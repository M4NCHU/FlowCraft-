using FlowCraft.Application.Projects;
using FlowCraft.Domain.Projects;
using FlowCraft.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace FlowCraft.Infrastructure.Projects
{
    public sealed class ProjectRepository : IProjectRepository
    {
        private readonly FlowCraftDbContext _db;
        private readonly ILogger<ProjectRepository> _logger;

        public ProjectRepository(FlowCraftDbContext db, ILogger<ProjectRepository> logger)
        {
            _db = db;
            _logger = logger;
        }

        public async Task<IReadOnlyList<Project>> GetAllAsync(CancellationToken ct)
        {
            _logger.LogInformation("ProjectRepository.GetAllAsync called.");

            return await _db.Projects
                .OrderByDescending(p => p.CreatedAt)
                .AsNoTracking()
                .ToListAsync(ct);
        }

        public async Task<Project?> GetByIdAsync(Guid id, CancellationToken ct)
        {
            _logger.LogInformation("ProjectRepository.GetByIdAsync called. id={Id}", id);

            return await _db.Projects
                .Include(p => p.Layouts)
                .SingleOrDefaultAsync(p => p.Id == id, ct);
        }

        public async Task<Project> AddAsync(Project project, CancellationToken ct)
        {
            _logger.LogInformation("ProjectRepository.AddAsync called. name={Name}", project.Name);

            await _db.Projects.AddAsync(project, ct);
            return project;
        }

        public Task<Project?> UpdateAsync(Project project, CancellationToken ct)
        {
            _logger.LogInformation("ProjectRepository.UpdateAsync called. id={Id}", project.Id);

            _db.Projects.Update(project);
            return Task.FromResult<Project?>(project);
        }

        public async Task<bool> DeleteAsync(Guid id, CancellationToken ct)
        {
            _logger.LogInformation("ProjectRepository.DeleteAsync called. id={Id}", id);

            var project = await _db.Projects.SingleOrDefaultAsync(p => p.Id == id, ct);
            if (project is null)
                return false;

            _db.Projects.Remove(project);
            return true;
        }
    }
}
