using System.Text;
using Bazap.API.Data;
using Microsoft.EntityFrameworkCore;

namespace Bazap.API.Services;

public class PrintService : IPrintService
{
    private readonly BazapContext _context;
    private readonly ILogger<PrintService> _logger;

    public PrintService(BazapContext context, ILogger<PrintService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<byte[]> GenerateLabelPdfAsync(int eventItemId, int copies = 1)
    {
        var label = await LoadLabelDetailsAsync(eventItemId);
        var html = GenerateLabelHtml(label, copies);
        _logger.LogInformation("Generated label HTML for EventItem {EventItemId}, {Copies} copies", eventItemId, copies);
        return Encoding.UTF8.GetBytes(html);
    }

    public async Task<byte[]> GenerateBatchLabelsPdfAsync(List<int> eventItemIds)
    {
        var labels = new List<LabelRenderData>();

        foreach (var id in eventItemIds)
        {
            try
            {
                labels.Add(await LoadLabelDetailsAsync(id));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate label for EventItem {EventItemId}", id);
            }
        }

        var html = GenerateBatchLabelHtml(labels);
        _logger.LogInformation("Generated batch labels HTML for {Count} items", labels.Count);
        return Encoding.UTF8.GetBytes(html);
    }

    private async Task<LabelRenderData> LoadLabelDetailsAsync(int eventItemId)
    {
        var eventItem = await _context.EventItems
            .Include(ei => ei.Event)
            .Include(ei => ei.InspectionActions.OrderByDescending(a => a.InspectedAt))
            .FirstOrDefaultAsync(ei => ei.Id == eventItemId)
            ?? throw new KeyNotFoundException($"EventItem {eventItemId} not found");

        var lastAction = eventItem.InspectionActions.FirstOrDefault()
            ?? throw new InvalidOperationException("No inspection action found for this item");

        var inspector = await _context.Users.FindAsync(lastAction.InspectedByUserId);
        var history = await GetItemHistorySummaryAsync(eventItem.ItemMakat);

        return new LabelRenderData
        {
            Makat = eventItem.ItemMakat,
            ItemName = eventItem.ItemName,
            DisableReasonText = GetDisableReasonText(lastAction.DisableReason),
            ActionDate = lastAction.InspectedAt,
            InspectorName = inspector?.Username ?? "Unknown",
            OrderNumber = eventItem.Event?.Number ?? "N/A",
            Notes = lastAction.Notes ?? string.Empty,
            History = history
        };
    }

    private async Task<List<HistorySummaryRow>> GetItemHistorySummaryAsync(string makat)
    {
        if (string.IsNullOrWhiteSpace(makat))
        {
            return new List<HistorySummaryRow>();
        }

        return await _context.EventItems
            .Where(ei => ei.ItemMakat == makat)
            .Include(ei => ei.Event)
            .Include(ei => ei.InspectionActions)
            .OrderByDescending(ei => ei.AddedAt)
            .Take(5)
            .Select(ei => new HistorySummaryRow
            {
                OrderNumber = ei.Event != null ? ei.Event.Number : string.Empty,
                Receiver = ei.Event != null ? ei.Event.Receiver : string.Empty,
                ActionDate = ei.InspectionActions
                    .OrderByDescending(a => a.InspectedAt)
                    .Select(a => (DateTime?)a.InspectedAt)
                    .FirstOrDefault() ?? ei.AddedAt,
                StatusLabel = ei.InspectionStatus == Models.ItemInspectionStatus.Pass
                    ? "תקין"
                    : ei.InspectionStatus == Models.ItemInspectionStatus.Fail
                        ? "מושבת"
                        : "ממתין"
            })
            .ToListAsync();
    }

    private static string GetDisableReasonText(Models.DisableReason? reason) => reason switch
    {
        Models.DisableReason.VisualDamage => "נזק ויזואלי",
        Models.DisableReason.Scrap => "גרוטאות",
        Models.DisableReason.Malfunction => "תקלה/לא תקין",
        Models.DisableReason.MissingParts => "חלקים חסרים",
        Models.DisableReason.Expired => "פג תוקף",
        Models.DisableReason.Calibration => "טעון כיול",
        Models.DisableReason.Other => "אחר",
        _ => "לא צוין"
    };

    private string GenerateLabelHtml(LabelRenderData label, int copies)
    {
        var labelMarkup = string.Concat(Enumerable.Range(0, copies).Select(_ => GenerateSingleLabel(label)));
        return WrapHtml("מדבקת פריט מושבת", labelMarkup);
    }

    private string GenerateBatchLabelHtml(List<LabelRenderData> labels)
    {
        var labelMarkup = string.Concat(labels.Select(GenerateSingleLabel));
        return WrapHtml("מדבקות פריטים מושבתים", labelMarkup);
    }

    private string GenerateSingleLabel(LabelRenderData label)
    {
        var historyRows = label.History.Count == 0
            ? "<div class='history-empty'>אין היסטוריה קודמת</div>"
            : string.Concat(label.History.Select(row =>
                $"<div class='history-row'><strong>{row.OrderNumber}</strong><span>{row.StatusLabel}</span><span>{row.ActionDate:dd/MM/yy}</span></div>"));

        var historyPayload = label.History.Count == 0
            ? "none"
            : string.Join(";", label.History.Select(row => $"{row.OrderNumber},{row.StatusLabel},{row.ActionDate:yyyyMMdd}"));
        var qrData = $"BAZAP|MAKAT={label.Makat}|ORDER={label.OrderNumber}|STATUS=מושבת|DATE={label.ActionDate:yyyyMMddHHmmss}|HISTORY={historyPayload}";
        var qrCodeUrl = $"https://api.qrserver.com/v1/create-qr-code/?size=120x120&data={Uri.EscapeDataString(qrData)}";
        var notesHtml = string.IsNullOrWhiteSpace(label.Notes) ? "" : $"<div class='notes'><strong>הערות:</strong> {label.Notes}</div>";

        return $@"
<section class='label'>
  <div class='label-header'>
    <div class='label-status'>מושבת</div>
    <div class='label-subtitle'>מדבקת פריט לבדיקה ומעקב</div>
  </div>
  <div class='label-body'>
    <div class='label-main'>
      <div class='makat-box'>
        <div class='meta-title'>מקט</div>
        <div class='makat-value'>{label.Makat}</div>
      </div>
      <div class='meta-row'><strong>שם פריט:</strong><span>{label.ItemName}</span></div>
      <div class='meta-row'><strong>מספר הזמנה:</strong><span>{label.OrderNumber}</span></div>
      <div class='meta-row'><strong>סיבת השבתה:</strong><span>{label.DisableReasonText}</span></div>
      <div class='meta-row'><strong>בוחן:</strong><span>{label.InspectorName}</span></div>
      <div class='meta-row'><strong>תאריך:</strong><span>{label.ActionDate:dd/MM/yyyy HH:mm}</span></div>
      {notesHtml}
      <div class='history-box'>
        <div class='history-title'>היסטוריית פריט מקוצרת</div>
        {historyRows}
      </div>
    </div>
    <div class='qr-panel'>
      <img class='qr-code' src='{qrCodeUrl}' alt='QR Code' />
      <div class='qr-caption'>סריקה לקבלת היסטוריית הפריט</div>
    </div>
  </div>
</section>";
    }

    private static string WrapHtml(string title, string body) => $@"<!DOCTYPE html>
<html lang='he' dir='rtl'>
<head>
  <meta charset='UTF-8'>
  <meta name='viewport' content='width=device-width, initial-scale=1.0'>
  <title>{title}</title>
  <style>
    @page {{ margin: 10mm; }}
    body {{
      margin: 0;
      padding: 16px;
      direction: rtl;
      font-family: Arial, sans-serif;
      background: #f4f6f8;
    }}
    .label {{
      width: 10cm;
      min-height: 7cm;
      background: white;
      border: 3px solid #dc2626;
      border-radius: 14px;
      overflow: hidden;
      display: inline-block;
      vertical-align: top;
      margin: 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.12);
      page-break-inside: avoid;
    }}
    .label-header {{
      background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
      color: white;
      padding: 12px 14px;
      text-align: center;
    }}
    .label-status {{
      font-size: 30px;
      font-weight: 800;
      letter-spacing: 2px;
    }}
    .label-subtitle {{
      font-size: 11px;
      opacity: 0.92;
      margin-top: 4px;
    }}
    .label-body {{
      padding: 12px;
      display: flex;
      gap: 12px;
    }}
    .label-main {{
      flex: 1;
    }}
    .makat-box {{
      background: #fef3c7;
      border: 2px solid #f59e0b;
      border-radius: 10px;
      padding: 10px;
      margin-bottom: 10px;
      text-align: center;
    }}
    .meta-title {{
      font-size: 10px;
      color: #92400e;
      font-weight: 700;
      margin-bottom: 4px;
    }}
    .makat-value {{
      font-family: 'Courier New', monospace;
      font-size: 18px;
      font-weight: 700;
    }}
    .meta-row {{
      font-size: 11px;
      margin-bottom: 6px;
      display: flex;
      justify-content: space-between;
      gap: 8px;
      border-bottom: 1px solid #eef1f4;
      padding-bottom: 4px;
    }}
    .meta-row strong {{
      color: #4b5563;
      white-space: nowrap;
    }}
    .notes {{
      margin-top: 8px;
      font-size: 10px;
      color: #374151;
    }}
    .history-box {{
      margin-top: 10px;
      padding: 8px;
      border-radius: 10px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
    }}
    .history-title {{
      font-size: 10px;
      font-weight: 700;
      margin-bottom: 4px;
      color: #374151;
    }}
    .history-row {{
      display: grid;
      grid-template-columns: 1.6fr 1fr 1fr;
      gap: 6px;
      font-size: 9px;
      margin-bottom: 3px;
      color: #4b5563;
    }}
    .history-empty {{
      font-size: 9px;
      color: #9ca3af;
    }}
    .qr-panel {{
      width: 120px;
      text-align: center;
    }}
    .qr-code {{
      width: 108px;
      height: 108px;
      border: 2px solid #d1d5db;
      border-radius: 8px;
      padding: 4px;
      background: white;
    }}
    .qr-caption {{
      font-size: 9px;
      color: #6b7280;
      margin-top: 6px;
    }}
  </style>
</head>
<body>
  {body}
</body>
</html>";

    private sealed class LabelRenderData
    {
        public string Makat { get; set; } = string.Empty;
        public string ItemName { get; set; } = string.Empty;
        public string DisableReasonText { get; set; } = string.Empty;
        public DateTime ActionDate { get; set; }
        public string InspectorName { get; set; } = string.Empty;
        public string OrderNumber { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;
        public List<HistorySummaryRow> History { get; set; } = new();
    }

    private sealed class HistorySummaryRow
    {
        public string OrderNumber { get; set; } = string.Empty;
        public string Receiver { get; set; } = string.Empty;
        public DateTime ActionDate { get; set; }
        public string StatusLabel { get; set; } = string.Empty;
    }
}
