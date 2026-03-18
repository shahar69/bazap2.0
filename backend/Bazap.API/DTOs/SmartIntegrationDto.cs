namespace Bazap.API.DTOs;

public class SmartImportRequest
{
    public string RawText { get; set; } = string.Empty;
    public string? FileName { get; set; }
}

public class SmartImportCommitRequest
{
    public string OrderNumber { get; set; } = string.Empty;
    public string SourceUnit { get; set; } = string.Empty;
    public string Receiver { get; set; } = string.Empty;
    public int EventType { get; set; }
    public List<SmartImportLineDto> Lines { get; set; } = new();
}

public class SmartImportResultDto
{
    public bool UsedAi { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string SourceUnit { get; set; } = string.Empty;
    public string Receiver { get; set; } = string.Empty;
    public List<SmartImportLineDto> Lines { get; set; } = new();
    public List<string> Warnings { get; set; } = new();
}

public class SmartImportLineDto
{
    public string Makat { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public int? ItemId { get; set; }
    public bool MatchedCatalogItem { get; set; }
    public string SuggestedStatus { get; set; } = "ממתין";
    public string? SapItemCode { get; set; }
    public string MatchStatus { get; set; } = "unmatched";
    public decimal Confidence { get; set; }
    public List<string> Warnings { get; set; } = new();
    public bool SapReady => !string.IsNullOrWhiteSpace(SapItemCode);
}

public class SapExportRequest
{
    public List<int> EventIds { get; set; } = new();
}

public class SapExportPreviewDto
{
    public int OrdersCount { get; set; }
    public int RowsCount { get; set; }
    public List<string> Warnings { get; set; } = new();
    public string FileName { get; set; } = string.Empty;
    public string ExportMode { get; set; } = "file_export";
}

public class SapPushRequest
{
    public List<int> EventIds { get; set; } = new();
    public bool ForceFileFallback { get; set; }
}

public class SapPushResultDto
{
    public int EventId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string SapDocumentType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public int? DocEntry { get; set; }
    public int? DocNum { get; set; }
}

public class ItemSapMappingDto
{
    public int ItemId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public string LocalMakat { get; set; } = string.Empty;
    public string? SapItemCode { get; set; }
    public string? SapItemName { get; set; }
    public bool IsVerified { get; set; }
    public DateTime? LastSyncAt { get; set; }
    public string MappingStatus { get; set; } = "unmapped";
}

public class UpdateItemSapMappingRequest
{
    public string? SapItemCode { get; set; }
    public string? SapItemName { get; set; }
    public bool IsVerified { get; set; }
}

public class EventSapStatusDto
{
    public int EventId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public bool SapReady { get; set; }
    public string Status { get; set; } = "not_ready";
    public string Message { get; set; } = string.Empty;
    public string SapDocumentType { get; set; } = string.Empty;
    public int? DocEntry { get; set; }
    public int? DocNum { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
