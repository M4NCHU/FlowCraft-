using System.ComponentModel.DataAnnotations;

namespace Application.DTOs.Tenant;

public sealed class TenantCreateOptions
{
    public string? UserName { get; }
    public string? Email { get; }
    public string? Password { get; }

    public TenantCreateOptions(string? userName, string? email, string? password)
    {
        UserName = userName;
        Email = email;
        Password = password;
    }
}

public sealed class TenantDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}

public sealed class CreateTenantRequest
{
    [Required] public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }

    [Required, EmailAddress] public string Email { get; set; } = string.Empty;
    [Required] public string UserName { get; set; } = string.Empty;
    [Required] public string Password { get; set; } = string.Empty;
}

public sealed class UpdateTenantRequest
{
    [Required] public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
}
