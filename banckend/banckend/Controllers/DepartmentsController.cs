using Application.DTOs.Employees;
using Application.Services.Interfaces;
using FlowCraft.Domain.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FlowCraft.Api.Controllers;

[ApiController]
[Route("api/departments")]
[Authorize]
public sealed class DepartmentsController : ControllerBase
{
    private readonly IDepartmentService _service;
    private readonly ILogger<DepartmentsController> _logger;

    public DepartmentsController(IDepartmentService service, ILogger<DepartmentsController> logger)
    {
        _service = service;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<DepartmentDto>>> GetAll([FromQuery] bool includeInactive, CancellationToken ct)
    {
        var tenantId = User.GetTenantId();
        var departments = await _service.GetAllAsync(tenantId, includeInactive, ct);
        return Ok(departments);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<DepartmentDto>> GetById(Guid id, CancellationToken ct)
    {
        var tenantId = User.GetTenantId();
        var department = await _service.GetByIdAsync(tenantId, id, ct);

        return department is null ? NotFound() : Ok(department);
    }

    [HttpPost]
    [Authorize(Roles = $"{Roles.Admin},{Roles.Manager}")]
    public async Task<ActionResult<DepartmentDto>> Create([FromBody] CreateDepartmentRequest request, CancellationToken ct)
    {
        var tenantId = User.GetTenantId();

        try
        {
            var department = await _service.CreateAsync(tenantId, request, ct);

            _logger.LogInformation("Department created. tenantId={TenantId}, departmentId={DepartmentId}", tenantId, department.Id);

            return CreatedAtAction(nameof(GetById), new { id = department.Id }, department);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.Manager}")]
    public async Task<ActionResult<DepartmentDto>> Update(Guid id, [FromBody] UpdateDepartmentRequest request, CancellationToken ct)
    {
        var tenantId = User.GetTenantId();

        try
        {
            var department = await _service.UpdateAsync(tenantId, id, request, ct);

            _logger.LogInformation("Department updated. tenantId={TenantId}, departmentId={DepartmentId}", tenantId, id);

            return Ok(department);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
