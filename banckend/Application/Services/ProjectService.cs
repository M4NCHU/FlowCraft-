using FlowCraft.Interfaces.Abstractions;
using FlowCraft.Domain.Projects;
using FlowCraft.Infrastructure.Persistence;
using Microsoft.Extensions.Logging;

namespace FlowCraft.Application.Projects
{
    public sealed class ProjectService : IProjectService
    {
        private readonly IProjectRepository _projects;
        private readonly IUnitOfWork _unitOfWork;
        private readonly ILogger<ProjectService> _logger;

        public ProjectService(
            IProjectRepository projects,
            IUnitOfWork unitOfWork,
            ILogger<ProjectService> logger)
        {
            _projects = projects;
            _unitOfWork = unitOfWork;
            _logger = logger;
        }

        public async Task<IReadOnlyList<Project>> GetAllAsync(CancellationToken ct)
        {
            _logger.LogInformation("ProjectService.GetAllAsync called.");
            return await _projects.GetAllAsync(ct);
        }

        public async Task<Project?> GetByIdAsync(Guid id, CancellationToken ct)
        {
            _logger.LogInformation("ProjectService.GetByIdAsync called. id={Id}", id);
            return await _projects.GetByIdAsync(id, ct);
        }

        public async Task<Project> CreateAsync(string name, string? description, CancellationToken ct)
        {
            _logger.LogInformation("ProjectService.CreateAsync called. name={Name}", name);

            var now = DateTime.UtcNow;

            var project = new Project
            {
                Id = Guid.NewGuid(),
                Name = name.Trim(),
                Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim(),
                CreatedAt = now,
                UpdatedAt = now
            };

            await _projects.AddAsync(project, ct);
            await _unitOfWork.SaveChangesAsync(ct);

            return project;
        }

        public async Task<Project?> UpdateAsync(Guid id, string name, string? description, CancellationToken ct)
        {
            _logger.LogInformation("ProjectService.UpdateAsync called. id={Id}", id);

            var existing = await _projects.GetByIdAsync(id, ct);
            if (existing is null)
                return null;

            existing.Name = name.Trim();
            existing.Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
            existing.UpdatedAt = DateTime.UtcNow;

            await _projects.UpdateAsync(existing, ct);
            await _unitOfWork.SaveChangesAsync(ct);

            return existing;
        }

        public async Task<bool> DeleteAsync(Guid id, CancellationToken ct)
        {
            _logger.LogInformation("ProjectService.DeleteAsync called. id={Id}", id);

            var existing = await _projects.GetByIdAsync(id, ct);
            if (existing is null)
                return false;

            if (existing.Layouts.Any())
            {
                _logger.LogWarning(
                    "Cannot delete project with layouts. id={Id}, layoutsCount={LayoutsCount}",
                    id,
                    existing.Layouts.Count);

                return false;
            }

            var removed = await _projects.DeleteAsync(id, ct);
            if (!removed)
                return false;

            await _unitOfWork.SaveChangesAsync(ct);
            return true;
        }
    }
}
