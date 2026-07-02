namespace Domain.Inventory;

public enum InventoryParameterType
{
    Text = 1,
    Number = 2,
    Boolean = 3,
    Select = 4
}

public class InventoryCategoryParameter
{
    public Guid Id { get; set; }
    public Guid InventoryCategoryId { get; set; }
    public InventoryCategory InventoryCategory { get; set; } = null!;

    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public InventoryParameterType Type { get; set; }
    public string? Unit { get; set; }
    public bool Required { get; set; }

    // For select type - comma-separated options
    public string? Options { get; set; }

    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}
