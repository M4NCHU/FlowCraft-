using Application.DTOs.Maintenance;

namespace Application.Services.Interfaces;

public interface IWorkOrderService
{
    Task<IReadOnlyList<WorkOrderDto>> GetAllAsync(Guid tenantId, CancellationToken ct = default);
    Task<WorkOrderDto?> GetByIdAsync(Guid tenantId, Guid workOrderId, CancellationToken ct = default);

    Task<WorkOrderDto> CreateAsync(Guid tenantId, CreateWorkOrderRequest request, CancellationToken ct = default);
    Task<WorkOrderDto> UpdateAsync(Guid tenantId, Guid workOrderId, UpdateWorkOrderRequest request, CancellationToken ct = default);
    Task<WorkOrderDto> SetStatusAsync(Guid tenantId, Guid workOrderId, SetWorkOrderStatusRequest request, CancellationToken ct = default);
}
