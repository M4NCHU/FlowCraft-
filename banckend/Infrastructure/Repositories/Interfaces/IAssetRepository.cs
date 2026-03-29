using Domain.Assets;

namespace Infrastructure.Repositories.Interfaces;

public interface IAssetRepository
{
    Task<IReadOnlyList<Asset>> GetAllAsync(Guid tenantId, bool includeInactive = false, CancellationToken cancellationToken = default);

    Task<Asset?> GetByIdAsync(
        Guid tenantId,
        Guid id,
        bool includePlacements = false,
        bool includeAssignments = false,
        bool includeCategoryData = false,
        bool includeUsageReadings = false,
        bool includeFailures = false,
        bool includeWorkOrders = false,
        CancellationToken cancellationToken = default);

    Task<Asset?> GetByCodeAsync(Guid tenantId, string code, CancellationToken cancellationToken = default);
    Task<bool> CodeExistsAsync(Guid tenantId, string code, Guid? excludeId = null, CancellationToken cancellationToken = default);

    Task<AssetPlacement?> GetCurrentPlacementAsync(Guid tenantId, Guid assetId, CancellationToken cancellationToken = default);
    Task<AssetAssignment?> GetActiveAssignmentAsync(Guid tenantId, Guid assetId, CancellationToken cancellationToken = default);

    Task AddAsync(Asset asset, CancellationToken cancellationToken = default);
    Task UpdateAsync(Asset asset, CancellationToken cancellationToken = default);
    Task DeleteAsync(Asset asset, CancellationToken cancellationToken = default);

    Task AddPlacementAsync(AssetPlacement placement, CancellationToken cancellationToken = default);
    Task UpdatePlacementAsync(AssetPlacement placement, CancellationToken cancellationToken = default);

    Task AddAssignmentAsync(AssetAssignment assignment, CancellationToken cancellationToken = default);
    Task UpdateAssignmentAsync(AssetAssignment assignment, CancellationToken cancellationToken = default);

    Task AddParameterValueAsync(AssetParameterValue value, CancellationToken cancellationToken = default);
    Task DeleteParameterValueAsync(AssetParameterValue value, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AssetUsageReading>> GetUsageReadingsAsync(
        Guid tenantId,
        Guid assetId,
        CancellationToken cancellationToken = default);

    Task<AssetUsageReading?> GetLatestUsageReadingAsync(
        Guid tenantId,
        Guid assetId,
        AssetMeterType meterType,
        CancellationToken cancellationToken = default);

    Task AddUsageReadingAsync(AssetUsageReading reading, CancellationToken cancellationToken = default);
}
