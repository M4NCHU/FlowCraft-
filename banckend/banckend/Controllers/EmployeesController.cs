using Application.DTOs.Employees;
using Application.Services.Interfaces;
using FlowCraft.Domain.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FlowCraft.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class EmployeesController : ControllerBase
{
    private readonly IEmployeeService _service;
    private readonly ILogger<EmployeesController> _logger;

    public EmployeesController(IEmployeeService service, ILogger<EmployeesController> logger)
    {
        _service = service;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<EmployeeDto>>> GetAll([FromQuery] bool includeInactive, CancellationToken ct)
    {
        var tenantId = User.GetTenantId();
        var employees = await _service.GetAllAsync(tenantId, includeInactive, ct);
        return Ok(employees);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<EmployeeDto>> GetById(Guid id, CancellationToken ct)
    {
        var tenantId = User.GetTenantId();
        var employee = await _service.GetByIdAsync(tenantId, id, ct);

        return employee is null ? NotFound() : Ok(employee);
    }

    [HttpPost]
    [Authorize(Roles = $"{Roles.Admin},{Roles.Manager}")]
    public async Task<ActionResult<EmployeeDto>> Create([FromBody] CreateEmployeeRequest request, CancellationToken ct)
    {
        var tenantId = User.GetTenantId();

        try
        {
            var employee = await _service.CreateAsync(tenantId, request, ct);

            _logger.LogInformation("Employee created. tenantId={TenantId}, employeeId={EmployeeId}", tenantId, employee.Id);

            return CreatedAtAction(nameof(GetById), new { id = employee.Id }, employee);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.Manager}")]
    public async Task<ActionResult<EmployeeDto>> Update(Guid id, [FromBody] UpdateEmployeeRequest request, CancellationToken ct)
    {
        var tenantId = User.GetTenantId();

        try
        {
            var employee = await _service.UpdateAsync(tenantId, id, request, ct);

            _logger.LogInformation("Employee updated. tenantId={TenantId}, employeeId={EmployeeId}", tenantId, id);

            return Ok(employee);
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

            _logger.LogInformation("Employee deactivated. tenantId={TenantId}, employeeId={EmployeeId}", tenantId, id);

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}/skills")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.Manager}")]
    public async Task<ActionResult<IReadOnlyList<EmployeeSkillDto>>> ReplaceSkills(
        Guid id,
        [FromBody] ReplaceEmployeeSkillsRequest request,
        CancellationToken ct)
    {
        var tenantId = User.GetTenantId();

        try
        {
            var skills = await _service.ReplaceSkillsAsync(tenantId, id, request, ct);
            return Ok(skills);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
