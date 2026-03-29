using Domain.Maintenance;

namespace Infrastructure.Repositories.Interfaces;

public interface IMaintenancePlanRepository
{
    Task<IReadOnlyList<MaintenancePlan>> GetAllAsync(
        Guid tenantId,
        Guid? assetId = null,
        bool includeInactive = false,
        bool includeExecutions = false,
        CancellationToken cancellationToken = default);

    Task<MaintenancePlan?> GetByIdAsync(
        Guid tenantId,
        Guid id,
        bool includeExecutions = false,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<MaintenanceExecution>> GetExecutionsInRangeAsync(
        Guid tenantId,
        DateTime fromUtc,
        DateTime toUtc,
        Guid? assetId = null,
        CancellationToken cancellationToken = default);

    Task<MaintenanceExecution?> GetExecutionAsync(
        Guid tenantId,
        Guid maintenancePlanId,
        DateTime scheduledForUtc,
        CancellationToken cancellationToken = default);

    Task AddAsync(MaintenancePlan plan, CancellationToken cancellationToken = default);
    Task UpdateAsync(MaintenancePlan plan, CancellationToken cancellationToken = default);
    Task AddExecutionAsync(MaintenanceExecution execution, CancellationToken cancellationToken = default);
    Task UpdateExecutionAsync(MaintenanceExecution execution, CancellationToken cancellationToken = default);
}
