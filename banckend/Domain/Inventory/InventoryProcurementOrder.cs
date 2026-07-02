using Domain.Instance;
using Domain.Maintenance;

namespace Domain.Inventory;

public enum InventoryProcurementStatus
{
    Draft = 1,
    Ordered = 2,
    AwaitingDelivery = 3,
    Received = 4
}

public class InventoryProcurementOrder
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public Guid InventoryItemId { get; set; }
    public InventoryItem InventoryItem { get; set; } = null!;

    public decimal Quantity { get; set; }
    public InventoryProcurementStatus Status { get; set; } = InventoryProcurementStatus.Draft;
    public string? SupplierName { get; set; }

    // Links to requesting context
    public Guid? RequestedByDepartmentId { get; set; }
    public Guid? LinkedWorkOrderId { get; set; }
    public Guid? LinkedMaintenancePlanId { get; set; }
    public MaintenancePlan? LinkedMaintenancePlan { get; set; }

    public DateTime RequestedAtUtc { get; set; }
    public DateTime? ExpectedDeliveryAtUtc { get; set; }
    public DateTime? ReceivedAtUtc { get; set; }
    public string? Notes { get; set; }

    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}
