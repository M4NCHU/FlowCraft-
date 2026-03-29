using Application.DTOs.Lean;
using Application.Services.Interfaces;
using Domain.Employees;
using Domain.Lean;
using FlowCraft.Interfaces.Abstractions;

namespace Application.Services;

public sealed class ImprovementIdeaService : IImprovementIdeaService
{
    private readonly IUnitOfWork _uow;

    public ImprovementIdeaService(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<IReadOnlyList<ImprovementIdeaDto>> GetAllAsync(Guid tenantId, bool includeClosed = true, CancellationToken ct = default)
    {
        var ideas = await _uow.ImprovementIdeas.GetAllAsync(tenantId, includeClosed, ct);
        return ideas.Select(Map).ToList();
    }

    public async Task<ImprovementIdeaDto?> GetByIdAsync(Guid tenantId, Guid improvementIdeaId, CancellationToken ct = default)
    {
        var idea = await _uow.ImprovementIdeas.GetByIdAsync(tenantId, improvementIdeaId, ct);
        return idea is null ? null : Map(idea);
    }

    public async Task<ImprovementIdeaDto> CreateAsync(Guid tenantId, CreateImprovementIdeaRequest request, CancellationToken ct = default)
    {
        var department = await ResolveDepartmentAsync(tenantId, request.DepartmentId, ct);
        var owner = await ResolveEmployeeAsync(tenantId, request.OwnerEmployeeId, ct);
        var now = DateTime.UtcNow;

        var idea = new ImprovementIdea
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            DepartmentId = department?.Id,
            Department = department,
            OwnerEmployeeId = owner?.Id,
            OwnerEmployee = owner,
            Title = Require(request.Title, nameof(request.Title)),
            Description = Require(request.Description, nameof(request.Description)),
            Category = request.Category,
            WasteType = request.WasteType,
            Status = ImprovementStatus.New,
            Impact = request.Impact,
            QuickWin = request.QuickWin,
            ProposedAction = TrimOrNull(request.ProposedAction),
            BaselineMetricName = TrimOrNull(request.BaselineMetricName),
            MetricUnit = TrimOrNull(request.MetricUnit),
            BaselineValue = request.BaselineValue,
            TargetValue = request.TargetValue,
            EstimatedSavingsPerMonth = request.EstimatedSavingsPerMonth,
            DueDateUtc = request.DueDateUtc,
            Notes = TrimOrNull(request.Notes),
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };

        await _uow.ImprovementIdeas.AddAsync(idea, ct);
        await _uow.SaveChangesAsync(ct);

        return Map(idea);
    }

    public async Task<ImprovementIdeaDto> UpdateAsync(Guid tenantId, Guid improvementIdeaId, UpdateImprovementIdeaRequest request, CancellationToken ct = default)
    {
        var idea = await _uow.ImprovementIdeas.GetByIdAsync(tenantId, improvementIdeaId, ct)
            ?? throw new InvalidOperationException($"Improvement idea {improvementIdeaId} not found.");

        var department = await ResolveDepartmentAsync(tenantId, request.DepartmentId, ct);
        var owner = await ResolveEmployeeAsync(tenantId, request.OwnerEmployeeId, ct);

        idea.DepartmentId = department?.Id;
        idea.Department = department;
        idea.OwnerEmployeeId = owner?.Id;
        idea.OwnerEmployee = owner;
        idea.Title = Require(request.Title, nameof(request.Title));
        idea.Description = Require(request.Description, nameof(request.Description));
        idea.Category = request.Category;
        idea.WasteType = request.WasteType;
        idea.Impact = request.Impact;
        idea.QuickWin = request.QuickWin;
        idea.RootCause = TrimOrNull(request.RootCause);
        idea.ProposedAction = TrimOrNull(request.ProposedAction);
        idea.BaselineMetricName = TrimOrNull(request.BaselineMetricName);
        idea.MetricUnit = TrimOrNull(request.MetricUnit);
        idea.BaselineValue = request.BaselineValue;
        idea.TargetValue = request.TargetValue;
        idea.ActualValue = request.ActualValue;
        idea.EstimatedSavingsPerMonth = request.EstimatedSavingsPerMonth;
        idea.ImplementedSavingsPerMonth = request.ImplementedSavingsPerMonth;
        idea.ResultSummary = TrimOrNull(request.ResultSummary);
        idea.DueDateUtc = request.DueDateUtc;
        idea.Notes = TrimOrNull(request.Notes);
        idea.UpdatedAtUtc = DateTime.UtcNow;

        await _uow.ImprovementIdeas.UpdateAsync(idea, ct);
        await _uow.SaveChangesAsync(ct);

        return Map(idea);
    }

    public async Task<ImprovementIdeaDto> SetStatusAsync(Guid tenantId, Guid improvementIdeaId, SetImprovementIdeaStatusRequest request, CancellationToken ct = default)
    {
        var idea = await _uow.ImprovementIdeas.GetByIdAsync(tenantId, improvementIdeaId, ct)
            ?? throw new InvalidOperationException($"Improvement idea {improvementIdeaId} not found.");

        idea.Status = request.Status;
        idea.UpdatedAtUtc = DateTime.UtcNow;

        if (!string.IsNullOrWhiteSpace(request.Notes))
            idea.Notes = request.Notes.Trim();

        if (request.Status == ImprovementStatus.Implemented)
        {
            idea.ImplementedAtUtc = DateTime.UtcNow;
        }
        else
        {
            idea.ImplementedAtUtc = null;
        }

        await _uow.ImprovementIdeas.UpdateAsync(idea, ct);
        await _uow.SaveChangesAsync(ct);

        return Map(idea);
    }

    private static ImprovementIdeaDto Map(ImprovementIdea idea) =>
        new()
        {
            Id = idea.Id,
            DepartmentId = idea.DepartmentId,
            DepartmentName = idea.Department?.Name,
            OwnerEmployeeId = idea.OwnerEmployeeId,
            OwnerEmployeeName = idea.OwnerEmployee is null
                ? null
                : $"{idea.OwnerEmployee.FirstName} {idea.OwnerEmployee.LastName}".Trim(),
            Title = idea.Title,
            Description = idea.Description,
            Category = idea.Category,
            WasteType = idea.WasteType,
            Status = idea.Status,
            Impact = idea.Impact,
            QuickWin = idea.QuickWin,
            RootCause = idea.RootCause,
            ProposedAction = idea.ProposedAction,
            BaselineMetricName = idea.BaselineMetricName,
            MetricUnit = idea.MetricUnit,
            BaselineValue = idea.BaselineValue,
            TargetValue = idea.TargetValue,
            ActualValue = idea.ActualValue,
            EstimatedSavingsPerMonth = idea.EstimatedSavingsPerMonth,
            ImplementedSavingsPerMonth = idea.ImplementedSavingsPerMonth,
            ResultSummary = idea.ResultSummary,
            ImprovementPercent = CalculateImprovementPercent(idea),
            TargetAchievementPercent = CalculateTargetAchievementPercent(idea),
            PriorityScore = CalculatePriorityScore(idea),
            IsOverdue = IsOverdue(idea),
            IsDueSoon = IsDueSoon(idea),
            DueDateUtc = idea.DueDateUtc,
            ImplementedAtUtc = idea.ImplementedAtUtc,
            Notes = idea.Notes,
            CreatedAtUtc = idea.CreatedAtUtc,
            UpdatedAtUtc = idea.UpdatedAtUtc
        };

    private static int CalculatePriorityScore(ImprovementIdea idea)
    {
        if (idea.Status is ImprovementStatus.Implemented or ImprovementStatus.Rejected)
            return 0;

        var score = idea.Impact switch
        {
            ImprovementImpact.Low => 15,
            ImprovementImpact.Medium => 30,
            ImprovementImpact.High => 45,
            ImprovementImpact.Critical => 60,
            _ => 0
        };

        if (idea.QuickWin)
            score += 15;

        score += idea.Status switch
        {
            ImprovementStatus.New => 6,
            ImprovementStatus.InReview => 10,
            ImprovementStatus.Approved => 14,
            ImprovementStatus.InProgress => 8,
            _ => 0
        };

        score += idea.WasteType switch
        {
            LeanWasteType.Waiting => 8,
            LeanWasteType.Defects => 8,
            LeanWasteType.Overproduction => 7,
            LeanWasteType.Transport => 6,
            LeanWasteType.Motion => 6,
            LeanWasteType.Inventory => 5,
            LeanWasteType.Overprocessing => 5,
            LeanWasteType.UnusedTalent => 4,
            _ => 0
        };

        score += idea.EstimatedSavingsPerMonth switch
        {
            >= 20000m => 20,
            >= 10000m => 15,
            >= 5000m => 10,
            >= 1000m => 5,
            > 0m => 2,
            _ => 0
        };

        if (idea.DueDateUtc.HasValue)
        {
            var daysToDue = (int)Math.Ceiling((idea.DueDateUtc.Value - DateTime.UtcNow).TotalDays);

            score += daysToDue switch
            {
                < 0 => 18,
                <= 7 => 14,
                <= 14 => 10,
                <= 30 => 5,
                _ => 0
            };
        }

        return score;
    }

    private static bool IsOverdue(ImprovementIdea idea)
        => idea.Status is not (ImprovementStatus.Implemented or ImprovementStatus.Rejected)
            && idea.DueDateUtc.HasValue
            && idea.DueDateUtc.Value < DateTime.UtcNow;

    private static bool IsDueSoon(ImprovementIdea idea)
        => idea.Status is not (ImprovementStatus.Implemented or ImprovementStatus.Rejected)
            && idea.DueDateUtc.HasValue
            && idea.DueDateUtc.Value >= DateTime.UtcNow
            && idea.DueDateUtc.Value <= DateTime.UtcNow.AddDays(14);

    private static decimal? CalculateImprovementPercent(ImprovementIdea idea)
    {
        if (!idea.BaselineValue.HasValue || !idea.ActualValue.HasValue || idea.BaselineValue.Value == 0)
            return null;

        return Math.Round(((idea.BaselineValue.Value - idea.ActualValue.Value) / idea.BaselineValue.Value) * 100m, 2);
    }

    private static decimal? CalculateTargetAchievementPercent(ImprovementIdea idea)
    {
        if (!idea.BaselineValue.HasValue || !idea.TargetValue.HasValue || !idea.ActualValue.HasValue)
            return null;

        var baseline = idea.BaselineValue.Value;
        var target = idea.TargetValue.Value;
        var actual = idea.ActualValue.Value;
        var targetDelta = baseline - target;

        if (targetDelta == 0)
            return actual == target ? 100m : null;

        var achievedDelta = baseline - actual;
        return Math.Round((achievedDelta / targetDelta) * 100m, 2);
    }

    private async Task<Department?> ResolveDepartmentAsync(Guid tenantId, Guid? departmentId, CancellationToken ct)
    {
        if (!departmentId.HasValue)
            return null;

        return await _uow.Departments.GetByIdAsync(tenantId, departmentId.Value, ct)
            ?? throw new InvalidOperationException($"Department {departmentId.Value} not found.");
    }

    private async Task<EmployeeProfile?> ResolveEmployeeAsync(Guid tenantId, Guid? employeeId, CancellationToken ct)
    {
        if (!employeeId.HasValue)
            return null;

        return await _uow.Employees.GetByIdAsync(tenantId, employeeId.Value, cancellationToken: ct)
            ?? throw new InvalidOperationException($"Employee {employeeId.Value} not found.");
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
