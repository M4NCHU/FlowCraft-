using Domain.Assets;
using FlowCraft.Infrastructure.Persistence;
using Infrastructure.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public sealed class AssetRepository : IAssetRepository
{
    private readonly FlowCraftDbContext _db;

    public AssetRepository(FlowCraftDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<Asset>> GetAllAsync(Guid tenantId, bool includeInactive = false, CancellationToken cancellationToken = default)
    {
        var query = _db.Assets
            .AsNoTracking()
            .Where(x => x.TenantId == tenantId);

        if (!includeInactive)
            query = query.Where(x => x.IsActive);

        return await query
            .OrderBy(x => x.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<Asset?> GetByIdAsync(
        Guid tenantId,
        Guid id,
        bool includePlacements = false,
        bool includeAssignments = false,
        bool includeCategoryData = false,
        bool includeUsageReadings = false,
        bool includeFailures = false,
        bool includeWorkOrders = false,
        CancellationToken cancellationToken = default)
    {
        IQueryable<Asset> query = _db.Assets
            .Where(x => x.TenantId == tenantId);

        if (includePlacements)
            query = query.Include(x => x.Placements);

        if (includeAssignments)
            query = query.Include(x => x.Assignments);

        if (includeCategoryData)
        {
            query = query
                .Include(x => x.AssetCategory!)
                .ThenInclude(x => x.Parameters)
                .Include(x => x.ParameterValues)
                .ThenInclude(x => x.ParameterDefinition);
        }

        if (includeUsageReadings)
        {
            query = query
                .Include(x => x.UsageReadings)
                .ThenInclude(x => x.RecordedByEmployee);
        }

        if (includeFailures)
            query = query.Include(x => x.FailureReports);

        if (includeWorkOrders)
            query = query.Include(x => x.WorkOrders);

        return await query.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task<Asset?> GetByCodeAsync(Guid tenantId, string code, CancellationToken cancellationToken = default)
    {
        var trimmed = (code ?? string.Empty).Trim();
        if (trimmed.Length == 0)
            return null;

        return await _db.Assets
            .FirstOrDefaultAsync(x => x.TenantId == tenantId && x.Code == trimmed, cancellationToken);
    }

    public async Task<bool> CodeExistsAsync(Guid tenantId, string code, Guid? excludeId = null, CancellationToken cancellationToken = default)
    {
        var trimmed = (code ?? string.Empty).Trim();
        if (trimmed.Length == 0)
            return false;

        return await _db.Assets.AnyAsync(
            x => x.TenantId == tenantId
                 && x.Code == trimmed
                 && (!excludeId.HasValue || x.Id != excludeId.Value),
            cancellationToken);
    }

    public async Task<AssetPlacement?> GetCurrentPlacementAsync(Guid tenantId, Guid assetId, CancellationToken cancellationToken = default)
        => await _db.AssetPlacements
            .FirstOrDefaultAsync(x => x.TenantId == tenantId && x.AssetId == assetId && x.IsCurrent, cancellationToken);

    public async Task<AssetAssignment?> GetActiveAssignmentAsync(Guid tenantId, Guid assetId, CancellationToken cancellationToken = default)
        => await _db.AssetAssignments
            .FirstOrDefaultAsync(
                x => x.TenantId == tenantId
                     && x.AssetId == assetId
                     && x.Status == AssetAssignmentStatus.Active,
                cancellationToken);

    public Task AddAsync(Asset asset, CancellationToken cancellationToken = default)
        => _db.Assets.AddAsync(asset, cancellationToken).AsTask();

    public Task UpdateAsync(Asset asset, CancellationToken cancellationToken = default)
    {
        _db.Assets.Update(asset);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(Asset asset, CancellationToken cancellationToken = default)
    {
        _db.Assets.Remove(asset);
        return Task.CompletedTask;
    }

    public Task AddPlacementAsync(AssetPlacement placement, CancellationToken cancellationToken = default)
        => _db.AssetPlacements.AddAsync(placement, cancellationToken).AsTask();

    public Task UpdatePlacementAsync(AssetPlacement placement, CancellationToken cancellationToken = default)
    {
        _db.AssetPlacements.Update(placement);
        return Task.CompletedTask;
    }

    public Task AddAssignmentAsync(AssetAssignment assignment, CancellationToken cancellationToken = default)
        => _db.AssetAssignments.AddAsync(assignment, cancellationToken).AsTask();

    public Task UpdateAssignmentAsync(AssetAssignment assignment, CancellationToken cancellationToken = default)
    {
        _db.AssetAssignments.Update(assignment);
        return Task.CompletedTask;
    }

    public Task AddParameterValueAsync(AssetParameterValue value, CancellationToken cancellationToken = default)
        => _db.AssetParameterValues.AddAsync(value, cancellationToken).AsTask();

    public Task DeleteParameterValueAsync(AssetParameterValue value, CancellationToken cancellationToken = default)
    {
        _db.AssetParameterValues.Remove(value);
        return Task.CompletedTask;
    }

    public async Task<IReadOnlyList<AssetUsageReading>> GetUsageReadingsAsync(
        Guid tenantId,
        Guid assetId,
        CancellationToken cancellationToken = default)
        => await _db.AssetUsageReadings
            .AsNoTracking()
            .Include(x => x.RecordedByEmployee)
            .Where(x => x.TenantId == tenantId && x.AssetId == assetId)
            .OrderByDescending(x => x.RecordedAtUtc)
            .ToListAsync(cancellationToken);

    public Task<AssetUsageReading?> GetLatestUsageReadingAsync(
        Guid tenantId,
        Guid assetId,
        AssetMeterType meterType,
        CancellationToken cancellationToken = default)
        => _db.AssetUsageReadings
            .Include(x => x.RecordedByEmployee)
            .Where(x => x.TenantId == tenantId && x.AssetId == assetId && x.MeterType == meterType)
            .OrderByDescending(x => x.RecordedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

    public Task AddUsageReadingAsync(AssetUsageReading reading, CancellationToken cancellationToken = default)
        => _db.AssetUsageReadings.AddAsync(reading, cancellationToken).AsTask();
}
