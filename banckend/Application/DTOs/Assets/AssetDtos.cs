using Domain.Assets;

namespace Application.DTOs.Assets;

public sealed class AssetUsageReadingDto
{
    public Guid Id { get; set; }
    public Guid AssetId { get; set; }
    public AssetMeterType MeterType { get; set; }
    public decimal ReadingValue { get; set; }
    public Guid? RecordedByEmployeeId { get; set; }
    public string? RecordedByEmployeeName { get; set; }
    public string? Notes { get; set; }
    public DateTime RecordedAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}

public sealed class AssetUsageSummaryDto
{
    public AssetMeterType MeterType { get; set; }
    public decimal? LatestReadingValue { get; set; }
    public DateTime? LatestRecordedAtUtc { get; set; }
    public decimal? NextMaintenanceMeterValue { get; set; }
    public decimal? RemainingToNextMaintenance { get; set; }
}

public sealed class AssetListItemDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public Guid? CategoryId { get; set; }
    public AssetType Type { get; set; }
    public AssetStatus Status { get; set; }
    public string? Category { get; set; }
    public bool IsMobile { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}

public sealed class AssetPlacementDto
{
    public Guid Id { get; set; }
    public Guid HallId { get; set; }
    public Guid? SectionId { get; set; }
    public decimal X { get; set; }
    public decimal Y { get; set; }
    public decimal Width { get; set; }
    public decimal Height { get; set; }
    public decimal RotationDeg { get; set; }
    public bool IsCurrent { get; set; }
    public DateTime PlacedAtUtc { get; set; }
    public DateTime? RemovedAtUtc { get; set; }
    public string? Notes { get; set; }
}

public sealed class AssetAssignmentDto
{
    public Guid Id { get; set; }
    public Guid EmployeeId { get; set; }
    public Guid? IssuedByEmployeeId { get; set; }
    public AssetAssignmentType Type { get; set; }
    public AssetAssignmentStatus Status { get; set; }
    public DateTime AssignedAtUtc { get; set; }
    public DateTime? DueBackAtUtc { get; set; }
    public DateTime? ReturnedAtUtc { get; set; }
    public string? Notes { get; set; }
}

public sealed class AssetDetailsDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public Guid? CategoryId { get; set; }
    public string? Category { get; set; }
    public string? Description { get; set; }
    public AssetType Type { get; set; }
    public AssetStatus Status { get; set; }
    public string? SerialNumber { get; set; }
    public string? Manufacturer { get; set; }
    public string? Model { get; set; }
    public bool IsMobile { get; set; }
    public bool IsActive { get; set; }
    public DateTime? PurchasedAtUtc { get; set; }
    public DateTime? CommissionedAtUtc { get; set; }
    public DateTime? WarrantyUntilUtc { get; set; }
    public DateTime? LastInventoryCheckAtUtc { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
    public IReadOnlyList<AssetCategoryParameterDto> Parameters { get; set; } = Array.Empty<AssetCategoryParameterDto>();
    public IReadOnlyList<AssetPlacementDto> Placements { get; set; } = Array.Empty<AssetPlacementDto>();
    public IReadOnlyList<AssetAssignmentDto> Assignments { get; set; } = Array.Empty<AssetAssignmentDto>();
    public IReadOnlyList<AssetUsageReadingDto> UsageReadings { get; set; } = Array.Empty<AssetUsageReadingDto>();
    public IReadOnlyList<AssetUsageSummaryDto> UsageSummaries { get; set; } = Array.Empty<AssetUsageSummaryDto>();
    public int FailureReportsCount { get; set; }
    public int WorkOrdersCount { get; set; }
}

public sealed class CreateAssetRequest
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public AssetType Type { get; set; } = AssetType.Machine;
    public Guid? CategoryId { get; set; }
    public string? Category { get; set; }
    public string? Description { get; set; }
    public string? SerialNumber { get; set; }
    public string? Manufacturer { get; set; }
    public string? Model { get; set; }
    public bool IsMobile { get; set; }
    public string? Notes { get; set; }
    public IReadOnlyList<SetAssetParameterValueRequest> Parameters { get; set; } = Array.Empty<SetAssetParameterValueRequest>();
}

public sealed class UpdateAssetRequest
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public AssetType Type { get; set; } = AssetType.Machine;
    public AssetStatus Status { get; set; } = AssetStatus.Available;
    public Guid? CategoryId { get; set; }
    public string? Category { get; set; }
    public string? Description { get; set; }
    public string? SerialNumber { get; set; }
    public string? Manufacturer { get; set; }
    public string? Model { get; set; }
    public bool IsMobile { get; set; }
    public string? Notes { get; set; }
    public IReadOnlyList<SetAssetParameterValueRequest> Parameters { get; set; } = Array.Empty<SetAssetParameterValueRequest>();
}

public sealed class SetAssetParameterValueRequest
{
    public Guid ParameterDefinitionId { get; set; }
    public string? Value { get; set; }
}

public sealed class PlaceAssetRequest
{
    public Guid HallId { get; set; }
    public Guid? SectionId { get; set; }
    public decimal X { get; set; }
    public decimal Y { get; set; }
    public decimal Width { get; set; }
    public decimal Height { get; set; }
    public decimal RotationDeg { get; set; }
    public string? Notes { get; set; }
}

public sealed class AssignAssetRequest
{
    public Guid EmployeeId { get; set; }
    public Guid? IssuedByEmployeeId { get; set; }
    public DateTime? DueBackAtUtc { get; set; }
    public string? Notes { get; set; }
}

public sealed class ReturnAssetRequest
{
    public DateTime? ReturnedAtUtc { get; set; }
    public string? Notes { get; set; }
}

public sealed class CreateAssetUsageReadingRequest
{
    public AssetMeterType MeterType { get; set; }
    public decimal ReadingValue { get; set; }
    public Guid? RecordedByEmployeeId { get; set; }
    public string? Notes { get; set; }
    public DateTime? RecordedAtUtc { get; set; }
}
