using Domain.Layouts;
using FlowCraft.Infrastructure.Persistence;
using Infrastructure.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public sealed class ProductionHallRepository : IProductionHallRepository
{
    private readonly FlowCraftDbContext _db;

    public ProductionHallRepository(FlowCraftDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<ProductionHall>> GetAllAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        return await _db.ProductionHalls
            .Include(x => x.Sections)
            .Where(x => x.TenantId == tenantId && x.IsActive)
            .OrderBy(x => x.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<ProductionHall?> GetByIdAsync(
        Guid tenantId,
        Guid id,
        bool includeSections = false,
        CancellationToken cancellationToken = default)
    {
        IQueryable<ProductionHall> query = _db.ProductionHalls
            .Where(x => x.TenantId == tenantId && x.IsActive);

        if (includeSections)
            query = query.Include(x => x.Sections);

        return await query.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }

    public Task AddAsync(ProductionHall hall, CancellationToken cancellationToken = default)
    {
        if (hall is null) throw new ArgumentNullException(nameof(hall));
        return _db.ProductionHalls.AddAsync(hall, cancellationToken).AsTask();
    }

    public Task AddSectionAsync(HallSection section, CancellationToken cancellationToken = default)
    {
        if (section is null) throw new ArgumentNullException(nameof(section));
        return _db.HallSections.AddAsync(section, cancellationToken).AsTask();
    }

    public Task UpdateAsync(ProductionHall hall, CancellationToken cancellationToken = default)
    {
        if (hall is null) throw new ArgumentNullException(nameof(hall));
        _db.Entry(hall).State = EntityState.Modified;
        return Task.CompletedTask;
    }

    public Task DeleteSectionAsync(HallSection section, CancellationToken cancellationToken = default)
    {
        if (section is null) throw new ArgumentNullException(nameof(section));
        _db.HallSections.Remove(section);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(ProductionHall hall, CancellationToken cancellationToken = default)
    {
        if (hall is null) throw new ArgumentNullException(nameof(hall));
        _db.ProductionHalls.Remove(hall);
        return Task.CompletedTask;
    }
}
