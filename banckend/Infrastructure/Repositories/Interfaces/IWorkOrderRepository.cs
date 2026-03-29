using Domain.Maintenance;

namespace Infrastructure.Repositories.Interfaces;

public interface IWorkOrderRepository
{
    Task<IReadOnlyList<WorkOrder>> GetAllAsync(Guid tenantId, CancellationToken cancellationToken = default);
    Task<WorkOrder?> GetByIdAsync(Guid tenantId, Guid id, bool includeFailureReport = false, CancellationToken cancellationToken = default);
    Task<WorkOrder?> GetByNumberAsync(Guid tenantId, string number, CancellationToken cancellationToken = default);
    Task<WorkOrder?> GetOpenForMaintenancePlanAsync(Guid tenantId, Guid maintenancePlanId, CancellationToken cancellationToken = default);
    Task<bool> NumberExistsAsync(Guid tenantId, string number, Guid? excludeId = null, CancellationToken cancellationToken = default);

    Task AddAsync(WorkOrder workOrder, CancellationToken cancellationToken = default);
    Task UpdateAsync(WorkOrder workOrder, CancellationToken cancellationToken = default);
    Task DeleteAsync(WorkOrder workOrder, CancellationToken cancellationToken = default);
}
