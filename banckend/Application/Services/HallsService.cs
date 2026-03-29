using Application.Services.Interfaces;
using Domain.Layouts;
using FlowCraft.Interfaces.Abstractions;

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
        double areaSqMeters,
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
            AreaSqMeters = areaSqMeters,
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
        double areaSqMeters,
        CancellationToken ct = default)
    {
        var hall = await _uow.ProductionHalls.GetByIdAsync(tenantId, hallId, includeSections: false, cancellationToken: ct);

        if (hall is null)
            throw new InvalidOperationException($"Hall {hallId} not found.");

        hall.Name = name.Trim();
        hall.Code = code.Trim();
        hall.Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
        hall.OutlineJson = outlineJson;
        hall.AreaSqMeters = areaSqMeters;
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

        var section = new HallSection
        {
            Id = Guid.NewGuid(),
            HallId = hallId,
            Name = name.Trim(),
            Code = string.IsNullOrWhiteSpace(code) ? null : code.Trim(),
            Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim(),
            OutlineJson = outlineJson,
            AreaSqMeters = areaSqMeters
        };

        hall.Sections.Add(section);
        hall.UpdatedAtUtc = DateTime.UtcNow;

        await _uow.ProductionHalls.UpdateAsync(hall, ct);
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

        hall.UpdatedAtUtc = DateTime.UtcNow;

        await _uow.ProductionHalls.UpdateAsync(hall, ct);
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

        hall.Sections.Remove(section);
        hall.UpdatedAtUtc = DateTime.UtcNow;

        await _uow.ProductionHalls.UpdateAsync(hall, ct);
        await _uow.SaveChangesAsync(ct);
    }
}
