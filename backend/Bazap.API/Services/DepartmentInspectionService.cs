using System.Text;
using Bazap.API.Data;
using Bazap.API.DTOs;
using Bazap.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Bazap.API.Services;

public interface IDepartmentInspectionService
{
    Task<IReadOnlyList<InspectionRecordDto>> GetRecordsAsync(InspectionRecordQuery query);
    Task<InspectionRecordDto> CreateRecordAsync(InspectionRecordRequest request);
    Task<CommanderReportDto> GetCommanderReportAsync(DateTime? from, DateTime? to);
    Task<byte[]> GenerateLabelsAsync(DisableLabelRequest request);
    Task<byte[]> ExportSapCsvAsync(DateTime? from, DateTime? to);
}

public class DepartmentInspectionService : IDepartmentInspectionService
{
    private static readonly HashSet<string> Decisions = ["Pass", "Disabled"];
    private static readonly HashSet<string> DisableReasons = ["VisualDefect", "Scrap", "Exceptional", "Cleaning"];
    private readonly BazapContext _context;

    public DepartmentInspectionService(BazapContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<InspectionRecordDto>> GetRecordsAsync(InspectionRecordQuery query)
    {
        var records = ApplyDateFilter(_context.InspectionRecords.AsNoTracking(), query.From, query.To);

        if (!string.IsNullOrWhiteSpace(query.Decision))
        {
            records = records.Where(record => record.Decision == query.Decision);
        }

        if (query.OnlyExceptional)
        {
            records = records.Where(record => record.DisableReason == "Exceptional");
        }

        return await records
            .OrderByDescending(record => record.InspectedAt)
            .Select(record => ToDto(record))
            .ToListAsync();
    }

    public async Task<InspectionRecordDto> CreateRecordAsync(InspectionRecordRequest request)
    {
        var makat = Normalize(request.Makat);
        var itemName = Normalize(request.ItemName);

        if (string.IsNullOrWhiteSpace(makat) && string.IsNullOrWhiteSpace(itemName))
        {
            throw new InvalidOperationException("חובה להזין מקט או שם פריט");
        }

        if (request.Quantity < 1)
        {
            throw new InvalidOperationException("כמות חייבת להיות גדולה מאפס");
        }

        if (!Decisions.Contains(request.Decision))
        {
            throw new InvalidOperationException("החלטת בחינה לא תקינה");
        }

        var disableReason = request.Decision == "Disabled" ? Normalize(request.DisableReason) : null;
        if (request.Decision == "Disabled" && (string.IsNullOrWhiteSpace(disableReason) || !DisableReasons.Contains(disableReason)))
        {
            throw new InvalidOperationException("סיבת השבתה לא תקינה");
        }

        if (!string.IsNullOrWhiteSpace(makat) && string.IsNullOrWhiteSpace(itemName))
        {
            itemName = await _context.Items
                .Where(item => item.Code == makat)
                .Select(item => item.Name)
                .FirstOrDefaultAsync();
        }

        var record = new InspectionRecord
        {
            Makat = makat,
            ItemName = itemName,
            Quantity = request.Quantity,
            Decision = request.Decision,
            DisableReason = disableReason,
            Notes = Normalize(request.Notes),
            InspectedAt = DateTime.UtcNow,
            InspectedBy = Normalize(request.InspectedBy) ?? "admin",
            SourceUnit = Normalize(request.SourceUnit)
        };

        _context.InspectionRecords.Add(record);
        await _context.SaveChangesAsync();
        return ToDto(record);
    }

    public async Task<CommanderReportDto> GetCommanderReportAsync(DateTime? from, DateTime? to)
    {
        var (fromDate, toDate) = NormalizeRange(from, to);
        var records = await ApplyDateFilter(_context.InspectionRecords.AsNoTracking(), fromDate, toDate).ToListAsync();

        var disabled = records.Where(record => record.Decision == "Disabled").ToList();
        var exceptional = disabled.Where(record => record.DisableReason == "Exceptional").ToList();

        return new CommanderReportDto(
            fromDate,
            toDate,
            records.Sum(record => record.Quantity),
            disabled.Sum(record => record.Quantity),
            records.Where(record => record.Decision == "Pass").Sum(record => record.Quantity),
            exceptional.Sum(record => record.Quantity),
            disabled
                .Where(record => !string.IsNullOrWhiteSpace(record.DisableReason))
                .GroupBy(record => record.DisableReason!)
                .Select(group => new ReasonSummaryDto(group.Key, ReasonLabel(group.Key), group.Sum(record => record.Quantity), group.Count()))
                .OrderByDescending(row => row.Quantity)
                .ToList(),
            exceptional.OrderByDescending(record => record.InspectedAt).Select(ToItemSummary).ToList(),
            disabled
                .GroupBy(record => new { record.Makat, record.ItemName })
                .Select(group => new ItemSummaryDto(group.Key.Makat, group.Key.ItemName, group.Sum(record => record.Quantity), null, null, group.Max(record => record.InspectedAt)))
                .OrderByDescending(row => row.Quantity)
                .Take(20)
                .ToList(),
            records
                .Where(record => !string.IsNullOrWhiteSpace(record.SourceUnit))
                .GroupBy(record => record.SourceUnit!)
                .Where(group => group.Count() > 1)
                .Select(group => new SourceSummaryDto(group.Key, group.Sum(record => record.Quantity), group.Count()))
                .OrderByDescending(row => row.Quantity)
                .ToList());
    }

    public async Task<byte[]> GenerateLabelsAsync(DisableLabelRequest request)
    {
        if (request.RecordIds.Count == 0)
        {
            throw new InvalidOperationException("לא נבחרו רשומות");
        }

        var records = await _context.InspectionRecords
            .AsNoTracking()
            .Where(record => request.RecordIds.Contains(record.Id) && record.Decision == "Disabled")
            .OrderBy(record => record.Id)
            .ToListAsync();

        var labelRecords = request.Mode == "Single"
            ? records.SelectMany(record => Enumerable.Range(0, record.Quantity).Select(_ => record))
            : records;

        var builder = new StringBuilder();
        builder.AppendLine("<!doctype html><html lang=\"he\" dir=\"rtl\"><head><meta charset=\"utf-8\"><title>פתקי השבתה</title>");
        builder.AppendLine(@"<style>
@page{size:70mm 50mm;margin:0}
*{box-sizing:border-box}
body{font-family:Arial,'Segoe UI',sans-serif;margin:0;color:#111;background:#fff}
.label{width:70mm;height:50mm;padding:4mm 5mm;break-after:page;display:grid;grid-template-rows:auto 1fr auto;border:1px solid #111}
.top{display:flex;justify-content:space-between;align-items:start;border-bottom:1px solid #111;padding-bottom:2mm}
.title{font-size:16pt;font-weight:900;letter-spacing:0}
.reason{font-size:11pt;font-weight:800;border:1px solid #111;padding:1mm 2mm}
.main{display:grid;align-content:center;gap:1mm}
.item{font-size:14pt;font-weight:900;line-height:1.05}
.row{font-size:9pt;line-height:1.2}
.qty{font-size:22pt;font-weight:900}
.bottom{display:flex;justify-content:space-between;border-top:1px solid #111;padding-top:1.5mm;font-size:8pt}
@media screen{body{background:#e9ece7;padding:12px}.label{background:#fff;margin:0 auto 12px;box-shadow:0 8px 22px rgba(0,0,0,.18)}}
</style></head><body>");

        foreach (var record in labelRecords)
        {
            var quantity = request.Mode == "Single" ? 1 : record.Quantity;
            builder.AppendLine("<section class=\"label\">");
            builder.AppendLine("<div class=\"top\"><div class=\"title\">השבתה</div>");
            builder.AppendLine($"<div class=\"reason\">{ReasonLabel(record.DisableReason)}</div></div>");
            builder.AppendLine("<div class=\"main\">");
            builder.AppendLine($"<div class=\"item\">{Html(record.Makat ?? record.ItemName ?? "-")}</div>");
            builder.AppendLine($"<div class=\"row\">שם: {Html(record.ItemName ?? "-")}</div>");
            builder.AppendLine($"<div class=\"qty\">כמות {quantity}</div>");
            builder.AppendLine($"<div class=\"row\">הערה: {Html(record.Notes ?? "-")}</div>");
            builder.AppendLine("</div>");
            builder.AppendLine($"<div class=\"bottom\"><span>{record.InspectedAt.ToLocalTime():dd/MM/yyyy}</span><span>בוחן: {Html(request.InspectedBy ?? record.InspectedBy)}</span></div>");
            builder.AppendLine("</section>");
        }

        builder.AppendLine("</body></html>");
        return Encoding.UTF8.GetBytes(builder.ToString());
    }

    public async Task<byte[]> ExportSapCsvAsync(DateTime? from, DateTime? to)
    {
        var (fromDate, toDate) = NormalizeRange(from, to);
        var records = await ApplyDateFilter(_context.InspectionRecords.AsNoTracking(), fromDate, toDate)
            .OrderBy(record => record.InspectedAt)
            .ToListAsync();

        var builder = new StringBuilder();
        builder.AppendLine("RecordId,Makat,ItemName,Quantity,Decision,DisableReason,Notes,InspectedAt,InspectedBy,SourceUnit");
        foreach (var record in records)
        {
            builder.AppendLine(string.Join(",", [
                record.Id.ToString(),
                Csv(record.Makat),
                Csv(record.ItemName),
                record.Quantity.ToString(),
                Csv(record.Decision),
                Csv(record.DisableReason),
                Csv(record.Notes),
                Csv(record.InspectedAt.ToString("O")),
                Csv(record.InspectedBy),
                Csv(record.SourceUnit)
            ]));
        }

        return Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(builder.ToString())).ToArray();
    }

    private static IQueryable<InspectionRecord> ApplyDateFilter(IQueryable<InspectionRecord> records, DateTime? from, DateTime? to)
    {
        var (fromDate, toDate) = NormalizeRange(from, to);
        return records.Where(record => record.InspectedAt >= fromDate && record.InspectedAt < toDate.AddDays(1));
    }

    private static (DateTime From, DateTime To) NormalizeRange(DateTime? from, DateTime? to)
    {
        var start = (from ?? DateTime.Today).Date;
        var end = (to ?? start).Date;
        return start <= end ? (start, end) : (end, start);
    }

    private static InspectionRecordDto ToDto(InspectionRecord record) =>
        new(record.Id, record.Makat, record.ItemName, record.Quantity, record.Decision, record.DisableReason, record.Notes, record.InspectedAt, record.InspectedBy, record.SourceUnit);

    private static ItemSummaryDto ToItemSummary(InspectionRecord record) =>
        new(record.Makat, record.ItemName, record.Quantity, record.Notes, record.SourceUnit, record.InspectedAt);

    private static string? Normalize(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string ReasonLabel(string? reason) => reason switch
    {
        "VisualDefect" => "לקוי ויזואלית",
        "Scrap" => "גריטה",
        "Exceptional" => "חריג",
        "Cleaning" => "ניקיון",
        _ => "-"
    };

    private static string Csv(string? value)
    {
        var escaped = (value ?? string.Empty).Replace("\"", "\"\"");
        return $"\"{escaped}\"";
    }

    private static string Html(string value) =>
        value.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;").Replace("\"", "&quot;");
}
