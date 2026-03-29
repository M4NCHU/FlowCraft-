using Domain.Assets;

namespace Application.DTOs.Assets;

public sealed class AssetCategoryParameterDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public AssetParameterType Type { get; set; }
    public string? Unit { get; set; }
    public bool IsRequired { get; set; }
    public int DisplayOrder { get; set; }
    public string? Value { get; set; }
    public string? DefaultValue { get; set; }
    public IReadOnlyList<string> Options { get; set; } = Array.Empty<string>();
}

public sealed class AssetCategoryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public AssetType AssetType { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; }
    public int AssetsCount { get; set; }
    public IReadOnlyList<AssetCategoryParameterDto> Parameters { get; set; } = Array.Empty<AssetCategoryParameterDto>();
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}

public sealed class AssetCategoryParameterRequest
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public AssetParameterType Type { get; set; } = AssetParameterType.Text;
    public string? Unit { get; set; }
    public bool IsRequired { get; set; }
    public int DisplayOrder { get; set; }
    public string? DefaultValue { get; set; }
    public IReadOnlyList<string> Options { get; set; } = Array.Empty<string>();
}

public sealed class CreateAssetCategoryRequest
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public AssetType AssetType { get; set; } = AssetType.Machine;
    public string? Description { get; set; }
    public IReadOnlyList<AssetCategoryParameterRequest> Parameters { get; set; } = Array.Empty<AssetCategoryParameterRequest>();
}

public sealed class UpdateAssetCategoryRequest
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public AssetType AssetType { get; set; } = AssetType.Machine;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public IReadOnlyList<AssetCategoryParameterRequest> Parameters { get; set; } = Array.Empty<AssetCategoryParameterRequest>();
}
