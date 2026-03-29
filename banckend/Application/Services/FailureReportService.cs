using Application.DTOs.Maintenance;
using Application.Services.Interfaces;
using Domain.Maintenance;
using FlowCraft.Interfaces.Abstractions;

namespace Application.Services;

public sealed class FailureReportService : IFailureReportService
{
    private readonly IUnitOfWork _uow;

    public FailureReportService(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<IReadOnlyList<FailureReportDto>> GetAllAsync(Guid tenantId, bool openOnly = false, CancellationToken ct = default)
    {
        var reports = await _uow.FailureReports.GetAllAsync(tenantId, openOnly, ct);
        return reports.Select(Map).ToList();
    }

    public async Task<FailureReportDto?> GetByIdAsync(Guid tenantId, Guid reportId, CancellationToken ct = default)
    {
        var report = await _uow.FailureReports.GetByIdAsync(tenantId, reportId, includeWorkOrders: true, cancellationToken: ct);
        return report is null ? null : Map(report);
    }

    public async Task<IReadOnlyList<FailureCauseCategoryDto>> GetCauseCategoriesAsync(
        Guid tenantId,
        bool includeInactive = false,
        CancellationToken ct = default)
    {
        var categories = await _uow.FailureReports.GetCauseCategoriesAsync(tenantId, includeInactive, ct);
        return categories.Select(MapCauseCategory).ToList();
    }

    public async Task<FailureCauseCategoryDto> CreateCauseCategoryAsync(
        Guid tenantId,
        CreateFailureCauseCategoryRequest request,
        CancellationToken ct = default)
    {
        var trimmedName = Require(request.Name, nameof(request.Name));
        var trimmedCode = Require(request.Code, nameof(request.Code));

        if (await _uow.FailureReports.CauseCategoryCodeExistsAsync(tenantId, trimmedCode, cancellationToken: ct))
            throw new InvalidOperationException($"Failure cause category code '{trimmedCode}' already exists.");

        if (await _uow.FailureReports.CauseCategoryNameExistsAsync(tenantId, trimmedName, cancellationToken: ct))
            throw new InvalidOperationException($"Failure cause category '{trimmedName}' already exists.");

        var now = DateTime.UtcNow;
        var category = new FailureCauseCategory
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Name = trimmedName,
            Code = trimmedCode,
            Description = TrimOrNull(request.Description),
            IsActive = true,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };

        await _uow.FailureReports.AddCauseCategoryAsync(category, ct);
        await _uow.SaveChangesAsync(ct);

        return MapCauseCategory(category);
    }

    public async Task<FailureCauseCategoryDto> UpdateCauseCategoryAsync(
        Guid tenantId,
        Guid categoryId,
        UpdateFailureCauseCategoryRequest request,
        CancellationToken ct = default)
    {
        var category = await _uow.FailureReports.GetCauseCategoryByIdAsync(tenantId, categoryId, ct)
            ?? throw new InvalidOperationException($"Failure cause category {categoryId} not found.");

        var trimmedName = Require(request.Name, nameof(request.Name));
        var trimmedCode = Require(request.Code, nameof(request.Code));

        if (await _uow.FailureReports.CauseCategoryCodeExistsAsync(tenantId, trimmedCode, categoryId, ct))
            throw new InvalidOperationException($"Failure cause category code '{trimmedCode}' already exists.");

        if (await _uow.FailureReports.CauseCategoryNameExistsAsync(tenantId, trimmedName, categoryId, ct))
            throw new InvalidOperationException($"Failure cause category '{trimmedName}' already exists.");

        category.Name = trimmedName;
        category.Code = trimmedCode;
        category.Description = TrimOrNull(request.Description);
        category.IsActive = request.IsActive;
        category.UpdatedAtUtc = DateTime.UtcNow;

        await _uow.FailureReports.UpdateCauseCategoryAsync(category, ct);
        await _uow.SaveChangesAsync(ct);

        return MapCauseCategory(category);
    }

    public async Task<FailureAnalyticsDto> GetAnalyticsAsync(Guid tenantId, CancellationToken ct = default)
    {
        var reports = await _uow.FailureReports.GetAllAsync(tenantId, openOnly: false, cancellationToken: ct);
        var totalDowntimeMinutes = reports.Sum(report => report.DowntimeMinutes ?? 0);
        var downtimeReports = reports.Where(report => (report.DowntimeMinutes ?? 0) > 0).ToList();
        var totalIntervals = new List<double>();

        foreach (var assetGroup in reports
                     .Where(report => report.AssetId.HasValue)
                     .GroupBy(report => report.AssetId!.Value))
        {
            var ordered = assetGroup.OrderBy(report => report.ReportedAtUtc).ToList();
            for (var index = 1; index < ordered.Count; index++)
            {
                totalIntervals.Add((ordered[index].ReportedAtUtc - ordered[index - 1].ReportedAtUtc).TotalHours);
            }
        }

        var paretoBase = reports
            .Where(report => (report.DowntimeMinutes ?? 0) > 0 || report.FailureCauseCategoryId.HasValue)
            .GroupBy(report => new
            {
                report.FailureCauseCategoryId,
                Name = report.FailureCauseCategory?.Name ?? "Nieokreślona przyczyna"
            })
            .Select(group => new
            {
                group.Key.FailureCauseCategoryId,
                group.Key.Name,
                IncidentsCount = group.Count(),
                TotalDowntimeMinutes = group.Sum(report => report.DowntimeMinutes ?? 0)
            })
            .OrderByDescending(item => item.TotalDowntimeMinutes)
            .ThenByDescending(item => item.IncidentsCount)
            .ToList();

        var downtimeTotalForPareto = Math.Max(1, paretoBase.Sum(item => item.TotalDowntimeMinutes));
        decimal cumulativeShare = 0m;

        var pareto = paretoBase.Select(item =>
        {
            var share = Math.Round(item.TotalDowntimeMinutes / (decimal)downtimeTotalForPareto, 4);
            cumulativeShare = Math.Round(cumulativeShare + share, 4);

            return new FailureParetoItemDto
            {
                FailureCauseCategoryId = item.FailureCauseCategoryId,
                CauseName = item.Name,
                IncidentsCount = item.IncidentsCount,
                TotalDowntimeMinutes = item.TotalDowntimeMinutes,
                Share = share,
                CumulativeShare = cumulativeShare
            };
        }).ToList();

        return new FailureAnalyticsDto
        {
            OpenIncidentsCount = reports.Count(report => report.Status != FailureStatus.Resolved && report.Status != FailureStatus.Closed),
            TotalIncidentsCount = reports.Count,
            DowntimeIncidentsCount = downtimeReports.Count,
            TotalDowntimeMinutes = totalDowntimeMinutes,
            MttrHours = downtimeReports.Count == 0
                ? null
                : Math.Round((decimal)downtimeReports.Average(report => report.DowntimeMinutes ?? 0) / 60m, 2),
            MtbfHours = totalIntervals.Count == 0
                ? null
                : Math.Round((decimal)totalIntervals.Average(), 2),
            Pareto = pareto
        };
    }

    public async Task<FailureReportDto> CreateAsync(Guid tenantId, CreateFailureReportRequest request, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        await EnsureFailureCauseCategoryExistsAsync(tenantId, request.FailureCauseCategoryId, ct);

        var report = new FailureReport
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            AssetId = request.AssetId,
            HallId = request.HallId,
            SectionId = request.SectionId,
            ReportedByEmployeeId = request.ReportedByEmployeeId,
            FailureCauseCategoryId = request.FailureCauseCategoryId,
            Title = Require(request.Title, nameof(request.Title)),
            Description = Require(request.Description, nameof(request.Description)),
            Severity = request.Severity,
            CausesDowntime = request.CausesDowntime,
            DowntimeStartedAtUtc = request.CausesDowntime ? request.DowntimeStartedAtUtc ?? now : null,
            DowntimeEndedAtUtc = request.CausesDowntime ? request.DowntimeEndedAtUtc : null,
            ProductionLossUnits = request.ProductionLossUnits,
            RootCause = TrimOrNull(request.RootCause),
            CorrectiveAction = TrimOrNull(request.CorrectiveAction),
            PreventiveAction = TrimOrNull(request.PreventiveAction),
            ReportedAtUtc = now
        };

        UpdateDowntimeMinutes(report);

        await _uow.FailureReports.AddAsync(report, ct);
        await _uow.SaveChangesAsync(ct);

        return Map(report);
    }

    public async Task<FailureReportDto> UpdateAsync(Guid tenantId, Guid reportId, UpdateFailureReportRequest request, CancellationToken ct = default)
    {
        var report = await _uow.FailureReports.GetByIdAsync(tenantId, reportId, includeWorkOrders: true, cancellationToken: ct)
            ?? throw new InvalidOperationException($"Failure report {reportId} not found.");
        await EnsureFailureCauseCategoryExistsAsync(tenantId, request.FailureCauseCategoryId, ct);

        report.Title = Require(request.Title, nameof(request.Title));
        report.Description = Require(request.Description, nameof(request.Description));
        report.Severity = request.Severity;
        report.CausesDowntime = request.CausesDowntime;
        report.FailureCauseCategoryId = request.FailureCauseCategoryId;
        report.DowntimeStartedAtUtc = request.CausesDowntime ? request.DowntimeStartedAtUtc ?? report.DowntimeStartedAtUtc : null;
        report.DowntimeEndedAtUtc = request.CausesDowntime ? request.DowntimeEndedAtUtc : null;
        report.ProductionLossUnits = request.ProductionLossUnits;
        report.RootCause = TrimOrNull(request.RootCause);
        report.CorrectiveAction = TrimOrNull(request.CorrectiveAction);
        report.PreventiveAction = TrimOrNull(request.PreventiveAction);
        report.ResolutionSummary = TrimOrNull(request.ResolutionSummary);
        UpdateDowntimeMinutes(report);

        await _uow.FailureReports.UpdateAsync(report, ct);
        await _uow.SaveChangesAsync(ct);

        return Map(report);
    }

    public async Task<FailureReportDto> SetStatusAsync(Guid tenantId, Guid reportId, SetFailureReportStatusRequest request, CancellationToken ct = default)
    {
        var report = await _uow.FailureReports.GetByIdAsync(tenantId, reportId, includeWorkOrders: true, cancellationToken: ct)
            ?? throw new InvalidOperationException($"Failure report {reportId} not found.");
        await EnsureFailureCauseCategoryExistsAsync(tenantId, request.FailureCauseCategoryId, ct);

        report.Status = request.Status;
        report.RootCause = TrimOrNull(request.RootCause) ?? report.RootCause;
        report.CorrectiveAction = TrimOrNull(request.CorrectiveAction) ?? report.CorrectiveAction;
        report.PreventiveAction = TrimOrNull(request.PreventiveAction) ?? report.PreventiveAction;
        report.ResolutionSummary = TrimOrNull(request.ResolutionSummary) ?? report.ResolutionSummary;
        report.FailureCauseCategoryId = request.FailureCauseCategoryId ?? report.FailureCauseCategoryId;
        report.ProductionLossUnits = request.ProductionLossUnits ?? report.ProductionLossUnits;

        var now = DateTime.UtcNow;

        if (request.Status == FailureStatus.Triaged && report.TriagedAtUtc is null)
            report.TriagedAtUtc = now;

        if (request.Status == FailureStatus.Resolved)
        {
            report.ResolvedAtUtc = now;
            if (report.CausesDowntime && report.DowntimeEndedAtUtc is null)
                report.DowntimeEndedAtUtc = request.DowntimeEndedAtUtc ?? now;
        }

        if (request.Status == FailureStatus.Closed)
        {
            report.ClosedAtUtc = now;
            if (report.CausesDowntime && report.DowntimeEndedAtUtc is null)
                report.DowntimeEndedAtUtc = request.DowntimeEndedAtUtc ?? now;
        }

        UpdateDowntimeMinutes(report);

        await _uow.FailureReports.UpdateAsync(report, ct);
        await _uow.SaveChangesAsync(ct);

        return Map(report);
    }

    private static FailureReportDto Map(FailureReport report) =>
        new()
        {
            Id = report.Id,
            AssetId = report.AssetId,
            HallId = report.HallId,
            SectionId = report.SectionId,
            ReportedByEmployeeId = report.ReportedByEmployeeId,
            FailureCauseCategoryId = report.FailureCauseCategoryId,
            FailureCauseCategoryName = report.FailureCauseCategory?.Name,
            Title = report.Title,
            Description = report.Description,
            Severity = report.Severity,
            Status = report.Status,
            CausesDowntime = report.CausesDowntime,
            ReportedAtUtc = report.ReportedAtUtc,
            DowntimeStartedAtUtc = report.DowntimeStartedAtUtc,
            DowntimeEndedAtUtc = report.DowntimeEndedAtUtc,
            DowntimeMinutes = report.DowntimeMinutes,
            ProductionLossUnits = report.ProductionLossUnits,
            TriagedAtUtc = report.TriagedAtUtc,
            ResolvedAtUtc = report.ResolvedAtUtc,
            ClosedAtUtc = report.ClosedAtUtc,
            RootCause = report.RootCause,
            CorrectiveAction = report.CorrectiveAction,
            PreventiveAction = report.PreventiveAction,
            ResolutionSummary = report.ResolutionSummary,
            WorkOrderIds = report.WorkOrders.Select(x => x.Id).ToList()
        };

    private static FailureCauseCategoryDto MapCauseCategory(FailureCauseCategory category) =>
        new()
        {
            Id = category.Id,
            Name = category.Name,
            Code = category.Code,
            Description = category.Description,
            IsActive = category.IsActive,
            IncidentsCount = category.FailureReports.Count,
            TotalDowntimeMinutes = category.FailureReports.Sum(report => report.DowntimeMinutes ?? 0),
            CreatedAtUtc = category.CreatedAtUtc,
            UpdatedAtUtc = category.UpdatedAtUtc
        };

    private static void UpdateDowntimeMinutes(FailureReport report)
    {
        if (!report.CausesDowntime)
        {
            report.DowntimeStartedAtUtc = null;
            report.DowntimeEndedAtUtc = null;
            report.DowntimeMinutes = null;
            return;
        }

        if (report.DowntimeStartedAtUtc.HasValue && report.DowntimeEndedAtUtc.HasValue)
        {
            var duration = report.DowntimeEndedAtUtc.Value - report.DowntimeStartedAtUtc.Value;
            report.DowntimeMinutes = Math.Max(0, (int)Math.Round(duration.TotalMinutes));
            return;
        }

        report.DowntimeMinutes = null;
    }

    private async Task EnsureFailureCauseCategoryExistsAsync(
        Guid tenantId,
        Guid? categoryId,
        CancellationToken ct)
    {
        if (!categoryId.HasValue)
            return;

        var category = await _uow.FailureReports.GetCauseCategoryByIdAsync(tenantId, categoryId.Value, ct);
        if (category is null || !category.IsActive)
            throw new InvalidOperationException($"Failure cause category {categoryId.Value} not found.");
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
