using Domain.Employees;

namespace Infrastructure.Repositories.Interfaces;

public interface IDepartmentRepository
{
    Task<IReadOnlyList<Department>> GetAllAsync(Guid tenantId, bool includeInactive = false, CancellationToken cancellationToken = default);
    Task<Department?> GetByIdAsync(Guid tenantId, Guid id, CancellationToken cancellationToken = default);
    Task<bool> CodeExistsAsync(Guid tenantId, string code, Guid? excludeId = null, CancellationToken cancellationToken = default);
    Task<bool> NameExistsAsync(Guid tenantId, string name, Guid? excludeId = null, CancellationToken cancellationToken = default);

    Task AddAsync(Department department, CancellationToken cancellationToken = default);
    Task UpdateAsync(Department department, CancellationToken cancellationToken = default);
}
