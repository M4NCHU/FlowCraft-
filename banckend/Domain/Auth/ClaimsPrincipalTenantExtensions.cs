using System.Security.Claims;

namespace FlowCraft.Domain.Auth;

public static class ClaimsPrincipalTenantExtensions
{
    private const string TenantIdClaimType = "tenant_id";

    public static Guid GetTenantId(this ClaimsPrincipal user)
    {
        var id = user.GetTenantIdOrNull();
        if (id is null)
            throw new UnauthorizedAccessException("Missing or invalid tenant_id claim.");

        return id.Value;
    }

    public static Guid? GetTenantIdOrNull(this ClaimsPrincipal user)
    {
        var raw = user.FindFirstValue(TenantIdClaimType);
        return Guid.TryParse(raw, out var tenantId) ? tenantId : null;
    }

    public static string? GetTenantIdRaw(this ClaimsPrincipal user)
        => user.FindFirstValue(TenantIdClaimType);
}