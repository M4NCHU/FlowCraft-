namespace Domain.Inventory;

public class InventoryItemParameter
{
    public Guid Id { get; set; }
    public Guid InventoryItemId { get; set; }
    public InventoryItem InventoryItem { get; set; } = null!;

    public Guid ParameterDefinitionId { get; set; }
    public InventoryCategoryParameter ParameterDefinition { get; set; } = null!;

    public string Value { get; set; } = string.Empty;

    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}
