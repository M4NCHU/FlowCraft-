using Infrastructure.Repositories.Interfaces;

namespace FlowCraft.Interfaces.Abstractions;

public interface IUnitOfWork : IAsyncDisposable
{
    IProductionHallRepository ProductionHalls { get; }
    IAssetRepository Assets { get; }
    IAssetCategoryRepository AssetCategories { get; }
    IEmployeeProfileRepository Employees { get; }
    IDepartmentRepository Departments { get; }
    IFailureReportRepository FailureReports { get; }
    IWorkOrderRepository WorkOrders { get; }
    IMaintenancePlanRepository MaintenancePlans { get; }
    IImprovementIdeaRepository ImprovementIdeas { get; }

    Task<int> SaveChangesAsync(CancellationToken ct = default);

    Task BeginTransactionAsync(CancellationToken ct = default);
    Task CommitAsync(CancellationToken ct = default);
    Task RollbackAsync(CancellationToken ct = default);

    Task ExecuteInTransactionAsync(Func<CancellationToken, Task> operation, CancellationToken ct = default);
    Task<TResult> ExecuteInTransactionAsync<TResult>(Func<CancellationToken, Task<TResult>> operation, CancellationToken ct = default);
}
