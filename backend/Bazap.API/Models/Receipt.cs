namespace Bazap.API.Models;

public class Receipt
{
    public int Id { get; set; }
    public required string RecipientName { get; set; }
    public DateTime ReceiptDate { get; set; } = DateTime.UtcNow;
    public int CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsCancelled { get; set; } = false;
    public string? CancellationReason { get; set; }
    public DateTime? CancelledAt { get; set; }

    // Navigation properties
    public User? CreatedByUser { get; set; }
    public ICollection<ReceiptItem> Items { get; set; } = new List<ReceiptItem>();
}
