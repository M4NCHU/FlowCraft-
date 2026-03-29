using System.ComponentModel.DataAnnotations;

namespace FlowCraft.Domain.Auth;

public sealed record RegisterRequest(
    [Required] string UserName,
    [Required, EmailAddress] string Email,
    [Required] string Password,
    Guid? TenantId,
    string? Role,
    bool SignIn = true);

public sealed record RegisterResponse(
    string UserId,
    string UserName,
    string Email,
    Guid? TenantId,
    DateTime? ExpiresAtUtc);
