using Application.DTOs.Maintenance;

namespace Application.Services.Interfaces;

public interface IFailureReportService
{
    Task<IReadOnlyList<FailureReportDto>> GetAllAsync(Guid tenantId, bool openOnly = false, CancellationToken ct = default);
    Task<FailureReportDto?> GetByIdAsync(Guid tenantId, Guid reportId, CancellationToken ct = default);
    Task<IReadOnlyList<FailureCauseCategoryDto>> GetCauseCategoriesAsync(Guid tenantId, bool includeInactive = false, CancellationToken ct = default);
    Task<FailureCauseCategoryDto> CreateCauseCategoryAsync(Guid tenantId, CreateFailureCauseCategoryRequest request, CancellationToken ct = default);
    Task<FailureCauseCategoryDto> UpdateCauseCategoryAsync(Guid tenantId, Guid categoryId, UpdateFailureCauseCategoryRequest request, CancellationToken ct = default);
    Task<FailureAnalyticsDto> GetAnalyticsAsync(Guid tenantId, CancellationToken ct = default);

    Task<FailureReportDto> CreateAsync(Guid tenantId, CreateFailureReportRequest request, CancellationToken ct = default);
    Task<FailureReportDto> UpdateAsync(Guid tenantId, Guid reportId, UpdateFailureReportRequest request, CancellationToken ct = default);
    Task<FailureReportDto> SetStatusAsync(Guid tenantId, Guid reportId, SetFailureReportStatusRequest request, CancellationToken ct = default);
}
