using Bazap.API.DTOs;
using Bazap.API.Models;
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

    [AllowAnonymous]
    [HttpPost("create")]
    public async Task<ActionResult<EventDto>> CreateEvent([FromBody] CreateEventRequest request)
    {
        try
        {
            var userIdClaim = User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userId = int.TryParse(userIdClaim, out var parsed) ? parsed : 0;

            // Fallback to seeded admin for anonymous/dev flows
            if (userId == 0)
                userId = 1;

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
    [AllowAnonymous]
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

    [HttpPost("{id}/submit-for-inspection")]
    public async Task<ActionResult> SubmitForInspection(int id)
    {
        try
        {
            await _eventService.SubmitEventForInspectionAsync(id);
            return Ok(new { message = "אירוע הוגש לבחינה בהצלחה" });
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "אירוע לא נמצא" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
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
    [AllowAnonymous]
    public async Task<ActionResult<List<EventDto>>> ListEvents([FromQuery] EventStatus? status)
    {
        try
        {
            var userId = int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var parsed) ? parsed : 1;
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
