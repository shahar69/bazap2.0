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

        var pendingItems = evt.Items.Count(i => i.InspectionStatus == ItemInspectionStatus.Pending);
        var passedItems = evt.Items.Count(i => i.InspectionStatus == ItemInspectionStatus.Pass);
        var failedItems = evt.Items.Count(i => i.InspectionStatus == ItemInspectionStatus.Fail);

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
            }).ToList(),
            PendingItems = pendingItems,
            CompletedItems = evt.Items.Count - pendingItems,
            PassedItems = passedItems,
            FailedItems = failedItems
        };
    }

    public async Task<EventDto> AddItemToEventAsync(int id, AddItemToEventRequest request)
    {
        var evt = await _context.Events
            .Include(e => e.Items)
            .FirstOrDefaultAsync(e => e.Id == id)
            ?? throw new KeyNotFoundException($"Event {id} not found");

        var itemMakat = request.ItemMakat?.Trim() ?? string.Empty;
        var itemName = request.ItemName?.Trim() ?? string.Empty;

        // Prefer canonical data from Items table when possible
        if (!string.IsNullOrEmpty(request.ItemMakat))
        {
            var item = await _context.Items.FirstOrDefaultAsync(i => i.Code == request.ItemMakat);
            if (item != null)
            {
                itemMakat = item.Code ?? itemMakat;
                itemName = string.IsNullOrWhiteSpace(item.Name) ? itemMakat : item.Name;
            }
        }

        // If no name was provided, fall back to makat so UI still shows something
        if (string.IsNullOrWhiteSpace(itemName))
            itemName = itemMakat;

        var targetQty = Math.Max(0, request.Quantity);

        // Merge with existing row (keyed by makat or ItemId) instead of duplicating rows
        var existing = evt.Items.FirstOrDefault(i =>
            (!string.IsNullOrEmpty(itemMakat) && i.ItemMakat == itemMakat) ||
            (request.ItemId.HasValue && i.ItemId == request.ItemId));

        if (existing != null)
        {
            existing.Quantity = targetQty;
            existing.ItemName = itemName;
            existing.ItemMakat = itemMakat;
            _context.EventItems.Update(existing);
        }
        else
        {
            var eventItem = new EventItem
            {
                EventId = id,
                ItemId = request.ItemId,
                ItemMakat = itemMakat,
                ItemName = itemName,
                Quantity = targetQty,
                InspectionStatus = ItemInspectionStatus.Pending,
                AddedAt = DateTime.UtcNow
            };
            _context.EventItems.Add(eventItem);
        }

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

    public async Task SubmitEventForInspectionAsync(int id)
    {
        var evt = await _context.Events
            .Include(e => e.Items)
            .FirstOrDefaultAsync(e => e.Id == id) 
            ?? throw new KeyNotFoundException($"Event {id} not found");

        if (evt.Items == null || evt.Items.Count == 0)
            throw new InvalidOperationException("לא ניתן להגיש אירוע ללא פריטים");

        if (evt.Status != EventStatus.Draft)
            throw new InvalidOperationException("ניתן להגיש רק אירועים בסטטוס טיוטה");

        evt.Status = EventStatus.Pending;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Event submitted for inspection: {EventNumber}", evt.Number);
    }

    public async Task<List<EventDto>> ListEventsAsync(int userId, EventStatus? status)
    {
        var query = _context.Events.AsQueryable();
        
        if (status.HasValue)
            query = query.Where(e => e.Status == status.Value);

        var events = await query.Include(e => e.Items).ToListAsync();

        var userIds = events.Select(e => e.CreatedByUserId).Distinct().ToList();
        var users = await _context.Users
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.Username);

        var eventDtos = new List<EventDto>(events.Count);

        foreach (var evt in events)
        {
            var items = evt.Items ?? new List<EventItem>();
            var pendingItems = items.Count(i => i.InspectionStatus == ItemInspectionStatus.Pending);
            var passedItems = items.Count(i => i.InspectionStatus == ItemInspectionStatus.Pass);
            var failedItems = items.Count(i => i.InspectionStatus == ItemInspectionStatus.Fail);

            eventDtos.Add(new EventDto
            {
                Id = evt.Id,
                Number = evt.Number ?? string.Empty,
                Type = evt.Type,
                SourceUnit = evt.SourceUnit ?? string.Empty,
                Receiver = evt.Receiver ?? string.Empty,
                CreatedAt = evt.CreatedAt,
                CreatedByUser = users.TryGetValue(evt.CreatedByUserId, out var username) ? username : "Unknown",
                Status = evt.Status,
                Items = items.Select(i => new EventItemDto
                {
                    Id = i.Id,
                    ItemId = i.ItemId,
                    ItemMakat = i.ItemMakat ?? string.Empty,
                    ItemName = i.ItemName ?? string.Empty,
                    Quantity = i.Quantity,
                    InspectionStatus = i.InspectionStatus,
                    AddedAt = i.AddedAt
                }).ToList(),
                PendingItems = pendingItems,
                CompletedItems = items.Count - pendingItems,
                PassedItems = passedItems,
                FailedItems = failedItems
            });
        }

        return eventDtos;
    }
}
