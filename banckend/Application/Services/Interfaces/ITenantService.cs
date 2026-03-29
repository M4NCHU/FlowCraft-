using Application.DTOs.Tenant;
using Domain.Instance;
using FlowCraft.Domain.Auth;

namespace Application.Services.Interfaces;

public interface ITenantService
{
    Task<IReadOnlyList<Tenant>> GetAllAsync(CancellationToken cancellationToken = default);

    Task<Tenant> CreateAsync(
        string name,
        string? code,
        TenantCreateOptions adminOptions,
        CancellationToken cancellationToken = default);

    Task<Tenant?> GetByIdReadOnlyAsync(Guid tenantId, CancellationToken cancellationToken = default);

    Task<Tenant> UpdateAsync(Guid tenantId, string name, string? code, CancellationToken cancellationToken = default);
}