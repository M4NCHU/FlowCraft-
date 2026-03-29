using Domain.Lean;

namespace Application.DTOs.Lean;

public sealed class ImprovementIdeaDto
{
    public Guid Id { get; set; }
    public Guid? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public Guid? OwnerEmployeeId { get; set; }
    public string? OwnerEmployeeName { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public ImprovementCategory Category { get; set; }
    public LeanWasteType WasteType { get; set; }
    public ImprovementStatus Status { get; set; }
    public ImprovementImpact Impact { get; set; }
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
    public string? ResultSummary { get; set; }
    public decimal? ImprovementPercent { get; set; }
    public decimal? TargetAchievementPercent { get; set; }
    public int PriorityScore { get; set; }
    public bool IsOverdue { get; set; }
    public bool IsDueSoon { get; set; }
    public DateTime? DueDateUtc { get; set; }
    public DateTime? ImplementedAtUtc { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}

public sealed class CreateImprovementIdeaRequest
{
    public Guid? DepartmentId { get; set; }
    public Guid? OwnerEmployeeId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public ImprovementCategory Category { get; set; } = ImprovementCategory.Kaizen;
    public LeanWasteType WasteType { get; set; } = LeanWasteType.Waiting;
    public ImprovementImpact Impact { get; set; } = ImprovementImpact.Medium;
    public bool QuickWin { get; set; }
    public string? ProposedAction { get; set; }
    public string? BaselineMetricName { get; set; }
    public string? MetricUnit { get; set; }
    public decimal? BaselineValue { get; set; }
    public decimal? TargetValue { get; set; }
    public decimal? EstimatedSavingsPerMonth { get; set; }
    public DateTime? DueDateUtc { get; set; }
    public string? Notes { get; set; }
}

public sealed class UpdateImprovementIdeaRequest
{
    public Guid? DepartmentId { get; set; }
    public Guid? OwnerEmployeeId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public ImprovementCategory Category { get; set; } = ImprovementCategory.Kaizen;
    public LeanWasteType WasteType { get; set; } = LeanWasteType.Waiting;
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
    public string? ResultSummary { get; set; }
    public DateTime? DueDateUtc { get; set; }
    public string? Notes { get; set; }
}

public sealed class SetImprovementIdeaStatusRequest
{
    public ImprovementStatus Status { get; set; }
    public string? Notes { get; set; }
}
