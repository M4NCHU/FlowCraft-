using System.ComponentModel.DataAnnotations;
using Domain.Inventory;

namespace Application.DTOs.Inventory;

public enum InventoryParameterTypeDto
{
    Text = 1,
    Number = 2,
    Boolean = 3,
    Select = 4
}

public class InventoryCategoryParameterDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public InventoryParameterTypeDto Type { get; set; }
    public string? Unit { get; set; }
    public bool Required { get; set; }
    public string[]? Options { get; set; }
}

public class InventoryCategoryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Domain { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? DefaultSupplier { get; set; }
    public Guid? LinkedDepartmentId { get; set; }
    public bool IsActive { get; set; }
    public List<InventoryCategoryParameterDto> ParameterTemplates { get; set; } = new();
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}

[Display(Name = "Nowa kategoria magazynowa")]
public class CreateInventoryCategoryRequest
{
    [Required, StringLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required, StringLength(64)]
    public string Code { get; set; } = string.Empty;

    [Required]
    public string Domain { get; set; } = string.Empty;

    [StringLength(1000)]
    public string? Description { get; set; }

    [StringLength(200)]
    public string? DefaultSupplier { get; set; }

    public Guid? LinkedDepartmentId { get; set; }

    public List<CreateInventoryCategoryParameterRequest> ParameterTemplates { get; set; } = new();
}

public class CreateInventoryCategoryParameterRequest
{
    [Required, StringLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required, StringLength(64)]
    public string Code { get; set; } = string.Empty;

    [Required]
    public InventoryParameterTypeDto Type { get; set; }

    [StringLength(64)]
    public string? Unit { get; set; }

    public bool Required { get; set; }

    public string[]? Options { get; set; }
}

[Display(Name = "Aktualizuj kategorię")]
public class UpdateInventoryCategoryRequest
{
    [Required, StringLength(200)]
    public string Name { get; set; } = string.Empty;

    [StringLength(1000)]
    public string? Description { get; set; }

    [StringLength(200)]
    public string? DefaultSupplier { get; set; }

    public Guid? LinkedDepartmentId { get; set; }
}
