namespace Bazap.API.DTOs;

public record InspectionRecordRequest(
    string? Makat,
    string? ItemName,
    int Quantity,
    string Decision,
    string? DisableReason,
    string? Notes,
    string InspectedBy,
    string? SourceUnit);

public record InspectionRecordDto(
    int Id,
    string? Makat,
    string? ItemName,
    int Quantity,
    string Decision,
    string? DisableReason,
    string? Notes,
    DateTime InspectedAt,
    string InspectedBy,
    string? SourceUnit);

public record InspectionRecordQuery(DateTime? From, DateTime? To, string? Decision, bool OnlyExceptional = false);

public record DisableLabelRequest(IReadOnlyList<int> RecordIds, string Mode, string? InspectedBy);

public record CommanderReportDto(
    DateTime From,
    DateTime To,
    int TotalQuantity,
    int DisabledQuantity,
    int PassedQuantity,
    int ExceptionalQuantity,
    IReadOnlyList<ReasonSummaryDto> DisableReasons,
    IReadOnlyList<ItemSummaryDto> ExceptionalItems,
    IReadOnlyList<ItemSummaryDto> DisabledItems,
    IReadOnlyList<SourceSummaryDto> RepeatedSources);

public record ReasonSummaryDto(string Reason, string Label, int Quantity, int RecordCount);

public record ItemSummaryDto(string? Makat, string? ItemName, int Quantity, string? Notes, string? SourceUnit, DateTime InspectedAt);

public record SourceSummaryDto(string SourceUnit, int Quantity, int RecordCount);
