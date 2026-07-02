using Domain.Employees;

namespace Infrastructure.Repositories.Interfaces;

public interface IEmployeeProfileRepository
{
    Task<IReadOnlyList<EmployeeProfile>> GetAllAsync(
        Guid tenantId,
        bool includeInactive = false,
        bool includeSkills = false,
        bool includeAssignments = false,
        CancellationToken cancellationToken = default);

    Task<EmployeeProfile?> GetByIdAsync(
        Guid tenantId,
        Guid id,
        bool includeUser = false,
        bool includeSkills = false,
        bool includeAssignments = false,
        CancellationToken cancellationToken = default);

    Task<EmployeeProfile?> GetByEmployeeNumberAsync(Guid tenantId, string employeeNumber, CancellationToken cancellationToken = default);
    Task<bool> EmployeeNumberExistsAsync(Guid tenantId, string employeeNumber, Guid? excludeId = null, CancellationToken cancellationToken = default);

    Task AddAsync(EmployeeProfile employee, CancellationToken cancellationToken = default);
    Task UpdateAsync(EmployeeProfile employee, CancellationToken cancellationToken = default);
    Task DeleteAsync(EmployeeProfile employee, CancellationToken cancellationToken = default);

    Task AddSkillAsync(EmployeeSkill skill, CancellationToken cancellationToken = default);
    Task UpdateSkillAsync(EmployeeSkill skill, CancellationToken cancellationToken = default);
    Task DeleteSkillAsync(EmployeeSkill skill, CancellationToken cancellationToken = default);
}
