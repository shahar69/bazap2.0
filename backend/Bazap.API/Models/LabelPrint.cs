namespace Bazap.API.Models;

public class LabelPrint
{
    public int Id { get; set; }
    public int InspectionActionId { get; set; }
    public InspectionAction? InspectionAction { get; set; }
    public int Quantity { get; set; } = 1;
    public DateTime PrintedAt { get; set; } = DateTime.UtcNow;
    public string? PrinterName { get; set; }
}
