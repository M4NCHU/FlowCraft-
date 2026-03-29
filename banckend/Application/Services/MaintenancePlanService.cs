using Application.DTOs.Maintenance;
using Application.Services.Interfaces;
using Domain.Assets;
using Domain.Maintenance;
using FlowCraft.Interfaces.Abstractions;

namespace Application.Services;

public sealed class MaintenancePlanService : IMaintenancePlanService
{
    private readonly IUnitOfWork _uow;

    public MaintenancePlanService(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<IReadOnlyList<MaintenancePlanDto>> GetAllAsync(
        Guid tenantId,
        Guid? assetId = null,
        bool includeInactive = false,
        CancellationToken ct = default)
    {
        var plans = await _uow.MaintenancePlans.GetAllAsync(
            tenantId,
            assetId,
            includeInactive,
            includeExecutions: true,
            cancellationToken: ct);
        var openWorkOrders = await GetOpenMaintenanceWorkOrdersAsync(tenantId, ct);

        return plans
            .Select(plan => MapPlan(plan, openWorkOrders.TryGetValue(plan.Id, out var workOrder) ? workOrder : null))
            .ToList();
    }

    public async Task<MaintenancePlanDto?> GetByIdAsync(Guid tenantId, Guid planId, CancellationToken ct = default)
    {
        var plan = await _uow.MaintenancePlans.GetByIdAsync(
            tenantId,
            planId,
            includeExecutions: true,
            cancellationToken: ct);

        if (plan is null)
            return null;

        var openWorkOrder = await _uow.WorkOrders.GetOpenForMaintenancePlanAsync(tenantId, planId, ct);
        return MapPlan(plan, openWorkOrder);
    }

    public async Task<IReadOnlyList<MaintenanceCalendarOccurrenceDto>> GetCalendarAsync(
        Guid tenantId,
        DateTime fromUtc,
        DateTime toUtc,
        Guid? assetId = null,
        CancellationToken ct = default)
    {
        if (toUtc < fromUtc)
            throw new ArgumentException("Range end must be greater than or equal to range start.", nameof(toUtc));

        var plans = await _uow.MaintenancePlans.GetAllAsync(
            tenantId,
            assetId,
            includeInactive: true,
            includeExecutions: false,
            cancellationToken: ct);
        var executions = await _uow.MaintenancePlans.GetExecutionsInRangeAsync(
            tenantId,
            fromUtc,
            toUtc,
            assetId,
            cancellationToken: ct);
        var openWorkOrders = await GetOpenMaintenanceWorkOrdersAsync(tenantId, ct);

        var items = new List<MaintenanceCalendarOccurrenceDto>();
        var executionLookup = executions.ToDictionary(
            execution => (execution.MaintenancePlanId, execution.ScheduledForUtc, execution.ScheduledMeterValue),
            execution => execution);

        foreach (var execution in executions)
        {
            items.Add(new MaintenanceCalendarOccurrenceDto
            {
                PlanId = execution.MaintenancePlanId,
                AssetId = execution.AssetId,
                AssetName = execution.Asset?.Name ?? string.Empty,
                AssetCode = execution.Asset?.Code ?? string.Empty,
                PlanTitle = execution.MaintenancePlan?.Title ?? "Przeglad",
                ScheduledForUtc = execution.ScheduledForUtc,
                ScheduledMeterValue = execution.ScheduledMeterValue,
                CompletedAtUtc = execution.CompletedAtUtc,
                Status = MaintenanceOccurrenceStatus.Completed,
                TriggerMode = execution.MaintenancePlan?.TriggerMode ?? MaintenanceTriggerMode.Calendar,
                LeadTimeDays = execution.MaintenancePlan?.LeadTimeDays ?? 0,
                EstimatedDurationMinutes = execution.MaintenancePlan?.EstimatedDurationMinutes,
                OpenWorkOrderId = openWorkOrders.TryGetValue(execution.MaintenancePlanId, out var workOrder)
                    ? workOrder.Id
                    : null,
                Checklist = execution.MaintenancePlan?.Checklist,
                Notes = execution.Notes
            });
        }

        foreach (var plan in plans.Where(plan => plan.TriggerMode == MaintenanceTriggerMode.Calendar))
        {
            foreach (var scheduledForUtc in EnumerateCalendarOccurrences(plan, fromUtc, toUtc))
            {
                if (executionLookup.ContainsKey((plan.Id, scheduledForUtc, null)))
                    continue;

                items.Add(new MaintenanceCalendarOccurrenceDto
                {
                    PlanId = plan.Id,
                    AssetId = plan.AssetId,
                    AssetName = plan.Asset?.Name ?? string.Empty,
                    AssetCode = plan.Asset?.Code ?? string.Empty,
                    PlanTitle = plan.Title,
                    ScheduledForUtc = scheduledForUtc,
                    ScheduledMeterValue = null,
                    CompletedAtUtc = null,
                    Status = DetermineCurrentStatus(plan),
                    TriggerMode = plan.TriggerMode,
                    LeadTimeDays = plan.LeadTimeDays,
                    EstimatedDurationMinutes = plan.EstimatedDurationMinutes,
                    OpenWorkOrderId = openWorkOrders.TryGetValue(plan.Id, out var workOrder)
                        ? workOrder.Id
                        : null,
                    Checklist = plan.Checklist,
                    Notes = plan.Description
                });
            }
        }

        return items
            .OrderBy(item => item.ScheduledForUtc)
            .ThenBy(item => item.AssetName)
            .ThenBy(item => item.PlanTitle)
            .ToList();
    }

    public async Task<MaintenancePlanDto> CreateAsync(Guid tenantId, CreateMaintenancePlanRequest request, CancellationToken ct = default)
    {
        var asset = await _uow.Assets.GetByIdAsync(tenantId, request.AssetId, includeUsageReadings: true, cancellationToken: ct)
            ?? throw new InvalidOperationException($"Asset {request.AssetId} not found.");

        await EnsureEmployeeExistsAsync(tenantId, request.AssignedToEmployeeId, ct);
        ValidateRequest(
            request.TriggerMode,
            request.ScheduleType,
            request.StartsAtUtc,
            request.RecurrenceUnit,
            request.RecurrenceInterval,
            request.MeterType,
            request.MeterInterval,
            request.LeadTimeDays);

        var now = DateTime.UtcNow;
        var initialMeterBaseline = ResolveInitialMeterBaseline(asset, request.MeterType, request.StartsAtMeterValue);
        var plan = new MaintenancePlan
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            AssetId = asset.Id,
            Asset = asset,
            AssignedToEmployeeId = request.AssignedToEmployeeId,
            Title = Require(request.Title, nameof(request.Title)),
            Description = TrimOrNull(request.Description),
            TriggerMode = request.TriggerMode,
            ScheduleType = request.ScheduleType,
            StartsAtUtc = request.StartsAtUtc,
            NextDueAtUtc = request.TriggerMode == MaintenanceTriggerMode.Calendar
                ? request.StartsAtUtc
                : null,
            RecurrenceUnit = request.TriggerMode == MaintenanceTriggerMode.Calendar && request.ScheduleType == MaintenanceScheduleType.Recurring
                ? request.RecurrenceUnit
                : null,
            RecurrenceInterval = request.TriggerMode == MaintenanceTriggerMode.Calendar && request.ScheduleType == MaintenanceScheduleType.Recurring
                ? request.RecurrenceInterval
                : null,
            MeterType = request.TriggerMode == MaintenanceTriggerMode.Meter
                ? request.MeterType
                : null,
            MeterInterval = request.TriggerMode == MaintenanceTriggerMode.Meter
                ? request.MeterInterval
                : null,
            LastCompletedMeterValue = request.TriggerMode == MaintenanceTriggerMode.Meter
                ? initialMeterBaseline
                : null,
            NextDueMeterValue = request.TriggerMode == MaintenanceTriggerMode.Meter
                ? CalculateInitialNextDueMeterValue(request.ScheduleType, initialMeterBaseline, request.MeterInterval)
                : null,
            AutoCreateLeadMeterValue = request.TriggerMode == MaintenanceTriggerMode.Meter
                ? request.AutoCreateLeadMeterValue
                : null,
            AutoCreateWorkOrder = request.AutoCreateWorkOrder,
            LeadTimeDays = request.LeadTimeDays,
            EstimatedDurationMinutes = request.EstimatedDurationMinutes,
            Checklist = TrimOrNull(request.Checklist),
            Instructions = TrimOrNull(request.Instructions),
            IsActive = true,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };

        await _uow.MaintenancePlans.AddAsync(plan, ct);
        await _uow.SaveChangesAsync(ct);

        var createdPlan = await _uow.MaintenancePlans.GetByIdAsync(tenantId, plan.Id, includeExecutions: true, cancellationToken: ct)
            ?? throw new InvalidOperationException("Maintenance plan was created but could not be loaded.");
        var openWorkOrder = await _uow.WorkOrders.GetOpenForMaintenancePlanAsync(tenantId, createdPlan.Id, ct);

        return MapPlan(createdPlan, openWorkOrder);
    }

    public async Task<MaintenancePlanDto> UpdateAsync(Guid tenantId, Guid planId, UpdateMaintenancePlanRequest request, CancellationToken ct = default)
    {
        var plan = await _uow.MaintenancePlans.GetByIdAsync(tenantId, planId, includeExecutions: true, cancellationToken: ct)
            ?? throw new InvalidOperationException($"Maintenance plan {planId} not found.");
        var asset = await _uow.Assets.GetByIdAsync(tenantId, request.AssetId, includeUsageReadings: true, cancellationToken: ct)
            ?? throw new InvalidOperationException($"Asset {request.AssetId} not found.");

        await EnsureEmployeeExistsAsync(tenantId, request.AssignedToEmployeeId, ct);
        ValidateRequest(
            request.TriggerMode,
            request.ScheduleType,
            request.StartsAtUtc,
            request.RecurrenceUnit,
            request.RecurrenceInterval,
            request.MeterType,
            request.MeterInterval,
            request.LeadTimeDays);

        plan.AssetId = asset.Id;
        plan.Asset = asset;
        plan.AssignedToEmployeeId = request.AssignedToEmployeeId;
        plan.Title = Require(request.Title, nameof(request.Title));
        plan.Description = TrimOrNull(request.Description);
        plan.TriggerMode = request.TriggerMode;
        plan.ScheduleType = request.ScheduleType;
        plan.StartsAtUtc = request.StartsAtUtc;
        plan.LeadTimeDays = request.LeadTimeDays;
        plan.EstimatedDurationMinutes = request.EstimatedDurationMinutes;
        plan.Checklist = TrimOrNull(request.Checklist);
        plan.Instructions = TrimOrNull(request.Instructions);
        plan.IsActive = request.IsActive;
        plan.AutoCreateWorkOrder = request.AutoCreateWorkOrder;
        plan.UpdatedAtUtc = DateTime.UtcNow;

        if (request.TriggerMode == MaintenanceTriggerMode.Calendar)
        {
            plan.RecurrenceUnit = request.ScheduleType == MaintenanceScheduleType.Recurring
                ? request.RecurrenceUnit
                : null;
            plan.RecurrenceInterval = request.ScheduleType == MaintenanceScheduleType.Recurring
                ? request.RecurrenceInterval
                : null;
            plan.MeterType = null;
            plan.MeterInterval = null;
            plan.AutoCreateLeadMeterValue = null;
            plan.LastCompletedMeterValue = null;
            plan.NextDueMeterValue = null;
            plan.NextDueAtUtc = request.IsActive
                ? CalculateNextDueAt(plan, plan.LastCompletedAtUtc)
                : null;
        }
        else
        {
            var initialMeterBaseline = ResolveInitialMeterBaseline(asset, request.MeterType, request.StartsAtMeterValue);

            plan.RecurrenceUnit = null;
            plan.RecurrenceInterval = null;
            plan.NextDueAtUtc = null;
            plan.MeterType = request.MeterType;
            plan.MeterInterval = request.MeterInterval;
            plan.AutoCreateLeadMeterValue = request.AutoCreateLeadMeterValue;

            if (!plan.LastCompletedMeterValue.HasValue)
                plan.LastCompletedMeterValue = initialMeterBaseline;

            if (!request.IsActive)
            {
                plan.NextDueMeterValue = null;
            }
            else if (plan.ScheduleType == MaintenanceScheduleType.OneTime)
            {
                plan.NextDueMeterValue = request.StartsAtMeterValue ?? plan.NextDueMeterValue ?? initialMeterBaseline;
            }
            else
            {
                var baseline = plan.LastCompletedMeterValue ?? initialMeterBaseline;
                plan.NextDueMeterValue = baseline + (request.MeterInterval ?? 0m);
            }
        }

        await _uow.MaintenancePlans.UpdateAsync(plan, ct);
        await _uow.SaveChangesAsync(ct);

        var updatedPlan = await _uow.MaintenancePlans.GetByIdAsync(tenantId, planId, includeExecutions: true, cancellationToken: ct)
            ?? throw new InvalidOperationException($"Maintenance plan {planId} not found after update.");
        var openWorkOrder = await _uow.WorkOrders.GetOpenForMaintenancePlanAsync(tenantId, updatedPlan.Id, ct);

        return MapPlan(updatedPlan, openWorkOrder);
    }

    public async Task<MaintenancePlanDto> CompleteAsync(Guid tenantId, Guid planId, CompleteMaintenanceOccurrenceRequest request, CancellationToken ct = default)
    {
        var plan = await _uow.MaintenancePlans.GetByIdAsync(tenantId, planId, includeExecutions: true, cancellationToken: ct)
            ?? throw new InvalidOperationException($"Maintenance plan {planId} not found.");

        if (!plan.IsActive)
            throw new InvalidOperationException("Inactive maintenance plan cannot be completed.");

        await EnsureEmployeeExistsAsync(tenantId, request.CompletedByEmployeeId, ct);

        var now = DateTime.UtcNow;
        var completedAtUtc = request.CompletedAtUtc ?? now;
        var scheduledForUtc = request.ScheduledForUtc ?? plan.NextDueAtUtc ?? completedAtUtc;
        var scheduledMeterValue = request.ScheduledMeterValue ?? plan.NextDueMeterValue;

        if (plan.TriggerMode == MaintenanceTriggerMode.Meter && !scheduledMeterValue.HasValue)
            throw new InvalidOperationException("Meter-based maintenance requires scheduled meter value.");

        var existingExecution = await _uow.MaintenancePlans.GetExecutionAsync(tenantId, planId, scheduledForUtc, ct);
        if (existingExecution is not null && existingExecution.ScheduledMeterValue == scheduledMeterValue)
            throw new InvalidOperationException("This occurrence has already been completed.");

        var execution = new MaintenanceExecution
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            MaintenancePlanId = plan.Id,
            AssetId = plan.AssetId,
            CompletedByEmployeeId = request.CompletedByEmployeeId,
            ScheduledForUtc = scheduledForUtc,
            ScheduledMeterValue = scheduledMeterValue,
            CompletedAtUtc = completedAtUtc,
            Outcome = MaintenanceExecutionOutcome.Completed,
            ActualMinutes = request.ActualMinutes,
            Notes = TrimOrNull(request.Notes),
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };

        await _uow.MaintenancePlans.AddExecutionAsync(execution, ct);

        plan.LastCompletedAtUtc = completedAtUtc;
        plan.UpdatedAtUtc = now;

        if (plan.TriggerMode == MaintenanceTriggerMode.Calendar)
        {
            if (plan.ScheduleType == MaintenanceScheduleType.OneTime)
            {
                plan.NextDueAtUtc = null;
                plan.IsActive = false;
            }
            else
            {
                var nextDue = AdvanceCalendarOccurrence(plan, scheduledForUtc);
                var guard = 0;
                while (nextDue <= completedAtUtc && guard < 120)
                {
                    nextDue = AdvanceCalendarOccurrence(plan, nextDue);
                    guard++;
                }

                plan.NextDueAtUtc = nextDue;
            }
        }
        else
        {
            plan.LastCompletedMeterValue = scheduledMeterValue;

            if (plan.ScheduleType == MaintenanceScheduleType.OneTime)
            {
                plan.NextDueMeterValue = null;
                plan.IsActive = false;
            }
            else
            {
                plan.NextDueMeterValue = (scheduledMeterValue ?? 0m) + (plan.MeterInterval ?? 0m);
            }
        }

        await _uow.MaintenancePlans.UpdateAsync(plan, ct);

        var openWorkOrder = await _uow.WorkOrders.GetOpenForMaintenancePlanAsync(tenantId, plan.Id, ct);
        if (openWorkOrder is not null)
        {
            openWorkOrder.Status = WorkOrderStatus.Done;
            openWorkOrder.CompletedAtUtc = completedAtUtc;
            openWorkOrder.ActualMinutes ??= request.ActualMinutes;
            openWorkOrder.ResolutionSummary = string.IsNullOrWhiteSpace(request.Notes)
                ? openWorkOrder.ResolutionSummary
                : request.Notes.Trim();
            await _uow.WorkOrders.UpdateAsync(openWorkOrder, ct);
        }

        await _uow.SaveChangesAsync(ct);

        var updatedPlan = await _uow.MaintenancePlans.GetByIdAsync(tenantId, planId, includeExecutions: true, cancellationToken: ct)
            ?? throw new InvalidOperationException($"Maintenance plan {planId} not found after completion.");

        return MapPlan(updatedPlan, null);
    }

    public async Task<MaintenanceAutomationSyncDto> SyncAutoGeneratedWorkOrdersAsync(
        Guid tenantId,
        Guid? assetId = null,
        CancellationToken ct = default)
    {
        var plans = await _uow.MaintenancePlans.GetAllAsync(
            tenantId,
            assetId,
            includeInactive: false,
            includeExecutions: false,
            cancellationToken: ct);

        var openWorkOrders = await GetOpenMaintenanceWorkOrdersAsync(tenantId, ct);
        var createdIds = new List<Guid>();

        foreach (var plan in plans.Where(plan => plan.AutoCreateWorkOrder))
        {
            if (openWorkOrders.ContainsKey(plan.Id))
                continue;

            if (!ShouldCreateWorkOrder(plan))
                continue;

            var now = DateTime.UtcNow;
            var number = await GenerateWorkOrderNumberAsync(tenantId, now, ct);
            var dueAtUtc = plan.TriggerMode == MaintenanceTriggerMode.Calendar
                ? plan.NextDueAtUtc
                : now;
            var priority = DeterminePriority(plan);

            var workOrder = new WorkOrder
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                MaintenancePlanId = plan.Id,
                AssetId = plan.AssetId,
                RequestedByEmployeeId = plan.AssignedToEmployeeId,
                AssignedToEmployeeId = plan.AssignedToEmployeeId,
                Number = number,
                Title = $"Przeglad: {plan.Title}",
                Description = BuildPreventiveDescription(plan),
                Source = WorkOrderSource.PreventiveMaintenance,
                Type = WorkOrderType.PreventiveMaintenance,
                Priority = priority,
                Status = plan.AssignedToEmployeeId.HasValue ? WorkOrderStatus.Assigned : WorkOrderStatus.New,
                RequestedAtUtc = now,
                DueAtUtc = dueAtUtc,
                PlannedForOccurrenceUtc = plan.NextDueAtUtc,
                TriggeredByMeterValue = plan.NextDueMeterValue,
                EstimatedMinutes = plan.EstimatedDurationMinutes,
                AutoCreated = true
            };

            await _uow.WorkOrders.AddAsync(workOrder, ct);
            createdIds.Add(workOrder.Id);
            openWorkOrders[plan.Id] = workOrder;
        }

        if (createdIds.Count > 0)
            await _uow.SaveChangesAsync(ct);

        return new MaintenanceAutomationSyncDto
        {
            CreatedWorkOrdersCount = createdIds.Count,
            CreatedWorkOrderIds = createdIds
        };
    }

    private static MaintenancePlanDto MapPlan(MaintenancePlan plan, WorkOrder? openWorkOrder)
    {
        var recentExecutions = plan.Executions
            .OrderByDescending(execution => execution.CompletedAtUtc ?? execution.ScheduledForUtc)
            .Take(5)
            .Select(MapExecution)
            .ToList();

        return new MaintenancePlanDto
        {
            Id = plan.Id,
            AssetId = plan.AssetId,
            AssetName = plan.Asset?.Name ?? string.Empty,
            AssetCode = plan.Asset?.Code ?? string.Empty,
            AssignedToEmployeeId = plan.AssignedToEmployeeId,
            AssignedToEmployeeName = plan.AssignedToEmployee is null
                ? null
                : $"{plan.AssignedToEmployee.FirstName} {plan.AssignedToEmployee.LastName}".Trim(),
            Title = plan.Title,
            Description = plan.Description,
            ScheduleType = plan.ScheduleType,
            TriggerMode = plan.TriggerMode,
            StartsAtUtc = plan.StartsAtUtc,
            NextDueAtUtc = plan.NextDueAtUtc,
            RecurrenceUnit = plan.RecurrenceUnit,
            RecurrenceInterval = plan.RecurrenceInterval,
            MeterType = plan.MeterType,
            MeterInterval = plan.MeterInterval,
            NextDueMeterValue = plan.NextDueMeterValue,
            LastCompletedMeterValue = plan.LastCompletedMeterValue,
            AutoCreateLeadMeterValue = plan.AutoCreateLeadMeterValue,
            AutoCreateWorkOrder = plan.AutoCreateWorkOrder,
            LeadTimeDays = plan.LeadTimeDays,
            EstimatedDurationMinutes = plan.EstimatedDurationMinutes,
            Checklist = plan.Checklist,
            Instructions = plan.Instructions,
            IsActive = plan.IsActive,
            LastCompletedAtUtc = plan.LastCompletedAtUtc,
            OpenWorkOrderId = openWorkOrder?.Id,
            CurrentStatus = DetermineCurrentStatus(plan),
            ExecutionsCount = plan.Executions.Count,
            RecentExecutions = recentExecutions
        };
    }

    private static MaintenanceExecutionDto MapExecution(MaintenanceExecution execution) =>
        new()
        {
            Id = execution.Id,
            MaintenancePlanId = execution.MaintenancePlanId,
            AssetId = execution.AssetId,
            ScheduledForUtc = execution.ScheduledForUtc,
            ScheduledMeterValue = execution.ScheduledMeterValue,
            CompletedAtUtc = execution.CompletedAtUtc,
            Outcome = execution.Outcome,
            CompletedByEmployeeId = execution.CompletedByEmployeeId,
            ActualMinutes = execution.ActualMinutes,
            Notes = execution.Notes
        };

    private static IEnumerable<DateTime> EnumerateCalendarOccurrences(MaintenancePlan plan, DateTime fromUtc, DateTime toUtc)
    {
        if (!plan.IsActive || plan.TriggerMode != MaintenanceTriggerMode.Calendar || !plan.NextDueAtUtc.HasValue)
            yield break;

        var current = plan.NextDueAtUtc.Value;
        var guard = 0;

        while (current <= toUtc && guard < 120)
        {
            if (current >= fromUtc)
                yield return current;

            if (plan.ScheduleType == MaintenanceScheduleType.OneTime)
                yield break;

            current = AdvanceCalendarOccurrence(plan, current);
            guard++;
        }
    }

    private static MaintenanceOccurrenceStatus DetermineCurrentStatus(MaintenancePlan plan)
    {
        if (!plan.IsActive)
            return MaintenanceOccurrenceStatus.Inactive;

        if (plan.TriggerMode == MaintenanceTriggerMode.Calendar)
        {
            if (!plan.NextDueAtUtc.HasValue)
                return MaintenanceOccurrenceStatus.Completed;

            var now = DateTime.UtcNow;
            if (plan.NextDueAtUtc.Value < now)
                return MaintenanceOccurrenceStatus.Overdue;

            if (plan.NextDueAtUtc.Value <= now.AddDays(Math.Max(plan.LeadTimeDays, 0)))
                return MaintenanceOccurrenceStatus.DueSoon;

            return MaintenanceOccurrenceStatus.Upcoming;
        }

        if (!plan.NextDueMeterValue.HasValue || !plan.MeterType.HasValue)
            return MaintenanceOccurrenceStatus.Completed;

        var latestReading = GetLatestMeterReading(plan.Asset, plan.MeterType.Value);
        if (!latestReading.HasValue)
            return MaintenanceOccurrenceStatus.Upcoming;

        if (latestReading.Value >= plan.NextDueMeterValue.Value)
            return MaintenanceOccurrenceStatus.Overdue;

        var alertThreshold = plan.NextDueMeterValue.Value - Math.Max(plan.AutoCreateLeadMeterValue ?? 0m, 0m);
        if (latestReading.Value >= alertThreshold)
            return MaintenanceOccurrenceStatus.DueSoon;

        return MaintenanceOccurrenceStatus.Upcoming;
    }

    private static bool ShouldCreateWorkOrder(MaintenancePlan plan)
        => DetermineCurrentStatus(plan) is MaintenanceOccurrenceStatus.DueSoon or MaintenanceOccurrenceStatus.Overdue;

    private static WorkOrderPriority DeterminePriority(MaintenancePlan plan)
        => DetermineCurrentStatus(plan) == MaintenanceOccurrenceStatus.Overdue
            ? WorkOrderPriority.High
            : WorkOrderPriority.Medium;

    private static string BuildPreventiveDescription(MaintenancePlan plan)
    {
        var parts = new List<string>
        {
            $"Plan: {plan.Title}"
        };

        if (!string.IsNullOrWhiteSpace(plan.Description))
            parts.Add(plan.Description.Trim());

        if (!string.IsNullOrWhiteSpace(plan.Checklist))
            parts.Add($"Checklist: {plan.Checklist.Trim()}");

        if (plan.TriggerMode == MaintenanceTriggerMode.Meter && plan.NextDueMeterValue.HasValue && plan.MeterType.HasValue)
            parts.Add($"Prog licznika: {plan.NextDueMeterValue.Value} ({plan.MeterType.Value})");

        return string.Join("\n", parts);
    }

    private static decimal ResolveInitialMeterBaseline(Asset asset, AssetMeterType? meterType, decimal? requestedBaseline)
    {
        if (requestedBaseline.HasValue)
            return requestedBaseline.Value;

        if (!meterType.HasValue)
            return 0m;

        return asset.UsageReadings
            .Where(reading => reading.MeterType == meterType.Value)
            .OrderByDescending(reading => reading.RecordedAtUtc)
            .Select(reading => reading.ReadingValue)
            .FirstOrDefault();
    }

    private static decimal? GetLatestMeterReading(Asset? asset, AssetMeterType meterType)
    {
        if (asset is null)
            return null;

        var latest = asset.UsageReadings
            .Where(reading => reading.MeterType == meterType)
            .OrderByDescending(reading => reading.RecordedAtUtc)
            .FirstOrDefault();

        return latest?.ReadingValue;
    }

    private static decimal? CalculateInitialNextDueMeterValue(
        MaintenanceScheduleType scheduleType,
        decimal initialBaseline,
        decimal? meterInterval)
    {
        if (scheduleType == MaintenanceScheduleType.OneTime)
            return initialBaseline;

        return initialBaseline + (meterInterval ?? 0m);
    }

    private static DateTime? CalculateNextDueAt(MaintenancePlan plan, DateTime? completedAtUtc)
    {
        if (plan.ScheduleType == MaintenanceScheduleType.OneTime)
            return completedAtUtc.HasValue ? null : plan.StartsAtUtc;

        var due = plan.StartsAtUtc;
        if (!completedAtUtc.HasValue)
            return due;

        var guard = 0;
        while (due <= completedAtUtc.Value && guard < 120)
        {
            due = AdvanceCalendarOccurrence(plan, due);
            guard++;
        }

        return due;
    }

    private static DateTime AdvanceCalendarOccurrence(MaintenancePlan plan, DateTime value)
    {
        var interval = plan.RecurrenceInterval ?? 1;

        return plan.RecurrenceUnit switch
        {
            MaintenanceRecurrenceUnit.Day => value.AddDays(interval),
            MaintenanceRecurrenceUnit.Week => value.AddDays(7 * interval),
            MaintenanceRecurrenceUnit.Month => value.AddMonths(interval),
            MaintenanceRecurrenceUnit.Quarter => value.AddMonths(3 * interval),
            MaintenanceRecurrenceUnit.Year => value.AddYears(interval),
            _ => value.AddMonths(interval)
        };
    }

    private static void ValidateRequest(
        MaintenanceTriggerMode triggerMode,
        MaintenanceScheduleType scheduleType,
        DateTime startsAtUtc,
        MaintenanceRecurrenceUnit? recurrenceUnit,
        int? recurrenceInterval,
        AssetMeterType? meterType,
        decimal? meterInterval,
        int leadTimeDays)
    {
        if (leadTimeDays < 0 || leadTimeDays > 365)
            throw new ArgumentException("LeadTimeDays must be between 0 and 365.", nameof(leadTimeDays));

        if (triggerMode == MaintenanceTriggerMode.Calendar)
        {
            if (startsAtUtc == default)
                throw new ArgumentException("StartsAtUtc is required.", nameof(startsAtUtc));

            if (scheduleType == MaintenanceScheduleType.Recurring)
            {
                if (!recurrenceUnit.HasValue)
                    throw new ArgumentException("RecurrenceUnit is required for recurring schedules.", nameof(recurrenceUnit));

                if (!recurrenceInterval.HasValue || recurrenceInterval.Value <= 0)
                    throw new ArgumentException("RecurrenceInterval must be greater than 0 for recurring schedules.", nameof(recurrenceInterval));
            }

            return;
        }

        if (!meterType.HasValue)
            throw new ArgumentException("MeterType is required for meter-based plans.", nameof(meterType));

        if (scheduleType == MaintenanceScheduleType.Recurring && (!meterInterval.HasValue || meterInterval.Value <= 0))
            throw new ArgumentException("MeterInterval must be greater than 0 for recurring meter-based plans.", nameof(meterInterval));
    }

    private async Task EnsureEmployeeExistsAsync(Guid tenantId, Guid? employeeId, CancellationToken ct)
    {
        if (!employeeId.HasValue)
            return;

        var employee = await _uow.Employees.GetByIdAsync(tenantId, employeeId.Value, cancellationToken: ct);
        if (employee is null || !employee.IsActive)
            throw new InvalidOperationException($"Employee {employeeId.Value} not found.");
    }

    private async Task<Dictionary<Guid, WorkOrder>> GetOpenMaintenanceWorkOrdersAsync(Guid tenantId, CancellationToken ct)
    {
        var orders = await _uow.WorkOrders.GetAllAsync(tenantId, ct);
        return orders
            .Where(order => order.MaintenancePlanId.HasValue
                            && order.Status != WorkOrderStatus.Done
                            && order.Status != WorkOrderStatus.Cancelled)
            .GroupBy(order => order.MaintenancePlanId!.Value)
            .ToDictionary(group => group.Key, group => group.OrderByDescending(order => order.RequestedAtUtc).First());
    }

    private async Task<string> GenerateWorkOrderNumberAsync(Guid tenantId, DateTime now, CancellationToken ct)
    {
        var suffix = 1;
        while (suffix < 1000)
        {
            var candidate = $"PM-{now:yyyyMMdd}-{suffix:000}";
            if (!await _uow.WorkOrders.NumberExistsAsync(tenantId, candidate, cancellationToken: ct))
                return candidate;

            suffix++;
        }

        throw new InvalidOperationException("Could not generate a unique preventive work order number.");
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
