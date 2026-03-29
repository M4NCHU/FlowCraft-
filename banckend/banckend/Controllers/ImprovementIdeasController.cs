using Application.DTOs.Lean;
using Application.Services.Interfaces;
using FlowCraft.Domain.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FlowCraft.Api.Controllers;

[ApiController]
[Route("api/improvement-ideas")]
[Authorize]
public sealed class ImprovementIdeasController : ControllerBase
{
    private readonly IImprovementIdeaService _service;
    private readonly ILogger<ImprovementIdeasController> _logger;

    public ImprovementIdeasController(IImprovementIdeaService service, ILogger<ImprovementIdeasController> logger)
    {
        _service = service;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ImprovementIdeaDto>>> GetAll([FromQuery] bool includeClosed = true, CancellationToken ct = default)
    {
        var tenantId = User.GetTenantId();
        var ideas = await _service.GetAllAsync(tenantId, includeClosed, ct);
        return Ok(ideas);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ImprovementIdeaDto>> GetById(Guid id, CancellationToken ct = default)
    {
        var tenantId = User.GetTenantId();
        var idea = await _service.GetByIdAsync(tenantId, id, ct);

        return idea is null ? NotFound() : Ok(idea);
    }

    [HttpPost]
    [Authorize(Roles = $"{Roles.Admin},{Roles.Manager},{Roles.Editor}")]
    public async Task<ActionResult<ImprovementIdeaDto>> Create([FromBody] CreateImprovementIdeaRequest request, CancellationToken ct = default)
    {
        var tenantId = User.GetTenantId();

        try
        {
            var idea = await _service.CreateAsync(tenantId, request, ct);

            _logger.LogInformation("Improvement idea created. tenantId={TenantId}, ideaId={IdeaId}", tenantId, idea.Id);

            return CreatedAtAction(nameof(GetById), new { id = idea.Id }, idea);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.Manager},{Roles.Editor}")]
    public async Task<ActionResult<ImprovementIdeaDto>> Update(Guid id, [FromBody] UpdateImprovementIdeaRequest request, CancellationToken ct = default)
    {
        var tenantId = User.GetTenantId();

        try
        {
            var idea = await _service.UpdateAsync(tenantId, id, request, ct);

            _logger.LogInformation("Improvement idea updated. tenantId={TenantId}, ideaId={IdeaId}", tenantId, id);

            return Ok(idea);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/status")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.Manager},{Roles.Editor}")]
    public async Task<ActionResult<ImprovementIdeaDto>> SetStatus(Guid id, [FromBody] SetImprovementIdeaStatusRequest request, CancellationToken ct = default)
    {
        var tenantId = User.GetTenantId();

        try
        {
            var idea = await _service.SetStatusAsync(tenantId, id, request, ct);

            _logger.LogInformation("Improvement idea status updated. tenantId={TenantId}, ideaId={IdeaId}, status={Status}", tenantId, id, request.Status);

            return Ok(idea);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
