using Bazap.API.Data;
using Bazap.API.DTOs;
using Bazap.API.Models;
using Microsoft.EntityFrameworkCore;

namespace Bazap.API.Services;

public class EventService : IEventService
{
    private readonly BazapContext _context;
    private readonly ILogger<EventService> _logger;

    public EventService(BazapContext context, ILogger<EventService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<EventDto> CreateEventAsync(CreateEventRequest request, int userId)
    {
        var eventNumber = $"EVT-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..8].ToUpper()}";
        
        var evt = new Event
        {
            Number = eventNumber,
            Type = request.Type,
            SourceUnit = request.SourceUnit,
            Receiver = request.Receiver,
            CreatedByUserId = userId,
            CreatedAt = DateTime.UtcNow,
            Status = EventStatus.Draft
        };

        _context.Events.Add(evt);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Event created: {EventNumber}", eventNumber);
        return await GetEventAsync(evt.Id);
    }

    public async Task<EventDto> GetEventAsync(int id)
    {
        var evt = await _context.Events
            .Include(e => e.Items)
            .FirstOrDefaultAsync(e => e.Id == id)
            ?? throw new KeyNotFoundException($"Event {id} not found");

        var user = await _context.Users.FindAsync(evt.CreatedByUserId);

        return new EventDto
        {
            Id = evt.Id,
            Number = evt.Number,
            Type = evt.Type,
            SourceUnit = evt.SourceUnit,
            Receiver = evt.Receiver,
            CreatedAt = evt.CreatedAt,
            CreatedByUser = user?.Username ?? "Unknown",
            Status = evt.Status,
            Items = evt.Items.Select(i => new EventItemDto
            {
                Id = i.Id,
                ItemId = i.ItemId,
                ItemMakat = i.ItemMakat,
                ItemName = i.ItemName,
                Quantity = i.Quantity,
                InspectionStatus = i.InspectionStatus,
                AddedAt = i.AddedAt
            }).ToList()
        };
    }

    public async Task<EventDto> AddItemToEventAsync(int id, AddItemToEventRequest request)
    {
        var evt = await _context.Events.FindAsync(id) ?? throw new KeyNotFoundException($"Event {id} not found");

        var itemMakat = request.ItemMakat ?? string.Empty;
        var itemName = request.ItemName ?? string.Empty;

        if (!string.IsNullOrEmpty(request.ItemMakat))
        {
            var item = await _context.Items.FirstOrDefaultAsync(i => i.Code == request.ItemMakat);
            if (item != null)
            {
                itemMakat = item.Code;
                itemName = item.Name;
            }
        }

        var eventItem = new EventItem
        {
            EventId = id,
            ItemId = request.ItemId,
            ItemMakat = itemMakat,
            ItemName = itemName,
            Quantity = request.Quantity,
            InspectionStatus = ItemInspectionStatus.Pending,
            AddedAt = DateTime.UtcNow
        };

        _context.EventItems.Add(eventItem);
        await _context.SaveChangesAsync();

        return await GetEventAsync(id);
    }

    public async Task RemoveItemFromEventAsync(int id, int eventItemId)
    {
        var evt = await _context.Events.FindAsync(id) ?? throw new KeyNotFoundException($"Event {id} not found");
        var eventItem = await _context.EventItems.FindAsync(eventItemId) ?? throw new KeyNotFoundException($"EventItem {eventItemId} not found");

        if (eventItem.EventId != id)
            throw new InvalidOperationException("EventItem does not belong to this Event");

        _context.EventItems.Remove(eventItem);
        await _context.SaveChangesAsync();
    }

    public async Task CompleteEventAsync(int id)
    {
        var evt = await _context.Events.FindAsync(id) ?? throw new KeyNotFoundException($"Event {id} not found");
        evt.Status = EventStatus.Completed;
        await _context.SaveChangesAsync();
    }

    public async Task<List<EventDto>> ListEventsAsync(int userId, EventStatus? status)
    {
        var query = _context.Events.AsQueryable();
        
        if (status.HasValue)
            query = query.Where(e => e.Status == status.Value);

        var events = await query.Include(e => e.Items).ToListAsync();
        
        return await Task.WhenAll(events.Select(e => GetEventAsync(e.Id)));
    }
}
