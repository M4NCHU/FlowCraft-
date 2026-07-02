using Application.DTOs.Employees;
using Application.Services.Interfaces;
using Domain.Assets;
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
        var employees = await _uow.Employees.GetAllAsync(
            tenantId,
            includeInactive,
            includeSkills: true,
            includeAssignments: true,
            cancellationToken: ct);
        return employees.Select(Map).ToList();
    }

    public async Task<EmployeeDto?> GetByIdAsync(Guid tenantId, Guid employeeId, CancellationToken ct = default)
    {
        var employee = await _uow.Employees.GetByIdAsync(
            tenantId,
            employeeId,
            includeUser: true,
            includeSkills: true,
            includeAssignments: true,
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
            includeAssignments: true,
            cancellationToken: ct)
            ?? throw new InvalidOperationException($"Employee {employeeId} not found.");

        var inputSkills = (request.Skills ?? Array.Empty<UpsertEmployeeSkillRequest>())
            .GroupBy(GetSkillKey)
            .Select(group => group.Last())
            .ToList();

        var requestedCategoryIds = inputSkills.Select(skill => skill.AssetCategoryId).ToHashSet();
        var requestedAssetIds = inputSkills
            .Where(skill => skill.AssetId.HasValue)
            .Select(skill => skill.AssetId!.Value)
            .ToHashSet();
        var categories = await _uow.AssetCategories.GetAllAsync(
            tenantId,
            includeInactive: false,
            cancellationToken: ct);
        var categoriesById = categories.ToDictionary(category => category.Id);
        var assets = await _uow.Assets.GetAllAsync(tenantId, includeInactive: false, cancellationToken: ct);
        var assetsById = assets.ToDictionary(asset => asset.Id);

        foreach (var categoryId in requestedCategoryIds)
        {
            if (!categoriesById.ContainsKey(categoryId))
                throw new InvalidOperationException($"Asset category {categoryId} not found.");
        }

        foreach (var assetId in requestedAssetIds)
        {
            if (!assetsById.TryGetValue(assetId, out var asset))
                throw new InvalidOperationException($"Asset {assetId} not found.");

            if (asset.CategoryId != inputSkills.First(skill => skill.AssetId == assetId).AssetCategoryId)
                throw new InvalidOperationException($"Asset {assetId} is not linked to the selected asset category.");
        }

        var existingSkills = employee.Skills.ToList();
        var requestedKeys = inputSkills.Select(GetSkillKey).ToHashSet();

        foreach (var existingSkill in existingSkills.Where(skill => !requestedKeys.Contains(GetSkillKey(skill))))
        {
            await _uow.Employees.DeleteSkillAsync(existingSkill, ct);
            employee.Skills.Remove(existingSkill);
        }

        var now = DateTime.UtcNow;

        foreach (var inputSkill in inputSkills)
        {
            var existingSkill = employee.Skills.FirstOrDefault(skill => GetSkillKey(skill) == GetSkillKey(inputSkill));

            if (existingSkill is null)
            {
                var createdSkill = new EmployeeSkill
                {
                    Id = Guid.NewGuid(),
                    EmployeeId = employee.Id,
                    Employee = employee,
                    AssetCategoryId = inputSkill.AssetCategoryId,
                    AssetId = inputSkill.AssetId,
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

            existingSkill.SkillLevel = inputSkill.SkillLevel;
            existingSkill.AssetId = inputSkill.AssetId;
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

        var refreshedEmployee = await _uow.Employees.GetByIdAsync(
            tenantId,
            employeeId,
            includeSkills: true,
            includeAssignments: true,
            cancellationToken: ct)
            ?? throw new InvalidOperationException($"Employee {employeeId} not found after update.");

        return refreshedEmployee.Skills
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
                .OrderBy(skill => skill.Asset is null ? 0 : 1)
                .ThenBy(skill => skill.Asset?.Name ?? skill.AssetCategory?.Name ?? string.Empty)
                .Select(MapSkill)
                .ToList(),
            AssignedAssets = employee.AssetAssignments
                .Where(assignment => assignment.Status == AssetAssignmentStatus.Active && assignment.Asset is not null)
                .OrderByDescending(assignment => assignment.AssignedAtUtc)
                .Select(MapAssignedAsset)
                .ToList()
        };

    private static EmployeeSkillDto MapSkill(EmployeeSkill skill) =>
        new()
        {
            Id = skill.Id,
            AssetCategoryId = skill.AssetCategoryId,
            AssetCategoryName = skill.AssetCategory?.Name ?? string.Empty,
            AssetId = skill.AssetId,
            AssetName = skill.Asset?.Name,
            IsMachineSpecific = skill.AssetId.HasValue,
            ScopeLabel = skill.Asset is not null
                ? $"{skill.Asset.Name} ({skill.Asset.Code})"
                : skill.AssetCategory?.Name ?? string.Empty,
            AssetType = skill.AssetCategory is null ? 0 : (int)skill.AssetCategory.AssetType,
            SkillLevel = skill.SkillLevel,
            CanOperate = skill.CanOperate,
            CanMaintain = skill.CanMaintain,
            CanApproveMaintenance = skill.CanApproveMaintenance,
            Notes = skill.Notes,
            CreatedAtUtc = skill.CreatedAtUtc,
            UpdatedAtUtc = skill.UpdatedAtUtc
        };

    private static EmployeeAssignedAssetDto MapAssignedAsset(AssetAssignment assignment) =>
        new()
        {
            AssetId = assignment.AssetId,
            AssetName = assignment.Asset?.Name ?? string.Empty,
            AssetCode = assignment.Asset?.Code ?? string.Empty,
            AssetCategoryName = assignment.Asset?.Category,
            AssignedAtUtc = assignment.AssignedAtUtc,
            DueBackAtUtc = assignment.DueBackAtUtc
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

    private static string GetSkillKey(UpsertEmployeeSkillRequest skill)
        => skill.AssetId.HasValue
            ? $"asset:{skill.AssetId.Value}"
            : $"category:{skill.AssetCategoryId}";

    private static string GetSkillKey(EmployeeSkill skill)
        => skill.AssetId.HasValue
            ? $"asset:{skill.AssetId.Value}"
            : $"category:{skill.AssetCategoryId}";
}
