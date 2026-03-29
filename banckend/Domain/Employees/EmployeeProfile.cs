using Domain.Assets;
using Domain.Instance;
using Domain.Maintenance;
using FlowCraft.Domain.Auth;

namespace Domain.Employees;

public enum EmployeeStatus
{
    Active = 1,
    OnLeave = 2,
    Suspended = 3,
    Terminated = 4
}

public class EmployeeProfile
{
    public Guid Id { get; set; }

    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public Guid? UserId { get; set; }
    public ApplicationUser? User { get; set; }

    public string EmployeeNumber { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? JobTitle { get; set; }
    public string? DepartmentName { get; set; }
    public Guid? DepartmentId { get; set; }
    public Department? Department { get; set; }
    public string? Phone { get; set; }
    public string? Notes { get; set; }

    public EmployeeStatus Status { get; set; } = EmployeeStatus.Active;
    public bool IsActive { get; set; } = true;

    public DateTime? HireDateUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }

    public ICollection<EmployeeSkill> Skills { get; set; } = new List<EmployeeSkill>();
    public ICollection<AssetUsageReading> RecordedAssetUsageReadings { get; set; } = new List<AssetUsageReading>();
    public ICollection<AssetAssignment> AssetAssignments { get; set; } = new List<AssetAssignment>();
    public ICollection<AssetAssignment> IssuedAssetAssignments { get; set; } = new List<AssetAssignment>();
    public ICollection<FailureReport> ReportedFailures { get; set; } = new List<FailureReport>();
    public ICollection<WorkOrder> RequestedWorkOrders { get; set; } = new List<WorkOrder>();
    public ICollection<WorkOrder> AssignedWorkOrders { get; set; } = new List<WorkOrder>();
}
