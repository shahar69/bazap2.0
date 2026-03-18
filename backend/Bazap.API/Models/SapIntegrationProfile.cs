namespace Bazap.API.Models;

public class SapIntegrationProfile
{
    public int Id { get; set; }
    public string Mode { get; set; } = "file_export";
    public string? BaseUrl { get; set; }
    public string? CompanyDb { get; set; }
    public string AuthMode { get; set; } = "basic";
    public string ItemKeyMode { get; set; } = "local_makat_mapping";
    public string? Username { get; set; }
    public string? Password { get; set; }
    public string? DefaultWarehouse { get; set; }
    public string? GoodsIssueSeries { get; set; }
    public string? GoodsReceiptSeries { get; set; }
    public string EnabledDocumentTypes { get; set; } = "GoodsIssue,GoodsReceipt";
    public bool UseDirectServiceLayer { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
