using Domain.Maintenance;

namespace Infrastructure.Repositories.Interfaces;

public interface IFailureReportRepository
{
    Task<IReadOnlyList<FailureReport>> GetAllAsync(Guid tenantId, bool openOnly = false, CancellationToken cancellationToken = default);
    Task<FailureReport?> GetByIdAsync(Guid tenantId, Guid id, bool includeWorkOrders = false, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<FailureCauseCategory>> GetCauseCategoriesAsync(Guid tenantId, bool includeInactive = false, CancellationToken cancellationToken = default);
    Task<FailureCauseCategory?> GetCauseCategoryByIdAsync(Guid tenantId, Guid id, CancellationToken cancellationToken = default);
    Task<bool> CauseCategoryCodeExistsAsync(Guid tenantId, string code, Guid? excludeId = null, CancellationToken cancellationToken = default);
    Task<bool> CauseCategoryNameExistsAsync(Guid tenantId, string name, Guid? excludeId = null, CancellationToken cancellationToken = default);

    Task AddAsync(FailureReport report, CancellationToken cancellationToken = default);
    Task UpdateAsync(FailureReport report, CancellationToken cancellationToken = default);
    Task DeleteAsync(FailureReport report, CancellationToken cancellationToken = default);
    Task AddCauseCategoryAsync(FailureCauseCategory category, CancellationToken cancellationToken = default);
    Task UpdateCauseCategoryAsync(FailureCauseCategory category, CancellationToken cancellationToken = default);
}
