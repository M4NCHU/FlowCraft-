using Domain.Maintenance;

namespace Application.DTOs.Maintenance;

public sealed class FailureCauseCategoryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; }
    public int IncidentsCount { get; set; }
    public int TotalDowntimeMinutes { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}

public sealed class FailureParetoItemDto
{
    public Guid? FailureCauseCategoryId { get; set; }
    public string CauseName { get; set; } = string.Empty;
    public int IncidentsCount { get; set; }
    public int TotalDowntimeMinutes { get; set; }
    public decimal Share { get; set; }
    public decimal CumulativeShare { get; set; }
}

public sealed class FailureAnalyticsDto
{
    public int OpenIncidentsCount { get; set; }
    public int TotalIncidentsCount { get; set; }
    public int DowntimeIncidentsCount { get; set; }
    public int TotalDowntimeMinutes { get; set; }
    public decimal? MttrHours { get; set; }
    public decimal? MtbfHours { get; set; }
    public IReadOnlyList<FailureParetoItemDto> Pareto { get; set; } = Array.Empty<FailureParetoItemDto>();
}

public sealed class FailureReportDto
{
    public Guid Id { get; set; }
    public Guid? AssetId { get; set; }
    public Guid? HallId { get; set; }
    public Guid? SectionId { get; set; }
    public Guid? ReportedByEmployeeId { get; set; }
    public Guid? FailureCauseCategoryId { get; set; }
    public string? FailureCauseCategoryName { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public FailureSeverity Severity { get; set; }
    public FailureStatus Status { get; set; }
    public bool CausesDowntime { get; set; }
    public DateTime ReportedAtUtc { get; set; }
    public DateTime? DowntimeStartedAtUtc { get; set; }
    public DateTime? DowntimeEndedAtUtc { get; set; }
    public int? DowntimeMinutes { get; set; }
    public decimal? ProductionLossUnits { get; set; }
    public DateTime? TriagedAtUtc { get; set; }
    public DateTime? ResolvedAtUtc { get; set; }
    public DateTime? ClosedAtUtc { get; set; }
    public string? RootCause { get; set; }
    public string? CorrectiveAction { get; set; }
    public string? PreventiveAction { get; set; }
    public string? ResolutionSummary { get; set; }
    public IReadOnlyList<Guid> WorkOrderIds { get; set; } = Array.Empty<Guid>();
}

public sealed class CreateFailureReportRequest
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public FailureSeverity Severity { get; set; } = FailureSeverity.Medium;
    public bool CausesDowntime { get; set; }
    public Guid? AssetId { get; set; }
    public Guid? HallId { get; set; }
    public Guid? SectionId { get; set; }
    public Guid? ReportedByEmployeeId { get; set; }
    public Guid? FailureCauseCategoryId { get; set; }
    public DateTime? DowntimeStartedAtUtc { get; set; }
    public DateTime? DowntimeEndedAtUtc { get; set; }
    public decimal? ProductionLossUnits { get; set; }
    public string? RootCause { get; set; }
    public string? CorrectiveAction { get; set; }
    public string? PreventiveAction { get; set; }
}

public sealed class UpdateFailureReportRequest
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public FailureSeverity Severity { get; set; } = FailureSeverity.Medium;
    public bool CausesDowntime { get; set; }
    public Guid? FailureCauseCategoryId { get; set; }
    public DateTime? DowntimeStartedAtUtc { get; set; }
    public DateTime? DowntimeEndedAtUtc { get; set; }
    public decimal? ProductionLossUnits { get; set; }
    public string? RootCause { get; set; }
    public string? CorrectiveAction { get; set; }
    public string? PreventiveAction { get; set; }
    public string? ResolutionSummary { get; set; }
}

public sealed class SetFailureReportStatusRequest
{
    public FailureStatus Status { get; set; }
    public string? ResolutionSummary { get; set; }
    public string? RootCause { get; set; }
    public string? CorrectiveAction { get; set; }
    public string? PreventiveAction { get; set; }
    public Guid? FailureCauseCategoryId { get; set; }
    public DateTime? DowntimeEndedAtUtc { get; set; }
    public decimal? ProductionLossUnits { get; set; }
}

public sealed class CreateFailureCauseCategoryRequest
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public sealed class UpdateFailureCauseCategoryRequest
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
}
