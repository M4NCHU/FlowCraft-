using Application.Services.Interfaces;
using Domain.Layouts;
using FlowCraft.Interfaces.Abstractions;
using System.Text.Json;

namespace Application.Services;

public sealed class HallsService : IHallsService
{
    private readonly IUnitOfWork _uow;

    public HallsService(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public Task<IReadOnlyList<ProductionHall>> GetHallsAsync(Guid tenantId, CancellationToken ct = default)
        => _uow.ProductionHalls.GetAllAsync(tenantId, ct);

    public Task<ProductionHall?> GetHallAsync(Guid tenantId, Guid hallId, bool includeSections, CancellationToken ct = default)
        => _uow.ProductionHalls.GetByIdAsync(tenantId, hallId, includeSections, ct);

    public async Task<ProductionHall> CreateHallAsync(
        Guid tenantId,
        string name,
        string code,
        string? description,
        string outlineJson,
        CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;

        var hall = new ProductionHall
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = name.Trim(),
            Code = code.Trim(),
            Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim(),
            OutlineJson = outlineJson,
            AreaSqMeters = CalculateHallAreaSqMeters(outlineJson),
            IsActive = true,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };

        await _uow.ProductionHalls.AddAsync(hall, ct);
        await _uow.SaveChangesAsync(ct);

        return hall;
    }

    public async Task UpdateHallAsync(
        Guid tenantId,
        Guid hallId,
        string name,
        string code,
        string? description,
        string outlineJson,
        CancellationToken ct = default)
    {
        var hall = await _uow.ProductionHalls.GetByIdAsync(tenantId, hallId, includeSections: false, cancellationToken: ct);

        if (hall is null)
            throw new InvalidOperationException($"Hall {hallId} not found.");

        hall.Name = name.Trim();
        hall.Code = code.Trim();
        hall.Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
        hall.OutlineJson = outlineJson;
        hall.AreaSqMeters = CalculateHallAreaSqMeters(outlineJson);
        hall.UpdatedAtUtc = DateTime.UtcNow;

        await _uow.ProductionHalls.UpdateAsync(hall, ct);
        await _uow.SaveChangesAsync(ct);
    }

    public async Task DeleteHallAsync(Guid tenantId, Guid hallId, CancellationToken ct = default)
    {
        var hall = await _uow.ProductionHalls.GetByIdAsync(tenantId, hallId, includeSections: false, cancellationToken: ct);

        if (hall is null)
            return;

        await _uow.ProductionHalls.DeleteAsync(hall, ct);
        await _uow.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<HallSection>> GetSectionsAsync(Guid tenantId, Guid hallId, CancellationToken ct = default)
    {
        var hall = await _uow.ProductionHalls.GetByIdAsync(tenantId, hallId, includeSections: true, cancellationToken: ct);

        if (hall is null)
            return Array.Empty<HallSection>();

        return hall.Sections.OrderBy(x => x.Name).ToList();
    }

    public async Task<HallSection> CreateSectionAsync(
        Guid tenantId,
        Guid hallId,
        string name,
        string? code,
        string? description,
        string outlineJson,
        double areaSqMeters,
        CancellationToken ct = default)
    {
        var hall = await _uow.ProductionHalls.GetByIdAsync(tenantId, hallId, includeSections: true, cancellationToken: ct);

        if (hall is null)
            throw new InvalidOperationException($"Hall {hallId} not found.");

        var now = DateTime.UtcNow;
        var section = new HallSection
        {
            Id = Guid.NewGuid(),
            HallId = hallId,
            Name = name.Trim(),
            Code = string.IsNullOrWhiteSpace(code) ? null : code.Trim(),
            Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim(),
            OutlineJson = outlineJson,
            AreaSqMeters = areaSqMeters,
            Order = hall.Sections.Count + 1,
            IsActive = true,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };

        await _uow.ProductionHalls.AddSectionAsync(section, ct);
        await _uow.SaveChangesAsync(ct);

        return section;
    }

    public async Task UpdateSectionAsync(
        Guid tenantId,
        Guid hallId,
        Guid sectionId,
        string name,
        string? code,
        string? description,
        string outlineJson,
        double areaSqMeters,
        CancellationToken ct = default)
    {
        var hall = await _uow.ProductionHalls.GetByIdAsync(tenantId, hallId, includeSections: true, cancellationToken: ct);

        if (hall is null)
            throw new InvalidOperationException($"Hall {hallId} not found.");

        var section = hall.Sections.FirstOrDefault(x => x.Id == sectionId);
        if (section is null)
            throw new InvalidOperationException($"Section {sectionId} not found in hall {hallId}.");

        section.Name = name.Trim();
        section.Code = string.IsNullOrWhiteSpace(code) ? null : code.Trim();
        section.Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
        section.OutlineJson = outlineJson;
        section.AreaSqMeters = areaSqMeters;
        section.UpdatedAtUtc = DateTime.UtcNow;

        await _uow.SaveChangesAsync(ct);
    }

    public async Task DeleteSectionAsync(Guid tenantId, Guid hallId, Guid sectionId, CancellationToken ct = default)
    {
        var hall = await _uow.ProductionHalls.GetByIdAsync(tenantId, hallId, includeSections: true, cancellationToken: ct);

        if (hall is null)
            return;

        var section = hall.Sections.FirstOrDefault(x => x.Id == sectionId);
        if (section is null)
            return;

        await _uow.ProductionHalls.DeleteSectionAsync(section, ct);
        await _uow.SaveChangesAsync(ct);
    }

    private static double CalculateHallAreaSqMeters(string outlineJson)
    {
        if (string.IsNullOrWhiteSpace(outlineJson))
            return 0;

        try
        {
            using var document = JsonDocument.Parse(outlineJson);
            var root = document.RootElement;

            var points = ExtractBoundaryPoints(root);
            if (points.Count < 6)
                return 0;

            var metersPerGridCell = 1d;
            var gridSize = 40d;

            if (root.ValueKind == JsonValueKind.Object &&
                root.TryGetProperty("scale", out var scaleElement))
            {
                if (scaleElement.TryGetProperty("metersPerGridCell", out var metersElement) &&
                    metersElement.TryGetDouble(out var parsedMeters) &&
                    parsedMeters > 0)
                {
                    metersPerGridCell = parsedMeters;
                }

                if (scaleElement.TryGetProperty("gridSize", out var gridElement) &&
                    gridElement.TryGetDouble(out var parsedGrid) &&
                    parsedGrid > 0)
                {
                    gridSize = parsedGrid;
                }
            }

            var polygonArea = CalculatePolygonArea(points);
            var metersPerPoint = metersPerGridCell / gridSize;

            return Math.Round(Math.Abs(polygonArea) * metersPerPoint * metersPerPoint, 2);
        }
        catch
        {
            return 0;
        }
    }

    private static List<double> ExtractBoundaryPoints(JsonElement root)
    {
        var source = root;

        if (root.ValueKind == JsonValueKind.Object &&
            root.TryGetProperty("boundary", out var boundaryElement))
        {
            source = boundaryElement;
        }

        if (source.ValueKind == JsonValueKind.Object &&
            source.TryGetProperty("points", out var pointsElement))
        {
            source = pointsElement;
        }

        if (source.ValueKind != JsonValueKind.Array)
            return [];

        var points = new List<double>();
        foreach (var entry in source.EnumerateArray())
        {
            if (entry.TryGetDouble(out var value) && double.IsFinite(value))
            {
                points.Add(value);
            }
        }

        return points;
    }

    private static double CalculatePolygonArea(IReadOnlyList<double> points)
    {
        if (points.Count < 6)
            return 0;

        double area = 0;

        for (var index = 0; index < points.Count; index += 2)
        {
            var nextIndex = (index + 2) % points.Count;
            area += points[index] * points[nextIndex + 1] - points[nextIndex] * points[index + 1];
        }

        return Math.Abs(area / 2d);
    }
}
