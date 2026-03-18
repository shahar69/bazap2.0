namespace Bazap.API.Models;

public class ItemSapMapping
{
    public int Id { get; set; }
    public int ItemId { get; set; }
    public Item? Item { get; set; }
    public string LocalMakat { get; set; } = string.Empty;
    public string? SapItemCode { get; set; }
    public string? SapItemName { get; set; }
    public bool IsVerified { get; set; }
    public DateTime? LastSyncAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
