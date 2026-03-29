using Domain.Instance;
using Domain.Layouts;

namespace Domain.Assets;

public class AssetPlacement
{
    public Guid Id { get; set; }

    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public Guid AssetId { get; set; }
    public Asset Asset { get; set; } = null!;

    public Guid HallId { get; set; }
    public ProductionHall Hall { get; set; } = null!;

    public Guid? SectionId { get; set; }
    public HallSection? Section { get; set; }

    public decimal X { get; set; }
    public decimal Y { get; set; }
    public decimal Width { get; set; }
    public decimal Height { get; set; }
    public decimal RotationDeg { get; set; }

    public bool IsCurrent { get; set; } = true;

    public DateTime PlacedAtUtc { get; set; }
    public DateTime? RemovedAtUtc { get; set; }

    public string? Notes { get; set; }
}
