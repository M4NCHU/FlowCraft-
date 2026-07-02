using Application.DTOs.Assets;
using Application.Services.Interfaces;
using FlowCraft.Domain.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FlowCraft.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class AssetsController : ControllerBase
{
    private readonly IAssetService _service;
    private readonly ILogger<AssetsController> _logger;

    public AssetsController(IAssetService service, ILogger<AssetsController> logger)
    {
        _service = service;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AssetListItemDto>>> GetAll([FromQuery] bool includeInactive, CancellationToken ct)
    {
        var tenantId = User.GetTenantId();
        var assets = await _service.GetAllAsync(tenantId, includeInactive, ct);
        return Ok(assets);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AssetDetailsDto>> GetById(Guid id, CancellationToken ct)
    {
        var tenantId = User.GetTenantId();
        var asset = await _service.GetByIdAsync(tenantId, id, ct);

        return asset is null ? NotFound() : Ok(asset);
    }

    [HttpPost]
    [Authorize(Roles = $"{Roles.Admin},{Roles.Manager},{Roles.Editor}")]
    public async Task<ActionResult<AssetDetailsDto>> Create([FromBody] CreateAssetRequest request, CancellationToken ct)
    {
        var tenantId = User.GetTenantId();

        try
        {
            var asset = await _service.CreateAsync(tenantId, request, ct);

            _logger.LogInformation("Asset created. tenantId={TenantId}, assetId={AssetId}", tenantId, asset.Id);

            return CreatedAtAction(nameof(GetById), new { id = asset.Id }, asset);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.Manager},{Roles.Editor}")]
    public async Task<ActionResult<AssetDetailsDto>> Update(Guid id, [FromBody] UpdateAssetRequest request, CancellationToken ct)
    {
        var tenantId = User.GetTenantId();

        try
        {
            var asset = await _service.UpdateAsync(tenantId, id, request, ct);

            _logger.LogInformation("Asset updated. tenantId={TenantId}, assetId={AssetId}", tenantId, id);

            return Ok(asset);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.Manager}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var tenantId = User.GetTenantId();

        try
        {
            await _service.DeleteAsync(tenantId, id, ct);

            _logger.LogInformation("Asset retired. tenantId={TenantId}, assetId={AssetId}", tenantId, id);

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/placement")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.Manager},{Roles.Editor}")]
    public async Task<ActionResult<AssetPlacementDto>> Place(Guid id, [FromBody] PlaceAssetRequest request, CancellationToken ct)
    {
        var tenantId = User.GetTenantId();

        try
        {
            var placement = await _service.PlaceAsync(tenantId, id, request, ct);

            _logger.LogInformation("Asset placed on map. tenantId={TenantId}, assetId={AssetId}, hallId={HallId}",
                tenantId,
                id,
                placement.HallId);

            return Ok(placement);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:guid}/placement")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.Manager},{Roles.Editor}")]
    public async Task<IActionResult> RemovePlacement(Guid id, CancellationToken ct)
    {
        var tenantId = User.GetTenantId();

        try
        {
            await _service.RemovePlacementAsync(tenantId, id, ct);

            _logger.LogInformation("Asset removed from hall map. tenantId={TenantId}, assetId={AssetId}",
                tenantId,
                id);

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/assignments")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.Manager},{Roles.Editor}")]
    public async Task<ActionResult<AssetAssignmentDto>> Assign(Guid id, [FromBody] AssignAssetRequest request, CancellationToken ct)
    {
        var tenantId = User.GetTenantId();

        try
        {
            var assignment = await _service.AssignAsync(tenantId, id, request, ct);

            _logger.LogInformation("Asset assigned. tenantId={TenantId}, assetId={AssetId}, employeeId={EmployeeId}",
                tenantId,
                id,
                assignment.EmployeeId);

            return Ok(assignment);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/return")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.Manager},{Roles.Editor}")]
    public async Task<ActionResult<AssetAssignmentDto>> Return(Guid id, [FromBody] ReturnAssetRequest request, CancellationToken ct)
    {
        var tenantId = User.GetTenantId();

        try
        {
            var assignment = await _service.ReturnAsync(tenantId, id, request, ct);

            _logger.LogInformation("Asset returned. tenantId={TenantId}, assetId={AssetId}", tenantId, id);

            return Ok(assignment);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{id:guid}/usage-readings")]
    public async Task<ActionResult<IReadOnlyList<AssetUsageReadingDto>>> GetUsageReadings(Guid id, CancellationToken ct)
    {
        var tenantId = User.GetTenantId();

        try
        {
            var readings = await _service.GetUsageReadingsAsync(tenantId, id, ct);
            return Ok(readings);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/usage-readings")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.Manager},{Roles.Editor}")]
    public async Task<ActionResult<AssetUsageReadingDto>> AddUsageReading(
        Guid id,
        [FromBody] CreateAssetUsageReadingRequest request,
        CancellationToken ct)
    {
        var tenantId = User.GetTenantId();

        try
        {
            var reading = await _service.AddUsageReadingAsync(tenantId, id, request, ct);
            return Ok(reading);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
