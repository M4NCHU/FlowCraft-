using Domain.Assets;

namespace Domain.Layouts
{
    public enum LayoutElementType
    {
        Asset = 1,
        Machine = Asset,
        Workstation = 2,
        Buffer = 3,
        TransportPath = 4,
        AreaLabel = 5,
        Custom = 99
    }

    public class LayoutElement
    {
        public Guid Id { get; set; }

        public Guid HallId { get; set; }
        public ProductionHall Hall { get; set; } = default!;

        public Guid SectionId { get; set; }
        public HallSection Section { get; set; } = default!;

        public LayoutElementType Type { get; set; }

        public Guid? AssetId { get; set; }
        public Asset? Asset { get; set; }

        public decimal X { get; set; }
        public decimal Y { get; set; }
        public decimal Width { get; set; }
        public decimal Height { get; set; }
        public decimal RotationDeg { get; set; }

        public string? Label { get; set; }
        public string? ColorHex { get; set; }
        public string? ConfigJson { get; set; }

        public DateTime CreatedAtUtc { get; set; }
        public DateTime UpdatedAtUtc { get; set; }
    }
}
