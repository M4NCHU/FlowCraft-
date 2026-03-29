using Domain.Maintenance;
using FlowCraft.Infrastructure.Persistence;
using Infrastructure.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public sealed class FailureReportRepository : IFailureReportRepository
{
    private readonly FlowCraftDbContext _db;

    public FailureReportRepository(FlowCraftDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<FailureReport>> GetAllAsync(Guid tenantId, bool openOnly = false, CancellationToken cancellationToken = default)
    {
        var query = _db.FailureReports
            .AsNoTracking()
            .Include(x => x.FailureCauseCategory)
            .Where(x => x.TenantId == tenantId);

        if (openOnly)
            query = query.Where(x => x.Status != FailureStatus.Closed);

        return await query
            .OrderByDescending(x => x.ReportedAtUtc)
            .ToListAsync(cancellationToken);
    }

    public async Task<FailureReport?> GetByIdAsync(Guid tenantId, Guid id, bool includeWorkOrders = false, CancellationToken cancellationToken = default)
    {
        IQueryable<FailureReport> query = _db.FailureReports
            .Include(x => x.FailureCauseCategory)
            .Where(x => x.TenantId == tenantId);

        if (includeWorkOrders)
            query = query.Include(x => x.WorkOrders);

        return await query.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public async Task<IReadOnlyList<FailureCauseCategory>> GetCauseCategoriesAsync(
        Guid tenantId,
        bool includeInactive = false,
        CancellationToken cancellationToken = default)
    {
        var query = _db.FailureCauseCategories
            .AsNoTracking()
            .Include(x => x.FailureReports)
            .Where(x => x.TenantId == tenantId);

        if (!includeInactive)
            query = query.Where(x => x.IsActive);

        return await query
            .OrderBy(x => x.Name)
            .ToListAsync(cancellationToken);
    }

    public Task<FailureCauseCategory?> GetCauseCategoryByIdAsync(
        Guid tenantId,
        Guid id,
        CancellationToken cancellationToken = default)
        => _db.FailureCauseCategories
            .Include(x => x.FailureReports)
            .FirstOrDefaultAsync(x => x.TenantId == tenantId && x.Id == id, cancellationToken);

    public async Task<bool> CauseCategoryCodeExistsAsync(
        Guid tenantId,
        string code,
        Guid? excludeId = null,
        CancellationToken cancellationToken = default)
    {
        var trimmed = (code ?? string.Empty).Trim();
        if (trimmed.Length == 0)
            return false;

        return await _db.FailureCauseCategories.AnyAsync(
            x => x.TenantId == tenantId
                 && x.Code == trimmed
                 && (!excludeId.HasValue || x.Id != excludeId.Value),
            cancellationToken);
    }

    public async Task<bool> CauseCategoryNameExistsAsync(
        Guid tenantId,
        string name,
        Guid? excludeId = null,
        CancellationToken cancellationToken = default)
    {
        var trimmed = (name ?? string.Empty).Trim();
        if (trimmed.Length == 0)
            return false;

        return await _db.FailureCauseCategories.AnyAsync(
            x => x.TenantId == tenantId
                 && x.Name == trimmed
                 && (!excludeId.HasValue || x.Id != excludeId.Value),
            cancellationToken);
    }

    public Task AddAsync(FailureReport report, CancellationToken cancellationToken = default)
        => _db.FailureReports.AddAsync(report, cancellationToken).AsTask();

    public Task UpdateAsync(FailureReport report, CancellationToken cancellationToken = default)
    {
        _db.FailureReports.Update(report);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(FailureReport report, CancellationToken cancellationToken = default)
    {
        _db.FailureReports.Remove(report);
        return Task.CompletedTask;
    }

    public Task AddCauseCategoryAsync(FailureCauseCategory category, CancellationToken cancellationToken = default)
        => _db.FailureCauseCategories.AddAsync(category, cancellationToken).AsTask();

    public Task UpdateCauseCategoryAsync(FailureCauseCategory category, CancellationToken cancellationToken = default)
    {
        _db.FailureCauseCategories.Update(category);
        return Task.CompletedTask;
    }
}
