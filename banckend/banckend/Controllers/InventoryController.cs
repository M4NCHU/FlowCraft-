using Application.DTOs.Inventory;
using Application.Services;
using FlowCraft.Domain.Auth;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace banckend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
public class InventoryController : ControllerBase
{
    private readonly IInventoryService _inventoryService;
    private readonly ILogger<InventoryController> _logger;

    public InventoryController(IInventoryService inventoryService, ILogger<InventoryController> logger)
    {
        _inventoryService = inventoryService;
        _logger = logger;
    }

    #region Categories

    [HttpGet("categories")]
    [ProducesResponseType(typeof(List<InventoryCategoryDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<InventoryCategoryDto>>> GetAllCategories(CancellationToken cancellationToken)
    {
        var tenantId = User.GetTenantId();
        var categories = await _inventoryService.GetAllCategoriesAsync(tenantId, cancellationToken);
        return Ok(categories);
    }

    [HttpGet("categories/{id}")]
    [ProducesResponseType(typeof(InventoryCategoryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<InventoryCategoryDto>> GetCategoryById(Guid id, CancellationToken cancellationToken)
    {
        var tenantId = User.GetTenantId();
        var category = await _inventoryService.GetCategoryByIdAsync(tenantId, id, cancellationToken);
        if (category is null)
            return NotFound();
        return Ok(category);
    }

    [HttpPost("categories")]
    [ProducesResponseType(typeof(InventoryCategoryDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<InventoryCategoryDto>> CreateCategory(
        CreateInventoryCategoryRequest request,
        CancellationToken cancellationToken)
    {
        var tenantId = User.GetTenantId();
        var category = await _inventoryService.CreateCategoryAsync(tenantId, request, cancellationToken);
        return CreatedAtAction(nameof(GetCategoryById), new { id = category.Id }, category);
    }

    [HttpPut("categories/{id}")]
    [ProducesResponseType(typeof(InventoryCategoryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<InventoryCategoryDto>> UpdateCategory(
        Guid id,
        UpdateInventoryCategoryRequest request,
        CancellationToken cancellationToken)
    {
        var tenantId = User.GetTenantId();
        try
        {
            var category = await _inventoryService.UpdateCategoryAsync(tenantId, id, request, cancellationToken);
            return Ok(category);
        }
        catch (InvalidOperationException)
        {
            return NotFound();
        }
    }

    [HttpDelete("categories/{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteCategory(Guid id, CancellationToken cancellationToken)
    {
        var tenantId = User.GetTenantId();
        try
        {
            await _inventoryService.DeleteCategoryAsync(tenantId, id, cancellationToken);
            return NoContent();
        }
        catch (InvalidOperationException)
        {
            return NotFound();
        }
    }

    #endregion

    #region Items

    [HttpGet("items")]
    [ProducesResponseType(typeof(List<InventoryItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<InventoryItemDto>>> GetAllItems(CancellationToken cancellationToken)
    {
        var tenantId = User.GetTenantId();
        var items = await _inventoryService.GetAllItemsAsync(tenantId, cancellationToken);
        return Ok(items);
    }

    [HttpGet("items/{id}")]
    [ProducesResponseType(typeof(InventoryItemDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<InventoryItemDto>> GetItemById(Guid id, CancellationToken cancellationToken)
    {
        var tenantId = User.GetTenantId();
        var item = await _inventoryService.GetItemByIdAsync(tenantId, id, cancellationToken);
        if (item is null)
            return NotFound();
        return Ok(item);
    }

    [HttpPost("items")]
    [ProducesResponseType(typeof(InventoryItemDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<InventoryItemDto>> CreateItem(
        CreateInventoryItemRequest request,
        CancellationToken cancellationToken)
    {
        var tenantId = User.GetTenantId();
        var item = await _inventoryService.CreateItemAsync(tenantId, request, cancellationToken);
        return CreatedAtAction(nameof(GetItemById), new { id = item.Id }, item);
    }

    [HttpPut("items/{id}")]
    [ProducesResponseType(typeof(InventoryItemDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<InventoryItemDto>> UpdateItem(
        Guid id,
        UpdateInventoryItemRequest request,
        CancellationToken cancellationToken)
    {
        var tenantId = User.GetTenantId();
        try
        {
            var item = await _inventoryService.UpdateItemAsync(tenantId, id, request, cancellationToken);
            return Ok(item);
        }
        catch (InvalidOperationException)
        {
            return NotFound();
        }
    }

    [HttpDelete("items/{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteItem(Guid id, CancellationToken cancellationToken)
    {
        var tenantId = User.GetTenantId();
        try
        {
            await _inventoryService.DeleteItemAsync(tenantId, id, cancellationToken);
            return NoContent();
        }
        catch (InvalidOperationException)
        {
            return NotFound();
        }
    }

    #endregion

    #region Procurements

    [HttpGet("procurements")]
    [ProducesResponseType(typeof(List<InventoryProcurementOrderDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<InventoryProcurementOrderDto>>> GetAllProcurements(CancellationToken cancellationToken)
    {
        var tenantId = User.GetTenantId();
        var procurements = await _inventoryService.GetAllProcurementsAsync(tenantId, cancellationToken);
        return Ok(procurements);
    }

    [HttpGet("procurements/open")]
    [ProducesResponseType(typeof(List<InventoryProcurementOrderDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<InventoryProcurementOrderDto>>> GetOpenProcurements(CancellationToken cancellationToken)
    {
        var tenantId = User.GetTenantId();
        var procurements = await _inventoryService.GetOpenProcurementsAsync(tenantId, cancellationToken);
        return Ok(procurements);
    }

    [HttpGet("procurements/recommendations")]
    [ProducesResponseType(typeof(List<InventoryReplenishmentRecommendationDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<InventoryReplenishmentRecommendationDto>>> GetReplenishmentRecommendations(
        CancellationToken cancellationToken)
    {
        var tenantId = User.GetTenantId();
        var recommendations = await _inventoryService.GetReplenishmentRecommendationsAsync(tenantId, cancellationToken);
        return Ok(recommendations);
    }

    [HttpGet("procurements/{id}")]
    [ProducesResponseType(typeof(InventoryProcurementOrderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<InventoryProcurementOrderDto>> GetProcurementById(Guid id, CancellationToken cancellationToken)
    {
        var tenantId = User.GetTenantId();
        var procurement = await _inventoryService.GetProcurementByIdAsync(tenantId, id, cancellationToken);
        if (procurement is null)
            return NotFound();
        return Ok(procurement);
    }

    [HttpPost("procurements")]
    [ProducesResponseType(typeof(InventoryProcurementOrderDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<InventoryProcurementOrderDto>> CreateProcurement(
        CreateInventoryProcurementOrderRequest request,
        CancellationToken cancellationToken)
    {
        var tenantId = User.GetTenantId();
        var procurement = await _inventoryService.CreateProcurementAsync(tenantId, request, cancellationToken);
        return CreatedAtAction(nameof(GetProcurementById), new { id = procurement.Id }, procurement);
    }

    [HttpPost("procurements/recommendations/{itemId}/draft")]
    [ProducesResponseType(typeof(InventoryProcurementOrderDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<InventoryProcurementOrderDto>> CreateRecommendedProcurementDraft(
        Guid itemId,
        CancellationToken cancellationToken)
    {
        var tenantId = User.GetTenantId();

        try
        {
            var procurement = await _inventoryService.CreateRecommendedProcurementDraftAsync(
                tenantId,
                itemId,
                cancellationToken);

            return CreatedAtAction(nameof(GetProcurementById), new { id = procurement.Id }, procurement);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("procurements/{id}")]
    [ProducesResponseType(typeof(InventoryProcurementOrderDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<InventoryProcurementOrderDto>> UpdateProcurement(
        Guid id,
        UpdateInventoryProcurementOrderRequest request,
        CancellationToken cancellationToken)
    {
        var tenantId = User.GetTenantId();
        try
        {
            var procurement = await _inventoryService.UpdateProcurementAsync(tenantId, id, request, cancellationToken);
            return Ok(procurement);
        }
        catch (InvalidOperationException)
        {
            return NotFound();
        }
    }

    [HttpDelete("procurements/{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteProcurement(Guid id, CancellationToken cancellationToken)
    {
        var tenantId = User.GetTenantId();
        try
        {
            await _inventoryService.DeleteProcurementAsync(tenantId, id, cancellationToken);
            return NoContent();
        }
        catch (InvalidOperationException)
        {
            return NotFound();
        }
    }

    #endregion
}
