using Bazap.API.DTOs;
using Bazap.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Bazap.API.Controllers;

[ApiController]
[Route("api/[controller]")]
// Explicitly allow anonymous because inspection is used in kiosk/dev flows
// and the controller handles its own user fallback.
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

    [AllowAnonymous]
    [HttpPost("decide")]
    public async Task<ActionResult<InspectionActionDto>> MakeDecision([FromBody] InspectionDecisionRequest request)
    {
        try
        {
            var userId = int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var parsed) ? parsed : 1;

            if (request.Decision == Models.InspectionDecision.Disabled && request.DisableReason == null)
            {
                return BadRequest(new { message = "יש לבחור סיבת השבתה" });
            }

            var result = await _inspectionService.RecordDecisionAsync(request, userId);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "פריט לא נמצא" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error recording decision");
            return StatusCode(500, new { message = "שגיאה בהקלטת החלטה" });
        }
    }

    [AllowAnonymous]
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

    [AllowAnonymous]
    [HttpPost("print-label")]
    public async Task<IActionResult> PrintLabel([FromBody] PrintLabelRequest request)
    {
        try
        {
            var htmlData = await _printService.GenerateLabelPdfAsync(request.EventItemId, request.Copies);
            return File(htmlData, "text/html; charset=utf-8", $"label-{request.EventItemId}.html");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error printing label");
            return StatusCode(500, new { message = "שגיאה בהדפסת מדבקה" });
        }
    }

    [AllowAnonymous]
    [HttpPost("print/batch")]
    public async Task<IActionResult> PrintBatch([FromBody] BatchPrintRequest request)
    {
        try
        {
            var htmlData = await _printService.GenerateBatchLabelsPdfAsync(request.EventItemIds);
            return File(htmlData, "text/html; charset=utf-8", "labels-batch.html");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error printing batch labels");
            return StatusCode(500, new { message = "שגיאה בהדפסת מדבקות" });
        }
    }
    [AllowAnonymous]
    [HttpGet("suggestions/{itemMakat}")]
    public async Task<ActionResult<List<string>>> GetReasonSuggestions(string itemMakat)
    {
        try
        {
            var userId = int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var parsed) ? parsed : 1;
            var suggestions = await _inspectionService.GetReasonSuggestionsAsync(itemMakat, userId);
            return Ok(suggestions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting suggestions");
            return StatusCode(500, new { message = "שגיאה בטעינת הצעות" });
        }
    }}
