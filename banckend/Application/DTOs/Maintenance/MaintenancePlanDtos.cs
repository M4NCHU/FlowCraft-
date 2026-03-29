using Domain.Assets;
using Domain.Maintenance;

namespace Application.DTOs.Maintenance;

public enum MaintenanceOccurrenceStatus
{
    Upcoming = 1,
    DueSoon = 2,
    Overdue = 3,
    Completed = 4,
    Inactive = 5
}

public sealed class MaintenanceExecutionDto
{
    public Guid Id { get; set; }
    public Guid MaintenancePlanId { get; set; }
    public Guid AssetId { get; set; }
    public DateTime ScheduledForUtc { get; set; }
    public decimal? ScheduledMeterValue { get; set; }
    public DateTime? CompletedAtUtc { get; set; }
    public MaintenanceExecutionOutcome Outcome { get; set; }
    public Guid? CompletedByEmployeeId { get; set; }
    public int? ActualMinutes { get; set; }
    public string? Notes { get; set; }
}

public sealed class MaintenancePlanDto
{
    public Guid Id { get; set; }
    public Guid AssetId { get; set; }
    public string AssetName { get; set; } = string.Empty;
    public string AssetCode { get; set; } = string.Empty;
    public Guid? AssignedToEmployeeId { get; set; }
    public string? AssignedToEmployeeName { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public MaintenanceScheduleType ScheduleType { get; set; }
    public MaintenanceTriggerMode TriggerMode { get; set; }
    public DateTime StartsAtUtc { get; set; }
    public DateTime? NextDueAtUtc { get; set; }
    public MaintenanceRecurrenceUnit? RecurrenceUnit { get; set; }
    public int? RecurrenceInterval { get; set; }
    public AssetMeterType? MeterType { get; set; }
    public decimal? MeterInterval { get; set; }
    public decimal? NextDueMeterValue { get; set; }
    public decimal? LastCompletedMeterValue { get; set; }
    public decimal? AutoCreateLeadMeterValue { get; set; }
    public bool AutoCreateWorkOrder { get; set; }
    public int LeadTimeDays { get; set; }
    public int? EstimatedDurationMinutes { get; set; }
    public string? Checklist { get; set; }
    public string? Instructions { get; set; }
    public bool IsActive { get; set; }
    public DateTime? LastCompletedAtUtc { get; set; }
    public Guid? OpenWorkOrderId { get; set; }
    public MaintenanceOccurrenceStatus CurrentStatus { get; set; }
    public int ExecutionsCount { get; set; }
    public IReadOnlyList<MaintenanceExecutionDto> RecentExecutions { get; set; } = Array.Empty<MaintenanceExecutionDto>();
}

public sealed class MaintenanceCalendarOccurrenceDto
{
    public Guid PlanId { get; set; }
    public Guid AssetId { get; set; }
    public string AssetName { get; set; } = string.Empty;
    public string AssetCode { get; set; } = string.Empty;
    public string PlanTitle { get; set; } = string.Empty;
    public DateTime ScheduledForUtc { get; set; }
    public decimal? ScheduledMeterValue { get; set; }
    public DateTime? CompletedAtUtc { get; set; }
    public MaintenanceOccurrenceStatus Status { get; set; }
    public MaintenanceTriggerMode TriggerMode { get; set; }
    public int LeadTimeDays { get; set; }
    public int? EstimatedDurationMinutes { get; set; }
    public Guid? OpenWorkOrderId { get; set; }
    public string? Checklist { get; set; }
    public string? Notes { get; set; }
}

public sealed class CreateMaintenancePlanRequest
{
    public Guid AssetId { get; set; }
    public Guid? AssignedToEmployeeId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public MaintenanceScheduleType ScheduleType { get; set; } = MaintenanceScheduleType.Recurring;
    public MaintenanceTriggerMode TriggerMode { get; set; } = MaintenanceTriggerMode.Calendar;
    public DateTime StartsAtUtc { get; set; }
    public MaintenanceRecurrenceUnit? RecurrenceUnit { get; set; }
    public int? RecurrenceInterval { get; set; }
    public AssetMeterType? MeterType { get; set; }
    public decimal? MeterInterval { get; set; }
    public decimal? StartsAtMeterValue { get; set; }
    public decimal? AutoCreateLeadMeterValue { get; set; }
    public bool AutoCreateWorkOrder { get; set; }
    public int LeadTimeDays { get; set; } = 14;
    public int? EstimatedDurationMinutes { get; set; }
    public string? Checklist { get; set; }
    public string? Instructions { get; set; }
}

public sealed class UpdateMaintenancePlanRequest
{
    public Guid AssetId { get; set; }
    public Guid? AssignedToEmployeeId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public MaintenanceScheduleType ScheduleType { get; set; } = MaintenanceScheduleType.Recurring;
    public MaintenanceTriggerMode TriggerMode { get; set; } = MaintenanceTriggerMode.Calendar;
    public DateTime StartsAtUtc { get; set; }
    public MaintenanceRecurrenceUnit? RecurrenceUnit { get; set; }
    public int? RecurrenceInterval { get; set; }
    public AssetMeterType? MeterType { get; set; }
    public decimal? MeterInterval { get; set; }
    public decimal? StartsAtMeterValue { get; set; }
    public decimal? AutoCreateLeadMeterValue { get; set; }
    public bool AutoCreateWorkOrder { get; set; }
    public int LeadTimeDays { get; set; } = 14;
    public int? EstimatedDurationMinutes { get; set; }
    public string? Checklist { get; set; }
    public string? Instructions { get; set; }
    public bool IsActive { get; set; } = true;
}

public sealed class CompleteMaintenanceOccurrenceRequest
{
    public DateTime? ScheduledForUtc { get; set; }
    public decimal? ScheduledMeterValue { get; set; }
    public DateTime? CompletedAtUtc { get; set; }
    public Guid? CompletedByEmployeeId { get; set; }
    public int? ActualMinutes { get; set; }
    public string? Notes { get; set; }
}

public sealed class MaintenanceAutomationSyncDto
{
    public int CreatedWorkOrdersCount { get; set; }
    public IReadOnlyList<Guid> CreatedWorkOrderIds { get; set; } = Array.Empty<Guid>();
}
