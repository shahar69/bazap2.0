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
        if (string.IsNullOrWhiteSpace(request.SourceUnit))
            throw new InvalidOperationException("יש להזין יחידת מקור");

        if (string.IsNullOrWhiteSpace(request.Receiver))
            throw new InvalidOperationException("יש להזין שם מקבל");

        var eventNumber = string.IsNullOrWhiteSpace(request.OrderNumber)
            ? $"ORD-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..6].ToUpper()}"
            : request.OrderNumber.Trim();
        
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

        _logger.LogInformation("Order created: {OrderNumber}", eventNumber);
        return await GetEventAsync(evt.Id);
    }

    public async Task<EventDto> GetEventAsync(int id)
    {
        var evt = await _context.Events
            .Include(e => e.Items)
            .ThenInclude(i => i.InspectionActions)
            .FirstOrDefaultAsync(e => e.Id == id)
            ?? throw new KeyNotFoundException($"Event {id} not found");

        var user = await _context.Users.FindAsync(evt.CreatedByUserId);

        var pendingItems = evt.Items.Count(i => i.InspectionStatus == ItemInspectionStatus.Pending);
        var passedItems = evt.Items.Count(i => i.InspectionStatus == ItemInspectionStatus.Pass);
        var failedItems = evt.Items.Count(i => i.InspectionStatus == ItemInspectionStatus.Fail);
        var readyItemIds = evt.Items.Where(i => i.ItemId.HasValue).Select(i => i.ItemId!.Value).Distinct().ToList();
        var mappings = await _context.ItemSapMappings
            .Where(m => readyItemIds.Contains(m.ItemId))
            .ToDictionaryAsync(m => m.ItemId);
        var latestSync = await _context.SapSyncLogs.Where(l => l.EventId == evt.Id).OrderByDescending(l => l.UpdatedAt).FirstOrDefaultAsync();
        var sapReady = IsSapReady(evt.Items, mappings);

        return new EventDto
        {
            Id = evt.Id,
            Number = evt.Number,
            OrderNumber = evt.Number,
            Type = evt.Type,
            SourceUnit = evt.SourceUnit,
            Receiver = evt.Receiver,
            CreatedAt = evt.CreatedAt,
            CreatedByUser = user?.Username ?? "Unknown",
            Status = evt.Status,
            StatusLabel = GetEventStatusLabel(evt.Status),
            SapReady = sapReady,
            SapSyncStatus = ResolveSapSyncStatus(sapReady, latestSync?.Status),
            SapSyncMessage = ResolveSapSyncMessage(sapReady, latestSync),
            SapDocumentType = latestSync?.SapDocumentType ?? GetSapDocumentType(evt.Type),
            SapDocEntry = latestSync?.SapDocEntry,
            SapDocNum = latestSync?.SapDocNum,
            Items = evt.Items.Select(i => new EventItemDto
            {
                Id = i.Id,
                ItemId = i.ItemId,
                ItemMakat = i.ItemMakat,
                ItemName = i.ItemName,
                Quantity = i.Quantity,
                InspectionStatus = i.InspectionStatus,
                InspectionStatusLabel = GetInspectionStatusLabel(i.InspectionStatus),
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

        if (request.Quantity <= 0)
            throw new InvalidOperationException("כמות חייבת להיות גדולה מ-0");

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

        if (string.IsNullOrWhiteSpace(itemMakat) && string.IsNullOrWhiteSpace(itemName) && !request.ItemId.HasValue)
            throw new InvalidOperationException("יש לספק פריט תקין להוספה להזמנה");

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

    public async Task<EventDto> RemoveItemFromEventAsync(int id, int eventItemId)
    {
        var evt = await _context.Events.FindAsync(id) ?? throw new KeyNotFoundException($"Event {id} not found");
        var eventItem = await _context.EventItems.FindAsync(eventItemId) ?? throw new KeyNotFoundException($"EventItem {eventItemId} not found");

        if (eventItem.EventId != id)
            throw new InvalidOperationException("EventItem does not belong to this Event");

        _context.EventItems.Remove(eventItem);
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Removed EventItem {EventItemId} from Order {OrderId}", eventItemId, id);
        return await GetEventAsync(id);
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

        _logger.LogInformation("Order submitted for inspection: {OrderNumber}", evt.Number);
    }

    public async Task<List<EventDto>> ListEventsAsync(int userId, EventStatus? status)
    {
        var query = _context.Events.AsQueryable();
        
        if (status.HasValue)
            query = query.Where(e => e.Status == status.Value);

        var events = await query.Include(e => e.Items).ToListAsync();
        var eventIds = events.Select(e => e.Id).ToList();
        var itemIds = events.SelectMany(e => e.Items).Where(i => i.ItemId.HasValue).Select(i => i.ItemId!.Value).Distinct().ToList();
        var mappings = await _context.ItemSapMappings
            .Where(m => itemIds.Contains(m.ItemId))
            .ToDictionaryAsync(m => m.ItemId);
        var latestLogs = await _context.SapSyncLogs
            .Where(l => eventIds.Contains(l.EventId))
            .GroupBy(l => l.EventId)
            .Select(g => g.OrderByDescending(x => x.UpdatedAt).First())
            .ToDictionaryAsync(l => l.EventId);

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
            var sapReady = IsSapReady(items, mappings);
            latestLogs.TryGetValue(evt.Id, out var latestLog);

            eventDtos.Add(new EventDto
            {
                Id = evt.Id,
                Number = evt.Number ?? string.Empty,
                OrderNumber = evt.Number ?? string.Empty,
                Type = evt.Type,
                SourceUnit = evt.SourceUnit ?? string.Empty,
                Receiver = evt.Receiver ?? string.Empty,
                CreatedAt = evt.CreatedAt,
                CreatedByUser = users.TryGetValue(evt.CreatedByUserId, out var username) ? username : "Unknown",
                Status = evt.Status,
                StatusLabel = GetEventStatusLabel(evt.Status),
                SapReady = sapReady,
                SapSyncStatus = ResolveSapSyncStatus(sapReady, latestLog?.Status),
                SapSyncMessage = ResolveSapSyncMessage(sapReady, latestLog),
                SapDocumentType = latestLog?.SapDocumentType ?? GetSapDocumentType(evt.Type),
                SapDocEntry = latestLog?.SapDocEntry,
                SapDocNum = latestLog?.SapDocNum,
                Items = items.Select(i => new EventItemDto
                {
                    Id = i.Id,
                    ItemId = i.ItemId,
                    ItemMakat = i.ItemMakat ?? string.Empty,
                    ItemName = i.ItemName ?? string.Empty,
                    Quantity = i.Quantity,
                    InspectionStatus = i.InspectionStatus,
                    InspectionStatusLabel = GetInspectionStatusLabel(i.InspectionStatus),
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

    private static string GetInspectionStatusLabel(ItemInspectionStatus status) => status switch
    {
        ItemInspectionStatus.Pass => "תקין",
        ItemInspectionStatus.Fail => "מושבת",
        _ => "ממתין"
    };

    private static string GetEventStatusLabel(EventStatus status) => status switch
    {
        EventStatus.Draft => "טיוטה",
        EventStatus.Pending => "ממתין לבחינה",
        EventStatus.InProgress => "בבחינה",
        EventStatus.Completed => "הושלם",
        EventStatus.Archived => "ארכיון",
        _ => "לא ידוע"
    };

    private static string GetSapDocumentType(EventType type) => type switch
    {
        EventType.Receiving => "GoodsReceipt",
        EventType.Outgoing => "GoodsIssue",
        _ => "Inspection"
    };

    private static bool IsSapReady(IEnumerable<EventItem> items, IReadOnlyDictionary<int, ItemSapMapping> mappings)
    {
        var materializedItems = items.ToList();
        if (materializedItems.Count == 0)
        {
            return false;
        }

        return materializedItems.All(item =>
            item.ItemId.HasValue &&
            mappings.TryGetValue(item.ItemId.Value, out var mapping) &&
            !string.IsNullOrWhiteSpace(mapping.SapItemCode));
    }

    private static string ResolveSapSyncStatus(bool sapReady, string? latestStatus)
    {
        if (latestStatus == "synced")
        {
            return "exported";
        }

        if (sapReady && (string.IsNullOrWhiteSpace(latestStatus) || latestStatus == "not_ready"))
        {
            return "ready";
        }

        return latestStatus ?? (sapReady ? "ready" : "not_ready");
    }

    private static string ResolveSapSyncMessage(bool sapReady, SapSyncLog? latestLog)
    {
        if (latestLog?.Status == "synced")
        {
            return "חבילת ייצוא ל-SAP הוכנה וממתינה להעברה";
        }

        if (sapReady && (latestLog == null || latestLog.Status == "not_ready"))
        {
            return "ההזמנה מוכנה להכנת חבילת ייצוא ל-SAP.";
        }

        return latestLog?.ErrorMessage ?? latestLog?.ResponsePayload ?? string.Empty;
    }
}
