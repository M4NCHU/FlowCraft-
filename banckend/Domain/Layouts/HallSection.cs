using Domain.Assets;
using Domain.Maintenance;

namespace Domain.Layouts
{
    public class HallSection
    {
        public Guid Id { get; set; }

        public Guid HallId { get; set; }
        public ProductionHall Hall { get; set; } = default!;

        public string Name { get; set; } = default!;
        public string? Code { get; set; }
        public string? Description { get; set; }
        public int Order { get; set; }

        public string OutlineJson { get; set; } = "[]";
        public double AreaSqMeters { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAtUtc { get; set; }
        public DateTime UpdatedAtUtc { get; set; }

        public ICollection<LayoutElement> Elements { get; set; } = new List<LayoutElement>();
        public ICollection<AssetPlacement> AssetPlacements { get; set; } = new List<AssetPlacement>();
        public ICollection<FailureReport> FailureReports { get; set; } = new List<FailureReport>();
        public ICollection<WorkOrder> WorkOrders { get; set; } = new List<WorkOrder>();
    }
}
