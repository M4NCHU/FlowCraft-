using Application.Services;
using Application.Services.Interfaces;
using FlowCraft.Application.Projects;
using FlowCraft.Infrastructure.Persistence;
using FlowCraft.Infrastructure.Projects;
using FlowCraft.Interfaces.Abstractions;
using Infrastructure.Repositories;
using Infrastructure.Repositories.Interfaces;
using Microsoft.Extensions.DependencyInjection;

namespace FlowCraft.Api.Configuration
{
    public static class ApplicationServicesExtensions
    {
        public static IServiceCollection AddFlowCraftApplicationServices(
            this IServiceCollection services)
        {
            services.AddScoped<IUnitOfWork, EfUnitOfWork>();

            services.AddScoped<ITenantRepository, TenantRepository>();
            services.AddScoped<IProjectRepository, ProjectRepository>();
            services.AddScoped<IProductionHallRepository, ProductionHallRepository>();
            services.AddScoped<IAssetRepository, AssetRepository>();
            services.AddScoped<IAssetCategoryRepository, AssetCategoryRepository>();
            services.AddScoped<IEmployeeProfileRepository, EmployeeProfileRepository>();
            services.AddScoped<IDepartmentRepository, DepartmentRepository>();
            services.AddScoped<IFailureReportRepository, FailureReportRepository>();
            services.AddScoped<IWorkOrderRepository, WorkOrderRepository>();
            services.AddScoped<IMaintenancePlanRepository, MaintenancePlanRepository>();
            services.AddScoped<IImprovementIdeaRepository, ImprovementIdeaRepository>();

            services.AddScoped<ITenantService, TenantService>();
            services.AddScoped<IProjectService, ProjectService>();
            services.AddScoped<IHallsService, HallsService>();
            services.AddScoped<IAssetService, AssetService>();
            services.AddScoped<IAssetCategoryService, AssetCategoryService>();
            services.AddScoped<IEmployeeService, EmployeeService>();
            services.AddScoped<IDepartmentService, DepartmentService>();
            services.AddScoped<IFailureReportService, FailureReportService>();
            services.AddScoped<IWorkOrderService, WorkOrderService>();
            services.AddScoped<IMaintenancePlanService, MaintenancePlanService>();
            services.AddScoped<IImprovementIdeaService, ImprovementIdeaService>();

            return services;
        }
    }
}
