using Domain.Instance;
using Domain.Layouts;
using Domain.Maintenance;

namespace Domain.Assets;

public enum AssetType
{
    Machine = 1,
    Vehicle = 2,
    Rack = 3,
    Tool = 4,
    Device = 5,
    Other = 99
}

public enum AssetStatus
{
    Available = 1,
    InUse = 2,
    InMaintenance = 3,
    Broken = 4,
    Retired = 5
}

public class Asset
{
    public Guid Id { get; set; }

    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public Guid? CategoryId { get; set; }
    public AssetCategory? AssetCategory { get; set; }
    public string? Category { get; set; }
    public string? Description { get; set; }

    public AssetType Type { get; set; } = AssetType.Machine;
    public AssetStatus Status { get; set; } = AssetStatus.Available;

    public string? SerialNumber { get; set; }
    public string? Manufacturer { get; set; }
    public string? Model { get; set; }

    public bool IsMobile { get; set; }
    public bool IsActive { get; set; } = true;

    public DateTime? PurchasedAtUtc { get; set; }
    public DateTime? CommissionedAtUtc { get; set; }
    public DateTime? WarrantyUntilUtc { get; set; }
    public DateTime? LastInventoryCheckAtUtc { get; set; }

    public string? Notes { get; set; }

    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }

    public ICollection<AssetUsageReading> UsageReadings { get; set; } = new List<AssetUsageReading>();
    public ICollection<AssetPlacement> Placements { get; set; } = new List<AssetPlacement>();
    public ICollection<AssetAssignment> Assignments { get; set; } = new List<AssetAssignment>();
    public ICollection<AssetParameterValue> ParameterValues { get; set; } = new List<AssetParameterValue>();
    public ICollection<LayoutElement> LayoutElements { get; set; } = new List<LayoutElement>();
    public ICollection<FailureReport> FailureReports { get; set; } = new List<FailureReport>();
    public ICollection<WorkOrder> WorkOrders { get; set; } = new List<WorkOrder>();
    public ICollection<MaintenancePlan> MaintenancePlans { get; set; } = new List<MaintenancePlan>();
    public ICollection<MaintenanceExecution> MaintenanceExecutions { get; set; } = new List<MaintenanceExecution>();
}
