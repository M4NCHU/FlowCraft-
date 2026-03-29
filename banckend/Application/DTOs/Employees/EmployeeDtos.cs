using Domain.Employees;

namespace Application.DTOs.Employees;

public sealed class EmployeeSkillDto
{
    public Guid Id { get; set; }
    public Guid AssetCategoryId { get; set; }
    public string AssetCategoryName { get; set; } = string.Empty;
    public int AssetType { get; set; }
    public EmployeeSkillLevel SkillLevel { get; set; }
    public bool CanOperate { get; set; }
    public bool CanMaintain { get; set; }
    public bool CanApproveMaintenance { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}

public sealed class EmployeeDto
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public Guid? DepartmentId { get; set; }
    public string EmployeeNumber { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? JobTitle { get; set; }
    public string? DepartmentName { get; set; }
    public string? Phone { get; set; }
    public string? Notes { get; set; }
    public EmployeeStatus Status { get; set; }
    public bool IsActive { get; set; }
    public DateTime? HireDateUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
    public IReadOnlyList<EmployeeSkillDto> Skills { get; set; } = Array.Empty<EmployeeSkillDto>();
}

public sealed class CreateEmployeeRequest
{
    public Guid? DepartmentId { get; set; }
    public string EmployeeNumber { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? JobTitle { get; set; }
    public string? Phone { get; set; }
    public DateTime? HireDateUtc { get; set; }
    public Guid? UserId { get; set; }
    public string? Notes { get; set; }
}

public sealed class UpdateEmployeeRequest
{
    public Guid? DepartmentId { get; set; }
    public string EmployeeNumber { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public EmployeeStatus Status { get; set; } = EmployeeStatus.Active;
    public string? JobTitle { get; set; }
    public string? Phone { get; set; }
    public DateTime? HireDateUtc { get; set; }
    public Guid? UserId { get; set; }
    public string? Notes { get; set; }
}

public sealed class UpsertEmployeeSkillRequest
{
    public Guid AssetCategoryId { get; set; }
    public EmployeeSkillLevel SkillLevel { get; set; } = EmployeeSkillLevel.Beginner;
    public bool CanOperate { get; set; }
    public bool CanMaintain { get; set; }
    public bool CanApproveMaintenance { get; set; }
    public string? Notes { get; set; }
}

public sealed class ReplaceEmployeeSkillsRequest
{
    public IReadOnlyList<UpsertEmployeeSkillRequest> Skills { get; set; } = Array.Empty<UpsertEmployeeSkillRequest>();
}
