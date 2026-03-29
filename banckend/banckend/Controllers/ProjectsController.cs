using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Application.DTOs.Projects;
using FlowCraft.Application.Projects;
using FlowCraft.Domain.Auth;
using FlowCraft.Domain.Projects;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FlowCraft.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class ProjectsController : ControllerBase
{
    private readonly IProjectService _service;
    private readonly ILogger<ProjectsController> _logger;

    public ProjectsController(
        IProjectService service,
        ILogger<ProjectsController> logger)
    {
        _service = service;
        _logger = logger;
    }

    [Authorize(Policy = Policies.CanManageProjects)]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProjectListItemDto>>> GetAll(CancellationToken ct)
    {
        _logger.LogInformation("ProjectsController.GetAll called.");

        var projects = await _service.GetAllAsync(ct);
        var dtos = projects.Select(MapListItem).ToList();

        return Ok(dtos);
    }

    [Authorize(Policy = Policies.CanManageProjects)]
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ProjectDetailsDto>> GetById(Guid id, CancellationToken ct)
    {
        _logger.LogInformation("ProjectsController.GetById called. id={Id}", id);

        var project = await _service.GetByIdAsync(id, ct);
        if (project is null)
            return NotFound(new { message = "Project not found" });

        return Ok(MapDetails(project));
    }

    [Authorize(Policy = Policies.CanManageProjects)]
    [HttpPost]
    public async Task<ActionResult<ProjectDetailsDto>> Create(
        [FromBody] CreateProjectRequest request,
        CancellationToken ct)
    {
        _logger.LogInformation("ProjectsController.Create called. name={Name}", request.Name);

        var project = await _service.CreateAsync(request.Name, request.Description, ct);

        return CreatedAtAction(nameof(GetById), new { id = project.Id }, MapDetails(project));
    }

    [Authorize(Policy = Policies.CanManageProjects)]
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ProjectDetailsDto>> Update(
        Guid id,
        [FromBody] UpdateProjectRequest request,
        CancellationToken ct)
    {
        _logger.LogInformation("ProjectsController.Update called. id={Id}", id);

        var project = await _service.UpdateAsync(id, request.Name, request.Description, ct);
        if (project is null)
            return NotFound(new { message = "Project not found" });

        return Ok(MapDetails(project));
    }

    [Authorize(Policy = Policies.CanManageProjects)]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        _logger.LogInformation("ProjectsController.Delete called. id={Id}", id);

        var success = await _service.DeleteAsync(id, ct);
        if (!success)
            return BadRequest(new { message = "Cannot delete project or project not found" });

        return NoContent();
    }

    private static ProjectListItemDto MapListItem(Project project) =>
        new()
        {
            Id = project.Id,
            Name = project.Name,
            Description = project.Description,
            CreatedAt = project.CreatedAt,
            UpdatedAt = project.UpdatedAt
        };

    private static ProjectDetailsDto MapDetails(Project project) =>
        new()
        {
            Id = project.Id,
            Name = project.Name,
            Description = project.Description,
            CreatedAt = project.CreatedAt,
            UpdatedAt = project.UpdatedAt,
            LayoutsCount = project.Layouts.Count
        };
}
