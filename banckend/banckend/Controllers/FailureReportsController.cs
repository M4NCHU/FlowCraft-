using Application.DTOs.Maintenance;
using Application.Services.Interfaces;
using FlowCraft.Domain.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FlowCraft.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class FailureReportsController : ControllerBase
{
    private readonly IFailureReportService _service;
    private readonly ILogger<FailureReportsController> _logger;

    public FailureReportsController(IFailureReportService service, ILogger<FailureReportsController> logger)
    {
        _service = service;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<FailureReportDto>>> GetAll([FromQuery] bool openOnly, CancellationToken ct)
    {
        var tenantId = User.GetTenantId();
        var reports = await _service.GetAllAsync(tenantId, openOnly, ct);
        return Ok(reports);
    }

    [HttpGet("analytics")]
    public async Task<ActionResult<FailureAnalyticsDto>> GetAnalytics(CancellationToken ct)
    {
        var tenantId = User.GetTenantId();
        var analytics = await _service.GetAnalyticsAsync(tenantId, ct);
        return Ok(analytics);
    }

    [HttpGet("cause-categories")]
    public async Task<ActionResult<IReadOnlyList<FailureCauseCategoryDto>>> GetCauseCategories(
        [FromQuery] bool includeInactive,
        CancellationToken ct)
    {
        var tenantId = User.GetTenantId();
        var categories = await _service.GetCauseCategoriesAsync(tenantId, includeInactive, ct);
        return Ok(categories);
    }

    [HttpPost("cause-categories")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.Manager},{Roles.Editor}")]
    public async Task<ActionResult<FailureCauseCategoryDto>> CreateCauseCategory(
        [FromBody] CreateFailureCauseCategoryRequest request,
        CancellationToken ct)
    {
        var tenantId = User.GetTenantId();

        try
        {
            var category = await _service.CreateCauseCategoryAsync(tenantId, request, ct);
            return Ok(category);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("cause-categories/{id:guid}")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.Manager},{Roles.Editor}")]
    public async Task<ActionResult<FailureCauseCategoryDto>> UpdateCauseCategory(
        Guid id,
        [FromBody] UpdateFailureCauseCategoryRequest request,
        CancellationToken ct)
    {
        var tenantId = User.GetTenantId();

        try
        {
            var category = await _service.UpdateCauseCategoryAsync(tenantId, id, request, ct);
            return Ok(category);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<FailureReportDto>> GetById(Guid id, CancellationToken ct)
    {
        var tenantId = User.GetTenantId();
        var report = await _service.GetByIdAsync(tenantId, id, ct);

        return report is null ? NotFound() : Ok(report);
    }

    [HttpPost]
    [Authorize(Roles = $"{Roles.Admin},{Roles.Manager},{Roles.Editor}")]
    public async Task<ActionResult<FailureReportDto>> Create([FromBody] CreateFailureReportRequest request, CancellationToken ct)
    {
        var tenantId = User.GetTenantId();

        try
        {
            var report = await _service.CreateAsync(tenantId, request, ct);

            _logger.LogInformation("Failure report created. tenantId={TenantId}, reportId={ReportId}", tenantId, report.Id);

            return CreatedAtAction(nameof(GetById), new { id = report.Id }, report);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.Manager},{Roles.Editor}")]
    public async Task<ActionResult<FailureReportDto>> Update(Guid id, [FromBody] UpdateFailureReportRequest request, CancellationToken ct)
    {
        var tenantId = User.GetTenantId();

        try
        {
            var report = await _service.UpdateAsync(tenantId, id, request, ct);

            _logger.LogInformation("Failure report updated. tenantId={TenantId}, reportId={ReportId}", tenantId, id);

            return Ok(report);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}/status")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.Manager},{Roles.Editor}")]
    public async Task<ActionResult<FailureReportDto>> SetStatus(Guid id, [FromBody] SetFailureReportStatusRequest request, CancellationToken ct)
    {
        var tenantId = User.GetTenantId();

        try
        {
            var report = await _service.SetStatusAsync(tenantId, id, request, ct);

            _logger.LogInformation("Failure report status changed. tenantId={TenantId}, reportId={ReportId}, status={Status}",
                tenantId,
                id,
                report.Status);

            return Ok(report);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
