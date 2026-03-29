using Application.DTOs.Employees;
using Application.Services.Interfaces;
using Domain.Employees;
using FlowCraft.Interfaces.Abstractions;

namespace Application.Services;

public sealed class DepartmentService : IDepartmentService
{
    private readonly IUnitOfWork _uow;

    public DepartmentService(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<IReadOnlyList<DepartmentDto>> GetAllAsync(Guid tenantId, bool includeInactive = false, CancellationToken ct = default)
    {
        var departments = await _uow.Departments.GetAllAsync(tenantId, includeInactive, ct);
        return departments.Select(Map).ToList();
    }

    public async Task<DepartmentDto?> GetByIdAsync(Guid tenantId, Guid departmentId, CancellationToken ct = default)
    {
        var department = await _uow.Departments.GetByIdAsync(tenantId, departmentId, ct);
        return department is null ? null : Map(department);
    }

    public async Task<DepartmentDto> CreateAsync(Guid tenantId, CreateDepartmentRequest request, CancellationToken ct = default)
    {
        var code = NormalizeCode(request.Code);
        var name = Require(request.Name, nameof(request.Name));

        if (await _uow.Departments.CodeExistsAsync(tenantId, code, cancellationToken: ct))
            throw new InvalidOperationException($"Department code '{code}' already exists.");

        if (await _uow.Departments.NameExistsAsync(tenantId, name, cancellationToken: ct))
            throw new InvalidOperationException($"Department name '{name}' already exists.");

        var now = DateTime.UtcNow;
        var department = new Department
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = name,
            Code = code,
            Description = TrimOrNull(request.Description),
            ValueStream = TrimOrNull(request.ValueStream),
            IsActive = true,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };

        await _uow.Departments.AddAsync(department, ct);
        await _uow.SaveChangesAsync(ct);

        return Map(department);
    }

    public async Task<DepartmentDto> UpdateAsync(Guid tenantId, Guid departmentId, UpdateDepartmentRequest request, CancellationToken ct = default)
    {
        var department = await _uow.Departments.GetByIdAsync(tenantId, departmentId, ct)
            ?? throw new InvalidOperationException($"Department {departmentId} not found.");

        var code = NormalizeCode(request.Code);
        var name = Require(request.Name, nameof(request.Name));

        if (await _uow.Departments.CodeExistsAsync(tenantId, code, departmentId, ct))
            throw new InvalidOperationException($"Department code '{code}' already exists.");

        if (await _uow.Departments.NameExistsAsync(tenantId, name, departmentId, ct))
            throw new InvalidOperationException($"Department name '{name}' already exists.");

        department.Name = name;
        department.Code = code;
        department.Description = TrimOrNull(request.Description);
        department.ValueStream = TrimOrNull(request.ValueStream);
        department.IsActive = request.IsActive;
        department.UpdatedAtUtc = DateTime.UtcNow;

        await _uow.Departments.UpdateAsync(department, ct);
        await _uow.SaveChangesAsync(ct);

        return Map(department);
    }

    private static DepartmentDto Map(Department department) =>
        new()
        {
            Id = department.Id,
            Name = department.Name,
            Code = department.Code,
            Description = department.Description,
            ValueStream = department.ValueStream,
            IsActive = department.IsActive,
            EmployeesCount = department.Employees.Count(x => x.IsActive),
            CreatedAtUtc = department.CreatedAtUtc,
            UpdatedAtUtc = department.UpdatedAtUtc
        };

    private static string Require(string value, string paramName)
    {
        var trimmed = value?.Trim();
        if (string.IsNullOrWhiteSpace(trimmed))
            throw new ArgumentException($"{paramName} is required.", paramName);
        return trimmed;
    }

    private static string NormalizeCode(string value)
        => Require(value, nameof(value)).ToUpperInvariant();

    private static string? TrimOrNull(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
