using Domain.Inventory;
using FlowCraft.Infrastructure.Persistence;
using Infrastructure.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public sealed class InventoryCategoryRepository : IInventoryCategoryRepository
{
    private readonly FlowCraftDbContext _db;

    public InventoryCategoryRepository(FlowCraftDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<InventoryCategory>> GetAllAsync(
        Guid tenantId,
        bool includeInactive = false,
        CancellationToken cancellationToken = default)
    {
        var query = _db.InventoryCategories
            .AsNoTracking()
            .Include(x => x.Parameters)
            .Where(x => x.TenantId == tenantId);

        if (!includeInactive)
            query = query.Where(x => x.IsActive);

        return await query
            .OrderBy(x => x.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<InventoryCategory?> GetByIdAsync(
        Guid tenantId,
        Guid id,
        bool includeParameters = false,
        CancellationToken cancellationToken = default)
    {
        IQueryable<InventoryCategory> query = _db.InventoryCategories
            .Where(x => x.TenantId == tenantId);

        if (includeParameters)
            query = query.Include(x => x.Parameters);

        return await query.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task<InventoryCategory?> GetByCodeAsync(
        Guid tenantId,
        string code,
        CancellationToken cancellationToken = default)
    {
        var trimmed = (code ?? string.Empty).Trim();
        if (trimmed.Length == 0)
            return null;

        return await _db.InventoryCategories
            .AsNoTracking()
            .FirstOrDefaultAsync(
                x => x.TenantId == tenantId && x.Code == trimmed,
                cancellationToken);
    }

    public async Task AddAsync(InventoryCategory category, CancellationToken cancellationToken = default)
    {
        await _db.InventoryCategories.AddAsync(category, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(InventoryCategory category, CancellationToken cancellationToken = default)
    {
        _db.InventoryCategories.Update(category);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task RemoveAsync(InventoryCategory category, CancellationToken cancellationToken = default)
    {
        _db.InventoryCategories.Remove(category);
        await _db.SaveChangesAsync(cancellationToken);
    }
}

public sealed class InventoryItemRepository : IInventoryItemRepository
{
    private readonly FlowCraftDbContext _db;

    public InventoryItemRepository(FlowCraftDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<InventoryItem>> GetAllAsync(
        Guid tenantId,
        bool includeInactive = false,
        CancellationToken cancellationToken = default)
    {
        var query = _db.InventoryItems
            .AsNoTracking()
            .Include(x => x.ParameterValues)
            .Where(x => x.TenantId == tenantId);

        if (!includeInactive)
            query = query.Where(x => x.IsActive);

        return await query
            .OrderBy(x => x.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<InventoryItem?> GetByIdAsync(
        Guid tenantId,
        Guid id,
        bool includeParameters = false,
        bool includeCategory = false,
        CancellationToken cancellationToken = default)
    {
        IQueryable<InventoryItem> query = _db.InventoryItems
            .Where(x => x.TenantId == tenantId);

        if (includeParameters)
            query = query.Include(x => x.ParameterValues);

        if (includeCategory)
            query = query.Include(x => x.Category);

        return await query.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task<InventoryItem?> GetBySKUAsync(
        Guid tenantId,
        string sku,
        CancellationToken cancellationToken = default)
    {
        var trimmed = (sku ?? string.Empty).Trim();
        if (trimmed.Length == 0)
            return null;

        return await _db.InventoryItems
            .AsNoTracking()
            .FirstOrDefaultAsync(
                x => x.TenantId == tenantId && x.SKU == trimmed,
                cancellationToken);
    }

    public async Task<IReadOnlyList<InventoryItem>> GetByLinkedAssetAsync(
        Guid tenantId,
        Guid assetId,
        CancellationToken cancellationToken = default)
    {
        return await _db.InventoryItems
            .AsNoTracking()
            .Where(x => x.TenantId == tenantId && x.LinkedAssetId == assetId)
            .OrderBy(x => x.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(InventoryItem item, CancellationToken cancellationToken = default)
    {
        await _db.InventoryItems.AddAsync(item, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(InventoryItem item, CancellationToken cancellationToken = default)
    {
        _db.InventoryItems.Update(item);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task RemoveAsync(InventoryItem item, CancellationToken cancellationToken = default)
    {
        _db.InventoryItems.Remove(item);
        await _db.SaveChangesAsync(cancellationToken);
    }
}

public sealed class InventoryProcurementOrderRepository : IInventoryProcurementOrderRepository
{
    private readonly FlowCraftDbContext _db;

    public InventoryProcurementOrderRepository(FlowCraftDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<InventoryProcurementOrder>> GetAllAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        return await _db.InventoryProcurementOrders
            .AsNoTracking()
            .Where(x => x.TenantId == tenantId)
            .OrderByDescending(x => x.RequestedAtUtc)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<InventoryProcurementOrder>> GetOpenAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        return await _db.InventoryProcurementOrders
            .AsNoTracking()
            .Where(x =>
                x.TenantId == tenantId &&
                x.Status != InventoryProcurementStatus.Received)
            .OrderByDescending(x => x.RequestedAtUtc)
            .ToListAsync(cancellationToken);
    }

    public async Task<InventoryProcurementOrder?> GetByIdAsync(
        Guid tenantId,
        Guid id,
        CancellationToken cancellationToken = default)
    {
        return await _db.InventoryProcurementOrders
            .AsNoTracking()
            .FirstOrDefaultAsync(
                x => x.TenantId == tenantId && x.Id == id,
                cancellationToken);
    }

    public async Task<IReadOnlyList<InventoryProcurementOrder>> GetByItemAsync(
        Guid tenantId,
        Guid itemId,
        CancellationToken cancellationToken = default)
    {
        return await _db.InventoryProcurementOrders
            .AsNoTracking()
            .Where(x => x.TenantId == tenantId && x.InventoryItemId == itemId)
            .OrderByDescending(x => x.RequestedAtUtc)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(InventoryProcurementOrder order, CancellationToken cancellationToken = default)
    {
        await _db.InventoryProcurementOrders.AddAsync(order, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(InventoryProcurementOrder order, CancellationToken cancellationToken = default)
    {
        _db.InventoryProcurementOrders.Update(order);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task RemoveAsync(InventoryProcurementOrder order, CancellationToken cancellationToken = default)
    {
        _db.InventoryProcurementOrders.Remove(order);
        await _db.SaveChangesAsync(cancellationToken);
    }
}
