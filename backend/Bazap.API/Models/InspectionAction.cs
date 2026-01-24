using System.Collections.Generic;

namespace Bazap.API.Models;

public class InspectionAction
{
    public int Id { get; set; }
    public int EventItemId { get; set; }
    public EventItem? EventItem { get; set; }

    public InspectionDecision Decision { get; set; }
    public DisableReason? DisableReason { get; set; }
    public string? Notes { get; set; }
    public int InspectedByUserId { get; set; }
    public DateTime InspectedAt { get; set; } = DateTime.UtcNow;

    public List<LabelPrint> LabelPrints { get; set; } = new();
}
