

using FlowCraft.Domain.Projects;

namespace FlowCraft.Application.Projects;

public interface IProjectService
{
    Task<IReadOnlyList<Project>> GetAllAsync(CancellationToken ct);
    Task<Project?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<Project> CreateAsync(string name, string? description, CancellationToken ct);
    Task<Project?> UpdateAsync(Guid id, string name, string? description, CancellationToken ct);
    Task<bool> DeleteAsync(Guid id, CancellationToken ct);
}