using Domain.Inventory;

namespace Infrastructure.Repositories.Interfaces;

public interface IInventoryCategoryRepository
{
    Task<IReadOnlyList<InventoryCategory>> GetAllAsync(Guid tenantId, bool includeInactive = false, CancellationToken cancellationToken = default);
    Task<InventoryCategory?> GetByIdAsync(Guid tenantId, Guid id, bool includeParameters = false, CancellationToken cancellationToken = default);
    Task<InventoryCategory?> GetByCodeAsync(Guid tenantId, string code, CancellationToken cancellationToken = default);
    Task AddAsync(InventoryCategory category, CancellationToken cancellationToken = default);
    Task UpdateAsync(InventoryCategory category, CancellationToken cancellationToken = default);
    Task RemoveAsync(InventoryCategory category, CancellationToken cancellationToken = default);
}

public interface IInventoryItemRepository
{
    Task<IReadOnlyList<InventoryItem>> GetAllAsync(Guid tenantId, bool includeInactive = false, CancellationToken cancellationToken = default);
    Task<InventoryItem?> GetByIdAsync(Guid tenantId, Guid id, bool includeParameters = false, bool includeCategory = false, CancellationToken cancellationToken = default);
    Task<InventoryItem?> GetBySKUAsync(Guid tenantId, string sku, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<InventoryItem>> GetByLinkedAssetAsync(Guid tenantId, Guid assetId, CancellationToken cancellationToken = default);
    Task AddAsync(InventoryItem item, CancellationToken cancellationToken = default);
    Task UpdateAsync(InventoryItem item, CancellationToken cancellationToken = default);
    Task RemoveAsync(InventoryItem item, CancellationToken cancellationToken = default);
}

public interface IInventoryProcurementOrderRepository
{
    Task<IReadOnlyList<InventoryProcurementOrder>> GetAllAsync(Guid tenantId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<InventoryProcurementOrder>> GetOpenAsync(Guid tenantId, CancellationToken cancellationToken = default);
    Task<InventoryProcurementOrder?> GetByIdAsync(Guid tenantId, Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<InventoryProcurementOrder>> GetByItemAsync(Guid tenantId, Guid itemId, CancellationToken cancellationToken = default);
    Task AddAsync(InventoryProcurementOrder order, CancellationToken cancellationToken = default);
    Task UpdateAsync(InventoryProcurementOrder order, CancellationToken cancellationToken = default);
    Task RemoveAsync(InventoryProcurementOrder order, CancellationToken cancellationToken = default);
}
