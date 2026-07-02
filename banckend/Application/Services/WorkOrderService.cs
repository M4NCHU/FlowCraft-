using Application.DTOs.Maintenance;
using Application.Services.Interfaces;
using Domain.Maintenance;
using FlowCraft.Interfaces.Abstractions;

namespace Application.Services;

public sealed class WorkOrderService : IWorkOrderService
{
    private readonly IUnitOfWork _uow;

    public WorkOrderService(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<IReadOnlyList<WorkOrderDto>> GetAllAsync(Guid tenantId, CancellationToken ct = default)
    {
        var workOrders = await _uow.WorkOrders.GetAllAsync(tenantId, ct);
        return workOrders.Select(Map).ToList();
    }

    public async Task<WorkOrderDto?> GetByIdAsync(Guid tenantId, Guid workOrderId, CancellationToken ct = default)
    {
        var workOrder = await _uow.WorkOrders.GetByIdAsync(tenantId, workOrderId, includeFailureReport: true, cancellationToken: ct);
        return workOrder is null ? null : Map(workOrder);
    }

    public async Task<WorkOrderDto> CreateAsync(Guid tenantId, CreateWorkOrderRequest request, CancellationToken ct = default)
    {
        var trimmedNumber = Require(request.Number, nameof(request.Number));
        if (await _uow.WorkOrders.NumberExistsAsync(tenantId, trimmedNumber, cancellationToken: ct))
            throw new InvalidOperationException($"Work order number '{trimmedNumber}' already exists.");

        var workOrder = new WorkOrder
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            FailureReportId = request.FailureReportId,
            AssetId = request.AssetId,
            HallId = request.HallId,
            SectionId = request.SectionId,
            RequestedByEmployeeId = request.RequestedByEmployeeId,
            AssignedToEmployeeId = request.AssignedToEmployeeId,
            Number = trimmedNumber,
            Title = Require(request.Title, nameof(request.Title)),
            Description = Require(request.Description, nameof(request.Description)),
            Source = request.FailureReportId.HasValue
                ? WorkOrderSource.FailureReport
                : WorkOrderSource.Manual,
            Type = request.Type,
            Priority = request.Priority,
            Status = request.AssignedToEmployeeId.HasValue ? WorkOrderStatus.Assigned : WorkOrderStatus.New,
            RequestedAtUtc = DateTime.UtcNow,
            DueAtUtc = request.DueAtUtc,
            EstimatedMinutes = request.EstimatedMinutes,
            EstimatedCost = request.EstimatedCost,
            ExternalVendor = TrimOrNull(request.ExternalVendor)
        };

        await _uow.WorkOrders.AddAsync(workOrder, ct);
        await _uow.SaveChangesAsync(ct);

        return Map(workOrder);
    }

    public async Task<WorkOrderDto> UpdateAsync(Guid tenantId, Guid workOrderId, UpdateWorkOrderRequest request, CancellationToken ct = default)
    {
        var workOrder = await _uow.WorkOrders.GetByIdAsync(tenantId, workOrderId, includeFailureReport: true, cancellationToken: ct)
            ?? throw new InvalidOperationException($"Work order {workOrderId} not found.");

        var trimmedNumber = Require(request.Number, nameof(request.Number));
        if (await _uow.WorkOrders.NumberExistsAsync(tenantId, trimmedNumber, excludeId: workOrderId, cancellationToken: ct))
            throw new InvalidOperationException($"Work order number '{trimmedNumber}' already exists.");

        workOrder.Number = trimmedNumber;
        workOrder.Title = Require(request.Title, nameof(request.Title));
        workOrder.Description = Require(request.Description, nameof(request.Description));
        workOrder.Type = request.Type;
        workOrder.Priority = request.Priority;
        workOrder.AssetId = request.AssetId;
        workOrder.AssignedToEmployeeId = request.AssignedToEmployeeId;
        workOrder.DueAtUtc = request.DueAtUtc;
        workOrder.EstimatedMinutes = request.EstimatedMinutes;
        workOrder.EstimatedCost = request.EstimatedCost;
        workOrder.ExternalVendor = TrimOrNull(request.ExternalVendor);

        if (request.AssignedToEmployeeId.HasValue && workOrder.Status == WorkOrderStatus.New)
            workOrder.Status = WorkOrderStatus.Assigned;

        await _uow.WorkOrders.UpdateAsync(workOrder, ct);
        await _uow.SaveChangesAsync(ct);

        return Map(workOrder);
    }

    public async Task<WorkOrderDto> SetStatusAsync(Guid tenantId, Guid workOrderId, SetWorkOrderStatusRequest request, CancellationToken ct = default)
    {
        var workOrder = await _uow.WorkOrders.GetByIdAsync(tenantId, workOrderId, includeFailureReport: true, cancellationToken: ct)
            ?? throw new InvalidOperationException($"Work order {workOrderId} not found.");

        workOrder.Status = request.Status;
        workOrder.ActualMinutes = request.ActualMinutes;
        workOrder.ActualCost = request.ActualCost;
        workOrder.ResolutionSummary = TrimOrNull(request.ResolutionSummary) ?? workOrder.ResolutionSummary;

        var now = DateTime.UtcNow;

        if (request.Status == WorkOrderStatus.InProgress && workOrder.StartedAtUtc is null)
            workOrder.StartedAtUtc = now;

        if (request.Status == WorkOrderStatus.Done)
            workOrder.CompletedAtUtc = now;

        await _uow.WorkOrders.UpdateAsync(workOrder, ct);
        await _uow.SaveChangesAsync(ct);

        return Map(workOrder);
    }

    private static WorkOrderDto Map(WorkOrder workOrder) =>
        new()
        {
            Id = workOrder.Id,
            FailureReportId = workOrder.FailureReportId,
            MaintenancePlanId = workOrder.MaintenancePlanId,
            AssetId = workOrder.AssetId,
            HallId = workOrder.HallId,
            SectionId = workOrder.SectionId,
            RequestedByEmployeeId = workOrder.RequestedByEmployeeId,
            AssignedToEmployeeId = workOrder.AssignedToEmployeeId,
            Number = workOrder.Number,
            Title = workOrder.Title,
            Description = workOrder.Description,
            Type = workOrder.Type,
            Priority = workOrder.Priority,
            Status = workOrder.Status,
            Source = workOrder.Source,
            RequestedAtUtc = workOrder.RequestedAtUtc,
            PlannedForOccurrenceUtc = workOrder.PlannedForOccurrenceUtc,
            PlannedStartAtUtc = workOrder.PlannedStartAtUtc,
            StartedAtUtc = workOrder.StartedAtUtc,
            CompletedAtUtc = workOrder.CompletedAtUtc,
            DueAtUtc = workOrder.DueAtUtc,
            TriggeredByMeterValue = workOrder.TriggeredByMeterValue,
            EstimatedMinutes = workOrder.EstimatedMinutes,
            ActualMinutes = workOrder.ActualMinutes,
            EstimatedCost = workOrder.EstimatedCost,
            ActualCost = workOrder.ActualCost,
            ExternalVendor = workOrder.ExternalVendor,
            ResolutionSummary = workOrder.ResolutionSummary,
            AutoCreated = workOrder.AutoCreated
        };

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
