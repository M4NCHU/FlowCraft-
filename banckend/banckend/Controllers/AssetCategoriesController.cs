using Application.DTOs.Assets;
using Application.Services.Interfaces;
using Domain.Assets;
using FlowCraft.Domain.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FlowCraft.Api.Controllers;

[ApiController]
[Route("api/asset-categories")]
[Authorize]
public sealed class AssetCategoriesController : ControllerBase
{
    private readonly IAssetCategoryService _service;
    private readonly ILogger<AssetCategoriesController> _logger;

    public AssetCategoriesController(IAssetCategoryService service, ILogger<AssetCategoriesController> logger)
    {
        _service = service;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AssetCategoryDto>>> GetAll(
        [FromQuery] AssetType? assetType,
        [FromQuery] bool includeInactive,
        CancellationToken ct)
    {
        var tenantId = User.GetTenantId();
        var categories = await _service.GetAllAsync(tenantId, assetType, includeInactive, ct);
        return Ok(categories);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AssetCategoryDto>> GetById(Guid id, CancellationToken ct)
    {
        var tenantId = User.GetTenantId();
        var category = await _service.GetByIdAsync(tenantId, id, ct);
        return category is null ? NotFound() : Ok(category);
    }

    [HttpPost]
    [Authorize(Roles = $"{Roles.Admin},{Roles.Manager},{Roles.Editor}")]
    public async Task<ActionResult<AssetCategoryDto>> Create([FromBody] CreateAssetCategoryRequest request, CancellationToken ct)
    {
        var tenantId = User.GetTenantId();

        try
        {
            var category = await _service.CreateAsync(tenantId, request, ct);

            _logger.LogInformation("Asset category created. tenantId={TenantId}, categoryId={CategoryId}", tenantId, category.Id);

            return CreatedAtAction(nameof(GetById), new { id = category.Id }, category);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.Manager},{Roles.Editor}")]
    public async Task<ActionResult<AssetCategoryDto>> Update(Guid id, [FromBody] UpdateAssetCategoryRequest request, CancellationToken ct)
    {
        var tenantId = User.GetTenantId();

        try
        {
            var category = await _service.UpdateAsync(tenantId, id, request, ct);

            _logger.LogInformation("Asset category updated. tenantId={TenantId}, categoryId={CategoryId}", tenantId, id);

            return Ok(category);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
