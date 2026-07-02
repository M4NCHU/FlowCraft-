using System.ComponentModel.DataAnnotations;

namespace Application.DTOs.Inventory;

public enum InventoryProcurementStatusDto
{
    Draft = 1,
    Ordered = 2,
    AwaitingDelivery = 3,
    Received = 4
}

public class InventoryProcurementOrderDto
{
    public Guid Id { get; set; }
    public Guid InventoryItemId { get; set; }
    public decimal Quantity { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? SupplierName { get; set; }
    public Guid? RequestedByDepartmentId { get; set; }
    public Guid? LinkedWorkOrderId { get; set; }
    public Guid? LinkedMaintenancePlanId { get; set; }
    public DateTime RequestedAtUtc { get; set; }
    public DateTime? ExpectedDeliveryAtUtc { get; set; }
    public DateTime? ReceivedAtUtc { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}

[Display(Name = "Nowe zamówienie")]
public class CreateInventoryProcurementOrderRequest
{
    [Required]
    public Guid InventoryItemId { get; set; }

    [Required, Range(0.01, 999999.99)]
    public decimal Quantity { get; set; }

    [StringLength(200)]
    public string? SupplierName { get; set; }

    public Guid? RequestedByDepartmentId { get; set; }
    public Guid? LinkedWorkOrderId { get; set; }
    public Guid? LinkedMaintenancePlanId { get; set; }

    public DateTime? ExpectedDeliveryAtUtc { get; set; }

    [StringLength(4000)]
    public string? Notes { get; set; }
}

[Display(Name = "Aktualizuj zamówienie")]
public class UpdateInventoryProcurementOrderRequest
{
    [Required]
    public InventoryProcurementStatusDto Status { get; set; }

    [StringLength(200)]
    public string? SupplierName { get; set; }

    public DateTime? ExpectedDeliveryAtUtc { get; set; }
    public DateTime? ReceivedAtUtc { get; set; }

    [StringLength(4000)]
    public string? Notes { get; set; }
}
