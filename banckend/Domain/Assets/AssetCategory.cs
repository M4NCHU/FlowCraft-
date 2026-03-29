using Domain.Employees;
using Domain.Instance;

namespace Domain.Assets;

public enum AssetParameterType
{
    Text = 1,
    Number = 2,
    Boolean = 3,
    Select = 4
}

public class AssetCategory
{
    public Guid Id { get; set; }

    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public AssetType AssetType { get; set; } = AssetType.Machine;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }

    public ICollection<AssetCategoryParameter> Parameters { get; set; } = new List<AssetCategoryParameter>();
    public ICollection<Asset> Assets { get; set; } = new List<Asset>();
    public ICollection<EmployeeSkill> EmployeeSkills { get; set; } = new List<EmployeeSkill>();
}

public class AssetCategoryParameter
{
    public Guid Id { get; set; }

    public Guid AssetCategoryId { get; set; }
    public AssetCategory AssetCategory { get; set; } = null!;

    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public AssetParameterType Type { get; set; } = AssetParameterType.Text;
    public string? Unit { get; set; }
    public string? OptionsJson { get; set; }
    public string? DefaultValue { get; set; }
    public bool IsRequired { get; set; }
    public int DisplayOrder { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }

    public ICollection<AssetParameterValue> ParameterValues { get; set; } = new List<AssetParameterValue>();
}

public class AssetParameterValue
{
    public Guid Id { get; set; }

    public Guid AssetId { get; set; }
    public Asset Asset { get; set; } = null!;

    public Guid AssetCategoryParameterId { get; set; }
    public AssetCategoryParameter ParameterDefinition { get; set; } = null!;

    public string? Value { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}
