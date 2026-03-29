using Domain.Lean;
using FlowCraft.Infrastructure.Persistence;
using Infrastructure.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public sealed class ImprovementIdeaRepository : IImprovementIdeaRepository
{
    private readonly FlowCraftDbContext _db;

    public ImprovementIdeaRepository(FlowCraftDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<ImprovementIdea>> GetAllAsync(
        Guid tenantId,
        bool includeClosed = true,
        CancellationToken cancellationToken = default)
    {
        var query = _db.ImprovementIdeas
            .AsNoTracking()
            .Include(x => x.Department)
            .Include(x => x.OwnerEmployee)
            .Where(x => x.TenantId == tenantId);

        if (!includeClosed)
        {
            query = query.Where(x =>
                x.Status != ImprovementStatus.Implemented &&
                x.Status != ImprovementStatus.Rejected);
        }

        return await query
            .OrderByDescending(x => x.UpdatedAtUtc)
            .ThenByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);
    }

    public Task<ImprovementIdea?> GetByIdAsync(Guid tenantId, Guid id, CancellationToken cancellationToken = default)
        => _db.ImprovementIdeas
            .Include(x => x.Department)
            .Include(x => x.OwnerEmployee)
            .FirstOrDefaultAsync(x => x.TenantId == tenantId && x.Id == id, cancellationToken);

    public Task AddAsync(ImprovementIdea idea, CancellationToken cancellationToken = default)
        => _db.ImprovementIdeas.AddAsync(idea, cancellationToken).AsTask();

    public Task UpdateAsync(ImprovementIdea idea, CancellationToken cancellationToken = default)
    {
        _db.ImprovementIdeas.Update(idea);
        return Task.CompletedTask;
    }
}
