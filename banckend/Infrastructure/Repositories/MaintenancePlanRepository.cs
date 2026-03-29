using Domain.Maintenance;
using FlowCraft.Infrastructure.Persistence;
using Infrastructure.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public sealed class MaintenancePlanRepository : IMaintenancePlanRepository
{
    private readonly FlowCraftDbContext _db;

    public MaintenancePlanRepository(FlowCraftDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<MaintenancePlan>> GetAllAsync(
        Guid tenantId,
        Guid? assetId = null,
        bool includeInactive = false,
        bool includeExecutions = false,
        CancellationToken cancellationToken = default)
    {
        IQueryable<MaintenancePlan> query = _db.MaintenancePlans
            .AsNoTracking()
            .Include(x => x.Asset)
            .ThenInclude(x => x.UsageReadings)
            .Include(x => x.AssignedToEmployee)
            .Where(x => x.TenantId == tenantId);

        if (assetId.HasValue)
            query = query.Where(x => x.AssetId == assetId.Value);

        if (!includeInactive)
            query = query.Where(x => x.IsActive);

        if (includeExecutions)
            query = query.Include(x => x.Executions);

        return await query
            .OrderBy(x => x.NextDueAtUtc ?? DateTime.MaxValue)
            .ThenBy(x => x.Title)
            .ToListAsync(cancellationToken);
    }

    public async Task<MaintenancePlan?> GetByIdAsync(
        Guid tenantId,
        Guid id,
        bool includeExecutions = false,
        CancellationToken cancellationToken = default)
    {
        IQueryable<MaintenancePlan> query = _db.MaintenancePlans
            .Include(x => x.Asset)
            .ThenInclude(x => x.UsageReadings)
            .Include(x => x.AssignedToEmployee)
            .Where(x => x.TenantId == tenantId);

        if (includeExecutions)
        {
            query = query
                .Include(x => x.Executions)
                .ThenInclude(x => x.CompletedByEmployee);
        }

        return await query.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task<IReadOnlyList<MaintenanceExecution>> GetExecutionsInRangeAsync(
        Guid tenantId,
        DateTime fromUtc,
        DateTime toUtc,
        Guid? assetId = null,
        CancellationToken cancellationToken = default)
    {
        var query = _db.MaintenanceExecutions
            .AsNoTracking()
            .Include(x => x.Asset)
            .Include(x => x.MaintenancePlan)
            .Where(x => x.TenantId == tenantId && x.ScheduledForUtc >= fromUtc && x.ScheduledForUtc <= toUtc);

        if (assetId.HasValue)
            query = query.Where(x => x.AssetId == assetId.Value);

        return await query
            .OrderBy(x => x.ScheduledForUtc)
            .ToListAsync(cancellationToken);
    }

    public async Task<MaintenanceExecution?> GetExecutionAsync(
        Guid tenantId,
        Guid maintenancePlanId,
        DateTime scheduledForUtc,
        CancellationToken cancellationToken = default)
        => await _db.MaintenanceExecutions.FirstOrDefaultAsync(
            x => x.TenantId == tenantId
                 && x.MaintenancePlanId == maintenancePlanId
                 && x.ScheduledForUtc == scheduledForUtc,
            cancellationToken);

    public Task AddAsync(MaintenancePlan plan, CancellationToken cancellationToken = default)
        => _db.MaintenancePlans.AddAsync(plan, cancellationToken).AsTask();

    public Task UpdateAsync(MaintenancePlan plan, CancellationToken cancellationToken = default)
    {
        _db.MaintenancePlans.Update(plan);
        return Task.CompletedTask;
    }

    public Task AddExecutionAsync(MaintenanceExecution execution, CancellationToken cancellationToken = default)
        => _db.MaintenanceExecutions.AddAsync(execution, cancellationToken).AsTask();

    public Task UpdateExecutionAsync(MaintenanceExecution execution, CancellationToken cancellationToken = default)
    {
        _db.MaintenanceExecutions.Update(execution);
        return Task.CompletedTask;
    }
}
