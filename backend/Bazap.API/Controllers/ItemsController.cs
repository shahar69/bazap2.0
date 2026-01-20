using Bazap.API.DTOs;
using Bazap.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace Bazap.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ItemsController : ControllerBase
{
    private readonly IItemService _itemService;
    private readonly ILogger<ItemsController> _logger;

    public ItemsController(IItemService itemService, ILogger<ItemsController> logger)
    {
        _itemService = itemService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<List<ItemDto>>> GetAll([FromQuery] bool includeInactive = false)
    {
        try
        {
            var items = await _itemService.GetAllItemsAsync(includeInactive);
            return Ok(items);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting items");
            return StatusCode(StatusCodes.Status500InternalServerError, 
                new { message = "שגיאה בטעינת פריטים" });
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ItemDto>> GetById(int id)
    {
        try
        {
            var item = await _itemService.GetItemByIdAsync(id);
            if (item == null)
                return NotFound();

            return Ok(item);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting item {ItemId}", id);
            return StatusCode(StatusCodes.Status500InternalServerError);
        }
    }

    [HttpPost]
    public async Task<ActionResult<ItemDto>> Create([FromBody] CreateItemRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "יש להזין שם פריט" });

        try
        {
            _logger.LogInformation("Creating new item: {ItemName}", request.Name);
            var item = await _itemService.CreateItemAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = item.Id }, item);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("Validation error creating item: {Message}", ex.Message);
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating item");
            return StatusCode(StatusCodes.Status500InternalServerError);
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ItemDto>> Update(int id, [FromBody] UpdateItemRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "יש להזין שם פריט" });

        try
        {
            _logger.LogInformation("Updating item {ItemId}", id);
            var item = await _itemService.UpdateItemAsync(id, request);
            return Ok(item);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("Validation error updating item: {Message}", ex.Message);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating item {ItemId}", id);
            return StatusCode(StatusCodes.Status500InternalServerError);
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            _logger.LogInformation("Deleting item {ItemId}", id);
            var success = await _itemService.DeleteItemAsync(id);
            if (!success)
                return NotFound();

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("Validation error deleting item: {Message}", ex.Message);
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting item {ItemId}", id);
            return StatusCode(StatusCodes.Status500InternalServerError);
        }
    }
}
