using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Bazap.API.Data;
using Bazap.API.DTOs;
using Microsoft.EntityFrameworkCore;

namespace Bazap.API.Services;

public class AiImportService : IAiImportService
{
    private readonly BazapContext _context;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AiImportService> _logger;
    private readonly IEventService _eventService;
    private readonly ISapMappingService _sapMappingService;

    public AiImportService(
        BazapContext context,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<AiImportService> logger,
        IEventService eventService,
        ISapMappingService sapMappingService)
    {
        _context = context;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
        _eventService = eventService;
        _sapMappingService = sapMappingService;
    }

    public async Task<SmartImportResultDto> PreviewImportAsync(SmartImportRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RawText))
        {
            return new SmartImportResultDto
            {
                Warnings = new List<string> { "לא התקבל טקסט לניתוח" }
            };
        }

        var aiResult = await TryAnalyzeWithOpenAiAsync(request.RawText);
        var result = aiResult ?? AnalyzeHeuristically(request.RawText);
        await MatchCatalogItemsAsync(result);

        if (result.Lines.Count == 0)
        {
            result.Warnings.Add("לא זוהו שורות פריטים. נסה להדביק טקסט עם מק\"ט, שם וכמות.");
        }

        return result;
    }

    public async Task<EventDto> CommitImportAsync(SmartImportCommitRequest request, int userId)
    {
        if (string.IsNullOrWhiteSpace(request.SourceUnit))
            throw new InvalidOperationException("יש להזין יחידת מקור להזמנה");

        if (string.IsNullOrWhiteSpace(request.Receiver))
            throw new InvalidOperationException("יש להזין שם מקבל להזמנה");

        var validLines = request.Lines
            .Where(l => l.Quantity > 0 && (!string.IsNullOrWhiteSpace(l.Makat) || !string.IsNullOrWhiteSpace(l.ItemName) || l.ItemId.HasValue))
            .ToList();

        if (validLines.Count == 0)
            throw new InvalidOperationException("לא נמצאו שורות תקינות לייבוא");

        var evt = await _eventService.CreateEventAsync(new CreateEventRequest
        {
            SourceUnit = request.SourceUnit,
            Receiver = request.Receiver,
            Type = Enum.IsDefined(typeof(Models.EventType), request.EventType)
                ? (Models.EventType)request.EventType
                : Models.EventType.Receiving,
            OrderNumber = string.IsNullOrWhiteSpace(request.OrderNumber) ? null : request.OrderNumber
        }, userId);

        var current = evt;
        foreach (var line in validLines)
        {
            current = await _eventService.AddItemToEventAsync(current.Id, new AddItemToEventRequest
            {
                ItemId = line.ItemId,
                ItemMakat = line.Makat,
                ItemName = line.ItemName,
                Quantity = line.Quantity
            });
        }

        return current;
    }

    private async Task<SmartImportResultDto?> TryAnalyzeWithOpenAiAsync(string rawText)
    {
        var apiKey = _configuration["OpenAI:ApiKey"] ?? Environment.GetEnvironmentVariable("OPENAI_API_KEY");
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            return null;
        }

        try
        {
            var client = _httpClientFactory.CreateClient();
            using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/chat/completions");
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);

            var payload = new
            {
                model = _configuration["OpenAI:Model"] ?? "gpt-4.1-mini",
                temperature = 0.1,
                response_format = new { type = "json_object" },
                messages = new object[]
                {
                    new
                    {
                        role = "system",
                        content = "You extract warehouse order data from messy Hebrew or mixed-language text. Return strict JSON with fields: orderNumber, sourceUnit, receiver, warnings[], lines[]. Each line must contain makat, itemName, quantity, suggestedStatus. If unknown, use empty string. quantity must be integer."
                    },
                    new
                    {
                        role = "user",
                        content = $"Analyze this text and prepare an import preview for a military warehouse system:\n\n{rawText}"
                    }
                }
            };

            request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            using var response = await client.SendAsync(request);
            response.EnsureSuccessStatusCode();

            var body = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(body);
            var content = doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString();

            if (string.IsNullOrWhiteSpace(content))
            {
                return null;
            }

            var result = JsonSerializer.Deserialize<SmartImportResultDto>(content, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (result == null)
            {
                return null;
            }

            result.UsedAi = true;
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "AI import analysis failed, falling back to heuristic parsing");
            return null;
        }
    }

    private SmartImportResultDto AnalyzeHeuristically(string rawText)
    {
        var result = new SmartImportResultDto();
        var lines = rawText
            .Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)
            .Select(line => line.Trim())
            .Where(line => !string.IsNullOrWhiteSpace(line))
            .ToList();

        foreach (var line in lines)
        {
            if (string.IsNullOrWhiteSpace(result.OrderNumber))
            {
                result.OrderNumber = ExtractField(line, @"(?:מספר\s*הזמנה|הזמנה|order)\s*[:#]?\s*([A-Za-z0-9\-\/]+)");
            }

            if (string.IsNullOrWhiteSpace(result.SourceUnit))
            {
                result.SourceUnit = ExtractField(line, @"(?:יחידה|source\s*unit)\s*[:#]?\s*(.+)$");
            }

            if (string.IsNullOrWhiteSpace(result.Receiver))
            {
                result.Receiver = ExtractField(line, @"(?:מקבל|receiver)\s*[:#]?\s*(.+)$");
            }

            var parsedLine = TryParseItemLine(line);
            if (parsedLine != null)
            {
                result.Lines.Add(parsedLine);
            }
        }

        return result;
    }

    private static string ExtractField(string line, string pattern)
    {
        var match = Regex.Match(line, pattern, RegexOptions.IgnoreCase);
        return match.Success ? match.Groups[1].Value.Trim() : string.Empty;
    }

    private static SmartImportLineDto? TryParseItemLine(string line)
    {
        var separated = line.Split(new[] { '\t', ';', ',' }, StringSplitOptions.RemoveEmptyEntries)
            .Select(part => part.Trim())
            .ToArray();

        if (separated.Length >= 3 && int.TryParse(separated[^1], out var qtyFromColumns))
        {
            return new SmartImportLineDto
            {
                Makat = separated[0],
                ItemName = separated[1],
                Quantity = Math.Max(1, qtyFromColumns),
                SuggestedStatus = "ממתין"
            };
        }

        var regex = Regex.Match(line, @"(?<makat>[A-Za-z0-9\-\/]{3,})\s+(?<name>.+?)\s+(?<qty>\d+)$");
        if (!regex.Success)
        {
            return null;
        }

        return new SmartImportLineDto
        {
            Makat = regex.Groups["makat"].Value.Trim(),
            ItemName = regex.Groups["name"].Value.Trim(),
            Quantity = int.TryParse(regex.Groups["qty"].Value, out var qty) ? Math.Max(1, qty) : 1,
            SuggestedStatus = "ממתין"
        };
    }

    private async Task MatchCatalogItemsAsync(SmartImportResultDto result)
    {
        if (result.Lines.Count == 0)
        {
            return;
        }

        var catalog = await _context.Items.AsNoTracking().ToListAsync();

        foreach (var line in result.Lines)
        {
            var match = catalog.FirstOrDefault(item =>
                (!string.IsNullOrWhiteSpace(line.Makat) && string.Equals(item.Code, line.Makat, StringComparison.OrdinalIgnoreCase)) ||
                (!string.IsNullOrWhiteSpace(line.ItemName) && string.Equals(item.Name, line.ItemName, StringComparison.OrdinalIgnoreCase)));

            if (match == null && !string.IsNullOrWhiteSpace(line.ItemName))
            {
                match = catalog.FirstOrDefault(item => item.Name.Contains(line.ItemName, StringComparison.OrdinalIgnoreCase));
            }

            if (match != null)
            {
                line.ItemId = match.Id;
                line.MatchedCatalogItem = true;
                line.Makat = string.IsNullOrWhiteSpace(match.Code) ? line.Makat : match.Code;
                line.ItemName = match.Name;
                line.MatchStatus = "matched";
                line.Confidence = 0.95m;

                var mapping = await _context.ItemSapMappings.FirstOrDefaultAsync(m => m.ItemId == match.Id);
                if (mapping != null && !string.IsNullOrWhiteSpace(mapping.SapItemCode))
                {
                    line.SapItemCode = mapping.SapItemCode;
                }
                else
                {
                    line.Warnings.Add("לפריט אין SapItemCode מאומת");
                }
            }
            else
            {
                line.MatchStatus = "unmatched";
                line.Confidence = 0.2m;
                line.Warnings.Add("לא נמצא פריט תואם בקטלוג");
                result.Warnings.Add($"לא נמצא פריט תואם בקטלוג עבור '{line.Makat} {line.ItemName}'");
            }
        }
    }
}
