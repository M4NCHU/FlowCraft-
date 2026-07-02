using Domain.Layouts;

namespace Infrastructure.Repositories.Interfaces;

public interface IProductionHallRepository
{
    Task<IReadOnlyList<ProductionHall>> GetAllAsync(Guid tenantId, CancellationToken cancellationToken = default);

    Task<ProductionHall?> GetByIdAsync(
        Guid tenantId,
        Guid id,
        bool includeSections = false,
        CancellationToken cancellationToken = default);

    Task AddAsync(ProductionHall hall, CancellationToken cancellationToken = default);
    Task AddSectionAsync(HallSection section, CancellationToken cancellationToken = default);
    Task UpdateAsync(ProductionHall hall, CancellationToken cancellationToken = default);
    Task DeleteSectionAsync(HallSection section, CancellationToken cancellationToken = default);
    Task DeleteAsync(ProductionHall hall, CancellationToken cancellationToken = default);
}
