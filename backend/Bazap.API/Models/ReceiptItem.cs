namespace Bazap.API.Models;

public class ReceiptItem
{
    public int Id { get; set; }
    public int ReceiptId { get; set; }
    public int ItemId { get; set; }
    public int Quantity { get; set; }

    // Navigation properties
    public Receipt? Receipt { get; set; }
    public Item? Item { get; set; }
}
