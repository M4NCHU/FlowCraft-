using System.ComponentModel.DataAnnotations;
using Application.Services.Interfaces;
using Domain.Layouts;
using FlowCraft.Domain.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace FlowCraft.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class HallsController : ControllerBase
{
    private readonly IHallsService _service;
    private readonly ILogger<HallsController> _logger;

    public HallsController(IHallsService service, ILogger<HallsController> logger)
    {
        _service = service;
        _logger = logger;
    }

    public sealed record HallSummaryResponse(
        Guid Id,
        string Name,
        string Code,
        double AreaSqMeters,
        int SectionsCount);

    public sealed record HallDetailsResponse(
        Guid Id,
        string Name,
        string Code,
        string? Description,
        string OutlineJson,
        double AreaSqMeters,
        IReadOnlyList<SectionResponse> Sections);

    public sealed record SectionResponse(
        Guid Id,
        string Name,
        string? Code,
        string? Description,
        string OutlineJson,
        double AreaSqMeters);

    public sealed record CreateHallRequest(
        [Required] string Name,
        [Required] string Code,
        string? Description,
        [Required] string OutlineJson,
        [Range(0, double.MaxValue)] double AreaSqMeters);

    public sealed record UpdateHallRequest(
        [Required] string Name,
        [Required] string Code,
        string? Description,
        [Required] string OutlineJson,
        [Range(0, double.MaxValue)] double AreaSqMeters);

    public sealed record CreateSectionRequest(
        [Required] string Name,
        string? Code,
        string? Description,
        [Required] string OutlineJson,
        [Range(0, double.MaxValue)] double AreaSqMeters);

    public sealed record UpdateSectionRequest(
        [Required] string Name,
        string? Code,
        string? Description,
        [Required] string OutlineJson,
        [Range(0, double.MaxValue)] double AreaSqMeters);

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<HallSummaryResponse>>> GetHalls(CancellationToken ct)
    {
        var tenantId = User.GetTenantId();

        var halls = await _service.GetHallsAsync(tenantId, ct);

        var result = halls
            .Select(h => new HallSummaryResponse(
                h.Id,
                h.Name,
                h.Code,
                h.AreaSqMeters,
                h.Sections.Count))
            .ToList();

        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<HallDetailsResponse>> GetHall(Guid id, CancellationToken ct)
    {
        var tenantId = User.GetTenantId();

        var hall = await _service.GetHallAsync(tenantId, id, includeSections: true, ct: ct);
        if (hall is null)
            return NotFound();

        var response = new HallDetailsResponse(
            hall.Id,
            hall.Name,
            hall.Code,
            hall.Description,
            hall.OutlineJson,
            hall.AreaSqMeters,
            hall.Sections
                .OrderBy(s => s.Name)
                .Select(MapSection)
                .ToList());

        return Ok(response);
    }

    [HttpPost]
    //[Authorize(Roles = $"{Roles.Admin},{Roles.Planner}")]
    public async Task<ActionResult<HallDetailsResponse>> CreateHall(
        [FromBody] CreateHallRequest request,
        CancellationToken ct)
    {
        var tenantId = User.GetTenantId();

        var hall = await _service.CreateHallAsync(
            tenantId: tenantId,
            name: request.Name,
            code: request.Code,
            description: request.Description,
            outlineJson: request.OutlineJson,
            areaSqMeters: request.AreaSqMeters,
            ct: ct);

        _logger.LogInformation("Production hall created. hallId={HallId}, tenantId={TenantId}, name={Name}",
            hall.Id, tenantId, hall.Name);

        var response = new HallDetailsResponse(
            hall.Id,
            hall.Name,
            hall.Code,
            hall.Description,
            hall.OutlineJson,
            hall.AreaSqMeters,
            Array.Empty<SectionResponse>());

        return CreatedAtAction(nameof(GetHall), new { id = hall.Id }, response);
    }

    [HttpPut("{id:guid}")]
    //[Authorize(Roles = $"{Roles.Admin},{Roles.Planner}")]
    public async Task<IActionResult> UpdateHall(
        Guid id,
        [FromBody] UpdateHallRequest request,
        CancellationToken ct)
    {
        var tenantId = User.GetTenantId();

        await _service.UpdateHallAsync(
            tenantId: tenantId,
            hallId: id,
            name: request.Name,
            code: request.Code,
            description: request.Description,
            outlineJson: request.OutlineJson,
            areaSqMeters: request.AreaSqMeters,
            ct: ct);

        _logger.LogInformation("Production hall updated. hallId={HallId}, tenantId={TenantId}", id, tenantId);

        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.Planner}")]
    public async Task<IActionResult> DeleteHall(Guid id, CancellationToken ct)
    {
        var tenantId = User.GetTenantId();

        await _service.DeleteHallAsync(tenantId, id, ct);

        _logger.LogInformation("Production hall deleted. hallId={HallId}, tenantId={TenantId}", id, tenantId);

        return NoContent();
    }

    [HttpGet("{hallId:guid}/sections")]
    public async Task<ActionResult<IReadOnlyList<SectionResponse>>> GetSections(Guid hallId, CancellationToken ct)
    {
        var tenantId = User.GetTenantId();

        var sections = await _service.GetSectionsAsync(tenantId, hallId, ct);
        var result = sections.OrderBy(s => s.Name).Select(MapSection).ToList();

        return Ok(result);
    }

    [HttpPost("{hallId:guid}/sections")]
    //[Authorize(Roles = $"{Roles.Admin},{Roles.Planner}")]
    public async Task<ActionResult<SectionResponse>> CreateSection(
        Guid hallId,
        [FromBody] CreateSectionRequest request,
        CancellationToken ct)
    {
        var tenantId = User.GetTenantId();

        var section = await _service.CreateSectionAsync(
            tenantId: tenantId,
            hallId: hallId,
            name: request.Name,
            code: request.Code,
            description: request.Description,
            outlineJson: request.OutlineJson,
            areaSqMeters: request.AreaSqMeters,
            ct: ct);

        _logger.LogInformation(
            "Hall section created. tenantId={TenantId}, hallId={HallId}, sectionId={SectionId}",
            tenantId,
            hallId,
            section.Id);

        return CreatedAtAction(nameof(GetSections), new { hallId }, MapSection(section));
    }

    [HttpPut("{hallId:guid}/sections/{sectionId:guid}")]
    //[Authorize(Roles = $"{Roles.Admin},{Roles.Planner}")]
    public async Task<IActionResult> UpdateSection(
        Guid hallId,
        Guid sectionId,
        [FromBody] UpdateSectionRequest request,
        CancellationToken ct)
    {
        var tenantId = User.GetTenantId();

        await _service.UpdateSectionAsync(
            tenantId: tenantId,
            hallId: hallId,
            sectionId: sectionId,
            name: request.Name,
            code: request.Code,
            description: request.Description,
            outlineJson: request.OutlineJson,
            areaSqMeters: request.AreaSqMeters,
            ct: ct);

        _logger.LogInformation(
            "Hall section updated. tenantId={TenantId}, hallId={HallId}, sectionId={SectionId}",
            tenantId,
            hallId,
            sectionId);

        return NoContent();
    }

    [HttpDelete("{hallId:guid}/sections/{sectionId:guid}")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.Planner}")]
    public async Task<IActionResult> DeleteSection(Guid hallId, Guid sectionId, CancellationToken ct)
    {
        var tenantId = User.GetTenantId();

        await _service.DeleteSectionAsync(tenantId, hallId, sectionId, ct);

        _logger.LogInformation(
            "Hall section deleted. tenantId={TenantId}, hallId={HallId}, sectionId={SectionId}",
            tenantId,
            hallId,
            sectionId);

        return NoContent();
    }

    private static SectionResponse MapSection(HallSection section) =>
        new(
            section.Id,
            section.Name,
            section.Code,
            section.Description,
            section.OutlineJson,
            section.AreaSqMeters);
}
