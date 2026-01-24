using Bazap.API.Data;
using Bazap.API.DTOs;
using System.Text;
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
        var eventItem = await _context.EventItems
            .Include(ei => ei.Event)
            .Include(ei => ei.InspectionActions.OrderByDescending(a => a.InspectedAt))
            .FirstOrDefaultAsync(ei => ei.Id == eventItemId)
            ?? throw new KeyNotFoundException($"EventItem {eventItemId} not found");

        var lastAction = eventItem.InspectionActions.FirstOrDefault()
            ?? throw new InvalidOperationException("No inspection action found for this item");

        var inspector = await _context.Users.FindAsync(lastAction.InspectedByUserId);

        var disableReasonText = GetDisableReasonText(lastAction.DisableReason);

        var html = GenerateLabelHtml(
            makat: eventItem.ItemMakat,
            itemName: eventItem.ItemName,
            reason: disableReasonText,
            date: lastAction.InspectedAt.ToString("dd/MM/yyyy HH:mm"),
            inspector: inspector?.Username ?? "Unknown",
            eventNumber: eventItem.Event?.Number ?? "N/A",
            notes: lastAction.Notes ?? "",
            copies: copies
        );

        var htmlBytes = Encoding.UTF8.GetBytes(html);
        _logger.LogInformation("Generated label HTML for EventItem {EventItemId}, {Copies} copies", eventItemId, copies);
        return await Task.FromResult(htmlBytes);
    }

    public async Task<byte[]> GenerateBatchLabelsPdfAsync(List<int> eventItemIds)
    {
        var htmlBuilder = new StringBuilder();
        htmlBuilder.Append(@"<!DOCTYPE html>
<html lang='he' dir='rtl'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>מדבקות השבתה</title>
    <style>
        @page { margin: 0; size: A4; }
        @media print {
            body { margin: 0; padding: 0; }
            .label { page-break-after: always; }
        }
        * { box-sizing: border-box; }
        body { margin: 0; padding: 10px; font-family: Arial, sans-serif; direction: rtl; }
        .label { 
            width: 10cm; 
            height: 7cm; 
            border: 3px solid #000; 
            padding: 15px; 
            margin: 10px;
            display: inline-block;
            background: white;
            page-break-inside: avoid;
            position: relative;
        }
    </style>
</head>
<body>");

        int count = 0;
        foreach (var id in eventItemIds)
        {
            try
            {
                var eventItem = await _context.EventItems
                    .Include(ei => ei.Event)
                    .Include(ei => ei.InspectionActions.OrderByDescending(a => a.InspectedAt))
                    .FirstOrDefaultAsync(ei => ei.Id == id);

                if (eventItem == null) continue;

                var lastAction = eventItem.InspectionActions.FirstOrDefault();
                if (lastAction == null) continue;

                var inspector = await _context.Users.FindAsync(lastAction.InspectedByUserId);
                var disableReasonText = GetDisableReasonText(lastAction.DisableReason);

                // Generate label content (without outer HTML tags)
                var labelContent = GenerateLabelContent(
                    makat: eventItem.ItemMakat,
                    itemName: eventItem.ItemName,
                    reason: disableReasonText,
                    date: lastAction.InspectedAt.ToString("dd/MM/yyyy HH:mm"),
                    inspector: inspector?.Username ?? "Unknown",
                    eventNumber: eventItem.Event?.Number ?? "N/A",
                    notes: lastAction.Notes ?? ""
                );

                htmlBuilder.Append(labelContent);
                count++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate label for EventItem {EventItemId}", id);
            }
        }

        htmlBuilder.Append("</body></html>");

        var htmlBytes = Encoding.UTF8.GetBytes(htmlBuilder.ToString());
        _logger.LogInformation("Generated batch labels HTML for {Count} items", count);
        return await Task.FromResult(htmlBytes);
    }

    private string GetDisableReasonText(Models.DisableReason? reason) => reason switch
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

    private string GenerateLabelContent(string makat, string itemName, string reason, string date, string inspector, string eventNumber, string notes)
    {
        return $@"
    <div class='label'>
        <div style='background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 12px; margin: -15px -15px 10px -15px; border-bottom: 3px solid #000; text-align: center; border-radius: 4px 4px 0 0;'>
            <div style='font-size: 28px; font-weight: bold; margin: 0; letter-spacing: 2px;'>מושבת</div>
        </div>
        
        <div style='font-family: monospace; font-size: 16px; background: #fef3c7; padding: 10px; border-radius: 4px; text-align: center; font-weight: bold; margin: 10px 0; border: 2px solid #f59e0b;'>
            מק״ט: {makat}
        </div>
        
        <div style='background: #fee2e2; padding: 10px; border-radius: 4px; font-weight: bold; text-align: center; margin: 10px 0; border-left: 4px solid #ef4444; font-size: 14px;'>
            {reason}
        </div>
        
        <div style='font-size: 12px; margin: 8px 0; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;'>
            <div style='font-weight: bold; color: #6b7280;'>שם:</div>
            <div style='margin-top: 2px;'>{itemName}</div>
        </div>
        
        <div style='font-size: 11px; margin: 6px 0;'>
            <span style='font-weight: bold; color: #6b7280;'>אירוע:</span> {eventNumber}
            <span style='margin-left: 15px; font-weight: bold; color: #6b7280;'>בוחן:</span> {inspector}
        </div>
        
        <div style='font-size: 10px; color: #9ca3af; margin-top: 8px; padding-top: 5px; border-top: 1px dashed #d1d5db;'>
            {date}
            {(string.IsNullOrWhiteSpace(notes) ? "" : $"<div style='margin-top: 3px;'><strong>הערות:</strong> {notes}</div>")}
        </div>
    </div>";
    }

    private string GenerateLabelHtml(string makat, string itemName, string reason, string date, string inspector, string eventNumber, string notes, int copies)
    {
        // Generate QR code data URL (contains item info for scanning)
        var qrData = $"BAZAP-DISABLED|{makat}|{eventNumber}|{DateTime.UtcNow:yyyyMMddHHmmss}";
        var qrCodeUrl = $"https://api.qrserver.com/v1/create-qr-code/?size=120x120&data={Uri.EscapeDataString(qrData)}";

        var htmlBuilder = new StringBuilder();
        htmlBuilder.Append(@"<!DOCTYPE html>
<html lang='he' dir='rtl'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>מדבקת השבתה מקצועית</title>
    <style>
        @page { margin: 0; size: 10cm 7cm; }
        @media print {
            body { margin: 0; padding: 0; }
            .label { margin: 0; page-break-after: always; }
            .print-info { display: none; }
        }
        * { box-sizing: border-box; }
        body { 
            margin: 0; 
            padding: 0; 
            font-family: 'Segoe UI', 'Arial', sans-serif; 
            direction: rtl; 
            background: #f5f5f5;
        }
        .container {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 15px;
            padding: 15px;
        }
        .label { 
            width: 10cm; 
            height: 7cm; 
            background: white;
            position: relative;
            display: flex;
            flex-direction: column;
            page-break-inside: avoid;
            box-shadow: 0 8px 24px rgba(0,0,0,0.15);
            border-radius: 12px;
            overflow: hidden;
            border: 3px solid #dc2626;
        }
        .header {
            background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
            color: white;
            padding: 16px;
            text-align: center;
            position: relative;
            box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
        }
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, 
                transparent 0%, 
                rgba(255,255,255,0.3) 50%, 
                transparent 100%);
        }
        .status {
            font-size: 32px;
            font-weight: 800;
            margin: 0;
            letter-spacing: 3px;
            text-shadow: 0 3px 8px rgba(0,0,0,0.3);
            text-transform: uppercase;
            animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.85; }
        }
        .warning-strip {
            background: repeating-linear-gradient(
                45deg,
                #fbbf24,
                #fbbf24 10px,
                #000 10px,
                #000 20px
            );
            height: 8px;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
        }
        .content {
            padding: 16px;
            flex: 1;
            display: flex;
            gap: 12px;
        }
        .main-info {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .qr-section {
            width: 120px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #f9fafb;
            border-radius: 8px;
            padding: 8px;
            border: 2px solid #e5e7eb;
        }
        .qr-code {
            width: 100px;
            height: 100px;
            background: white;
            border: 2px solid #dc2626;
            border-radius: 6px;
            padding: 4px;
        }
        .qr-label {
            font-size: 9px;
            color: #6b7280;
            margin-top: 4px;
            text-align: center;
            font-weight: 600;
        }
        .makat-box {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            padding: 12px;
            border-radius: 8px;
            text-align: center;
            border: 2px solid #f59e0b;
            box-shadow: 0 2px 8px rgba(245, 158, 11, 0.2);
        }
        .makat-label {
            font-size: 10px;
            color: #92400e;
            font-weight: 700;
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .makat-value {
            font-family: 'Courier New', monospace;
            font-size: 20px;
            font-weight: 900;
            color: #78350f;
            letter-spacing: 2px;
        }
        .reason-box {
            background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
            padding: 12px;
            border-radius: 8px;
            font-weight: 800;
            text-align: center;
            border-left: 5px solid #dc2626;
            font-size: 16px;
            color: #7f1d1d;
            box-shadow: 0 2px 8px rgba(220, 38, 38, 0.15);
            text-transform: uppercase;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            padding: 6px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        .info-row:last-child {
            border-bottom: none;
        }
        .info-label {
            font-weight: 700;
            color: #6b7280;
            text-transform: uppercase;
            font-size: 9px;
            letter-spacing: 0.5px;
        }
        .info-value {
            color: #1f2937;
            font-weight: 600;
        }
        .footer {
            background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.02));
            padding: 8px 16px;
            font-size: 9px;
            color: #9ca3af;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: 1px solid #e5e7eb;
        }
        .logo {
            font-weight: 900;
            color: #dc2626;
            font-size: 11px;
            letter-spacing: 1px;
        }
        .notes {
            font-size: 10px;
            margin-top: 8px;
            padding: 8px;
            background: #fef3c7;
            border-radius: 6px;
            border-left: 3px solid #f59e0b;
            color: #78350f;
            font-style: italic;
        }
        .print-info {
            text-align: center;
            padding: 20px;
            color: #6b7280;
            font-size: 14px;
            background: white;
            margin: 20px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
    </style>
</head>
<body>
    <div class='print-info'>
        <div style='font-size: 18px; font-weight: bold; color: #dc2626; margin-bottom: 10px;'>🖨️ מדבקות השבתה מקצועיות</div>
        לחץ <strong>Ctrl+P</strong> (או Cmd+P) כדי להדפיס
        <br>
        <span style='color: #059669;'>✓ כולל QR Code לסריקה מהירה</span>
    </div>
    <div class='container'>");

        // Generate copies
        for (int i = 0; i < copies; i++)
        {
            htmlBuilder.Append($@"
        <div class='label'>
            <div class='header'>
                <div class='status'>⛔ מושבת</div>
            </div>
            <div class='warning-strip'></div>
            
            <div class='content'>
                <div class='main-info'>
                    <div class='makat-box'>
                        <div class='makat-label'>מק״ט</div>
                        <div class='makat-value'>{makat}</div>
                    </div>
                    
                    <div class='reason-box'>🚫 {reason}</div>
                    
                    <div class='info-row'>
                        <span class='info-label'>שם פריט</span>
                        <span class='info-value'>{itemName}</span>
                    </div>
                    <div class='info-row'>
                        <span class='info-label'>אירוע</span>
                        <span class='info-value'>{eventNumber}</span>
                    </div>
                    <div class='info-row'>
                        <span class='info-label'>בוחן</span>
                        <span class='info-value'>{inspector}</span>
                    </div>
                    <div class='info-row'>
                        <span class='info-label'>תאריך</span>
                        <span class='info-value'>{date}</span>
                    </div>
                    {(string.IsNullOrWhiteSpace(notes) ? "" : $@"
                    <div class='notes'>
                        <strong>📝 הערות:</strong> {notes}
                    </div>")}
                </div>
                
                <div class='qr-section'>
                    <img class='qr-code' src='{qrCodeUrl}' alt='QR Code' />
                    <div class='qr-label'>סרוק לפרטים</div>
                </div>
            </div>
            
            <div class='footer'>
                <div class='logo'>BAZAP 2.0</div>
                <div>מערכת ניהול ציוד</div>
            </div>
        </div>");
        }

        htmlBuilder.Append(@"
    </div>
</body>
</html>");

        return htmlBuilder.ToString();
    }
}
