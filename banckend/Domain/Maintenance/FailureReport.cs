using Domain.Assets;
using Domain.Employees;
using Domain.Instance;
using Domain.Layouts;

namespace Domain.Maintenance;

public enum FailureSeverity
{
    Low = 1,
    Medium = 2,
    High = 3,
    Critical = 4
}

public enum FailureStatus
{
    Open = 1,
    Triaged = 2,
    InProgress = 3,
    Resolved = 4,
    Closed = 5
}

public class FailureReport
{
    public Guid Id { get; set; }

    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public Guid? AssetId { get; set; }
    public Asset? Asset { get; set; }

    public Guid? HallId { get; set; }
    public ProductionHall? Hall { get; set; }

    public Guid? SectionId { get; set; }
    public HallSection? Section { get; set; }

    public Guid? ReportedByEmployeeId { get; set; }
    public EmployeeProfile? ReportedByEmployee { get; set; }

    public Guid? FailureCauseCategoryId { get; set; }
    public FailureCauseCategory? FailureCauseCategory { get; set; }

    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    public FailureSeverity Severity { get; set; } = FailureSeverity.Medium;
    public FailureStatus Status { get; set; } = FailureStatus.Open;

    public bool CausesDowntime { get; set; }
    public DateTime? DowntimeStartedAtUtc { get; set; }
    public DateTime? DowntimeEndedAtUtc { get; set; }
    public int? DowntimeMinutes { get; set; }
    public decimal? ProductionLossUnits { get; set; }

    public DateTime ReportedAtUtc { get; set; }
    public DateTime? TriagedAtUtc { get; set; }
    public DateTime? ResolvedAtUtc { get; set; }
    public DateTime? ClosedAtUtc { get; set; }

    public string? RootCause { get; set; }
    public string? CorrectiveAction { get; set; }
    public string? PreventiveAction { get; set; }
    public string? ResolutionSummary { get; set; }

    public ICollection<WorkOrder> WorkOrders { get; set; } = new List<WorkOrder>();
}
