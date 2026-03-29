using Domain.Assets;
using Domain.Instance;
using Domain.Maintenance;

namespace Domain.Layouts
{
    public class ProductionHall
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public Tenant Tenant { get; set; } = null!;

        public string Name { get; set; } = default!;
        public string Code { get; set; } = default!;
        public string? Description { get; set; }

        public string OutlineJson { get; set; } = "[]";
        public double AreaSqMeters { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAtUtc { get; set; }
        public DateTime UpdatedAtUtc { get; set; }

        public ICollection<HallSection> Sections { get; set; } = new List<HallSection>();
        public ICollection<AssetPlacement> AssetPlacements { get; set; } = new List<AssetPlacement>();
        public ICollection<FailureReport> FailureReports { get; set; } = new List<FailureReport>();
        public ICollection<WorkOrder> WorkOrders { get; set; } = new List<WorkOrder>();
    }
}
