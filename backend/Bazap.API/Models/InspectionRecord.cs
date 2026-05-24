namespace Bazap.API.Models;

public class InspectionRecord
{
    public int Id { get; set; }
    public string? Makat { get; set; }
    public string? ItemName { get; set; }
    public int Quantity { get; set; }
    public string Decision { get; set; } = "Pass";
    public string? DisableReason { get; set; }
    public string? Notes { get; set; }
    public DateTime InspectedAt { get; set; } = DateTime.UtcNow;
    public string InspectedBy { get; set; } = "admin";
    public string? SourceUnit { get; set; }
    public DateTime? SapExportedAt { get; set; }
}
