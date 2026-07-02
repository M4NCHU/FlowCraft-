using Domain.Maintenance;

namespace Application.DTOs.Maintenance;

public sealed class WorkOrderDto
{
    public Guid Id { get; set; }
    public Guid? FailureReportId { get; set; }
    public Guid? MaintenancePlanId { get; set; }
    public Guid? AssetId { get; set; }
    public Guid? HallId { get; set; }
    public Guid? SectionId { get; set; }
    public Guid? RequestedByEmployeeId { get; set; }
    public Guid? AssignedToEmployeeId { get; set; }
    public string Number { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public WorkOrderType Type { get; set; }
    public WorkOrderPriority Priority { get; set; }
    public WorkOrderStatus Status { get; set; }
    public WorkOrderSource Source { get; set; }
    public DateTime RequestedAtUtc { get; set; }
    public DateTime? PlannedForOccurrenceUtc { get; set; }
    public DateTime? PlannedStartAtUtc { get; set; }
    public DateTime? StartedAtUtc { get; set; }
    public DateTime? CompletedAtUtc { get; set; }
    public DateTime? DueAtUtc { get; set; }
    public decimal? TriggeredByMeterValue { get; set; }
    public int? EstimatedMinutes { get; set; }
    public int? ActualMinutes { get; set; }
    public decimal? EstimatedCost { get; set; }
    public decimal? ActualCost { get; set; }
    public string? ExternalVendor { get; set; }
    public string? ResolutionSummary { get; set; }
    public bool AutoCreated { get; set; }
}

public sealed class CreateWorkOrderRequest
{
    public string Number { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public WorkOrderType Type { get; set; } = WorkOrderType.CorrectiveMaintenance;
    public WorkOrderPriority Priority { get; set; } = WorkOrderPriority.Medium;
    public Guid? FailureReportId { get; set; }
    public Guid? AssetId { get; set; }
    public Guid? HallId { get; set; }
    public Guid? SectionId { get; set; }
    public Guid? RequestedByEmployeeId { get; set; }
    public Guid? AssignedToEmployeeId { get; set; }
    public DateTime? DueAtUtc { get; set; }
    public int? EstimatedMinutes { get; set; }
    public decimal? EstimatedCost { get; set; }
    public string? ExternalVendor { get; set; }
}

public sealed class UpdateWorkOrderRequest
{
    public string Number { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public WorkOrderType Type { get; set; } = WorkOrderType.CorrectiveMaintenance;
    public WorkOrderPriority Priority { get; set; } = WorkOrderPriority.Medium;
    public Guid? AssetId { get; set; }
    public Guid? AssignedToEmployeeId { get; set; }
    public DateTime? DueAtUtc { get; set; }
    public int? EstimatedMinutes { get; set; }
    public decimal? EstimatedCost { get; set; }
    public string? ExternalVendor { get; set; }
}

public sealed class SetWorkOrderStatusRequest
{
    public WorkOrderStatus Status { get; set; }
    public int? ActualMinutes { get; set; }
    public decimal? ActualCost { get; set; }
    public string? ResolutionSummary { get; set; }
}
