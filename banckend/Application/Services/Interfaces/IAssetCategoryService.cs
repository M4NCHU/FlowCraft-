using Application.DTOs.Assets;
using Domain.Assets;

namespace Application.Services.Interfaces;

public interface IAssetCategoryService
{
    Task<IReadOnlyList<AssetCategoryDto>> GetAllAsync(
        Guid tenantId,
        AssetType? assetType = null,
        bool includeInactive = false,
        CancellationToken ct = default);

    Task<AssetCategoryDto?> GetByIdAsync(Guid tenantId, Guid categoryId, CancellationToken ct = default);
    Task<AssetCategoryDto> CreateAsync(Guid tenantId, CreateAssetCategoryRequest request, CancellationToken ct = default);
    Task<AssetCategoryDto> UpdateAsync(Guid tenantId, Guid categoryId, UpdateAssetCategoryRequest request, CancellationToken ct = default);
}
