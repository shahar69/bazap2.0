namespace Bazap.API.DTOs;

public class CreateReceiptRequest
{
    public required string RecipientName { get; set; }
    public required List<ReceiptItemRequest> Items { get; set; }
}

public class ReceiptItemRequest
{
    public int ItemId { get; set; }
    public int Quantity { get; set; }
}

public class CancelReceiptRequest
{
    public required string Reason { get; set; }
}

public class ReceiptDto
{
    public int Id { get; set; }
    public required string RecipientName { get; set; }
    public DateTime ReceiptDate { get; set; }
    public int CreatedByUserId { get; set; }
    public string? CreatedByUsername { get; set; }
    public List<ReceiptItemDto> Items { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public bool IsCancelled { get; set; }
    public string? CancellationReason { get; set; }
    public DateTime? CancelledAt { get; set; }
}

public class ReceiptItemDto
{
    public int Id { get; set; }
    public int ItemId { get; set; }
    public string? ItemName { get; set; }
    public int Quantity { get; set; }
}
