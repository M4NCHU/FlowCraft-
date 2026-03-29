using Application.DTOs.Employees;
using Application.Services.Interfaces;
using Domain.Employees;
using FlowCraft.Interfaces.Abstractions;

namespace Application.Services;

public sealed class EmployeeService : IEmployeeService
{
    private readonly IUnitOfWork _uow;

    public EmployeeService(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<IReadOnlyList<EmployeeDto>> GetAllAsync(Guid tenantId, bool includeInactive = false, CancellationToken ct = default)
    {
        var employees = await _uow.Employees.GetAllAsync(tenantId, includeInactive, includeSkills: true, cancellationToken: ct);
        return employees.Select(Map).ToList();
    }

    public async Task<EmployeeDto?> GetByIdAsync(Guid tenantId, Guid employeeId, CancellationToken ct = default)
    {
        var employee = await _uow.Employees.GetByIdAsync(
            tenantId,
            employeeId,
            includeUser: true,
            includeSkills: true,
            cancellationToken: ct);
        return employee is null ? null : Map(employee);
    }

    public async Task<EmployeeDto> CreateAsync(Guid tenantId, CreateEmployeeRequest request, CancellationToken ct = default)
    {
        var trimmedNumber = Require(request.EmployeeNumber, nameof(request.EmployeeNumber));
        if (await _uow.Employees.EmployeeNumberExistsAsync(tenantId, trimmedNumber, cancellationToken: ct))
            throw new InvalidOperationException($"Employee number '{trimmedNumber}' already exists.");

        var now = DateTime.UtcNow;
        var department = await ResolveDepartmentAsync(tenantId, request.DepartmentId, ct);

        var employee = new EmployeeProfile
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            UserId = request.UserId,
            DepartmentId = department?.Id,
            Department = department,
            EmployeeNumber = trimmedNumber,
            FirstName = Require(request.FirstName, nameof(request.FirstName)),
            LastName = Require(request.LastName, nameof(request.LastName)),
            JobTitle = TrimOrNull(request.JobTitle),
            DepartmentName = department?.Name,
            Phone = TrimOrNull(request.Phone),
            HireDateUtc = request.HireDateUtc,
            Notes = TrimOrNull(request.Notes),
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };

        await _uow.Employees.AddAsync(employee, ct);
        await _uow.SaveChangesAsync(ct);

        return Map(employee);
    }

    public async Task<IReadOnlyList<EmployeeSkillDto>> ReplaceSkillsAsync(
        Guid tenantId,
        Guid employeeId,
        ReplaceEmployeeSkillsRequest request,
        CancellationToken ct = default)
    {
        var employee = await _uow.Employees.GetByIdAsync(
            tenantId,
            employeeId,
            includeSkills: true,
            cancellationToken: ct)
            ?? throw new InvalidOperationException($"Employee {employeeId} not found.");

        var inputSkills = (request.Skills ?? Array.Empty<UpsertEmployeeSkillRequest>())
            .GroupBy(skill => skill.AssetCategoryId)
            .Select(group => group.Last())
            .ToList();

        var requestedCategoryIds = inputSkills.Select(skill => skill.AssetCategoryId).ToHashSet();
        var categories = await _uow.AssetCategories.GetAllAsync(
            tenantId,
            includeInactive: false,
            cancellationToken: ct);
        var categoriesById = categories.ToDictionary(category => category.Id);

        foreach (var categoryId in requestedCategoryIds)
        {
            if (!categoriesById.ContainsKey(categoryId))
                throw new InvalidOperationException($"Asset category {categoryId} not found.");
        }

        var existingSkills = employee.Skills.ToList();

        foreach (var existingSkill in existingSkills.Where(skill => !requestedCategoryIds.Contains(skill.AssetCategoryId)))
        {
            await _uow.Employees.DeleteSkillAsync(existingSkill, ct);
            employee.Skills.Remove(existingSkill);
        }

        var now = DateTime.UtcNow;

        foreach (var inputSkill in inputSkills)
        {
            var existingSkill = employee.Skills.FirstOrDefault(skill => skill.AssetCategoryId == inputSkill.AssetCategoryId);
            var category = categoriesById[inputSkill.AssetCategoryId];

            if (existingSkill is null)
            {
                var createdSkill = new EmployeeSkill
                {
                    Id = Guid.NewGuid(),
                    EmployeeId = employee.Id,
                    Employee = employee,
                    AssetCategoryId = category.Id,
                    AssetCategory = category,
                    SkillLevel = inputSkill.SkillLevel,
                    CanOperate = inputSkill.CanOperate,
                    CanMaintain = inputSkill.CanMaintain,
                    CanApproveMaintenance = inputSkill.CanApproveMaintenance,
                    Notes = TrimOrNull(inputSkill.Notes),
                    CreatedAtUtc = now,
                    UpdatedAtUtc = now
                };

                employee.Skills.Add(createdSkill);
                await _uow.Employees.AddSkillAsync(createdSkill, ct);
                continue;
            }

            existingSkill.AssetCategory = category;
            existingSkill.SkillLevel = inputSkill.SkillLevel;
            existingSkill.CanOperate = inputSkill.CanOperate;
            existingSkill.CanMaintain = inputSkill.CanMaintain;
            existingSkill.CanApproveMaintenance = inputSkill.CanApproveMaintenance;
            existingSkill.Notes = TrimOrNull(inputSkill.Notes);
            existingSkill.UpdatedAtUtc = now;

            await _uow.Employees.UpdateSkillAsync(existingSkill, ct);
        }

        employee.UpdatedAtUtc = now;
        await _uow.Employees.UpdateAsync(employee, ct);
        await _uow.SaveChangesAsync(ct);

        return employee.Skills
            .OrderBy(skill => skill.AssetCategory?.Name ?? string.Empty)
            .Select(MapSkill)
            .ToList();
    }

    public async Task<EmployeeDto> UpdateAsync(Guid tenantId, Guid employeeId, UpdateEmployeeRequest request, CancellationToken ct = default)
    {
        var employee = await _uow.Employees.GetByIdAsync(tenantId, employeeId, cancellationToken: ct)
            ?? throw new InvalidOperationException($"Employee {employeeId} not found.");

        var trimmedNumber = Require(request.EmployeeNumber, nameof(request.EmployeeNumber));
        if (await _uow.Employees.EmployeeNumberExistsAsync(tenantId, trimmedNumber, excludeId: employeeId, cancellationToken: ct))
            throw new InvalidOperationException($"Employee number '{trimmedNumber}' already exists.");

        var department = await ResolveDepartmentAsync(tenantId, request.DepartmentId, ct);

        employee.EmployeeNumber = trimmedNumber;
        employee.FirstName = Require(request.FirstName, nameof(request.FirstName));
        employee.LastName = Require(request.LastName, nameof(request.LastName));
        employee.Status = request.Status;
        employee.IsActive = request.Status != EmployeeStatus.Terminated;
        employee.JobTitle = TrimOrNull(request.JobTitle);
        employee.DepartmentId = department?.Id;
        employee.Department = department;
        employee.DepartmentName = department?.Name;
        employee.Phone = TrimOrNull(request.Phone);
        employee.HireDateUtc = request.HireDateUtc;
        employee.UserId = request.UserId;
        employee.Notes = TrimOrNull(request.Notes);
        employee.UpdatedAtUtc = DateTime.UtcNow;

        await _uow.Employees.UpdateAsync(employee, ct);
        await _uow.SaveChangesAsync(ct);

        return Map(employee);
    }

    public async Task DeleteAsync(Guid tenantId, Guid employeeId, CancellationToken ct = default)
    {
        var employee = await _uow.Employees.GetByIdAsync(tenantId, employeeId, cancellationToken: ct)
            ?? throw new InvalidOperationException($"Employee {employeeId} not found.");

        employee.IsActive = false;
        employee.Status = EmployeeStatus.Terminated;
        employee.UpdatedAtUtc = DateTime.UtcNow;

        await _uow.Employees.UpdateAsync(employee, ct);
        await _uow.SaveChangesAsync(ct);
    }

    private static EmployeeDto Map(EmployeeProfile employee) =>
        new()
        {
            Id = employee.Id,
            UserId = employee.UserId,
            DepartmentId = employee.DepartmentId,
            EmployeeNumber = employee.EmployeeNumber,
            FirstName = employee.FirstName,
            LastName = employee.LastName,
            JobTitle = employee.JobTitle,
            DepartmentName = employee.Department?.Name ?? employee.DepartmentName,
            Phone = employee.Phone,
            Notes = employee.Notes,
            Status = employee.Status,
            IsActive = employee.IsActive,
            HireDateUtc = employee.HireDateUtc,
            CreatedAtUtc = employee.CreatedAtUtc,
            UpdatedAtUtc = employee.UpdatedAtUtc,
            Skills = employee.Skills
                .OrderBy(skill => skill.AssetCategory?.Name ?? string.Empty)
                .Select(MapSkill)
                .ToList()
        };

    private static EmployeeSkillDto MapSkill(EmployeeSkill skill) =>
        new()
        {
            Id = skill.Id,
            AssetCategoryId = skill.AssetCategoryId,
            AssetCategoryName = skill.AssetCategory?.Name ?? string.Empty,
            AssetType = skill.AssetCategory is null ? 0 : (int)skill.AssetCategory.AssetType,
            SkillLevel = skill.SkillLevel,
            CanOperate = skill.CanOperate,
            CanMaintain = skill.CanMaintain,
            CanApproveMaintenance = skill.CanApproveMaintenance,
            Notes = skill.Notes,
            CreatedAtUtc = skill.CreatedAtUtc,
            UpdatedAtUtc = skill.UpdatedAtUtc
        };

    private async Task<Department?> ResolveDepartmentAsync(
        Guid tenantId,
        Guid? departmentId,
        CancellationToken ct)
    {
        if (!departmentId.HasValue)
            return null;

        return await _uow.Departments.GetByIdAsync(tenantId, departmentId.Value, ct)
            ?? throw new InvalidOperationException($"Department {departmentId.Value} not found.");
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
}
