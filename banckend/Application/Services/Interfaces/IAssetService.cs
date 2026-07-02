using Application.DTOs.Assets;

namespace Application.Services.Interfaces;

public interface IAssetService
{
    Task<IReadOnlyList<AssetListItemDto>> GetAllAsync(Guid tenantId, bool includeInactive = false, CancellationToken ct = default);
    Task<AssetDetailsDto?> GetByIdAsync(Guid tenantId, Guid assetId, CancellationToken ct = default);

    Task<AssetDetailsDto> CreateAsync(Guid tenantId, CreateAssetRequest request, CancellationToken ct = default);
    Task<AssetDetailsDto> UpdateAsync(Guid tenantId, Guid assetId, UpdateAssetRequest request, CancellationToken ct = default);

    Task DeleteAsync(Guid tenantId, Guid assetId, CancellationToken ct = default);

    Task<AssetPlacementDto> PlaceAsync(Guid tenantId, Guid assetId, PlaceAssetRequest request, CancellationToken ct = default);
    Task RemovePlacementAsync(Guid tenantId, Guid assetId, CancellationToken ct = default);
    Task<AssetAssignmentDto> AssignAsync(Guid tenantId, Guid assetId, AssignAssetRequest request, CancellationToken ct = default);
    Task<AssetAssignmentDto> ReturnAsync(Guid tenantId, Guid assetId, ReturnAssetRequest request, CancellationToken ct = default);
    Task<IReadOnlyList<AssetUsageReadingDto>> GetUsageReadingsAsync(Guid tenantId, Guid assetId, CancellationToken ct = default);
    Task<AssetUsageReadingDto> AddUsageReadingAsync(Guid tenantId, Guid assetId, CreateAssetUsageReadingRequest request, CancellationToken ct = default);
}
