using Bazap.API.DTOs;
using Bazap.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace Bazap.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReceiptsController : ControllerBase
{
    private readonly IReceiptService _receiptService;
    private readonly ILogger<ReceiptsController> _logger;

    public ReceiptsController(IReceiptService receiptService, ILogger<ReceiptsController> logger)
    {
        _receiptService = receiptService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<List<ReceiptDto>>> GetAll(
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] string? search = null,
        [FromQuery] int? itemId = null)
    {
        try
        {
            var receipts = await _receiptService.GetAllReceiptsAsync(fromDate, toDate, search, itemId);
            return Ok(receipts);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting receipts");
            return StatusCode(StatusCodes.Status500InternalServerError, 
                new { message = "שגיאה בטעינת קבלות" });
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ReceiptDto>> GetById(int id)
    {
        try
        {
            var receipt = await _receiptService.GetReceiptByIdAsync(id);
            if (receipt == null)
                return NotFound();

            return Ok(receipt);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting receipt {ReceiptId}", id);
            return StatusCode(StatusCodes.Status500InternalServerError);
        }
    }

    [HttpPost]
    public async Task<ActionResult<ReceiptDto>> Create([FromBody] CreateReceiptRequest request, [FromQuery] int userId = 1)
    {
        try
        {
            _logger.LogInformation("Creating new receipt for recipient: {RecipientName}", request.RecipientName);
            var receipt = await _receiptService.CreateReceiptAsync(request, userId);
            return CreatedAtAction(nameof(GetById), new { id = receipt.Id }, receipt);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("Validation error creating receipt: {Message}", ex.Message);
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating receipt");
            return StatusCode(StatusCodes.Status500InternalServerError, 
                new { message = "שגיאה בשמירת הקבלה" });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            _logger.LogInformation("Deleting receipt {ReceiptId}", id);
            var success = await _receiptService.DeleteReceiptAsync(id);
            if (!success)
                return NotFound();

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting receipt {ReceiptId}", id);
            return StatusCode(StatusCodes.Status500InternalServerError);
        }
    }

    [HttpPost("{id}/cancel")]
    public async Task<IActionResult> CancelReceipt(int id, [FromBody] CancelReceiptRequest request)
    {
        try
        {
            _logger.LogInformation("Cancelling receipt {ReceiptId} with reason: {Reason}", id, request.Reason);
            var success = await _receiptService.CancelReceiptAsync(id, request.Reason);
            if (!success)
                return NotFound();

            return Ok(new { message = "הקבלה בוטלה בהצלחה והמלאי הוחזר" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cancelling receipt {ReceiptId}", id);
            return StatusCode(StatusCodes.Status500InternalServerError, 
                new { message = "שגיאה בביטול הקבלה" });
        }
    }
}
