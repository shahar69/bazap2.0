using System.Text;
using Bazap.API.Data;
using Bazap.API.DTOs;
using Microsoft.EntityFrameworkCore;

namespace Bazap.API.Services;

public class SapExportService : ISapExportService
{
    private readonly BazapContext _context;

    public SapExportService(BazapContext context)
    {
        _context = context;
    }

    public async Task<(byte[] Content, SapExportPreviewDto Preview)> ExportOrdersAsync(SapExportRequest request)
    {
        var events = await _context.Events
            .Include(e => e.Items)
            .ThenInclude(i => i.InspectionActions)
            .Where(e => request.EventIds.Contains(e.Id))
            .ToListAsync();

        var preview = new SapExportPreviewDto
        {
            OrdersCount = events.Count
        };

        var rows = new List<string>
        {
            "ORDER_NUMBER,MOVEMENT_TYPE,MATERIAL_CODE,MATERIAL_NAME,QUANTITY,SOURCE_UNIT,RECEIVER,ORDER_STATUS,ITEM_STATUS,INSPECTION_DATE,DISABLE_REASON,NOTES"
        };

        foreach (var evt in events)
        {
            foreach (var item in evt.Items)
            {
                var lastAction = item.InspectionActions.OrderByDescending(a => a.InspectedAt).FirstOrDefault();
                var movementType = evt.Type switch
                {
                    Models.EventType.Receiving => "ZGI",
                    Models.EventType.Outgoing => "ZGO",
                    _ => "ZINSP"
                };

                var itemStatus = item.InspectionStatus switch
                {
                    Models.ItemInspectionStatus.Pass => "OK",
                    Models.ItemInspectionStatus.Fail => "DISABLED",
                    _ => "PENDING"
                };

                if (string.IsNullOrWhiteSpace(item.ItemMakat))
                {
                    preview.Warnings.Add($"בהזמנה {evt.Number} יש פריט ללא מק\"ט ולכן הייצוא ל-SAP חלקי.");
                }

                rows.Add(string.Join(",",
                    Csv(evt.Number),
                    Csv(movementType),
                    Csv(item.ItemMakat),
                    Csv(item.ItemName),
                    item.Quantity,
                    Csv(evt.SourceUnit),
                    Csv(evt.Receiver),
                    Csv(evt.Status.ToString()),
                    Csv(itemStatus),
                    Csv(lastAction?.InspectedAt.ToString("yyyy-MM-dd HH:mm:ss") ?? string.Empty),
                    Csv(lastAction?.DisableReason?.ToString() ?? string.Empty),
                    Csv(lastAction?.Notes ?? string.Empty)
                ));
            }
        }

        preview.RowsCount = Math.Max(rows.Count - 1, 0);
        return (Encoding.UTF8.GetBytes(string.Join(Environment.NewLine, rows)), preview);
    }

    private static string Csv(string value)
    {
        var safe = value.Replace("\"", "\"\"");
        return $"\"{safe}\"";
    }
}
