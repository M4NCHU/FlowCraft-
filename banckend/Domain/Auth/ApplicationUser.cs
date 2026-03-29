using Domain.Employees;
using Domain.Instance;
using Microsoft.AspNetCore.Identity;

namespace FlowCraft.Domain.Auth;

public class ApplicationUser : IdentityUser<Guid>
{
    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public Guid? TenantId { get; set; }
    public Tenant? Tenant { get; set; }
    public EmployeeProfile? EmployeeProfile { get; set; }
}
