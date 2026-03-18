using System.IO.Compression;
using System.Text;
using System.Text.Json;
using Bazap.API.Data;
using Bazap.API.DTOs;
using Bazap.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Bazap.API.Services;

public interface ISapMappingService
{
    Task<List<ItemSapMappingDto>> GetItemMappingsAsync();
    Task<ItemSapMappingDto> UpdateItemMappingAsync(int itemId, UpdateItemSapMappingRequest request);
    Task<bool> IsEventSapReadyAsync(Event evt);
    Task<SapDocumentPayload> BuildPayloadAsync(Event evt);
}

public interface ISapSyncOrchestrator
{
    Task<(byte[] Content, SapExportPreviewDto Preview)> ExportOrdersAsync(SapExportRequest request);
    Task<List<SapPushResultDto>> PushOrdersAsync(SapPushRequest request);
    Task<EventSapStatusDto> GetStatusAsync(int eventId);
    Task<SapPushResultDto> RetryAsync(int eventId);
}

public interface ISapTransportAdapter
{
    Task<SapPushResultDto> PushAsync(Event evt, SapDocumentPayload payload, SapIntegrationProfile profile);
}

public class SapIntegrationProfileResolver
{
    private readonly BazapContext _context;
    private readonly IConfiguration _configuration;

    public SapIntegrationProfileResolver(BazapContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    public async Task<SapIntegrationProfile> GetActiveProfileAsync()
    {
        var profile = await _context.SapIntegrationProfiles.OrderBy(p => p.Id).FirstOrDefaultAsync()
            ?? new SapIntegrationProfile();

        profile.Mode = _configuration["SapB1:Mode"] ?? profile.Mode;
        profile.BaseUrl = _configuration["SapB1:BaseUrl"] ?? profile.BaseUrl;
        profile.CompanyDb = _configuration["SapB1:CompanyDb"] ?? profile.CompanyDb;
        profile.Username = _configuration["SapB1:Username"] ?? profile.Username;
        profile.Password = _configuration["SapB1:Password"] ?? profile.Password;
        profile.ItemKeyMode = _configuration["SapB1:ItemKeyMode"] ?? profile.ItemKeyMode;
        profile.DefaultWarehouse = _configuration["SapB1:DefaultWarehouse"] ?? profile.DefaultWarehouse;
        profile.UseDirectServiceLayer = bool.TryParse(_configuration["SapB1:UseDirectServiceLayer"], out var direct)
            ? direct
            : profile.UseDirectServiceLayer;

        if (!string.Equals(profile.Mode, "direct_service_layer", StringComparison.OrdinalIgnoreCase))
        {
            profile.UseDirectServiceLayer = false;
            profile.Mode = "file_export";
        }

        return profile;
    }
}

public class SapMappingService : ISapMappingService
{
    private readonly BazapContext _context;

    public SapMappingService(BazapContext context)
    {
        _context = context;
    }

    public async Task<List<ItemSapMappingDto>> GetItemMappingsAsync()
    {
        var items = await _context.Items
            .OrderBy(i => i.Name)
            .ToListAsync();

        var mappings = await _context.ItemSapMappings.ToDictionaryAsync(m => m.ItemId);

        return items.Select(item =>
        {
            mappings.TryGetValue(item.Id, out var mapping);
            return ToDto(item, mapping);
        }).ToList();
    }

    public async Task<ItemSapMappingDto> UpdateItemMappingAsync(int itemId, UpdateItemSapMappingRequest request)
    {
        var item = await _context.Items.FindAsync(itemId) ?? throw new KeyNotFoundException("פריט לא נמצא");

        if (request.IsVerified && string.IsNullOrWhiteSpace(request.SapItemCode))
        {
            throw new InvalidOperationException("לא ניתן לאמת מיפוי SAP ללא SapItemCode");
        }

        var mapping = await _context.ItemSapMappings.FirstOrDefaultAsync(m => m.ItemId == itemId);

        if (mapping == null)
        {
            mapping = new ItemSapMapping
            {
                ItemId = itemId,
                LocalMakat = item.Code ?? string.Empty
            };
            _context.ItemSapMappings.Add(mapping);
        }

        mapping.LocalMakat = item.Code ?? mapping.LocalMakat;
        mapping.SapItemCode = request.SapItemCode?.Trim();
        mapping.SapItemName = request.SapItemName?.Trim();
        mapping.IsVerified = request.IsVerified;
        mapping.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return ToDto(item, mapping);
    }

    public async Task<bool> IsEventSapReadyAsync(Event evt)
    {
        var items = evt.Items?.ToList() ?? new List<EventItem>();
        if (items.Count == 0)
        {
            return false;
        }

        var itemIds = items.Where(i => i.ItemId.HasValue).Select(i => i.ItemId!.Value).Distinct().ToList();
        var mappings = await _context.ItemSapMappings
            .Where(m => itemIds.Contains(m.ItemId))
            .ToDictionaryAsync(m => m.ItemId);

        return items.All(item =>
            item.ItemId.HasValue &&
            mappings.TryGetValue(item.ItemId.Value, out var mapping) &&
            !string.IsNullOrWhiteSpace(mapping.SapItemCode));
    }

    public async Task<SapDocumentPayload> BuildPayloadAsync(Event evt)
    {
        var itemIds = evt.Items.Where(i => i.ItemId.HasValue).Select(i => i.ItemId!.Value).ToList();
        var mappings = await _context.ItemSapMappings.Where(m => itemIds.Contains(m.ItemId)).ToDictionaryAsync(m => m.ItemId);

        var documentType = evt.Type == EventType.Receiving ? "GoodsReceipt" : "GoodsIssue";
        var sapObject = evt.Type == EventType.Receiving ? "InventoryGenEntries" : "InventoryGenExits";

        var lines = evt.Items.Select(item =>
        {
            mappings.TryGetValue(item.ItemId ?? 0, out var mapping);
            return new SapDocumentLine
            {
                LocalMakat = item.ItemMakat,
                SapItemCode = mapping?.SapItemCode ?? string.Empty,
                ItemName = item.ItemName,
                Quantity = item.Quantity,
                ItemStatus = item.InspectionStatus == ItemInspectionStatus.Pass ? "OK" :
                    item.InspectionStatus == ItemInspectionStatus.Fail ? "DISABLED" : "PENDING",
                Notes = item.InspectionActions.OrderByDescending(a => a.InspectedAt).FirstOrDefault()?.Notes ?? string.Empty
            };
        }).ToList();

        return new SapDocumentPayload
        {
            EventId = evt.Id,
            OrderNumber = evt.Number,
            DocumentType = documentType,
            SapObject = sapObject,
            SourceUnit = evt.SourceUnit,
            Receiver = evt.Receiver,
            Status = evt.Status.ToString(),
            Lines = lines
        };
    }

    private static ItemSapMappingDto ToDto(Item item, ItemSapMapping? mapping)
    {
        var status = mapping == null
            ? "unmapped"
            : string.IsNullOrWhiteSpace(mapping.SapItemCode)
                ? "missing_code"
                : mapping.IsVerified ? "verified" : "mapped";

        return new ItemSapMappingDto
        {
            ItemId = item.Id,
            ItemName = item.Name,
            LocalMakat = item.Code ?? string.Empty,
            SapItemCode = mapping?.SapItemCode,
            SapItemName = mapping?.SapItemName,
            IsVerified = mapping?.IsVerified ?? false,
            LastSyncAt = mapping?.LastSyncAt,
            MappingStatus = status
        };
    }
}

public class FileExportSapTransportAdapter : ISapTransportAdapter
{
    public Task<SapPushResultDto> PushAsync(Event evt, SapDocumentPayload payload, SapIntegrationProfile profile)
    {
        return Task.FromResult(new SapPushResultDto
        {
            EventId = evt.Id,
            OrderNumber = evt.Number,
            SapDocumentType = payload.DocumentType,
            Status = "exported",
            Message = "חבילת ייצוא ל-SAP הוכנה להורדה"
        });
    }
}

public class ServiceLayerSapTransportAdapter : ISapTransportAdapter
{
    private readonly IHttpClientFactory _httpClientFactory;

    public ServiceLayerSapTransportAdapter(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    public async Task<SapPushResultDto> PushAsync(Event evt, SapDocumentPayload payload, SapIntegrationProfile profile)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(profile.BaseUrl) || string.IsNullOrWhiteSpace(profile.CompanyDb) ||
                string.IsNullOrWhiteSpace(profile.Username) || string.IsNullOrWhiteSpace(profile.Password))
            {
                return new SapPushResultDto
                {
                    EventId = evt.Id,
                    OrderNumber = evt.Number,
                    SapDocumentType = payload.DocumentType,
                    Status = "failed",
                    Message = "פרופיל SAP אינו מוגדר במלואו"
                };
            }

            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(20);

            var loginPayload = JsonSerializer.Serialize(new
            {
                CompanyDB = profile.CompanyDb,
                UserName = profile.Username,
                Password = profile.Password
            });

            using var loginResponse = await client.PostAsync(
                $"{profile.BaseUrl.TrimEnd('/')}/Login",
                new StringContent(loginPayload, Encoding.UTF8, "application/json"));

            if (!loginResponse.IsSuccessStatusCode)
            {
                return new SapPushResultDto
                {
                    EventId = evt.Id,
                    OrderNumber = evt.Number,
                    SapDocumentType = payload.DocumentType,
                    Status = "failed",
                    Message = $"Login ל-SAP נכשל: {(int)loginResponse.StatusCode}"
                };
            }

            var cookies = loginResponse.Headers.TryGetValues("Set-Cookie", out var cookieValues)
                ? string.Join("; ", cookieValues.Select(c => c.Split(';')[0]))
                : string.Empty;

            var request = new HttpRequestMessage(HttpMethod.Post, $"{profile.BaseUrl.TrimEnd('/')}/{payload.SapObject}");
            request.Headers.Add("Cookie", cookies);
            request.Content = new StringContent(JsonSerializer.Serialize(new
            {
                Comments = $"Bazap Order {payload.OrderNumber}",
                JournalMemo = $"Bazap {payload.DocumentType}",
                DocumentLines = payload.Lines.Select(line => new
                {
                    ItemCode = line.SapItemCode,
                    Quantity = line.Quantity,
                    WarehouseCode = profile.DefaultWarehouse,
                    FreeText = line.Notes
                })
            }), Encoding.UTF8, "application/json");

            using var pushResponse = await client.SendAsync(request);
            var body = await pushResponse.Content.ReadAsStringAsync();

            if (!pushResponse.IsSuccessStatusCode)
            {
                return new SapPushResultDto
                {
                    EventId = evt.Id,
                    OrderNumber = evt.Number,
                    SapDocumentType = payload.DocumentType,
                    Status = "failed",
                    Message = $"שליחה ל-SAP נכשלה: {body}"
                };
            }

            using var doc = JsonDocument.Parse(body);
            var docEntry = doc.RootElement.TryGetProperty("DocEntry", out var docEntryProp) ? docEntryProp.GetInt32() : (int?)null;
            var docNum = doc.RootElement.TryGetProperty("DocNum", out var docNumProp) ? docNumProp.GetInt32() : (int?)null;

            return new SapPushResultDto
            {
                EventId = evt.Id,
                OrderNumber = evt.Number,
                SapDocumentType = payload.DocumentType,
                Status = "synced",
                Message = "המסמך נשלח בהצלחה ל-SAP",
                DocEntry = docEntry,
                DocNum = docNum
            };
        }
        catch (Exception ex)
        {
            return new SapPushResultDto
            {
                EventId = evt.Id,
                OrderNumber = evt.Number,
                SapDocumentType = payload.DocumentType,
                Status = "failed",
                Message = $"שגיאת תקשורת מול SAP: {ex.Message}"
            };
        }
    }
}

public class SapSyncOrchestrator : ISapSyncOrchestrator
{
    private readonly BazapContext _context;
    private readonly ISapMappingService _sapMappingService;
    private readonly SapIntegrationProfileResolver _profileResolver;
    private readonly FileExportSapTransportAdapter _fileAdapter;
    private readonly ServiceLayerSapTransportAdapter _serviceLayerAdapter;

    public SapSyncOrchestrator(
        BazapContext context,
        ISapMappingService sapMappingService,
        SapIntegrationProfileResolver profileResolver,
        FileExportSapTransportAdapter fileAdapter,
        ServiceLayerSapTransportAdapter serviceLayerAdapter)
    {
        _context = context;
        _sapMappingService = sapMappingService;
        _profileResolver = profileResolver;
        _fileAdapter = fileAdapter;
        _serviceLayerAdapter = serviceLayerAdapter;
    }

    public async Task<(byte[] Content, SapExportPreviewDto Preview)> ExportOrdersAsync(SapExportRequest request)
    {
        if (request.EventIds == null || request.EventIds.Count == 0)
            throw new InvalidOperationException("יש לבחור לפחות הזמנה אחת לייצוא");

        var events = await LoadEventsAsync(request.EventIds);
        if (events.Count == 0)
            throw new KeyNotFoundException("לא נמצאו הזמנות לייצוא");

        var lines = new List<string>
        {
            "ORDER_NUMBER,DOCUMENT_TYPE,LOCAL_MAKAT,SAP_ITEM_CODE,ITEM_NAME,QUANTITY,SOURCE_UNIT,RECEIVER,ITEM_STATUS,NOTES"
        };
        var payloads = new List<SapDocumentPayload>();
        var warnings = new List<string>();

        foreach (var evt in events)
        {
            var payload = await _sapMappingService.BuildPayloadAsync(evt);
            payloads.Add(payload);

            foreach (var line in payload.Lines)
            {
                if (string.IsNullOrWhiteSpace(line.SapItemCode))
                {
                    warnings.Add($"הזמנה {evt.Number}: חסר SapItemCode עבור {line.LocalMakat}.");
                }

                lines.Add(string.Join(",",
                    Csv(payload.OrderNumber),
                    Csv(payload.DocumentType),
                    Csv(line.LocalMakat),
                    Csv(line.SapItemCode),
                    Csv(line.ItemName),
                    line.Quantity,
                    Csv(payload.SourceUnit),
                    Csv(payload.Receiver),
                    Csv(line.ItemStatus),
                    Csv(line.Notes)
                ));
            }

            await WriteSyncLogAsync(evt.Id, payload.DocumentType, "exported", JsonSerializer.Serialize(payload), null, null, null, "קובץ ייצוא חכם נוצר");
        }

        var preview = new SapExportPreviewDto
        {
            OrdersCount = events.Count,
            RowsCount = Math.Max(lines.Count - 1, 0),
            Warnings = warnings,
            FileName = $"sap-export-bundle-{DateTime.UtcNow:yyyyMMddHHmmss}.zip",
            ExportMode = "file_export"
        };

        await using var stream = new MemoryStream();
        using (var archive = new ZipArchive(stream, ZipArchiveMode.Create, true))
        {
            var csvEntry = archive.CreateEntry("sap-export.csv");
            await using (var entryStream = csvEntry.Open())
            await using (var writer = new StreamWriter(entryStream, Encoding.UTF8))
            {
                await writer.WriteAsync(string.Join(Environment.NewLine, lines));
            }

            var jsonEntry = archive.CreateEntry("sap-export.json");
            await using (var entryStream = jsonEntry.Open())
            await using (var writer = new StreamWriter(entryStream, Encoding.UTF8))
            {
                await writer.WriteAsync(JsonSerializer.Serialize(payloads, new JsonSerializerOptions { WriteIndented = true }));
            }

            var summaryEntry = archive.CreateEntry("sap-export-summary.json");
            await using (var entryStream = summaryEntry.Open())
            await using (var writer = new StreamWriter(entryStream, Encoding.UTF8))
            {
                await writer.WriteAsync(JsonSerializer.Serialize(preview, new JsonSerializerOptions { WriteIndented = true }));
            }

            var readmeEntry = archive.CreateEntry("README.txt");
            await using (var entryStream = readmeEntry.Open())
            await using (var writer = new StreamWriter(entryStream, Encoding.UTF8))
            {
                await writer.WriteAsync(BuildReadme(preview, payloads));
            }
        }

        return (stream.ToArray(), preview);
    }

    public async Task<List<SapPushResultDto>> PushOrdersAsync(SapPushRequest request)
    {
        if (request.EventIds == null || request.EventIds.Count == 0)
            throw new InvalidOperationException("יש לבחור לפחות הזמנה אחת לשליחה");

        var profile = await _profileResolver.GetActiveProfileAsync();
        var events = await LoadEventsAsync(request.EventIds);
        if (events.Count == 0)
            throw new KeyNotFoundException("לא נמצאו הזמנות לשליחה");

        var results = new List<SapPushResultDto>();

        foreach (var evt in events)
        {
            var ready = await _sapMappingService.IsEventSapReadyAsync(evt);
            var payload = await _sapMappingService.BuildPayloadAsync(evt);

            if (!ready)
            {
                var notReadyResult = new SapPushResultDto
                {
                    EventId = evt.Id,
                    OrderNumber = evt.Number,
                    SapDocumentType = payload.DocumentType,
                    Status = "not_ready",
                    Message = "ההזמנה אינה מוכנה ל-SAP. חסרים מיפויי פריטים."
                };
                results.Add(notReadyResult);
                await WriteSyncLogAsync(evt.Id, payload.DocumentType, notReadyResult.Status, JsonSerializer.Serialize(payload), null, null, null, notReadyResult.Message);
                continue;
            }

            var adapter = profile.UseDirectServiceLayer && !request.ForceFileFallback
                ? (ISapTransportAdapter)_serviceLayerAdapter
                : _fileAdapter;

            var result = await adapter.PushAsync(evt, payload, profile);
            results.Add(result);

            await WriteSyncLogAsync(
                evt.Id,
                payload.DocumentType,
                result.Status,
                JsonSerializer.Serialize(payload),
                result.DocEntry,
                result.DocNum,
                result.Status == "failed" ? result.Message : null,
                result.Message);
        }

        return results;
    }

    public async Task<EventSapStatusDto> GetStatusAsync(int eventId)
    {
        var evt = await _context.Events
            .Include(e => e.Items)
            .FirstOrDefaultAsync(e => e.Id == eventId)
            ?? throw new KeyNotFoundException("הזמנה לא נמצאה");

        var log = await _context.SapSyncLogs
            .Where(l => l.EventId == eventId)
            .OrderByDescending(l => l.UpdatedAt)
            .FirstOrDefaultAsync();

        var sapReady = await _sapMappingService.IsEventSapReadyAsync(evt);

        return new EventSapStatusDto
        {
            EventId = evt.Id,
            OrderNumber = evt.Number,
            SapReady = sapReady,
            Status = ResolveSapStatus(sapReady, log?.Status),
            Message = ResolveSapMessage(sapReady, log),
            SapDocumentType = log?.SapDocumentType ?? (evt.Type == EventType.Receiving ? "GoodsReceipt" : "GoodsIssue"),
            DocEntry = log?.SapDocEntry,
            DocNum = log?.SapDocNum,
            UpdatedAt = log?.UpdatedAt
        };
    }

    public async Task<SapPushResultDto> RetryAsync(int eventId)
    {
        if (eventId <= 0)
            throw new InvalidOperationException("מזהה הזמנה לא תקין");

        var results = await PushOrdersAsync(new SapPushRequest { EventIds = new List<int> { eventId } });
        return results[0];
    }

    private async Task<List<Event>> LoadEventsAsync(List<int> eventIds)
    {
        return await _context.Events
            .Include(e => e.Items)
            .ThenInclude(i => i.InspectionActions)
            .Where(e => eventIds.Contains(e.Id))
            .ToListAsync();
    }

    private async Task WriteSyncLogAsync(int eventId, string documentType, string status, string? requestPayload, int? docEntry, int? docNum, string? errorMessage, string? responsePayload)
    {
            var log = new SapSyncLog
        {
            EventId = eventId,
            Direction = status == "synced" ? "push" : "export",
            SapDocumentType = documentType,
            Status = status,
            SapDocEntry = docEntry,
            SapDocNum = docNum,
            RequestPayload = requestPayload,
            ResponsePayload = responsePayload,
            ErrorMessage = errorMessage,
            UpdatedAt = DateTime.UtcNow
        };

        _context.SapSyncLogs.Add(log);
        await _context.SaveChangesAsync();
    }

    private static string BuildReadme(SapExportPreviewDto preview, List<SapDocumentPayload> payloads)
    {
        var lines = new List<string>
        {
            "Bazap SAP Export Bundle",
            "Mode: Stage 1 file export",
            $"Created (UTC): {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss}",
            $"Orders: {preview.OrdersCount}",
            $"Rows: {preview.RowsCount}",
            string.Empty,
            "Files in this package:",
            "- sap-export.csv : canonical flat file for SAP handoff",
            "- sap-export.json : full structured payload snapshot",
            "- sap-export-summary.json : bundle metadata and warnings",
            "- README.txt : operator instructions",
            string.Empty,
            "Recommended handoff flow:",
            "1. Open sap-export-summary.json and review warnings.",
            "2. If warnings exist, complete missing item mappings before final handoff when possible.",
            "3. Deliver sap-export.csv together with the JSON snapshot to the SAP operator or import process.",
            "4. Keep this ZIP as an audit package for the order batch.",
            string.Empty,
            "Orders in this package:"
        };

        lines.AddRange(payloads.Select(payload => $"- {payload.OrderNumber} | {payload.DocumentType} | {payload.Lines.Count} lines"));

        if (preview.Warnings.Count > 0)
        {
            lines.Add(string.Empty);
            lines.Add("Warnings:");
            lines.AddRange(preview.Warnings.Select(warning => $"- {warning}"));
        }

        return string.Join(Environment.NewLine, lines);
    }

    private static string ResolveSapStatus(bool sapReady, string? latestStatus)
    {
        if (latestStatus == "synced")
        {
            return "exported";
        }

        if (sapReady && (string.IsNullOrWhiteSpace(latestStatus) || latestStatus == "not_ready"))
        {
            return "ready";
        }

        return latestStatus ?? (sapReady ? "ready" : "not_ready");
    }

    private static string ResolveSapMessage(bool sapReady, SapSyncLog? log)
    {
        if (log?.Status == "synced")
        {
            return "חבילת ייצוא ל-SAP הוכנה וממתינה להעברה.";
        }

        if (sapReady && (log == null || log.Status == "not_ready"))
        {
            return "ההזמנה מוכנה להכנת חבילת ייצוא ל-SAP.";
        }

        return log?.ErrorMessage ?? log?.ResponsePayload ?? "טרם בוצע sync";
    }

    private static string Csv(string value)
    {
        var safe = value.Replace("\"", "\"\"");
        return $"\"{safe}\"";
    }
}

public class SapDocumentPayload
{
    public int EventId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string DocumentType { get; set; } = string.Empty;
    public string SapObject { get; set; } = string.Empty;
    public string SourceUnit { get; set; } = string.Empty;
    public string Receiver { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public List<SapDocumentLine> Lines { get; set; } = new();
}

public class SapDocumentLine
{
    public string LocalMakat { get; set; } = string.Empty;
    public string SapItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public string ItemStatus { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
}
