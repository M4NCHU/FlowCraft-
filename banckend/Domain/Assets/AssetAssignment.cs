using Domain.Employees;
using Domain.Instance;

namespace Domain.Assets;

public enum AssetAssignmentType
{
    Issue = 1,
    Return = 2,
    Transfer = 3
}

public enum AssetAssignmentStatus
{
    Active = 1,
    Returned = 2,
    Cancelled = 3
}

public class AssetAssignment
{
    public Guid Id { get; set; }

    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public Guid AssetId { get; set; }
    public Asset Asset { get; set; } = null!;

    public Guid EmployeeId { get; set; }
    public EmployeeProfile Employee { get; set; } = null!;

    public Guid? IssuedByEmployeeId { get; set; }
    public EmployeeProfile? IssuedByEmployee { get; set; }

    public AssetAssignmentType Type { get; set; } = AssetAssignmentType.Issue;
    public AssetAssignmentStatus Status { get; set; } = AssetAssignmentStatus.Active;

    public DateTime AssignedAtUtc { get; set; }
    public DateTime? DueBackAtUtc { get; set; }
    public DateTime? ReturnedAtUtc { get; set; }

    public string? Notes { get; set; }
}
