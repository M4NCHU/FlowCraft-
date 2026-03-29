using Domain.Lean;

namespace Infrastructure.Repositories.Interfaces;

public interface IImprovementIdeaRepository
{
    Task<IReadOnlyList<ImprovementIdea>> GetAllAsync(Guid tenantId, bool includeClosed = true, CancellationToken cancellationToken = default);
    Task<ImprovementIdea?> GetByIdAsync(Guid tenantId, Guid id, CancellationToken cancellationToken = default);

    Task AddAsync(ImprovementIdea idea, CancellationToken cancellationToken = default);
    Task UpdateAsync(ImprovementIdea idea, CancellationToken cancellationToken = default);
}
