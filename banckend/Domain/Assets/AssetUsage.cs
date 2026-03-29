using Domain.Employees;
using Domain.Instance;

namespace Domain.Assets;

public enum AssetMeterType
{
    OperatingHours = 1,
    ProductionCycles = 2,
    ProducedBatches = 3
}

public class AssetUsageReading
{
    public Guid Id { get; set; }

    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public Guid AssetId { get; set; }
    public Asset Asset { get; set; } = null!;

    public AssetMeterType MeterType { get; set; } = AssetMeterType.OperatingHours;
    public decimal ReadingValue { get; set; }

    public Guid? RecordedByEmployeeId { get; set; }
    public EmployeeProfile? RecordedByEmployee { get; set; }

    public string? Notes { get; set; }

    public DateTime RecordedAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}
