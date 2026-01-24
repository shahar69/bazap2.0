using Bazap.API.DTOs;
using Bazap.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Bazap.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class InspectionController : ControllerBase
{
    private readonly IInspectionService _inspectionService;
    private readonly IPrintService _printService;
    private readonly ILogger<InspectionController> _logger;

    public InspectionController(
        IInspectionService inspectionService,
        IPrintService printService,
        ILogger<InspectionController> logger)
    {
        _inspectionService = inspectionService;
        _printService = printService;
        _logger = logger;
    }

    [HttpPost("decide")]
    public async Task<ActionResult<InspectionActionDto>> MakeDecision([FromBody] InspectionDecisionRequest request)
    {
        try
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var result = await _inspectionService.RecordDecisionAsync(request, userId);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "פריט לא נמצא" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error recording decision");
            return StatusCode(500, new { message = "שגיאה בהקלטת החלטה" });
        }
    }

    [HttpGet("label-preview/{eventItemId}")]
    public async Task<ActionResult<LabelDataDto>> GetLabelPreview(int eventItemId)
    {
        try
        {
            var labelData = await _inspectionService.GetLabelDataAsync(eventItemId);
            return Ok(labelData);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "פריט לא נמצא" });
        }
    }

    [HttpPost("print-label")]
    public async Task<IActionResult> PrintLabel([FromBody] PrintLabelRequest request)
    {
        try
        {
            var pdfData = await _printService.GenerateLabelPdfAsync(request.EventItemId, request.Copies);
            return File(pdfData, "application/pdf", $"label-{request.EventItemId}.pdf");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error printing label");
            return StatusCode(500, new { message = "שגיאה בהדפסת מדבקה" });
        }
    }

    [HttpPost("print/batch")]
    public async Task<IActionResult> PrintBatch([FromBody] BatchPrintRequest request)
    {
        try
        {
            var pdfData = await _printService.GenerateBatchLabelsPdfAsync(request.EventItemIds);
            return File(pdfData, "application/pdf", "labels-batch.pdf");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error printing batch labels");
            return StatusCode(500, new { message = "שגיאה בהדפסת מדבקות" });
        }
    }
}
