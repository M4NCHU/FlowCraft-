using System.ComponentModel.DataAnnotations;

namespace Application.DTOs.Inventory;

public enum InventoryCriticalityDto
{
    Low = 1,
    Medium = 2,
    High = 3
}

public enum InventoryServiceTypeDto
{
    Preventive = 1,
    Corrective = 2,
    Emergency = 3,
    Overhaul = 4,
    Inspection = 5,
    Other = 6
}

public class InventoryItemParameterValueDto
{
    public Guid ParameterDefinitionId { get; set; }
    public string Value { get; set; } = string.Empty;
}

public class InventoryItemDto
{
    public Guid Id { get; set; }
    public Guid CategoryId { get; set; }
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
    public Guid? LinkedDepartmentId { get; set; }
    public Guid? LinkedAssetId { get; set; }
    public Guid? LinkedAssetCategoryId { get; set; }
    public string Criticality { get; set; } = string.Empty;
    public string? ServiceType { get; set; }
    public bool IsActive { get; set; }
    public string? Notes { get; set; }
    public DateTime? LastReceiptAtUtc { get; set; }
    public Dictionary<string, string> ParameterValues { get; set; } = new();
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}

[Display(Name = "Nowa pozycja magazynowa")]
public class CreateInventoryItemRequest
{
    [Required]
    public Guid CategoryId { get; set; }

    [Required, StringLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required, StringLength(64)]
    public string SKU { get; set; } = string.Empty;

    [Required, StringLength(64)]
    public string Unit { get; set; } = string.Empty;

    [Range(0, 999999.99)]
    public decimal QuantityOnHand { get; set; }

    [Range(0, 999999.99)]
    public decimal QuantityReserved { get; set; }

    [Range(0, 999999.99)]
    public decimal MinimumStock { get; set; }

    [Range(0, 999999.99)]
    public decimal ReorderQuantity { get; set; }

    [Range(1, 365)]
    public int LeadTimeDays { get; set; } = 7;

    [Required, StringLength(200)]
    public string Location { get; set; } = string.Empty;

    [StringLength(200)]
    public string? SupplierName { get; set; }

    [Range(0.01, 9999999.99)]
    public decimal? UnitCost { get; set; }

    public Guid? LinkedDepartmentId { get; set; }
    public Guid? LinkedAssetId { get; set; }
    public Guid? LinkedAssetCategoryId { get; set; }

    [Required]
    public InventoryCriticalityDto Criticality { get; set; } = InventoryCriticalityDto.Low;

    public InventoryServiceTypeDto? ServiceType { get; set; }

    [StringLength(4000)]
    public string? Notes { get; set; }

    public Dictionary<string, string> ParameterValues { get; set; } = new();
}

[Display(Name = "Aktualizuj pozycję")]
public class UpdateInventoryItemRequest
{
    [Required, StringLength(200)]
    public string Name { get; set; } = string.Empty;

    [Range(0, 999999.99)]
    public decimal QuantityOnHand { get; set; }

    [Range(0, 999999.99)]
    public decimal QuantityReserved { get; set; }

    [Range(0, 999999.99)]
    public decimal MinimumStock { get; set; }

    [Range(0, 999999.99)]
    public decimal ReorderQuantity { get; set; }

    [Range(1, 365)]
    public int LeadTimeDays { get; set; } = 7;

    [Required, StringLength(200)]
    public string Location { get; set; } = string.Empty;

    [StringLength(200)]
    public string? SupplierName { get; set; }

    [Range(0.01, 9999999.99)]
    public decimal? UnitCost { get; set; }

    public Guid? LinkedDepartmentId { get; set; }
    public Guid? LinkedAssetId { get; set; }

    [Required]
    public InventoryCriticalityDto Criticality { get; set; }

    public InventoryServiceTypeDto? ServiceType { get; set; }

    public bool IsActive { get; set; } = true;

    [StringLength(4000)]
    public string? Notes { get; set; }

    public Dictionary<string, string> ParameterValues { get; set; } = new();
}
