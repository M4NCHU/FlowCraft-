using Application.DTOs.Lean;

namespace Application.Services.Interfaces;

public interface IImprovementIdeaService
{
    Task<IReadOnlyList<ImprovementIdeaDto>> GetAllAsync(Guid tenantId, bool includeClosed = true, CancellationToken ct = default);
    Task<ImprovementIdeaDto?> GetByIdAsync(Guid tenantId, Guid improvementIdeaId, CancellationToken ct = default);
    Task<ImprovementIdeaDto> CreateAsync(Guid tenantId, CreateImprovementIdeaRequest request, CancellationToken ct = default);
    Task<ImprovementIdeaDto> UpdateAsync(Guid tenantId, Guid improvementIdeaId, UpdateImprovementIdeaRequest request, CancellationToken ct = default);
    Task<ImprovementIdeaDto> SetStatusAsync(Guid tenantId, Guid improvementIdeaId, SetImprovementIdeaStatusRequest request, CancellationToken ct = default);
}
