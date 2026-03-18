namespace Bazap.API.Models;

public class SapSyncLog
{
    public int Id { get; set; }
    public int EventId { get; set; }
    public Event? Event { get; set; }
    public string Direction { get; set; } = "export";
    public string SapDocumentType { get; set; } = string.Empty;
    public string Status { get; set; } = "not_ready";
    public int? SapDocEntry { get; set; }
    public int? SapDocNum { get; set; }
    public string? RequestPayload { get; set; }
    public string? ResponsePayload { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
