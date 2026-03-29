using Domain.Instance;
using FlowCraft.Infrastructure.Persistence;
using Infrastructure.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public sealed class TenantRepository : ITenantRepository
{
    private readonly FlowCraftDbContext _db;

    public TenantRepository(FlowCraftDbContext db) => _db = db;

    public async Task<Tenant?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        => await _db.Tenants
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<Tenant?> GetByIdReadOnlyAsync(Guid id, CancellationToken cancellationToken = default)
        => await _db.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<Tenant?> GetDetailsByIdAsync(Guid id, CancellationToken cancellationToken = default)
        => await _db.Tenants
            .AsNoTracking()
            .Include(x => x.Halls)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<Tenant?> GetByCodeAsync(string code, CancellationToken cancellationToken = default)
    {
        var trimmed = (code ?? string.Empty).Trim();
        if (trimmed.Length == 0)
            return null;

        return await _db.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Code != null && x.Code == trimmed, cancellationToken);
    }

    public async Task<IReadOnlyList<Tenant>> GetAllAsync(CancellationToken cancellationToken = default)
        => await _db.Tenants
            .AsNoTracking()
            .OrderBy(x => x.Name)
            .ToListAsync(cancellationToken);

    public Task AddAsync(Tenant tenant, CancellationToken cancellationToken = default)
        => _db.Tenants.AddAsync(tenant, cancellationToken).AsTask();

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
        => _db.SaveChangesAsync(cancellationToken);

    public async Task<bool> CodeExistsAsync(string code, CancellationToken cancellationToken = default)
    {
        var trimmed = (code ?? string.Empty).Trim();
        if (trimmed.Length == 0)
            return false;

        return await _db.Tenants.AnyAsync(x => x.Code == trimmed, cancellationToken);
    }

    public void Remove(Tenant tenant) => _db.Tenants.Remove(tenant);
}
