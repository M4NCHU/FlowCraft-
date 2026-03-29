using Application.DTOs.Maintenance;
using Application.Services.Interfaces;
using FlowCraft.Domain.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FlowCraft.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class WorkOrdersController : ControllerBase
{
    private readonly IWorkOrderService _service;
    private readonly ILogger<WorkOrdersController> _logger;

    public WorkOrdersController(IWorkOrderService service, ILogger<WorkOrdersController> logger)
    {
        _service = service;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<WorkOrderDto>>> GetAll(CancellationToken ct)
    {
        var tenantId = User.GetTenantId();
        var workOrders = await _service.GetAllAsync(tenantId, ct);
        return Ok(workOrders);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<WorkOrderDto>> GetById(Guid id, CancellationToken ct)
    {
        var tenantId = User.GetTenantId();
        var workOrder = await _service.GetByIdAsync(tenantId, id, ct);

        return workOrder is null ? NotFound() : Ok(workOrder);
    }

    [HttpPost]
    [Authorize(Roles = $"{Roles.Admin},{Roles.Manager},{Roles.Editor}")]
    public async Task<ActionResult<WorkOrderDto>> Create([FromBody] CreateWorkOrderRequest request, CancellationToken ct)
    {
        var tenantId = User.GetTenantId();
        var workOrder = await _service.CreateAsync(tenantId, request, ct);

        _logger.LogInformation("Work order created. tenantId={TenantId}, workOrderId={WorkOrderId}", tenantId, workOrder.Id);

        return CreatedAtAction(nameof(GetById), new { id = workOrder.Id }, workOrder);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.Manager},{Roles.Editor}")]
    public async Task<ActionResult<WorkOrderDto>> Update(Guid id, [FromBody] UpdateWorkOrderRequest request, CancellationToken ct)
    {
        var tenantId = User.GetTenantId();

        try
        {
            var workOrder = await _service.UpdateAsync(tenantId, id, request, ct);

            _logger.LogInformation("Work order updated. tenantId={TenantId}, workOrderId={WorkOrderId}", tenantId, id);

            return Ok(workOrder);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}/status")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.Manager},{Roles.Editor}")]
    public async Task<ActionResult<WorkOrderDto>> SetStatus(Guid id, [FromBody] SetWorkOrderStatusRequest request, CancellationToken ct)
    {
        var tenantId = User.GetTenantId();

        try
        {
            var workOrder = await _service.SetStatusAsync(tenantId, id, request, ct);

            _logger.LogInformation("Work order status changed. tenantId={TenantId}, workOrderId={WorkOrderId}, status={Status}",
                tenantId,
                id,
                workOrder.Status);

            return Ok(workOrder);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
