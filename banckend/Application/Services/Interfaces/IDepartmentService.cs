using Application.DTOs.Employees;

namespace Application.Services.Interfaces;

public interface IDepartmentService
{
    Task<IReadOnlyList<DepartmentDto>> GetAllAsync(Guid tenantId, bool includeInactive = false, CancellationToken ct = default);
    Task<DepartmentDto?> GetByIdAsync(Guid tenantId, Guid departmentId, CancellationToken ct = default);
    Task<DepartmentDto> CreateAsync(Guid tenantId, CreateDepartmentRequest request, CancellationToken ct = default);
    Task<DepartmentDto> UpdateAsync(Guid tenantId, Guid departmentId, UpdateDepartmentRequest request, CancellationToken ct = default);
}
