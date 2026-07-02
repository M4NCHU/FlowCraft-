using Domain.Instance;

namespace Domain.Inventory;

public enum InventoryDomain
{
    SpareParts = 1,
    Consumables = 2,
    Safety = 3,
    MRO = 4
}

public class InventoryCategory
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public InventoryDomain Domain { get; set; }
    public string? Description { get; set; }
    public string? DefaultSupplier { get; set; }
    public Guid? LinkedDepartmentId { get; set; }

    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }

    public ICollection<InventoryCategoryParameter> Parameters { get; set; } = new List<InventoryCategoryParameter>();
    public ICollection<InventoryItem> Items { get; set; } = new List<InventoryItem>();
}
