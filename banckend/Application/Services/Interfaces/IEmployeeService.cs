using Application.DTOs.Employees;

namespace Application.Services.Interfaces;

public interface IEmployeeService
{
    Task<IReadOnlyList<EmployeeDto>> GetAllAsync(Guid tenantId, bool includeInactive = false, CancellationToken ct = default);
    Task<EmployeeDto?> GetByIdAsync(Guid tenantId, Guid employeeId, CancellationToken ct = default);

    Task<EmployeeDto> CreateAsync(Guid tenantId, CreateEmployeeRequest request, CancellationToken ct = default);
    Task<EmployeeDto> UpdateAsync(Guid tenantId, Guid employeeId, UpdateEmployeeRequest request, CancellationToken ct = default);
    Task<IReadOnlyList<EmployeeSkillDto>> ReplaceSkillsAsync(Guid tenantId, Guid employeeId, ReplaceEmployeeSkillsRequest request, CancellationToken ct = default);

    Task DeleteAsync(Guid tenantId, Guid employeeId, CancellationToken ct = default);
}
