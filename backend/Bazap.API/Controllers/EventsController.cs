using Bazap.API.DTOs;
using Bazap.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Bazap.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class EventsController : ControllerBase
{
    private readonly IEventService _eventService;
    private readonly ILogger<EventsController> _logger;

    public EventsController(IEventService eventService, ILogger<EventsController> logger)
    {
        _eventService = eventService;
        _logger = logger;
    }

    [HttpPost("create")]
    public async Task<ActionResult<EventDto>> CreateEvent([FromBody] CreateEventRequest request)
    {
        try
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var result = await _eventService.CreateEventAsync(request, userId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating event");
            return StatusCode(500, new { message = "שגיאה ביצירת אירוע" });
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<EventDto>> GetEvent(int id)
    {
        try
        {
            var result = await _eventService.GetEventAsync(id);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "אירוע לא נמצא" });
        }
    }

    [HttpPost("{id}/add-item")]
    public async Task<ActionResult<EventDto>> AddItemToEvent(int id, [FromBody] AddItemToEventRequest request)
    {
        try
        {
            var result = await _eventService.AddItemToEventAsync(id, request);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "אירוע לא נמצא" });
        }
    }

    [HttpPost("{id}/remove-item/{itemId}")]
    public async Task<ActionResult> RemoveItemFromEvent(int id, int itemId)
    {
        try
        {
            await _eventService.RemoveItemFromEventAsync(id, itemId);
            return Ok();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpPost("{id}/complete")]
    public async Task<ActionResult> CompleteEvent(int id)
    {
        try
        {
            await _eventService.CompleteEventAsync(id);
            return Ok();
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "אירוע לא נמצא" });
        }
    }

    [HttpGet("list")]
    public async Task<ActionResult<List<EventDto>>> ListEvents([FromQuery] EventStatus? status)
    {
        try
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var result = await _eventService.ListEventsAsync(userId, status);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error listing events");
            return StatusCode(500, new { message = "שגיאה בהחזרת רשימת אירועים" });
        }
    }
}
