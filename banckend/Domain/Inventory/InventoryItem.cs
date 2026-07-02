using Domain.Assets;
using Domain.Employees;
using Domain.Instance;

namespace Domain.Inventory;

public enum InventoryCriticality
{
    Low = 1,
    Medium = 2,
    High = 3
}

public class InventoryItem
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public Guid CategoryId { get; set; }
    public InventoryCategory Category { get; set; } = null!;

    public string Name { get; set; } = string.Empty;
    public string SKU { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;

    public decimal QuantityOnHand { get; set; }
    public decimal QuantityReserved { get; set; }
    public decimal MinimumStock { get; set; }
    public decimal ReorderQuantity { get; set; }
    public int LeadTimeDays { get; set; }

    public string Location { get; set; } = string.Empty;
    public string? SupplierName { get; set; }
    public decimal? UnitCost { get; set; }

    // Links to other entities
    public Guid? LinkedDepartmentId { get; set; }
    public Guid? LinkedAssetId { get; set; }
    public Asset? LinkedAsset { get; set; }
    public Guid? LinkedAssetCategoryId { get; set; }

    public InventoryCriticality Criticality { get; set; } = InventoryCriticality.Low;
    public InventoryServiceType? ServiceType { get; set; }
    public bool IsActive { get; set; } = true;
    public string? Notes { get; set; }
    public DateTime? LastReceiptAtUtc { get; set; }

    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }

    public ICollection<InventoryItemParameter> ParameterValues { get; set; } = new List<InventoryItemParameter>();
    public ICollection<InventoryProcurementOrder> ProcurementOrders { get; set; } = new List<InventoryProcurementOrder>();
}
