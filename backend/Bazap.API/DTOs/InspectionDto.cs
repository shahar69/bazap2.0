using Bazap.API.Models;

namespace Bazap.API.DTOs;

public class InspectionDecisionRequest
{
    public int EventItemId { get; set; }
    public InspectionDecision Decision { get; set; }
    public DisableReason? DisableReason { get; set; }
    public string? Notes { get; set; }
}

public class InspectionActionDto
{
    public int Id { get; set; }
    public int EventItemId { get; set; }
    public InspectionDecision Decision { get; set; }
    public DisableReason? DisableReason { get; set; }
    public string? Notes { get; set; }
    public string InspectedByUser { get; set; } = string.Empty;
    public DateTime InspectedAt { get; set; }
}

public class LabelDataDto
{
    public int EventItemId { get; set; }
    public string Makat { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public DisableReason DisableReason { get; set; }
    public DateTime ActionDate { get; set; }
    public string InspectorName { get; set; } = string.Empty;
    public string EventNumber { get; set; } = string.Empty;
}

public class PrintLabelRequest
{
    public int EventItemId { get; set; }
    public int Copies { get; set; } = 1;
}

public class BatchPrintRequest
{
    public List<int> EventItemIds { get; set; } = new();
}
