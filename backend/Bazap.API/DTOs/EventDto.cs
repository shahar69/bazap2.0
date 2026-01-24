using Bazap.API.Models;

namespace Bazap.API.DTOs;

public class CreateEventRequest
{
    public required string SourceUnit { get; set; }
    public required string Receiver { get; set; }
    public EventType Type { get; set; } = EventType.Receiving;
}

public class AddItemToEventRequest
{
    public int? ItemId { get; set; }
    public string? ItemMakat { get; set; }
    public string? ItemName { get; set; }
    public int Quantity { get; set; }
}

public class RemoveItemFromEventRequest
{
    public int EventItemId { get; set; }
}

public class EventItemDto
{
    public int Id { get; set; }
    public int? ItemId { get; set; }
    public string ItemMakat { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public ItemInspectionStatus InspectionStatus { get; set; }
    public DateTime AddedAt { get; set; }
}

public class EventDto
{
    public int Id { get; set; }
    public string Number { get; set; } = string.Empty;
    public EventType Type { get; set; }
    public string SourceUnit { get; set; } = string.Empty;
    public string Receiver { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string CreatedByUser { get; set; } = string.Empty;
    public EventStatus Status { get; set; }
    public List<EventItemDto> Items { get; set; } = new();

    // Derived inspection progress helpers
    public int PendingItems { get; set; }
    public int CompletedItems { get; set; }
    public int PassedItems { get; set; }
    public int FailedItems { get; set; }
}
