using Domain.Assets;
using FlowCraft.Infrastructure.Persistence;
using Infrastructure.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public sealed class AssetCategoryRepository : IAssetCategoryRepository
{
    private readonly FlowCraftDbContext _db;

    public AssetCategoryRepository(FlowCraftDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<AssetCategory>> GetAllAsync(
        Guid tenantId,
        AssetType? assetType = null,
        bool includeInactive = false,
        CancellationToken cancellationToken = default)
    {
        var query = _db.AssetCategories
            .AsNoTracking()
            .Include(x => x.Parameters)
            .Include(x => x.Assets)
            .Where(x => x.TenantId == tenantId);

        if (assetType.HasValue)
            query = query.Where(x => x.AssetType == assetType.Value);

        if (!includeInactive)
            query = query.Where(x => x.IsActive);

        return await query
            .OrderBy(x => x.Name)
            .ToListAsync(cancellationToken);
    }

    public Task<AssetCategory?> GetByIdAsync(
        Guid tenantId,
        Guid id,
        bool includeParameters = true,
        bool includeAssets = true,
        CancellationToken cancellationToken = default)
    {
        IQueryable<AssetCategory> query = _db.AssetCategories
            .Where(x => x.TenantId == tenantId);

        if (includeParameters)
            query = query.Include(x => x.Parameters);

        if (includeAssets)
            query = query.Include(x => x.Assets);

        return query.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task<bool> CodeExistsAsync(
        Guid tenantId,
        string code,
        Guid? excludeId = null,
        CancellationToken cancellationToken = default)
    {
        var trimmed = (code ?? string.Empty).Trim();
        if (trimmed.Length == 0)
            return false;

        return await _db.AssetCategories.AnyAsync(
            x => x.TenantId == tenantId
                && x.Code == trimmed
                && (!excludeId.HasValue || x.Id != excludeId.Value),
            cancellationToken);
    }

    public async Task<bool> NameExistsAsync(
        Guid tenantId,
        string name,
        AssetType assetType,
        Guid? excludeId = null,
        CancellationToken cancellationToken = default)
    {
        var trimmed = (name ?? string.Empty).Trim();
        if (trimmed.Length == 0)
            return false;

        return await _db.AssetCategories.AnyAsync(
            x => x.TenantId == tenantId
                && x.AssetType == assetType
                && x.Name == trimmed
                && (!excludeId.HasValue || x.Id != excludeId.Value),
            cancellationToken);
    }

    public Task AddAsync(AssetCategory category, CancellationToken cancellationToken = default)
        => _db.AssetCategories.AddAsync(category, cancellationToken).AsTask();

    public Task UpdateAsync(AssetCategory category, CancellationToken cancellationToken = default)
    {
        _db.AssetCategories.Update(category);
        return Task.CompletedTask;
    }
}
