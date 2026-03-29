using Domain.Maintenance;
using FlowCraft.Infrastructure.Persistence;
using Infrastructure.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public sealed class WorkOrderRepository : IWorkOrderRepository
{
    private readonly FlowCraftDbContext _db;

    public WorkOrderRepository(FlowCraftDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<WorkOrder>> GetAllAsync(Guid tenantId, CancellationToken cancellationToken = default)
        => await _db.WorkOrders
            .AsNoTracking()
            .Include(x => x.Asset)
            .Include(x => x.MaintenancePlan)
            .Where(x => x.TenantId == tenantId)
            .OrderByDescending(x => x.RequestedAtUtc)
            .ToListAsync(cancellationToken);

    public async Task<WorkOrder?> GetByIdAsync(Guid tenantId, Guid id, bool includeFailureReport = false, CancellationToken cancellationToken = default)
    {
        IQueryable<WorkOrder> query = _db.WorkOrders
            .Include(x => x.Asset)
            .Include(x => x.MaintenancePlan)
            .Where(x => x.TenantId == tenantId);

        if (includeFailureReport)
            query = query.Include(x => x.FailureReport);

        return await query.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public Task<WorkOrder?> GetOpenForMaintenancePlanAsync(
        Guid tenantId,
        Guid maintenancePlanId,
        CancellationToken cancellationToken = default)
        => _db.WorkOrders
            .Where(x => x.TenantId == tenantId
                        && x.MaintenancePlanId == maintenancePlanId
                        && x.Status != WorkOrderStatus.Done
                        && x.Status != WorkOrderStatus.Cancelled)
            .OrderByDescending(x => x.RequestedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

    public async Task<WorkOrder?> GetByNumberAsync(Guid tenantId, string number, CancellationToken cancellationToken = default)
    {
        var trimmed = (number ?? string.Empty).Trim();
        if (trimmed.Length == 0)
            return null;

        return await _db.WorkOrders
            .FirstOrDefaultAsync(x => x.TenantId == tenantId && x.Number == trimmed, cancellationToken);
    }

    public async Task<bool> NumberExistsAsync(Guid tenantId, string number, Guid? excludeId = null, CancellationToken cancellationToken = default)
    {
        var trimmed = (number ?? string.Empty).Trim();
        if (trimmed.Length == 0)
            return false;

        return await _db.WorkOrders.AnyAsync(
            x => x.TenantId == tenantId
                 && x.Number == trimmed
                 && (!excludeId.HasValue || x.Id != excludeId.Value),
            cancellationToken);
    }

    public Task AddAsync(WorkOrder workOrder, CancellationToken cancellationToken = default)
        => _db.WorkOrders.AddAsync(workOrder, cancellationToken).AsTask();

    public Task UpdateAsync(WorkOrder workOrder, CancellationToken cancellationToken = default)
    {
        _db.WorkOrders.Update(workOrder);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(WorkOrder workOrder, CancellationToken cancellationToken = default)
    {
        _db.WorkOrders.Remove(workOrder);
        return Task.CompletedTask;
    }
}
