using FlowCraft.Interfaces.Abstractions;
using Infrastructure.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Logging;

namespace FlowCraft.Infrastructure.Persistence;

public sealed class EfUnitOfWork : IUnitOfWork
{
    private readonly FlowCraftDbContext _dbContext;
    private readonly ILogger<EfUnitOfWork> _logger;

    private IDbContextTransaction? _currentTransaction;
    private int _txDepth;

    public EfUnitOfWork(
        FlowCraftDbContext dbContext,
        ILogger<EfUnitOfWork> logger,
        IProductionHallRepository productionHallRepository,
        IAssetRepository assetRepository,
        IAssetCategoryRepository assetCategoryRepository,
        IEmployeeProfileRepository employeeProfileRepository,
        IDepartmentRepository departmentRepository,
        IFailureReportRepository failureReportRepository,
        IWorkOrderRepository workOrderRepository,
        IMaintenancePlanRepository maintenancePlanRepository,
        IImprovementIdeaRepository improvementIdeaRepository)
    {
        _dbContext = dbContext;
        _logger = logger;
        ProductionHalls = productionHallRepository;
        Assets = assetRepository;
        AssetCategories = assetCategoryRepository;
        Employees = employeeProfileRepository;
        Departments = departmentRepository;
        FailureReports = failureReportRepository;
        WorkOrders = workOrderRepository;
        MaintenancePlans = maintenancePlanRepository;
        ImprovementIdeas = improvementIdeaRepository;
    }

    public IProductionHallRepository ProductionHalls { get; }
    public IAssetRepository Assets { get; }
    public IAssetCategoryRepository AssetCategories { get; }
    public IEmployeeProfileRepository Employees { get; }
    public IDepartmentRepository Departments { get; }
    public IFailureReportRepository FailureReports { get; }
    public IWorkOrderRepository WorkOrders { get; }
    public IMaintenancePlanRepository MaintenancePlans { get; }
    public IImprovementIdeaRepository ImprovementIdeas { get; }

    public async Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        _logger.LogInformation("UnitOfWork.SaveChangesAsync called.");
        return await _dbContext.SaveChangesAsync(ct);
    }

    public async Task BeginTransactionAsync(CancellationToken ct = default)
    {
        if (_txDepth > 0)
        {
            _txDepth++;
            _logger.LogDebug("UnitOfWork.BeginTransactionAsync joined existing transaction. Depth={Depth}", _txDepth);
            return;
        }

        _logger.LogInformation("UnitOfWork.BeginTransactionAsync starting transaction.");
        _currentTransaction = await _dbContext.Database.BeginTransactionAsync(ct);
        _txDepth = 1;
    }

    public async Task CommitAsync(CancellationToken ct = default)
    {
        if (_txDepth == 0)
        {
            _logger.LogDebug("UnitOfWork.CommitAsync called but there is no active transaction.");
            return;
        }

        _txDepth--;

        if (_txDepth > 0)
        {
            _logger.LogDebug("UnitOfWork.CommitAsync deferred. Depth={Depth}", _txDepth);
            return;
        }

        if (_currentTransaction is null)
            return;

        _logger.LogInformation("UnitOfWork.CommitAsync committing transaction.");

        try
        {
            await _currentTransaction.CommitAsync(ct);
        }
        finally
        {
            await _currentTransaction.DisposeAsync();
            _currentTransaction = null;
        }
    }

    public async Task RollbackAsync(CancellationToken ct = default)
    {
        if (_txDepth == 0)
        {
            _logger.LogDebug("UnitOfWork.RollbackAsync called but there is no active transaction.");
            return;
        }

        _txDepth = 0;

        if (_currentTransaction is null)
            return;

        _logger.LogWarning("UnitOfWork.RollbackAsync rolling back transaction.");

        try
        {
            await _currentTransaction.RollbackAsync(ct);
        }
        finally
        {
            await _currentTransaction.DisposeAsync();
            _currentTransaction = null;
        }
    }

    public async Task ExecuteInTransactionAsync(Func<CancellationToken, Task> operation, CancellationToken ct = default)
    {
        if (operation is null)
            throw new ArgumentNullException(nameof(operation));

        await BeginTransactionAsync(ct);

        try
        {
            await operation(ct);
            await SaveChangesAsync(ct);
            await CommitAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "UnitOfWork.ExecuteInTransactionAsync failed. Rolling back.");
            await RollbackAsync(ct);
            throw;
        }
    }

    public async Task<TResult> ExecuteInTransactionAsync<TResult>(
        Func<CancellationToken, Task<TResult>> operation,
        CancellationToken ct = default)
    {
        if (operation is null)
            throw new ArgumentNullException(nameof(operation));

        await BeginTransactionAsync(ct);

        try
        {
            var result = await operation(ct);
            await SaveChangesAsync(ct);
            await CommitAsync(ct);
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "UnitOfWork.ExecuteInTransactionAsync<TResult> failed. Rolling back.");
            await RollbackAsync(ct);
            throw;
        }
    }

    public async ValueTask DisposeAsync()
    {
        _txDepth = 0;

        if (_currentTransaction != null)
        {
            await _currentTransaction.DisposeAsync();
            _currentTransaction = null;
        }
    }
}
