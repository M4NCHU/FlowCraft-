using Domain.Employees;
using FlowCraft.Infrastructure.Persistence;
using Infrastructure.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public sealed class DepartmentRepository : IDepartmentRepository
{
    private readonly FlowCraftDbContext _db;

    public DepartmentRepository(FlowCraftDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<Department>> GetAllAsync(
        Guid tenantId,
        bool includeInactive = false,
        CancellationToken cancellationToken = default)
    {
        var query = _db.Departments
            .AsNoTracking()
            .Include(x => x.Employees)
            .Where(x => x.TenantId == tenantId);

        if (!includeInactive)
            query = query.Where(x => x.IsActive);

        return await query
            .OrderBy(x => x.Name)
            .ToListAsync(cancellationToken);
    }

    public Task<Department?> GetByIdAsync(Guid tenantId, Guid id, CancellationToken cancellationToken = default)
        => _db.Departments
            .Include(x => x.Employees)
            .FirstOrDefaultAsync(x => x.TenantId == tenantId && x.Id == id, cancellationToken);

    public async Task<bool> CodeExistsAsync(
        Guid tenantId,
        string code,
        Guid? excludeId = null,
        CancellationToken cancellationToken = default)
    {
        var trimmed = (code ?? string.Empty).Trim();
        if (trimmed.Length == 0)
            return false;

        return await _db.Departments.AnyAsync(
            x => x.TenantId == tenantId
                && x.Code == trimmed
                && (!excludeId.HasValue || x.Id != excludeId.Value),
            cancellationToken);
    }

    public async Task<bool> NameExistsAsync(
        Guid tenantId,
        string name,
        Guid? excludeId = null,
        CancellationToken cancellationToken = default)
    {
        var trimmed = (name ?? string.Empty).Trim();
        if (trimmed.Length == 0)
            return false;

        return await _db.Departments.AnyAsync(
            x => x.TenantId == tenantId
                && x.Name == trimmed
                && (!excludeId.HasValue || x.Id != excludeId.Value),
            cancellationToken);
    }

    public Task AddAsync(Department department, CancellationToken cancellationToken = default)
        => _db.Departments.AddAsync(department, cancellationToken).AsTask();

    public Task UpdateAsync(Department department, CancellationToken cancellationToken = default)
    {
        _db.Departments.Update(department);
        return Task.CompletedTask;
    }
}
