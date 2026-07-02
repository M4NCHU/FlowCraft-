namespace Application.DTOs.Inventory;

public class InventoryReplenishmentRecommendationDto
{
    public Guid ItemId { get; set; }
    public Guid CategoryId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public string SKU { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public string? SupplierName { get; set; }
    public string Criticality { get; set; } = string.Empty;
    public decimal QuantityOnHand { get; set; }
    public decimal QuantityReserved { get; set; }
    public decimal AvailableQuantity { get; set; }
    public decimal MinimumStock { get; set; }
    public decimal OpenProcurementQuantity { get; set; }
    public decimal SuggestedQuantity { get; set; }
    public decimal ShortageQuantity { get; set; }
    public int LeadTimeDays { get; set; }
    public bool HasOpenProcurement { get; set; }
    public Guid? OpenProcurementId { get; set; }
    public string Urgency { get; set; } = string.Empty;
    public string RecommendedAction { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public DateTime? NextExpectedDeliveryAtUtc { get; set; }
}
