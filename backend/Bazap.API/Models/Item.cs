namespace Bazap.API.Models;

public class Item
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public string? Code { get; set; }
    public int QuantityInStock { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation property
    public ICollection<ReceiptItem> ReceiptItems { get; set; } = new List<ReceiptItem>();
}
