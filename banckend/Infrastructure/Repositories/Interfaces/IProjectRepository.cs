using FlowCraft.Domain.Projects;

namespace FlowCraft.Application.Projects;

public interface IProjectRepository
{
    Task<IReadOnlyList<Project>> GetAllAsync(CancellationToken ct);
    Task<Project?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<Project> AddAsync(Project project, CancellationToken ct);
    Task<Project?> UpdateAsync(Project project, CancellationToken ct);
    Task<bool> DeleteAsync(Guid id, CancellationToken ct);
}