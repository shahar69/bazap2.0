using Bazap.API.DTOs;
using System.Text;

namespace Bazap.API.Services;

public class PrintService : IPrintService
{
    private readonly ILogger<PrintService> _logger;

    public PrintService(ILogger<PrintService> logger)
    {
        _logger = logger;
    }

    public async Task<byte[]> GenerateLabelPdfAsync(int eventItemId, int copies = 1)
    {
        var html = GenerateLabelHtml("מושבת", "test-makat-001", "Item Name", "ויזואלי", "2026-01-24", "admin");
        var pdf = ConvertHtmlToPdf(html, copies);
        return await Task.FromResult(pdf);
    }

    public async Task<byte[]> GenerateBatchLabelsPdfAsync(List<int> eventItemIds)
    {
        var htmlBuilder = new StringBuilder();
        foreach (var id in eventItemIds)
        {
            htmlBuilder.Append(GenerateLabelHtml("מושבת", $"makat-{id}", "Item Name", "ויזואלי", "2026-01-24", "admin"));
            htmlBuilder.Append("<br style='page-break-after: always;'/>");
        }

        var pdf = ConvertHtmlToPdf(htmlBuilder.ToString(), 1);
        return await Task.FromResult(pdf);
    }

    private string GenerateLabelHtml(string status, string makat, string itemName, string reason, string date, string inspector)
    {
        return $@"
<!DOCTYPE html>
<html lang='he' dir='rtl'>
<head>
    <meta charset='UTF-8'>
    <style>
        body {{ font-family: Arial; direction: rtl; margin: 0; padding: 10px; }}
        .label {{ 
            border: 2px solid black; 
            width: 10cm; 
            height: 7cm; 
            padding: 10px; 
            text-align: right;
            box-sizing: border-box;
        }}
        .status {{ font-size: 24px; font-weight: bold; color: red; margin: 5px 0; }}
        .makat {{ font-size: 14px; margin: 5px 0; }}
        .name {{ font-size: 12px; margin: 5px 0; }}
        .reason {{ font-size: 12px; margin: 5px 0; }}
        .date {{ font-size: 10px; margin: 5px 0; }}
        .inspector {{ font-size: 10px; margin: 5px 0; }}
    </style>
</head>
<body>
    <div class='label'>
        <div class='status'>{status}</div>
        <div class='makat'>מקט: {makat}</div>
        <div class='name'>פריט: {itemName}</div>
        <div class='reason'>סיבה: {reason}</div>
        <div class='date'>תאריך: {date}</div>
        <div class='inspector'>בוחן: {inspector}</div>
    </div>
</body>
</html>";
    }

    private byte[] ConvertHtmlToPdf(string html, int copies)
    {
        // Placeholder: In production, use a library like SelectPdf, iTextSharp, or similar
        // For now, return a simple PDF-like byte array
        var pdfBytes = Encoding.UTF8.GetBytes(html);
        _logger.LogInformation("Generated PDF for {Copies} copies", copies);
        return pdfBytes;
    }
}
