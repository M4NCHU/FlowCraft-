using System.ComponentModel.DataAnnotations;
using Application.DTOs.Tenant;
using Application.Services.Interfaces;
using Domain.Instance;
using FlowCraft.Domain.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FlowCraft.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class TenantsController : ControllerBase
{
    private readonly ITenantService _service;

    public TenantsController(ITenantService service)
    {
        _service = service;
    }

    [Authorize(Roles = Roles.TenantAdmin)]
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TenantDto>>> GetAll(CancellationToken cancellationToken)
    {
        var tenants = await _service.GetAllAsync(cancellationToken);
        return Ok(tenants.Select(Map).ToList());
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<TenantDto>> GetMyTenant(CancellationToken cancellationToken)
    {
        var tenantId = User.GetTenantId();

        var tenant = await _service.GetByIdReadOnlyAsync(tenantId, cancellationToken);
        if (tenant is null)
            return NotFound();

        return Ok(Map(tenant));
    }

    [Authorize(Roles = Roles.TenantAdmin)]
    [HttpPut("me")]
    public async Task<ActionResult<TenantDto>> UpdateMyTenant(
        [FromBody] UpdateTenantRequest request,
        CancellationToken cancellationToken)
    {
        var tenantId = User.GetTenantId();

        var tenant = await _service.UpdateAsync(
            tenantId,
            request.Name,
            request.Code,
            cancellationToken);

        return Ok(Map(tenant));
    }

    [Authorize(Roles = Roles.TenantAdmin)]
    [HttpGet("{tenantId:guid}")]
    public async Task<ActionResult<TenantDto>> GetById(Guid tenantId, CancellationToken cancellationToken)
    {
        var tenant = await _service.GetByIdReadOnlyAsync(tenantId, cancellationToken);
        if (tenant is null)
            return NotFound();

        return Ok(Map(tenant));
    }

    [Authorize(Roles = Roles.TenantAdmin)]
    [HttpPost]
    public async Task<ActionResult<TenantDto>> Create(
        [FromBody] CreateTenantRequest request,
        CancellationToken cancellationToken)
    {
        var tenant = await _service.CreateAsync(
            request.Name,
            request.Code,
            new TenantCreateOptions(request.UserName, request.Email, request.Password),
            cancellationToken);

        var dto = Map(tenant);

        return CreatedAtAction(nameof(GetById), new { tenantId = dto.Id }, dto);
    }

    private static TenantDto Map(Tenant tenant) =>
        new()
        {
            Id = tenant.Id,
            Name = tenant.Name,
            Code = tenant.Code,
            IsActive = tenant.IsActive,
            CreatedAtUtc = tenant.CreatedAtUtc,
            UpdatedAtUtc = tenant.UpdatedAtUtc
        };
}
