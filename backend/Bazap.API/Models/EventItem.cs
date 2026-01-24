namespace Bazap.API.Models;

public class EventItem
{
    public int Id { get; set; }
    public int EventId { get; set; }
    public Event? Event { get; set; }

    public int? ItemId { get; set; }
    public Item? Item { get; set; }

    public string ItemMakat { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public ItemInspectionStatus InspectionStatus { get; set; } = ItemInspectionStatus.Pending;
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;

    public List<InspectionAction> InspectionActions { get; set; } = new();
}
