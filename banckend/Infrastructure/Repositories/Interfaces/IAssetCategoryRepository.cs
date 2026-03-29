using Domain.Assets;

namespace Infrastructure.Repositories.Interfaces;

public interface IAssetCategoryRepository
{
    Task<IReadOnlyList<AssetCategory>> GetAllAsync(
        Guid tenantId,
        AssetType? assetType = null,
        bool includeInactive = false,
        CancellationToken cancellationToken = default);

    Task<AssetCategory?> GetByIdAsync(
        Guid tenantId,
        Guid id,
        bool includeParameters = true,
        bool includeAssets = true,
        CancellationToken cancellationToken = default);

    Task<bool> CodeExistsAsync(Guid tenantId, string code, Guid? excludeId = null, CancellationToken cancellationToken = default);
    Task<bool> NameExistsAsync(Guid tenantId, string name, AssetType assetType, Guid? excludeId = null, CancellationToken cancellationToken = default);

    Task AddAsync(AssetCategory category, CancellationToken cancellationToken = default);
    Task UpdateAsync(AssetCategory category, CancellationToken cancellationToken = default);
}
