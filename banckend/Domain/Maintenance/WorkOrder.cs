using Domain.Assets;
using Domain.Employees;
using Domain.Instance;
using Domain.Layouts;

namespace Domain.Maintenance;

public enum WorkOrderType
{
    CorrectiveMaintenance = 1,
    PreventiveMaintenance = 2,
    Inspection = 3,
    Installation = 4,
    Relocation = 5,
    Other = 99
}

public enum WorkOrderPriority
{
    Low = 1,
    Medium = 2,
    High = 3,
    Critical = 4
}

public enum WorkOrderStatus
{
    New = 1,
    Assigned = 2,
    InProgress = 3,
    WaitingForParts = 4,
    Done = 5,
    Cancelled = 6
}

public enum WorkOrderSource
{
    Manual = 1,
    FailureReport = 2,
    PreventiveMaintenance = 3
}

public class WorkOrder
{
    public Guid Id { get; set; }

    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public Guid? FailureReportId { get; set; }
    public FailureReport? FailureReport { get; set; }

    public Guid? AssetId { get; set; }
    public Asset? Asset { get; set; }

    public Guid? HallId { get; set; }
    public ProductionHall? Hall { get; set; }

    public Guid? SectionId { get; set; }
    public HallSection? Section { get; set; }

    public Guid? RequestedByEmployeeId { get; set; }
    public EmployeeProfile? RequestedByEmployee { get; set; }

    public Guid? AssignedToEmployeeId { get; set; }
    public EmployeeProfile? AssignedToEmployee { get; set; }

    public Guid? MaintenancePlanId { get; set; }
    public MaintenancePlan? MaintenancePlan { get; set; }

    public string Number { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    public WorkOrderSource Source { get; set; } = WorkOrderSource.Manual;
    public WorkOrderType Type { get; set; } = WorkOrderType.CorrectiveMaintenance;
    public WorkOrderPriority Priority { get; set; } = WorkOrderPriority.Medium;
    public WorkOrderStatus Status { get; set; } = WorkOrderStatus.New;

    public DateTime RequestedAtUtc { get; set; }
    public DateTime? PlannedStartAtUtc { get; set; }
    public DateTime? StartedAtUtc { get; set; }
    public DateTime? CompletedAtUtc { get; set; }
    public DateTime? DueAtUtc { get; set; }

    public int? EstimatedMinutes { get; set; }
    public int? ActualMinutes { get; set; }
    public DateTime? PlannedForOccurrenceUtc { get; set; }
    public decimal? TriggeredByMeterValue { get; set; }

    public decimal? EstimatedCost { get; set; }
    public decimal? ActualCost { get; set; }

    public string? ExternalVendor { get; set; }
    public string? ResolutionSummary { get; set; }
    public bool AutoCreated { get; set; }
}
