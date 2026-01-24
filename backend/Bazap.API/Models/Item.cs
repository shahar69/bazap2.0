namespace Bazap.API.Models;

public class Item
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public string? Code { get; set; }
    public string? Description { get; set; }
    public int QuantityInStock { get; set; }
    public bool IsActive { get; set; } = true;
    public int? ItemGroupId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<ReceiptItem> ReceiptItems { get; set; } = new List<ReceiptItem>();
    public ICollection<EventItem> EventItems { get; set; } = new List<EventItem>();
}
