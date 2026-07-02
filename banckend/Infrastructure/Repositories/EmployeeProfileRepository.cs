using Domain.Employees;
using FlowCraft.Infrastructure.Persistence;
using Infrastructure.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public sealed class EmployeeProfileRepository : IEmployeeProfileRepository
{
    private readonly FlowCraftDbContext _db;

    public EmployeeProfileRepository(FlowCraftDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<EmployeeProfile>> GetAllAsync(
        Guid tenantId,
        bool includeInactive = false,
        bool includeSkills = false,
        bool includeAssignments = false,
        CancellationToken cancellationToken = default)
    {
        IQueryable<EmployeeProfile> query = _db.EmployeeProfiles
            .AsNoTracking()
            .Include(x => x.Department)
            .Where(x => x.TenantId == tenantId);

        if (includeSkills)
        {
            query = query
                .Include(x => x.Skills)
                .ThenInclude(x => x.AssetCategory)
                .Include(x => x.Skills)
                .ThenInclude(x => x.Asset);
        }

        if (includeAssignments)
        {
            query = query
                .Include(x => x.AssetAssignments)
                .ThenInclude(x => x.Asset);
        }

        if (!includeInactive)
            query = query.Where(x => x.IsActive);

        return await query
            .OrderBy(x => x.LastName)
            .ThenBy(x => x.FirstName)
            .ToListAsync(cancellationToken);
    }

    public async Task<EmployeeProfile?> GetByIdAsync(
        Guid tenantId,
        Guid id,
        bool includeUser = false,
        bool includeSkills = false,
        bool includeAssignments = false,
        CancellationToken cancellationToken = default)
    {
        IQueryable<EmployeeProfile> query = _db.EmployeeProfiles
            .Include(x => x.Department)
            .Where(x => x.TenantId == tenantId);

        if (includeUser)
            query = query.Include(x => x.User);

        if (includeSkills)
        {
            query = query
                .Include(x => x.Skills)
                .ThenInclude(x => x.AssetCategory)
                .Include(x => x.Skills)
                .ThenInclude(x => x.Asset);
        }

        if (includeAssignments)
        {
            query = query
                .Include(x => x.AssetAssignments)
                .ThenInclude(x => x.Asset);
        }

        return await query.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task<EmployeeProfile?> GetByEmployeeNumberAsync(Guid tenantId, string employeeNumber, CancellationToken cancellationToken = default)
    {
        var trimmed = (employeeNumber ?? string.Empty).Trim();
        if (trimmed.Length == 0)
            return null;

        return await _db.EmployeeProfiles
            .FirstOrDefaultAsync(x => x.TenantId == tenantId && x.EmployeeNumber == trimmed, cancellationToken);
    }

    public async Task<bool> EmployeeNumberExistsAsync(Guid tenantId, string employeeNumber, Guid? excludeId = null, CancellationToken cancellationToken = default)
    {
        var trimmed = (employeeNumber ?? string.Empty).Trim();
        if (trimmed.Length == 0)
            return false;

        return await _db.EmployeeProfiles.AnyAsync(
            x => x.TenantId == tenantId
                 && x.EmployeeNumber == trimmed
                 && (!excludeId.HasValue || x.Id != excludeId.Value),
            cancellationToken);
    }

    public Task AddAsync(EmployeeProfile employee, CancellationToken cancellationToken = default)
        => _db.EmployeeProfiles.AddAsync(employee, cancellationToken).AsTask();

    public Task UpdateAsync(EmployeeProfile employee, CancellationToken cancellationToken = default)
    {
        _db.EmployeeProfiles.Update(employee);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(EmployeeProfile employee, CancellationToken cancellationToken = default)
    {
        _db.EmployeeProfiles.Remove(employee);
        return Task.CompletedTask;
    }

    public Task AddSkillAsync(EmployeeSkill skill, CancellationToken cancellationToken = default)
        => _db.EmployeeSkills.AddAsync(skill, cancellationToken).AsTask();

    public Task UpdateSkillAsync(EmployeeSkill skill, CancellationToken cancellationToken = default)
    {
        _db.EmployeeSkills.Update(skill);
        return Task.CompletedTask;
    }

    public Task DeleteSkillAsync(EmployeeSkill skill, CancellationToken cancellationToken = default)
    {
        _db.EmployeeSkills.Remove(skill);
        return Task.CompletedTask;
    }
}
