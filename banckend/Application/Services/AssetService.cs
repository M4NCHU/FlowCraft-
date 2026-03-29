using System.Globalization;
using System.Text.Json;
using Application.DTOs.Assets;
using Application.Services.Interfaces;
using Domain.Assets;
using Domain.Employees;
using Domain.Maintenance;
using FlowCraft.Interfaces.Abstractions;

namespace Application.Services;

public sealed class AssetService : IAssetService
{
    private readonly IUnitOfWork _uow;

    public AssetService(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<IReadOnlyList<AssetListItemDto>> GetAllAsync(Guid tenantId, bool includeInactive = false, CancellationToken ct = default)
    {
        var assets = await _uow.Assets.GetAllAsync(tenantId, includeInactive, ct);
        return assets.Select(MapListItem).ToList();
    }

    public async Task<AssetDetailsDto?> GetByIdAsync(Guid tenantId, Guid assetId, CancellationToken ct = default)
    {
        var asset = await _uow.Assets.GetByIdAsync(
            tenantId,
            assetId,
            includePlacements: true,
            includeAssignments: true,
            includeCategoryData: true,
            includeUsageReadings: true,
            includeFailures: true,
            includeWorkOrders: true,
            cancellationToken: ct);

        if (asset is null)
            return null;

        var maintenancePlans = await _uow.MaintenancePlans.GetAllAsync(
            tenantId,
            assetId,
            includeInactive: true,
            includeExecutions: false,
            cancellationToken: ct);

        return MapDetails(asset, maintenancePlans);
    }

    public async Task<AssetDetailsDto> CreateAsync(Guid tenantId, CreateAssetRequest request, CancellationToken ct = default)
    {
        var trimmedName = Require(request.Name, nameof(request.Name));
        var trimmedCode = Require(request.Code, nameof(request.Code));

        if (await _uow.Assets.CodeExistsAsync(tenantId, trimmedCode, cancellationToken: ct))
            throw new InvalidOperationException($"Asset code '{trimmedCode}' already exists.");

        var now = DateTime.UtcNow;
        var category = await ResolveCategoryAsync(tenantId, request.CategoryId, request.Type, ct);

        var asset = new Asset
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = trimmedName,
            Code = trimmedCode,
            Type = request.Type,
            CategoryId = category?.Id,
            AssetCategory = category,
            Category = category?.Name ?? TrimOrNull(request.Category),
            Description = TrimOrNull(request.Description),
            SerialNumber = TrimOrNull(request.SerialNumber),
            Manufacturer = TrimOrNull(request.Manufacturer),
            Model = TrimOrNull(request.Model),
            IsMobile = request.IsMobile,
            Notes = TrimOrNull(request.Notes),
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };

        await _uow.Assets.AddAsync(asset, ct);
        await SyncParameterValuesAsync(asset, category, request.Parameters, ct);
        await _uow.SaveChangesAsync(ct);

        return MapDetails(asset, Array.Empty<MaintenancePlan>());
    }

    public async Task<AssetDetailsDto> UpdateAsync(Guid tenantId, Guid assetId, UpdateAssetRequest request, CancellationToken ct = default)
    {
        var asset = await _uow.Assets.GetByIdAsync(
            tenantId,
            assetId,
            includePlacements: true,
            includeAssignments: true,
            includeCategoryData: true,
            includeUsageReadings: true,
            includeFailures: true,
            includeWorkOrders: true,
            cancellationToken: ct)
            ?? throw new InvalidOperationException($"Asset {assetId} not found.");

        var trimmedName = Require(request.Name, nameof(request.Name));
        var trimmedCode = Require(request.Code, nameof(request.Code));

        if (await _uow.Assets.CodeExistsAsync(tenantId, trimmedCode, excludeId: assetId, cancellationToken: ct))
            throw new InvalidOperationException($"Asset code '{trimmedCode}' already exists.");

        var category = await ResolveCategoryAsync(tenantId, request.CategoryId, request.Type, ct);

        asset.Name = trimmedName;
        asset.Code = trimmedCode;
        asset.Type = request.Type;
        asset.Status = request.Status;
        asset.CategoryId = category?.Id;
        asset.AssetCategory = category;
        asset.Category = category?.Name ?? TrimOrNull(request.Category);
        asset.Description = TrimOrNull(request.Description);
        asset.SerialNumber = TrimOrNull(request.SerialNumber);
        asset.Manufacturer = TrimOrNull(request.Manufacturer);
        asset.Model = TrimOrNull(request.Model);
        asset.IsMobile = request.IsMobile;
        asset.Notes = TrimOrNull(request.Notes);
        asset.UpdatedAtUtc = DateTime.UtcNow;

        await SyncParameterValuesAsync(asset, category, request.Parameters, ct);
        await _uow.Assets.UpdateAsync(asset, ct);
        await _uow.SaveChangesAsync(ct);

        var maintenancePlans = await _uow.MaintenancePlans.GetAllAsync(
            tenantId,
            assetId,
            includeInactive: true,
            includeExecutions: false,
            cancellationToken: ct);

        return MapDetails(asset, maintenancePlans);
    }

    public async Task DeleteAsync(Guid tenantId, Guid assetId, CancellationToken ct = default)
    {
        var asset = await _uow.Assets.GetByIdAsync(tenantId, assetId, cancellationToken: ct)
            ?? throw new InvalidOperationException($"Asset {assetId} not found.");

        asset.IsActive = false;
        asset.Status = AssetStatus.Retired;
        asset.UpdatedAtUtc = DateTime.UtcNow;

        await _uow.Assets.UpdateAsync(asset, ct);
        await _uow.SaveChangesAsync(ct);
    }

    public async Task<AssetPlacementDto> PlaceAsync(Guid tenantId, Guid assetId, PlaceAssetRequest request, CancellationToken ct = default)
    {
        var asset = await _uow.Assets.GetByIdAsync(tenantId, assetId, cancellationToken: ct)
            ?? throw new InvalidOperationException($"Asset {assetId} not found.");

        var currentPlacement = await _uow.Assets.GetCurrentPlacementAsync(tenantId, assetId, ct);
        var now = DateTime.UtcNow;

        if (currentPlacement is not null)
        {
            currentPlacement.IsCurrent = false;
            currentPlacement.RemovedAtUtc = now;
            await _uow.Assets.UpdatePlacementAsync(currentPlacement, ct);
        }

        var placement = new AssetPlacement
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            AssetId = assetId,
            HallId = request.HallId,
            SectionId = request.SectionId,
            X = request.X,
            Y = request.Y,
            Width = request.Width,
            Height = request.Height,
            RotationDeg = request.RotationDeg,
            IsCurrent = true,
            PlacedAtUtc = now,
            Notes = TrimOrNull(request.Notes)
        };

        asset.UpdatedAtUtc = now;

        await _uow.Assets.AddPlacementAsync(placement, ct);
        await _uow.Assets.UpdateAsync(asset, ct);
        await _uow.SaveChangesAsync(ct);

        return MapPlacement(placement);
    }

    public async Task<AssetAssignmentDto> AssignAsync(Guid tenantId, Guid assetId, AssignAssetRequest request, CancellationToken ct = default)
    {
        var asset = await _uow.Assets.GetByIdAsync(tenantId, assetId, cancellationToken: ct)
            ?? throw new InvalidOperationException($"Asset {assetId} not found.");

        var activeAssignment = await _uow.Assets.GetActiveAssignmentAsync(tenantId, assetId, ct);
        if (activeAssignment is not null)
            throw new InvalidOperationException($"Asset {assetId} is already assigned.");

        var employee = await _uow.Employees.GetByIdAsync(tenantId, request.EmployeeId, cancellationToken: ct);
        if (employee is null || !employee.IsActive)
            throw new InvalidOperationException($"Employee {request.EmployeeId} not found.");

        if (request.IssuedByEmployeeId.HasValue)
        {
            var issuer = await _uow.Employees.GetByIdAsync(tenantId, request.IssuedByEmployeeId.Value, cancellationToken: ct);
            if (issuer is null || !issuer.IsActive)
                throw new InvalidOperationException($"Issuer employee {request.IssuedByEmployeeId.Value} not found.");
        }

        var now = DateTime.UtcNow;

        var assignment = new AssetAssignment
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            AssetId = assetId,
            EmployeeId = request.EmployeeId,
            IssuedByEmployeeId = request.IssuedByEmployeeId,
            Type = AssetAssignmentType.Issue,
            Status = AssetAssignmentStatus.Active,
            AssignedAtUtc = now,
            DueBackAtUtc = request.DueBackAtUtc,
            Notes = TrimOrNull(request.Notes)
        };

        asset.Status = AssetStatus.InUse;
        asset.UpdatedAtUtc = now;

        await _uow.Assets.AddAssignmentAsync(assignment, ct);
        await _uow.Assets.UpdateAsync(asset, ct);
        await _uow.SaveChangesAsync(ct);

        return MapAssignment(assignment);
    }

    public async Task<AssetAssignmentDto> ReturnAsync(Guid tenantId, Guid assetId, ReturnAssetRequest request, CancellationToken ct = default)
    {
        var asset = await _uow.Assets.GetByIdAsync(tenantId, assetId, cancellationToken: ct)
            ?? throw new InvalidOperationException($"Asset {assetId} not found.");

        var assignment = await _uow.Assets.GetActiveAssignmentAsync(tenantId, assetId, ct)
            ?? throw new InvalidOperationException($"Asset {assetId} has no active assignment.");

        assignment.Status = AssetAssignmentStatus.Returned;
        assignment.ReturnedAtUtc = request.ReturnedAtUtc ?? DateTime.UtcNow;
        assignment.Notes = MergeNotes(assignment.Notes, request.Notes);

        asset.Status = AssetStatus.Available;
        asset.UpdatedAtUtc = DateTime.UtcNow;

        await _uow.Assets.UpdateAssignmentAsync(assignment, ct);
        await _uow.Assets.UpdateAsync(asset, ct);
        await _uow.SaveChangesAsync(ct);

        return MapAssignment(assignment);
    }

    public async Task<IReadOnlyList<AssetUsageReadingDto>> GetUsageReadingsAsync(
        Guid tenantId,
        Guid assetId,
        CancellationToken ct = default)
    {
        var asset = await _uow.Assets.GetByIdAsync(tenantId, assetId, cancellationToken: ct)
            ?? throw new InvalidOperationException($"Asset {assetId} not found.");

        _ = asset;

        var readings = await _uow.Assets.GetUsageReadingsAsync(tenantId, assetId, ct);
        return readings.Select(MapUsageReading).ToList();
    }

    public async Task<AssetUsageReadingDto> AddUsageReadingAsync(
        Guid tenantId,
        Guid assetId,
        CreateAssetUsageReadingRequest request,
        CancellationToken ct = default)
    {
        var asset = await _uow.Assets.GetByIdAsync(tenantId, assetId, cancellationToken: ct)
            ?? throw new InvalidOperationException($"Asset {assetId} not found.");

        if (request.ReadingValue < 0)
            throw new InvalidOperationException("Usage reading cannot be negative.");

        EmployeeProfile? employee = null;
        if (request.RecordedByEmployeeId.HasValue)
        {
            employee = await _uow.Employees.GetByIdAsync(
                tenantId,
                request.RecordedByEmployeeId.Value,
                cancellationToken: ct);

            if (employee is null || !employee.IsActive)
                throw new InvalidOperationException($"Employee {request.RecordedByEmployeeId.Value} not found.");
        }

        var latest = await _uow.Assets.GetLatestUsageReadingAsync(tenantId, assetId, request.MeterType, ct);
        if (latest is not null && request.ReadingValue < latest.ReadingValue)
            throw new InvalidOperationException("Usage reading must be greater than or equal to the latest reading.");

        var now = DateTime.UtcNow;
        var recordedAtUtc = request.RecordedAtUtc ?? now;
        var reading = new AssetUsageReading
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            AssetId = assetId,
            Asset = asset,
            MeterType = request.MeterType,
            ReadingValue = request.ReadingValue,
            RecordedByEmployeeId = request.RecordedByEmployeeId,
            RecordedByEmployee = employee,
            Notes = TrimOrNull(request.Notes),
            RecordedAtUtc = recordedAtUtc,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };

        await _uow.Assets.AddUsageReadingAsync(reading, ct);
        await _uow.SaveChangesAsync(ct);

        return MapUsageReading(reading);
    }

    private static AssetListItemDto MapListItem(Asset asset) =>
        new()
        {
            Id = asset.Id,
            Name = asset.Name,
            Code = asset.Code,
            CategoryId = asset.CategoryId,
            Type = asset.Type,
            Status = asset.Status,
            Category = asset.Category,
            IsMobile = asset.IsMobile,
            IsActive = asset.IsActive,
            CreatedAtUtc = asset.CreatedAtUtc,
            UpdatedAtUtc = asset.UpdatedAtUtc
        };

    private static AssetDetailsDto MapDetails(
        Asset asset,
        IReadOnlyList<MaintenancePlan> maintenancePlans) =>
        new()
        {
            Id = asset.Id,
            Name = asset.Name,
            Code = asset.Code,
            CategoryId = asset.CategoryId,
            Category = asset.Category,
            Description = asset.Description,
            Type = asset.Type,
            Status = asset.Status,
            SerialNumber = asset.SerialNumber,
            Manufacturer = asset.Manufacturer,
            Model = asset.Model,
            IsMobile = asset.IsMobile,
            IsActive = asset.IsActive,
            PurchasedAtUtc = asset.PurchasedAtUtc,
            CommissionedAtUtc = asset.CommissionedAtUtc,
            WarrantyUntilUtc = asset.WarrantyUntilUtc,
            LastInventoryCheckAtUtc = asset.LastInventoryCheckAtUtc,
            Notes = asset.Notes,
            CreatedAtUtc = asset.CreatedAtUtc,
            UpdatedAtUtc = asset.UpdatedAtUtc,
            Parameters = BuildParameterDtos(asset),
            Placements = asset.Placements.OrderByDescending(x => x.PlacedAtUtc).Select(MapPlacement).ToList(),
            Assignments = asset.Assignments.OrderByDescending(x => x.AssignedAtUtc).Select(MapAssignment).ToList(),
            UsageReadings = asset.UsageReadings
                .OrderByDescending(x => x.RecordedAtUtc)
                .Take(20)
                .Select(MapUsageReading)
                .ToList(),
            UsageSummaries = BuildUsageSummaries(asset, maintenancePlans),
            FailureReportsCount = asset.FailureReports.Count,
            WorkOrdersCount = asset.WorkOrders.Count
        };

    private static AssetPlacementDto MapPlacement(AssetPlacement placement) =>
        new()
        {
            Id = placement.Id,
            HallId = placement.HallId,
            SectionId = placement.SectionId,
            X = placement.X,
            Y = placement.Y,
            Width = placement.Width,
            Height = placement.Height,
            RotationDeg = placement.RotationDeg,
            IsCurrent = placement.IsCurrent,
            PlacedAtUtc = placement.PlacedAtUtc,
            RemovedAtUtc = placement.RemovedAtUtc,
            Notes = placement.Notes
        };

    private static AssetAssignmentDto MapAssignment(AssetAssignment assignment) =>
        new()
        {
            Id = assignment.Id,
            EmployeeId = assignment.EmployeeId,
            IssuedByEmployeeId = assignment.IssuedByEmployeeId,
            Type = assignment.Type,
            Status = assignment.Status,
            AssignedAtUtc = assignment.AssignedAtUtc,
            DueBackAtUtc = assignment.DueBackAtUtc,
            ReturnedAtUtc = assignment.ReturnedAtUtc,
            Notes = assignment.Notes
        };

    private static AssetUsageReadingDto MapUsageReading(AssetUsageReading reading) =>
        new()
        {
            Id = reading.Id,
            AssetId = reading.AssetId,
            MeterType = reading.MeterType,
            ReadingValue = reading.ReadingValue,
            RecordedByEmployeeId = reading.RecordedByEmployeeId,
            RecordedByEmployeeName = reading.RecordedByEmployee is null
                ? null
                : $"{reading.RecordedByEmployee.FirstName} {reading.RecordedByEmployee.LastName}".Trim(),
            Notes = reading.Notes,
            RecordedAtUtc = reading.RecordedAtUtc,
            CreatedAtUtc = reading.CreatedAtUtc,
            UpdatedAtUtc = reading.UpdatedAtUtc
        };

    private static IReadOnlyList<AssetUsageSummaryDto> BuildUsageSummaries(
        Asset asset,
        IReadOnlyList<MaintenancePlan> maintenancePlans)
    {
        var latestByMeter = asset.UsageReadings
            .GroupBy(x => x.MeterType)
            .ToDictionary(
                x => x.Key,
                x => x.OrderByDescending(reading => reading.RecordedAtUtc).First());

        var meterPlanLookup = maintenancePlans
            .Where(plan => plan.IsActive
                           && plan.TriggerMode == MaintenanceTriggerMode.Meter
                           && plan.MeterType.HasValue)
            .GroupBy(plan => plan.MeterType!.Value)
            .ToDictionary(
                x => x.Key,
                x => x
                    .Where(plan => plan.NextDueMeterValue.HasValue)
                    .OrderBy(plan => plan.NextDueMeterValue)
                    .FirstOrDefault());

        var meters = latestByMeter.Keys
            .Concat(meterPlanLookup.Keys)
            .Distinct()
            .OrderBy(x => (int)x);

        return meters
            .Select(meterType =>
            {
                latestByMeter.TryGetValue(meterType, out var latestReading);
                meterPlanLookup.TryGetValue(meterType, out var nextPlan);
                var nextDueValue = nextPlan?.NextDueMeterValue;
                decimal? remaining = latestReading is not null && nextDueValue.HasValue
                    ? nextDueValue.Value - latestReading.ReadingValue
                    : null;

                return new AssetUsageSummaryDto
                {
                    MeterType = meterType,
                    LatestReadingValue = latestReading?.ReadingValue,
                    LatestRecordedAtUtc = latestReading?.RecordedAtUtc,
                    NextMaintenanceMeterValue = nextDueValue,
                    RemainingToNextMaintenance = remaining
                };
            })
            .ToList();
    }

    private static IReadOnlyList<AssetCategoryParameterDto> BuildParameterDtos(Asset asset)
    {
        if (asset.AssetCategory?.Parameters is null || asset.AssetCategory.Parameters.Count == 0)
            return Array.Empty<AssetCategoryParameterDto>();

        var valuesByDefinitionId = asset.ParameterValues.ToDictionary(
            x => x.AssetCategoryParameterId,
            x => x.Value);

        return asset.AssetCategory.Parameters
            .OrderBy(x => x.DisplayOrder)
            .ThenBy(x => x.Name)
            .Select(parameter => new AssetCategoryParameterDto
            {
                Id = parameter.Id,
                Name = parameter.Name,
                Code = parameter.Code,
                Type = parameter.Type,
                Unit = parameter.Unit,
                IsRequired = parameter.IsRequired,
                DisplayOrder = parameter.DisplayOrder,
                Value = valuesByDefinitionId.TryGetValue(parameter.Id, out var value)
                    ? value
                    : parameter.DefaultValue,
                DefaultValue = parameter.DefaultValue,
                Options = ParseOptions(parameter.OptionsJson)
            })
            .ToList();
    }

    private async Task<AssetCategory?> ResolveCategoryAsync(
        Guid tenantId,
        Guid? categoryId,
        AssetType assetType,
        CancellationToken ct)
    {
        if (!categoryId.HasValue)
            return null;

        var category = await _uow.AssetCategories.GetByIdAsync(
            tenantId,
            categoryId.Value,
            includeParameters: true,
            includeAssets: false,
            cancellationToken: ct);

        if (category is null || !category.IsActive)
            throw new InvalidOperationException($"Asset category {categoryId.Value} not found.");

        if (category.AssetType != assetType)
            throw new InvalidOperationException($"Asset category {category.Name} is not valid for asset type {assetType}.");

        return category;
    }

    private async Task SyncParameterValuesAsync(
        Asset asset,
        AssetCategory? category,
        IReadOnlyList<SetAssetParameterValueRequest> inputs,
        CancellationToken ct)
    {
        var existingValues = asset.ParameterValues.ToList();
        var safeInputs = inputs ?? Array.Empty<SetAssetParameterValueRequest>();

        if (category is null)
        {
            foreach (var existing in existingValues)
            {
                await _uow.Assets.DeleteParameterValueAsync(existing, ct);
                asset.ParameterValues.Remove(existing);
            }

            return;
        }

        var definitions = category.Parameters
            .OrderBy(x => x.DisplayOrder)
            .ThenBy(x => x.Name)
            .ToList();

        var inputValues = safeInputs
            .GroupBy(x => x.ParameterDefinitionId)
            .ToDictionary(
                x => x.Key,
                x => TrimOrNull(x.Last().Value));

        foreach (var providedId in inputValues.Keys)
        {
            if (!definitions.Any(x => x.Id == providedId))
                throw new InvalidOperationException($"Parameter definition {providedId} does not belong to category {category.Name}.");
        }

        foreach (var existing in existingValues)
        {
            if (definitions.All(x => x.Id != existing.AssetCategoryParameterId))
            {
                await _uow.Assets.DeleteParameterValueAsync(existing, ct);
                asset.ParameterValues.Remove(existing);
            }
        }

        var now = DateTime.UtcNow;

        foreach (var definition in definitions)
        {
            var rawValue = inputValues.TryGetValue(definition.Id, out var providedValue)
                ? providedValue
                : TrimOrNull(definition.DefaultValue);

            var normalizedValue = NormalizeParameterValue(definition, rawValue);
            var existing = asset.ParameterValues.FirstOrDefault(
                x => x.AssetCategoryParameterId == definition.Id);

            if (normalizedValue is null)
            {
                if (existing is not null)
                {
                    await _uow.Assets.DeleteParameterValueAsync(existing, ct);
                    asset.ParameterValues.Remove(existing);
                }

                continue;
            }

            if (existing is null)
            {
                var created = new AssetParameterValue
                {
                    Id = Guid.NewGuid(),
                    AssetId = asset.Id,
                    Asset = asset,
                    AssetCategoryParameterId = definition.Id,
                    ParameterDefinition = definition,
                    Value = normalizedValue,
                    CreatedAtUtc = now,
                    UpdatedAtUtc = now
                };

                asset.ParameterValues.Add(created);
                await _uow.Assets.AddParameterValueAsync(created, ct);
            }
            else
            {
                existing.Value = normalizedValue;
                existing.UpdatedAtUtc = now;
            }
        }
    }

    private static string? NormalizeParameterValue(AssetCategoryParameter definition, string? rawValue)
    {
        var trimmed = TrimOrNull(rawValue);

        if (trimmed is null)
        {
            if (definition.IsRequired)
                throw new InvalidOperationException($"Parameter '{definition.Name}' is required.");

            return null;
        }

        return definition.Type switch
        {
            AssetParameterType.Text => trimmed,
            AssetParameterType.Number => NormalizeNumber(definition, trimmed),
            AssetParameterType.Boolean => NormalizeBoolean(definition, trimmed),
            AssetParameterType.Select => NormalizeSelect(definition, trimmed),
            _ => trimmed
        };
    }

    private static string NormalizeNumber(AssetCategoryParameter definition, string value)
    {
        if (decimal.TryParse(value, NumberStyles.Number, CultureInfo.InvariantCulture, out var invariant))
            return invariant.ToString(CultureInfo.InvariantCulture);

        if (decimal.TryParse(value, NumberStyles.Number, CultureInfo.CurrentCulture, out var current))
            return current.ToString(CultureInfo.InvariantCulture);

        throw new InvalidOperationException($"Parameter '{definition.Name}' must be a number.");
    }

    private static string NormalizeBoolean(AssetCategoryParameter definition, string value)
    {
        var normalized = value.Trim().ToLowerInvariant();
        return normalized switch
        {
            "true" or "1" or "tak" or "yes" => bool.TrueString.ToLowerInvariant(),
            "false" or "0" or "nie" or "no" => bool.FalseString.ToLowerInvariant(),
            _ => throw new InvalidOperationException($"Parameter '{definition.Name}' must be a boolean value.")
        };
    }

    private static string NormalizeSelect(AssetCategoryParameter definition, string value)
    {
        var options = ParseOptions(definition.OptionsJson);
        var match = options.FirstOrDefault(option =>
            string.Equals(option, value, StringComparison.OrdinalIgnoreCase));

        if (match is null)
            throw new InvalidOperationException($"Parameter '{definition.Name}' must be one of predefined options.");

        return match;
    }

    private static IReadOnlyList<string> ParseOptions(string? optionsJson)
    {
        if (string.IsNullOrWhiteSpace(optionsJson))
            return Array.Empty<string>();

        try
        {
            return JsonSerializer.Deserialize<string[]>(optionsJson) ?? Array.Empty<string>();
        }
        catch
        {
            return Array.Empty<string>();
        }
    }

    private static string Require(string value, string paramName)
    {
        var trimmed = value?.Trim();
        if (string.IsNullOrWhiteSpace(trimmed))
            throw new ArgumentException($"{paramName} is required.", paramName);
        return trimmed;
    }

    private static string? TrimOrNull(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string? MergeNotes(string? existing, string? addition)
    {
        var trimmedAddition = TrimOrNull(addition);
        if (trimmedAddition is null)
            return existing;

        var trimmedExisting = TrimOrNull(existing);
        return trimmedExisting is null ? trimmedAddition : $"{trimmedExisting}\n{trimmedAddition}";
    }
}
