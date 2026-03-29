using Domain.Assets;
using Domain.Employees;
using Domain.Instance;

namespace Domain.Maintenance;

public enum MaintenanceScheduleType
{
    OneTime = 1,
    Recurring = 2
}

public enum MaintenanceRecurrenceUnit
{
    Day = 1,
    Week = 2,
    Month = 3,
    Quarter = 4,
    Year = 5
}

public enum MaintenanceTriggerMode
{
    Calendar = 1,
    Meter = 2
}

public enum MaintenanceExecutionOutcome
{
    Completed = 1,
    Skipped = 2
}

public class MaintenancePlan
{
    public Guid Id { get; set; }

    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public Guid AssetId { get; set; }
    public Asset Asset { get; set; } = null!;

    public Guid? AssignedToEmployeeId { get; set; }
    public EmployeeProfile? AssignedToEmployee { get; set; }

    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }

    public MaintenanceTriggerMode TriggerMode { get; set; } = MaintenanceTriggerMode.Calendar;
    public MaintenanceScheduleType ScheduleType { get; set; } = MaintenanceScheduleType.Recurring;
    public DateTime StartsAtUtc { get; set; }
    public DateTime? NextDueAtUtc { get; set; }
    public MaintenanceRecurrenceUnit? RecurrenceUnit { get; set; }
    public int? RecurrenceInterval { get; set; }
    public AssetMeterType? MeterType { get; set; }
    public decimal? MeterInterval { get; set; }
    public decimal? NextDueMeterValue { get; set; }
    public decimal? LastCompletedMeterValue { get; set; }

    public int LeadTimeDays { get; set; } = 14;
    public decimal? AutoCreateLeadMeterValue { get; set; }
    public bool AutoCreateWorkOrder { get; set; }
    public int? EstimatedDurationMinutes { get; set; }
    public string? Checklist { get; set; }
    public string? Instructions { get; set; }

    public bool IsActive { get; set; } = true;
    public DateTime? LastCompletedAtUtc { get; set; }

    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }

    public ICollection<MaintenanceExecution> Executions { get; set; } = new List<MaintenanceExecution>();
}

public class MaintenanceExecution
{
    public Guid Id { get; set; }

    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public Guid MaintenancePlanId { get; set; }
    public MaintenancePlan MaintenancePlan { get; set; } = null!;

    public Guid AssetId { get; set; }
    public Asset Asset { get; set; } = null!;

    public Guid? CompletedByEmployeeId { get; set; }
    public EmployeeProfile? CompletedByEmployee { get; set; }

    public DateTime ScheduledForUtc { get; set; }
    public decimal? ScheduledMeterValue { get; set; }
    public DateTime? CompletedAtUtc { get; set; }
    public MaintenanceExecutionOutcome Outcome { get; set; } = MaintenanceExecutionOutcome.Completed;
    public int? ActualMinutes { get; set; }
    public string? Notes { get; set; }

    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}
