using Domain.Assets;

namespace Domain.Employees;

public enum EmployeeSkillLevel
{
    Beginner = 1,
    Independent = 2,
    Advanced = 3,
    Trainer = 4
}

public class EmployeeSkill
{
    public Guid Id { get; set; }

    public Guid EmployeeId { get; set; }
    public EmployeeProfile Employee { get; set; } = null!;

    public Guid AssetCategoryId { get; set; }
    public AssetCategory AssetCategory { get; set; } = null!;

    public EmployeeSkillLevel SkillLevel { get; set; } = EmployeeSkillLevel.Beginner;
    public bool CanOperate { get; set; }
    public bool CanMaintain { get; set; }
    public bool CanApproveMaintenance { get; set; }
    public string? Notes { get; set; }

    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}
