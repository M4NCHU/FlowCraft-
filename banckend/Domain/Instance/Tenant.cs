using Domain.Assets;
using Domain.Employees;
using Domain.Lean;
using Domain.Layouts;
using Domain.Maintenance;
using FlowCraft.Domain.Auth;

namespace Domain.Instance
{
    public sealed class Tenant
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Code { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAtUtc { get; set; }
        public DateTime UpdatedAtUtc { get; set; }

        public ICollection<ProductionHall> Halls { get; set; } = new List<ProductionHall>();
        public ICollection<ApplicationUser> Users { get; set; } = new List<ApplicationUser>();
        public ICollection<Asset> Assets { get; set; } = new List<Asset>();
        public ICollection<AssetCategory> AssetCategories { get; set; } = new List<AssetCategory>();
        public ICollection<AssetUsageReading> AssetUsageReadings { get; set; } = new List<AssetUsageReading>();
        public ICollection<AssetPlacement> AssetPlacements { get; set; } = new List<AssetPlacement>();
        public ICollection<AssetAssignment> AssetAssignments { get; set; } = new List<AssetAssignment>();
        public ICollection<EmployeeProfile> Employees { get; set; } = new List<EmployeeProfile>();
        public ICollection<EmployeeSkill> EmployeeSkills { get; set; } = new List<EmployeeSkill>();
        public ICollection<Department> Departments { get; set; } = new List<Department>();
        public ICollection<FailureCauseCategory> FailureCauseCategories { get; set; } = new List<FailureCauseCategory>();
        public ICollection<FailureReport> FailureReports { get; set; } = new List<FailureReport>();
        public ICollection<WorkOrder> WorkOrders { get; set; } = new List<WorkOrder>();
        public ICollection<MaintenancePlan> MaintenancePlans { get; set; } = new List<MaintenancePlan>();
        public ICollection<MaintenanceExecution> MaintenanceExecutions { get; set; } = new List<MaintenanceExecution>();
        public ICollection<ImprovementIdea> ImprovementIdeas { get; set; } = new List<ImprovementIdea>();
    }
}
