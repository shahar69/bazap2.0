using Bazap.API.DTOs;
using Bazap.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Bazap.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ItemsSearchController : ControllerBase
{
    private readonly IItemSearchService _itemService;
    private readonly ILogger<ItemsSearchController> _logger;

    public ItemsSearchController(IItemSearchService itemService, ILogger<ItemsSearchController> logger)
    {
        _itemService = itemService;
        _logger = logger;
    }

    [HttpPost("search")]
    public async Task<ActionResult<List<ItemSearchResponse>>> Search([FromBody] ItemSearchRequest request)
    {
        try
        {
            var results = await _itemService.SearchItemsAsync(request);
            return Ok(results);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching items");
            return StatusCode(500, new { message = "שגיאה בחיפוש פריטים" });
        }
    }

    [HttpGet("groups")]
    public async Task<ActionResult<List<ItemGroupDto>>> GetGroups()
    {
        try
        {
            var groups = await _itemService.GetItemGroupsAsync();
            return Ok(groups);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting groups");
            return StatusCode(500, new { message = "שגיאה בהחזרת קבוצות" });
        }
    }

    [HttpGet("recent")]
    public async Task<ActionResult<List<ItemSearchResponse>>> GetRecentItems([FromQuery] int limit = 5)
    {
        try
        {
            var items = await _itemService.GetRecentItemsAsync(limit);
            return Ok(items);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting recent items");
            return StatusCode(500, new { message = "שגיאה בהחזרת פריטים אחרונים" });
        }
    }

    [HttpGet("frequent")]
    public async Task<ActionResult<List<ItemSearchResponse>>> GetFrequentItems([FromQuery] int limit = 10)
    {
        try
        {
            var items = await _itemService.GetFrequentItemsAsync(limit);
            return Ok(items);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting frequent items");
            return StatusCode(500, new { message = "שגיאה בהחזרת פריטים תכופים" });
        }
    }
}
