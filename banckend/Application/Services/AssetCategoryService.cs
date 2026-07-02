using System.Text.Json;
using Application.DTOs.Assets;
using Application.Services.Interfaces;
using Domain.Assets;
using FlowCraft.Interfaces.Abstractions;

namespace Application.Services;

public sealed class AssetCategoryService : IAssetCategoryService
{
    private readonly IUnitOfWork _uow;

    public AssetCategoryService(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<IReadOnlyList<AssetCategoryDto>> GetAllAsync(
        Guid tenantId,
        AssetType? assetType = null,
        bool includeInactive = false,
        CancellationToken ct = default)
    {
        var categories = await _uow.AssetCategories.GetAllAsync(tenantId, assetType, includeInactive, ct);
        return categories.Select(Map).ToList();
    }

    public async Task<AssetCategoryDto?> GetByIdAsync(Guid tenantId, Guid categoryId, CancellationToken ct = default)
    {
        var category = await _uow.AssetCategories.GetByIdAsync(tenantId, categoryId, cancellationToken: ct);
        return category is null ? null : Map(category);
    }

    public async Task<AssetCategoryDto> CreateAsync(Guid tenantId, CreateAssetCategoryRequest request, CancellationToken ct = default)
    {
        var code = NormalizeCode(request.Code);
        var name = Require(request.Name, nameof(request.Name));
        ValidateParameterRequests(request.Parameters);

        if (await _uow.AssetCategories.CodeExistsAsync(tenantId, code, cancellationToken: ct))
            throw new InvalidOperationException($"Asset category code '{code}' already exists.");

        if (await _uow.AssetCategories.NameExistsAsync(tenantId, name, request.AssetType, cancellationToken: ct))
            throw new InvalidOperationException($"Asset category name '{name}' already exists for asset type {request.AssetType}.");

        var now = DateTime.UtcNow;
        var categoryId = Guid.NewGuid();
        var category = new AssetCategory
        {
            Id = categoryId,
            TenantId = tenantId,
            Name = name,
            Code = code,
            AssetType = request.AssetType,
            Description = TrimOrNull(request.Description),
            IsActive = true,
            CreatedAtUtc = now,
            UpdatedAtUtc = now,
            Parameters = request.Parameters
                .Select(parameter => MapParameterRequest(parameter, now, categoryId))
                .ToList()
        };

        await _uow.AssetCategories.AddAsync(category, ct);
        await _uow.SaveChangesAsync(ct);

        return Map(category);
    }

    public async Task<AssetCategoryDto> UpdateAsync(Guid tenantId, Guid categoryId, UpdateAssetCategoryRequest request, CancellationToken ct = default)
    {
        var category = await _uow.AssetCategories.GetByIdAsync(
                tenantId,
                categoryId,
                includeParameters: false,
                includeAssets: false,
                cancellationToken: ct)
            ?? throw new InvalidOperationException($"Asset category {categoryId} not found.");

        var existingParameters = (await _uow.AssetCategories.GetParametersAsync(
                tenantId,
                categoryId,
                ct))
            .ToList();

        var code = NormalizeCode(request.Code);
        var name = Require(request.Name, nameof(request.Name));
        ValidateParameterRequests(request.Parameters);

        if (await _uow.AssetCategories.CodeExistsAsync(tenantId, code, categoryId, ct))
            throw new InvalidOperationException($"Asset category code '{code}' already exists.");

        if (await _uow.AssetCategories.NameExistsAsync(tenantId, name, request.AssetType, categoryId, ct))
            throw new InvalidOperationException($"Asset category name '{name}' already exists for asset type {request.AssetType}.");

        category.Name = name;
        category.Code = code;
        category.AssetType = request.AssetType;
        category.Description = TrimOrNull(request.Description);
        category.IsActive = request.IsActive;

        var now = DateTime.UtcNow;
        category.UpdatedAtUtc = now;
        var matchedParameterIds = new HashSet<Guid>();
        var existingParametersByCode = existingParameters
            .ToDictionary(x => x.Code, StringComparer.OrdinalIgnoreCase);
        var existingParametersById = existingParameters
            .ToDictionary(x => x.Id);

        foreach (var parameterRequest in request.Parameters)
        {
            var normalizedCode = NormalizeCode(parameterRequest.Code);
            AssetCategoryParameter? existing = null;

            if (parameterRequest.Id.HasValue)
            {
                if (!existingParametersById.TryGetValue(parameterRequest.Id.Value, out existing))
                    throw new InvalidOperationException(
                        $"Asset category parameter {parameterRequest.Id.Value} not found in category {categoryId}.");
            }
            else if (existingParametersByCode.TryGetValue(normalizedCode, out var existingByCode))
            {
                existing = existingByCode;
            }

            if (existing is not null)
            {
                var previousCode = existing.Code;
                existing.Name = Require(parameterRequest.Name, nameof(parameterRequest.Name));
                existing.Code = normalizedCode;
                existing.Type = parameterRequest.Type;
                existing.Unit = TrimOrNull(parameterRequest.Unit);
                existing.IsRequired = parameterRequest.IsRequired;
                existing.DisplayOrder = parameterRequest.DisplayOrder;
                existing.DefaultValue = TrimOrNull(parameterRequest.DefaultValue);
                existing.OptionsJson = SerializeOptions(parameterRequest.Options);
                existing.UpdatedAtUtc = now;
                matchedParameterIds.Add(existing.Id);

                if (!string.Equals(previousCode, normalizedCode, StringComparison.OrdinalIgnoreCase))
                {
                    existingParametersByCode.Remove(previousCode);
                    existingParametersByCode[normalizedCode] = existing;
                }
            }
            else
            {
                var created = MapParameterRequest(parameterRequest, now, categoryId);
                await _uow.AssetCategories.AddParameterAsync(created, ct);
                existingParameters.Add(created);
                existingParametersById[created.Id] = created;
                existingParametersByCode[created.Code] = created;
                matchedParameterIds.Add(created.Id);
            }
        }

        var removedParameters = existingParameters
            .Where(parameter => !matchedParameterIds.Contains(parameter.Id))
            .ToList();

        foreach (var removed in removedParameters)
        {
            _uow.AssetCategories.RemoveParameter(removed);
        }

        await _uow.SaveChangesAsync(ct);

        var refreshedCategory = await _uow.AssetCategories.GetByIdAsync(
                tenantId,
                categoryId,
                includeParameters: true,
                includeAssets: true,
                cancellationToken: ct)
            ?? throw new InvalidOperationException($"Asset category {categoryId} not found after update.");

        return Map(refreshedCategory);
    }

    private static AssetCategoryDto Map(AssetCategory category) =>
        new()
        {
            Id = category.Id,
            Name = category.Name,
            Code = category.Code,
            AssetType = category.AssetType,
            Description = category.Description,
            IsActive = category.IsActive,
            AssetsCount = category.Assets.Count(x => x.IsActive),
            Parameters = category.Parameters
                .OrderBy(x => x.DisplayOrder)
                .ThenBy(x => x.Name)
                .Select(MapParameter)
                .ToList(),
            CreatedAtUtc = category.CreatedAtUtc,
            UpdatedAtUtc = category.UpdatedAtUtc
        };

    private static AssetCategoryParameterDto MapParameter(AssetCategoryParameter parameter) =>
        new()
        {
            Id = parameter.Id,
            Name = parameter.Name,
            Code = parameter.Code,
            Type = parameter.Type,
            Unit = parameter.Unit,
            IsRequired = parameter.IsRequired,
            DisplayOrder = parameter.DisplayOrder,
            Value = null,
            DefaultValue = parameter.DefaultValue,
            Options = ParseOptions(parameter.OptionsJson)
        };

    private static AssetCategoryParameter MapParameterRequest(
        AssetCategoryParameterRequest request,
        DateTime now,
        Guid? categoryId = null) =>
        new()
        {
            Id = Guid.NewGuid(),
            AssetCategoryId = categoryId ?? Guid.Empty,
            Name = Require(request.Name, nameof(request.Name)),
            Code = NormalizeCode(request.Code),
            Type = request.Type,
            Unit = TrimOrNull(request.Unit),
            IsRequired = request.IsRequired,
            DisplayOrder = request.DisplayOrder,
            DefaultValue = TrimOrNull(request.DefaultValue),
            OptionsJson = SerializeOptions(request.Options),
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };

    private static void ValidateParameterRequests(IReadOnlyList<AssetCategoryParameterRequest> parameters)
    {
        var codes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var parameter in parameters)
        {
            var normalizedCode = NormalizeCode(parameter.Code);
            if (!codes.Add(normalizedCode))
                throw new InvalidOperationException($"Duplicate parameter code '{normalizedCode}' in asset category.");

            if (parameter.Type == AssetParameterType.Select && !parameter.Options.Any())
                throw new InvalidOperationException($"Parameter '{normalizedCode}' requires at least one option.");
        }
    }

    private static string SerializeOptions(IReadOnlyList<string> options)
    {
        var normalized = options
            .Select(TrimOrNull)
            .Where(x => x is not null)
            .Cast<string>()
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        return normalized.Length == 0 ? "[]" : JsonSerializer.Serialize(normalized);
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

    private static string NormalizeCode(string value)
        => Require(value, nameof(value)).ToUpperInvariant();

    private static string? TrimOrNull(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
