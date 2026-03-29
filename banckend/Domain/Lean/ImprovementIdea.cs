using Domain.Employees;
using Domain.Instance;

namespace Domain.Lean;

public enum ImprovementCategory
{
    Kaizen = 1,
    FiveS = 2,
    StandardWork = 3,
    Flow = 4,
    Safety = 5,
    Quality = 6
}

public enum LeanWasteType
{
    Transport = 1,
    Inventory = 2,
    Motion = 3,
    Waiting = 4,
    Overproduction = 5,
    Overprocessing = 6,
    Defects = 7,
    UnusedTalent = 8
}

public enum ImprovementStatus
{
    New = 1,
    InReview = 2,
    Approved = 3,
    InProgress = 4,
    Implemented = 5,
    Rejected = 6
}

public enum ImprovementImpact
{
    Low = 1,
    Medium = 2,
    High = 3,
    Critical = 4
}

public class ImprovementIdea
{
    public Guid Id { get; set; }

    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public Guid? DepartmentId { get; set; }
    public Department? Department { get; set; }

    public Guid? OwnerEmployeeId { get; set; }
    public EmployeeProfile? OwnerEmployee { get; set; }

    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public ImprovementCategory Category { get; set; } = ImprovementCategory.Kaizen;
    public LeanWasteType WasteType { get; set; } = LeanWasteType.Waiting;
    public ImprovementStatus Status { get; set; } = ImprovementStatus.New;
    public ImprovementImpact Impact { get; set; } = ImprovementImpact.Medium;
    public bool QuickWin { get; set; }
    public string? RootCause { get; set; }
    public string? ProposedAction { get; set; }
    public string? BaselineMetricName { get; set; }
    public string? MetricUnit { get; set; }
    public decimal? BaselineValue { get; set; }
    public decimal? TargetValue { get; set; }
    public decimal? ActualValue { get; set; }
    public decimal? EstimatedSavingsPerMonth { get; set; }
    public decimal? ImplementedSavingsPerMonth { get; set; }
    public DateTime? DueDateUtc { get; set; }
    public DateTime? ImplementedAtUtc { get; set; }
    public string? Notes { get; set; }
    public string? ResultSummary { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}
