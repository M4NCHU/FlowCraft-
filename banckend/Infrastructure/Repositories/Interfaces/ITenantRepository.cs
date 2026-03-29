using Domain.Instance;

namespace Infrastructure.Repositories.Interfaces;

public interface ITenantRepository
{
    Task<Tenant?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Tenant?> GetByIdReadOnlyAsync(Guid id, CancellationToken cancellationToken = default);
    Task<Tenant?> GetDetailsByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<Tenant?> GetByCodeAsync(string code, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Tenant>> GetAllAsync(CancellationToken cancellationToken = default);

    Task AddAsync(Tenant tenant, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);

    Task<bool> CodeExistsAsync(string code, CancellationToken cancellationToken = default);

    void Remove(Tenant tenant);
}