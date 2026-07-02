using Domain.Assets;
using Domain.Employees;
using Domain.Instance;
using Domain.Inventory;
using Domain.Layouts;
using Domain.Lean;
using Domain.Maintenance;
using FlowCraft.Domain.Auth;
using FlowCraft.Domain.Layouts;
using FlowCraft.Domain.Projects;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace FlowCraft.Infrastructure.Persistence;

public sealed class FlowCraftDbContext
    : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>
{
    public FlowCraftDbContext(DbContextOptions<FlowCraftDbContext> options)
        : base(options)
    {
    }

    public DbSet<Project> Projects => Set<Project>();
    public DbSet<Layout> Layouts => Set<Layout>();
    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<ProductionHall> ProductionHalls => Set<ProductionHall>();
    public DbSet<HallSection> HallSections => Set<HallSection>();
    public DbSet<LayoutElement> LayoutElements => Set<LayoutElement>();
    public DbSet<Asset> Assets => Set<Asset>();
    public DbSet<AssetCategory> AssetCategories => Set<AssetCategory>();
    public DbSet<AssetCategoryParameter> AssetCategoryParameters => Set<AssetCategoryParameter>();
    public DbSet<AssetParameterValue> AssetParameterValues => Set<AssetParameterValue>();
    public DbSet<AssetPlacement> AssetPlacements => Set<AssetPlacement>();
    public DbSet<AssetAssignment> AssetAssignments => Set<AssetAssignment>();
    public DbSet<AssetUsageReading> AssetUsageReadings => Set<AssetUsageReading>();
    public DbSet<EmployeeProfile> EmployeeProfiles => Set<EmployeeProfile>();
    public DbSet<EmployeeSkill> EmployeeSkills => Set<EmployeeSkill>();
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<FailureReport> FailureReports => Set<FailureReport>();
    public DbSet<FailureCauseCategory> FailureCauseCategories => Set<FailureCauseCategory>();
    public DbSet<WorkOrder> WorkOrders => Set<WorkOrder>();
    public DbSet<MaintenancePlan> MaintenancePlans => Set<MaintenancePlan>();
    public DbSet<MaintenanceExecution> MaintenanceExecutions => Set<MaintenanceExecution>();
    public DbSet<ImprovementIdea> ImprovementIdeas => Set<ImprovementIdea>();
    public DbSet<InventoryCategory> InventoryCategories => Set<InventoryCategory>();
    public DbSet<InventoryCategoryParameter> InventoryCategoryParameters => Set<InventoryCategoryParameter>();
    public DbSet<InventoryItem> InventoryItems => Set<InventoryItem>();
    public DbSet<InventoryItemParameter> InventoryItemParameters => Set<InventoryItemParameter>();
    public DbSet<InventoryProcurementOrder> InventoryProcurementOrders => Set<InventoryProcurementOrder>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<ApplicationUser>(b =>
        {
            b.ToTable("users");
            b.Property(x => x.CreatedAt).IsRequired();
            b.Property(x => x.UpdatedAt).IsRequired();
            b.Property(x => x.IsActive).HasDefaultValue(true);

            b.HasOne(u => u.Tenant)
                .WithMany(t => t.Users)
                .HasForeignKey(u => u.TenantId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<IdentityRole<Guid>>().ToTable("roles");
        builder.Entity<IdentityUserRole<Guid>>().ToTable("user_roles");
        builder.Entity<IdentityUserClaim<Guid>>().ToTable("user_claims");
        builder.Entity<IdentityUserLogin<Guid>>().ToTable("user_logins");
        builder.Entity<IdentityRoleClaim<Guid>>().ToTable("role_claims");
        builder.Entity<IdentityUserToken<Guid>>().ToTable("user_tokens");

        builder.Entity<Tenant>(b =>
        {
            b.ToTable("tenants");
            b.Property(t => t.Name).HasMaxLength(200).IsRequired();
            b.Property(t => t.Code).HasMaxLength(64);
            b.Property(t => t.IsActive).HasDefaultValue(true);
            b.Property(t => t.CreatedAtUtc).IsRequired();
            b.Property(t => t.UpdatedAtUtc).IsRequired();
        });

        builder.Entity<InventoryCategory>(b =>
        {
            b.ToTable("inventory_categories");
            b.Property(x => x.Name).HasMaxLength(200).IsRequired();
            b.Property(x => x.Code).HasMaxLength(64).IsRequired();
            b.Property(x => x.Description).HasMaxLength(1000);
            b.Property(x => x.DefaultSupplier).HasMaxLength(200);
            b.Property(x => x.CreatedAtUtc).IsRequired();
            b.Property(x => x.UpdatedAtUtc).IsRequired();

            b.HasIndex(x => new { x.TenantId, x.Code }).IsUnique();

            b.HasOne(x => x.Tenant)
                .WithMany(t => t.InventoryCategories)
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<InventoryCategoryParameter>(b =>
        {
            b.ToTable("inventory_category_parameters");
            b.Property(x => x.Name).HasMaxLength(200).IsRequired();
            b.Property(x => x.Code).HasMaxLength(64).IsRequired();
            b.Property(x => x.Unit).HasMaxLength(64);
            b.Property(x => x.Options).HasMaxLength(2000);
            b.Property(x => x.CreatedAtUtc).IsRequired();
            b.Property(x => x.UpdatedAtUtc).IsRequired();

            b.HasIndex(x => new { x.InventoryCategoryId, x.Code }).IsUnique();

            b.HasOne(x => x.InventoryCategory)
                .WithMany(c => c.Parameters)
                .HasForeignKey(x => x.InventoryCategoryId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<InventoryItem>(b =>
        {
            b.ToTable("inventory_items");
            b.Property(x => x.Name).HasMaxLength(200).IsRequired();
            b.Property(x => x.SKU).HasMaxLength(64).IsRequired();
            b.Property(x => x.Unit).HasMaxLength(64).IsRequired();
            b.Property(x => x.Location).HasMaxLength(200).IsRequired();
            b.Property(x => x.SupplierName).HasMaxLength(200);
            b.Property(x => x.Notes).HasMaxLength(4000);
            b.Property(x => x.UnitCost).HasPrecision(12, 2);
            b.Property(x => x.QuantityOnHand).HasPrecision(18, 2);
            b.Property(x => x.QuantityReserved).HasPrecision(18, 2);
            b.Property(x => x.MinimumStock).HasPrecision(18, 2);
            b.Property(x => x.ReorderQuantity).HasPrecision(18, 2);
            b.Property(x => x.ServiceType).HasColumnName("servicetype");
            b.Property(x => x.CreatedAtUtc).IsRequired();
            b.Property(x => x.UpdatedAtUtc).IsRequired();

            b.HasIndex(x => new { x.TenantId, x.SKU }).IsUnique();
            b.HasIndex(x => new { x.TenantId, x.IsActive });

            b.HasOne(x => x.Tenant)
                .WithMany(t => t.InventoryItems)
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasOne(x => x.Category)
                .WithMany(c => c.Items)
                .HasForeignKey(x => x.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasOne(x => x.LinkedAsset)
                .WithMany()
                .HasForeignKey(x => x.LinkedAssetId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<InventoryItemParameter>(b =>
        {
            b.ToTable("inventory_item_parameters");
            b.Property(x => x.Value).HasMaxLength(512).IsRequired();
            b.Property(x => x.CreatedAtUtc).IsRequired();
            b.Property(x => x.UpdatedAtUtc).IsRequired();

            b.HasIndex(x => new { x.InventoryItemId, x.ParameterDefinitionId }).IsUnique();

            b.HasOne(x => x.InventoryItem)
                .WithMany(i => i.ParameterValues)
                .HasForeignKey(x => x.InventoryItemId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasOne(x => x.ParameterDefinition)
                .WithMany()
                .HasForeignKey(x => x.ParameterDefinitionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<InventoryProcurementOrder>(b =>
        {
            b.ToTable("inventory_procurement_orders");
            b.Property(x => x.Quantity).HasPrecision(18, 2);
            b.Property(x => x.SupplierName).HasMaxLength(200);
            b.Property(x => x.Notes).HasMaxLength(4000);
            b.Property(x => x.CreatedAtUtc).IsRequired();
            b.Property(x => x.UpdatedAtUtc).IsRequired();

            b.HasIndex(x => new { x.TenantId, x.Status });

            b.HasOne(x => x.Tenant)
                .WithMany(t => t.InventoryProcurementOrders)
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasOne(x => x.InventoryItem)
                .WithMany(i => i.ProcurementOrders)
                .HasForeignKey(x => x.InventoryItemId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasOne(x => x.LinkedMaintenancePlan)
                .WithMany()
                .HasForeignKey(x => x.LinkedMaintenancePlanId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<ProductionHall>(b =>
        {
            b.ToTable("production_halls");
            b.Property(h => h.Name).HasMaxLength(200).IsRequired();
            b.Property(h => h.Code).HasMaxLength(64);

            b.HasOne(h => h.Tenant)
                .WithMany(t => t.Halls)
                .HasForeignKey(h => h.TenantId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<HallSection>(b =>
        {
            b.ToTable("hall_sections");
            b.Property(s => s.Name).HasMaxLength(200).IsRequired();
            b.Property(s => s.Code).HasMaxLength(64);

            b.HasOne(s => s.Hall)
                .WithMany(h => h.Sections)
                .HasForeignKey(s => s.HallId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<LayoutElement>(b =>
        {
            b.ToTable("LayoutElement");

            b.HasOne(x => x.Hall)
                .WithMany()
                .HasForeignKey(x => x.HallId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasOne(x => x.Section)
                .WithMany(s => s.Elements)
                .HasForeignKey(x => x.SectionId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasOne(x => x.Asset)
                .WithMany(a => a.LayoutElements)
                .HasForeignKey(x => x.AssetId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<Asset>(b =>
        {
            b.ToTable("assets");
            b.Property(x => x.Name).HasMaxLength(200).IsRequired();
            b.Property(x => x.Code).HasMaxLength(64).IsRequired();
            b.Property(x => x.Category).HasMaxLength(128);
            b.Property(x => x.SerialNumber).HasMaxLength(128);
            b.Property(x => x.Manufacturer).HasMaxLength(128);
            b.Property(x => x.Model).HasMaxLength(128);
            b.Property(x => x.FootprintLengthMeters).HasPrecision(10, 2);
            b.Property(x => x.FootprintWidthMeters).HasPrecision(10, 2);
            b.Property(x => x.IsActive).HasDefaultValue(true);
            b.Property(x => x.CreatedAtUtc).IsRequired();
            b.Property(x => x.UpdatedAtUtc).IsRequired();

            b.HasIndex(x => new { x.TenantId, x.Code }).IsUnique();

            b.HasOne(x => x.Tenant)
                .WithMany(t => t.Assets)
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasOne(x => x.AssetCategory)
                .WithMany(c => c.Assets)
                .HasForeignKey(x => x.CategoryId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<AssetCategory>(b =>
        {
            b.ToTable("asset_categories");
            b.Property(x => x.Name).HasMaxLength(200).IsRequired();
            b.Property(x => x.Code).HasMaxLength(64).IsRequired();
            b.Property(x => x.Description).HasMaxLength(1000);
            b.Property(x => x.IsActive).HasDefaultValue(true);
            b.Property(x => x.CreatedAtUtc).IsRequired();
            b.Property(x => x.UpdatedAtUtc).IsRequired();

            b.HasIndex(x => new { x.TenantId, x.Code }).IsUnique();
            b.HasIndex(x => new { x.TenantId, x.Name, x.AssetType }).IsUnique();

            b.HasOne(x => x.Tenant)
                .WithMany(t => t.AssetCategories)
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<AssetCategoryParameter>(b =>
        {
            b.ToTable("asset_category_parameters");
            b.Property(x => x.Name).HasMaxLength(200).IsRequired();
            b.Property(x => x.Code).HasMaxLength(64).IsRequired();
            b.Property(x => x.Unit).HasMaxLength(64);
            b.Property(x => x.DefaultValue).HasMaxLength(256);
            b.Property(x => x.OptionsJson).HasMaxLength(4000);
            b.Property(x => x.CreatedAtUtc).IsRequired();
            b.Property(x => x.UpdatedAtUtc).IsRequired();

            b.HasIndex(x => new { x.AssetCategoryId, x.Code }).IsUnique();

            b.HasOne(x => x.AssetCategory)
                .WithMany(c => c.Parameters)
                .HasForeignKey(x => x.AssetCategoryId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<AssetParameterValue>(b =>
        {
            b.ToTable("asset_parameter_values");
            b.Property(x => x.Value).HasMaxLength(512);
            b.Property(x => x.CreatedAtUtc).IsRequired();
            b.Property(x => x.UpdatedAtUtc).IsRequired();

            b.HasIndex(x => new { x.AssetId, x.AssetCategoryParameterId }).IsUnique();

            b.HasOne(x => x.Asset)
                .WithMany(a => a.ParameterValues)
                .HasForeignKey(x => x.AssetId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasOne(x => x.ParameterDefinition)
                .WithMany(p => p.ParameterValues)
                .HasForeignKey(x => x.AssetCategoryParameterId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<AssetPlacement>(b =>
        {
            b.ToTable("asset_placements");
            b.Property(x => x.PlacedAtUtc).IsRequired();
            b.Property(x => x.IsCurrent).HasDefaultValue(true);

            b.HasIndex(x => new { x.AssetId, x.IsCurrent });

            b.HasOne(x => x.Tenant)
                .WithMany(t => t.AssetPlacements)
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasOne(x => x.Asset)
                .WithMany(a => a.Placements)
                .HasForeignKey(x => x.AssetId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasOne(x => x.Hall)
                .WithMany(h => h.AssetPlacements)
                .HasForeignKey(x => x.HallId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasOne(x => x.Section)
                .WithMany(s => s.AssetPlacements)
                .HasForeignKey(x => x.SectionId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<EmployeeProfile>(b =>
        {
            b.ToTable("employee_profiles");
            b.Property(x => x.EmployeeNumber).HasMaxLength(64).IsRequired();
            b.Property(x => x.FirstName).HasMaxLength(100).IsRequired();
            b.Property(x => x.LastName).HasMaxLength(100).IsRequired();
            b.Property(x => x.JobTitle).HasMaxLength(128);
            b.Property(x => x.DepartmentName).HasColumnName("department").HasMaxLength(128);
            b.Property(x => x.Phone).HasMaxLength(64);
            b.Property(x => x.IsActive).HasDefaultValue(true);
            b.Property(x => x.CreatedAtUtc).IsRequired();
            b.Property(x => x.UpdatedAtUtc).IsRequired();

            b.HasIndex(x => new { x.TenantId, x.EmployeeNumber }).IsUnique();
            b.HasIndex(x => x.UserId).IsUnique();

            b.HasOne(x => x.Tenant)
                .WithMany(t => t.Employees)
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasOne(x => x.User)
                .WithOne(u => u.EmployeeProfile)
                .HasForeignKey<EmployeeProfile>(x => x.UserId)
                .OnDelete(DeleteBehavior.SetNull);

            b.HasOne(x => x.Department)
                .WithMany(d => d.Employees)
                .HasForeignKey(x => x.DepartmentId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<Department>(b =>
        {
            b.ToTable("departments");
            b.Property(x => x.Name).HasMaxLength(200).IsRequired();
            b.Property(x => x.Code).HasMaxLength(64).IsRequired();
            b.Property(x => x.Description).HasMaxLength(1000);
            b.Property(x => x.ValueStream).HasMaxLength(128);
            b.Property(x => x.IsActive).HasDefaultValue(true);
            b.Property(x => x.CreatedAtUtc).IsRequired();
            b.Property(x => x.UpdatedAtUtc).IsRequired();

            b.HasIndex(x => new { x.TenantId, x.Code }).IsUnique();
            b.HasIndex(x => new { x.TenantId, x.Name }).IsUnique();

            b.HasOne(x => x.Tenant)
                .WithMany(t => t.Departments)
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<EmployeeSkill>(b =>
        {
            b.ToTable("employee_skills");
            b.Property(x => x.Notes).HasMaxLength(2000);
            b.Property(x => x.CreatedAtUtc).IsRequired();
            b.Property(x => x.UpdatedAtUtc).IsRequired();

            b.HasIndex(x => new { x.EmployeeId, x.AssetCategoryId })
                .IsUnique()
                .HasFilter("\"AssetId\" IS NULL");

            b.HasIndex(x => new { x.EmployeeId, x.AssetId })
                .IsUnique()
                .HasFilter("\"AssetId\" IS NOT NULL");

            b.HasOne(x => x.Employee)
                .WithMany(e => e.Skills)
                .HasForeignKey(x => x.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasOne(x => x.AssetCategory)
                .WithMany(c => c.EmployeeSkills)
                .HasForeignKey(x => x.AssetCategoryId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasOne(x => x.Asset)
                .WithMany(a => a.EmployeeSkills)
                .HasForeignKey(x => x.AssetId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<AssetAssignment>(b =>
        {
            b.ToTable("asset_assignments");
            b.Property(x => x.AssignedAtUtc).IsRequired();

            b.HasOne(x => x.Tenant)
                .WithMany(t => t.AssetAssignments)
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasOne(x => x.Asset)
                .WithMany(a => a.Assignments)
                .HasForeignKey(x => x.AssetId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasOne(x => x.Employee)
                .WithMany(e => e.AssetAssignments)
                .HasForeignKey(x => x.EmployeeId)
                .OnDelete(DeleteBehavior.Restrict);

            b.HasOne(x => x.IssuedByEmployee)
                .WithMany(e => e.IssuedAssetAssignments)
                .HasForeignKey(x => x.IssuedByEmployeeId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<AssetUsageReading>(b =>
        {
            b.ToTable("asset_usage_readings");
            b.Property(x => x.ReadingValue).HasPrecision(18, 2);
            b.Property(x => x.Notes).HasMaxLength(2000);
            b.Property(x => x.RecordedAtUtc).IsRequired();
            b.Property(x => x.CreatedAtUtc).IsRequired();
            b.Property(x => x.UpdatedAtUtc).IsRequired();

            b.HasIndex(x => new { x.TenantId, x.AssetId, x.MeterType, x.RecordedAtUtc });

            b.HasOne(x => x.Tenant)
                .WithMany(t => t.AssetUsageReadings)
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasOne(x => x.Asset)
                .WithMany(a => a.UsageReadings)
                .HasForeignKey(x => x.AssetId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasOne(x => x.RecordedByEmployee)
                .WithMany(e => e.RecordedAssetUsageReadings)
                .HasForeignKey(x => x.RecordedByEmployeeId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<FailureCauseCategory>(b =>
        {
            b.ToTable("failure_cause_categories");
            b.Property(x => x.Name).HasMaxLength(200).IsRequired();
            b.Property(x => x.Code).HasMaxLength(64).IsRequired();
            b.Property(x => x.Description).HasMaxLength(1000);
            b.Property(x => x.IsActive).HasDefaultValue(true);
            b.Property(x => x.CreatedAtUtc).IsRequired();
            b.Property(x => x.UpdatedAtUtc).IsRequired();

            b.HasIndex(x => new { x.TenantId, x.Code }).IsUnique();
            b.HasIndex(x => new { x.TenantId, x.Name }).IsUnique();

            b.HasOne(x => x.Tenant)
                .WithMany(t => t.FailureCauseCategories)
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<FailureReport>(b =>
        {
            b.ToTable("failure_reports");
            b.Property(x => x.Title).HasMaxLength(200).IsRequired();
            b.Property(x => x.Description).IsRequired();
            b.Property(x => x.RootCause).HasMaxLength(2000);
            b.Property(x => x.CorrectiveAction).HasMaxLength(2000);
            b.Property(x => x.PreventiveAction).HasMaxLength(2000);
            b.Property(x => x.ResolutionSummary).HasMaxLength(4000);
            b.Property(x => x.ReportedAtUtc).IsRequired();
            b.Property(x => x.ProductionLossUnits).HasPrecision(18, 2);

            b.HasOne(x => x.Tenant)
                .WithMany(t => t.FailureReports)
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasOne(x => x.Asset)
                .WithMany(a => a.FailureReports)
                .HasForeignKey(x => x.AssetId)
                .OnDelete(DeleteBehavior.SetNull);

            b.HasOne(x => x.Hall)
                .WithMany(h => h.FailureReports)
                .HasForeignKey(x => x.HallId)
                .OnDelete(DeleteBehavior.SetNull);

            b.HasOne(x => x.Section)
                .WithMany(s => s.FailureReports)
                .HasForeignKey(x => x.SectionId)
                .OnDelete(DeleteBehavior.SetNull);

            b.HasOne(x => x.ReportedByEmployee)
                .WithMany(e => e.ReportedFailures)
                .HasForeignKey(x => x.ReportedByEmployeeId)
                .OnDelete(DeleteBehavior.SetNull);

            b.HasOne(x => x.FailureCauseCategory)
                .WithMany(c => c.FailureReports)
                .HasForeignKey(x => x.FailureCauseCategoryId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<WorkOrder>(b =>
        {
            b.ToTable("work_orders");
            b.Property(x => x.Number).HasMaxLength(64).IsRequired();
            b.Property(x => x.Title).HasMaxLength(200).IsRequired();
            b.Property(x => x.Description).IsRequired();
            b.Property(x => x.ExternalVendor).HasMaxLength(200);
            b.Property(x => x.RequestedAtUtc).IsRequired();
            b.Property(x => x.TriggeredByMeterValue).HasPrecision(18, 2);

            b.HasIndex(x => new { x.TenantId, x.Number }).IsUnique();
            b.HasIndex(x => x.MaintenancePlanId);

            b.HasOne(x => x.Tenant)
                .WithMany(t => t.WorkOrders)
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasOne(x => x.FailureReport)
                .WithMany(f => f.WorkOrders)
                .HasForeignKey(x => x.FailureReportId)
                .OnDelete(DeleteBehavior.SetNull);

            b.HasOne(x => x.Asset)
                .WithMany(a => a.WorkOrders)
                .HasForeignKey(x => x.AssetId)
                .OnDelete(DeleteBehavior.SetNull);

            b.HasOne(x => x.Hall)
                .WithMany(h => h.WorkOrders)
                .HasForeignKey(x => x.HallId)
                .OnDelete(DeleteBehavior.SetNull);

            b.HasOne(x => x.Section)
                .WithMany(s => s.WorkOrders)
                .HasForeignKey(x => x.SectionId)
                .OnDelete(DeleteBehavior.SetNull);

            b.HasOne(x => x.RequestedByEmployee)
                .WithMany(e => e.RequestedWorkOrders)
                .HasForeignKey(x => x.RequestedByEmployeeId)
                .OnDelete(DeleteBehavior.SetNull);

            b.HasOne(x => x.AssignedToEmployee)
                .WithMany(e => e.AssignedWorkOrders)
                .HasForeignKey(x => x.AssignedToEmployeeId)
                .OnDelete(DeleteBehavior.SetNull);

            b.HasOne(x => x.MaintenancePlan)
                .WithMany()
                .HasForeignKey(x => x.MaintenancePlanId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<MaintenancePlan>(b =>
        {
            b.ToTable("maintenance_plans");
            b.Property(x => x.Title).HasMaxLength(200).IsRequired();
            b.Property(x => x.Description).HasMaxLength(2000);
            b.Property(x => x.Checklist).HasMaxLength(4000);
            b.Property(x => x.Instructions).HasMaxLength(4000);
            b.Property(x => x.CreatedAtUtc).IsRequired();
            b.Property(x => x.UpdatedAtUtc).IsRequired();
            b.Property(x => x.LeadTimeDays).HasDefaultValue(14);
            b.Property(x => x.IsActive).HasDefaultValue(true);
            b.Property(x => x.MeterInterval).HasPrecision(18, 2);
            b.Property(x => x.NextDueMeterValue).HasPrecision(18, 2);
            b.Property(x => x.LastCompletedMeterValue).HasPrecision(18, 2);
            b.Property(x => x.AutoCreateLeadMeterValue).HasPrecision(18, 2);

            b.HasIndex(x => new { x.TenantId, x.AssetId, x.NextDueAtUtc });
            b.HasIndex(x => new { x.TenantId, x.AssetId, x.NextDueMeterValue });

            b.HasOne(x => x.Tenant)
                .WithMany(t => t.MaintenancePlans)
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasOne(x => x.Asset)
                .WithMany(a => a.MaintenancePlans)
                .HasForeignKey(x => x.AssetId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasOne(x => x.AssignedToEmployee)
                .WithMany()
                .HasForeignKey(x => x.AssignedToEmployeeId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<MaintenanceExecution>(b =>
        {
            b.ToTable("maintenance_executions");
            b.Property(x => x.Notes).HasMaxLength(4000);
            b.Property(x => x.CreatedAtUtc).IsRequired();
            b.Property(x => x.UpdatedAtUtc).IsRequired();
            b.Property(x => x.ScheduledMeterValue).HasPrecision(18, 2);

            b.HasIndex(x => new { x.MaintenancePlanId, x.ScheduledForUtc }).IsUnique();
            b.HasIndex(x => new { x.TenantId, x.AssetId, x.ScheduledForUtc });

            b.HasOne(x => x.Tenant)
                .WithMany(t => t.MaintenanceExecutions)
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasOne(x => x.MaintenancePlan)
                .WithMany(x => x.Executions)
                .HasForeignKey(x => x.MaintenancePlanId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasOne(x => x.Asset)
                .WithMany(a => a.MaintenanceExecutions)
                .HasForeignKey(x => x.AssetId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasOne(x => x.CompletedByEmployee)
                .WithMany()
                .HasForeignKey(x => x.CompletedByEmployeeId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<ImprovementIdea>(b =>
        {
            b.ToTable("improvement_ideas");
            b.Property(x => x.Title).HasMaxLength(200).IsRequired();
            b.Property(x => x.Description).IsRequired();
            b.Property(x => x.RootCause).HasMaxLength(2000);
            b.Property(x => x.ProposedAction).HasMaxLength(2000);
            b.Property(x => x.BaselineMetricName).HasMaxLength(200);
            b.Property(x => x.MetricUnit).HasMaxLength(64);
            b.Property(x => x.Notes).HasMaxLength(4000);
            b.Property(x => x.EstimatedSavingsPerMonth).HasPrecision(12, 2);
            b.Property(x => x.ImplementedSavingsPerMonth).HasPrecision(12, 2);
            b.Property(x => x.BaselineValue).HasPrecision(12, 2);
            b.Property(x => x.TargetValue).HasPrecision(12, 2);
            b.Property(x => x.ActualValue).HasPrecision(12, 2);
            b.Property(x => x.ResultSummary).HasMaxLength(4000);
            b.Property(x => x.CreatedAtUtc).IsRequired();
            b.Property(x => x.UpdatedAtUtc).IsRequired();

            b.HasIndex(x => new { x.TenantId, x.Status });
            b.HasIndex(x => new { x.TenantId, x.DepartmentId });

            b.HasOne(x => x.Tenant)
                .WithMany(t => t.ImprovementIdeas)
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Cascade);

            b.HasOne(x => x.Department)
                .WithMany(d => d.ImprovementIdeas)
                .HasForeignKey(x => x.DepartmentId)
                .OnDelete(DeleteBehavior.SetNull);

            b.HasOne(x => x.OwnerEmployee)
                .WithMany()
                .HasForeignKey(x => x.OwnerEmployeeId)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }
}
