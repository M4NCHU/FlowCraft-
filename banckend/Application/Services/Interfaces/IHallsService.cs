using Domain.Layouts;

namespace Application.Services.Interfaces;

public interface IHallsService
{
    Task<IReadOnlyList<ProductionHall>> GetHallsAsync(Guid tenantId, CancellationToken ct = default);

    Task<ProductionHall?> GetHallAsync(Guid tenantId, Guid hallId, bool includeSections, CancellationToken ct = default);

    Task<ProductionHall> CreateHallAsync(
        Guid tenantId,
        string name,
        string code,
        string? description,
        string outlineJson,
        double areaSqMeters,
        CancellationToken ct = default);

    Task UpdateHallAsync(
        Guid tenantId,
        Guid hallId,
        string name,
        string code,
        string? description,
        string outlineJson,
        double areaSqMeters,
        CancellationToken ct = default);

    Task DeleteHallAsync(Guid tenantId, Guid hallId, CancellationToken ct = default);

    Task<IReadOnlyList<HallSection>> GetSectionsAsync(Guid tenantId, Guid hallId, CancellationToken ct = default);

    Task<HallSection> CreateSectionAsync(
        Guid tenantId,
        Guid hallId,
        string name,
        string? code,
        string? description,
        string outlineJson,
        double areaSqMeters,
        CancellationToken ct = default);

    Task UpdateSectionAsync(
        Guid tenantId,
        Guid hallId,
        Guid sectionId,
        string name,
        string? code,
        string? description,
        string outlineJson,
        double areaSqMeters,
        CancellationToken ct = default);

    Task DeleteSectionAsync(Guid tenantId, Guid hallId, Guid sectionId, CancellationToken ct = default);
}
