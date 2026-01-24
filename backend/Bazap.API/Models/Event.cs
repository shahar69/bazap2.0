using System.Collections.Generic;

namespace Bazap.API.Models;

public class Event
{
    public int Id { get; set; }
    public string Number { get; set; } = string.Empty;
    public EventType Type { get; set; }
    public string SourceUnit { get; set; } = string.Empty;
    public string Receiver { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public int CreatedByUserId { get; set; }
    public EventStatus Status { get; set; } = EventStatus.Draft;

    public List<EventItem> Items { get; set; } = new();
}
