using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Maintance : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AutoCreated",
                table: "work_orders",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "MaintenancePlanId",
                table: "work_orders",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PlannedForOccurrenceUtc",
                table: "work_orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Source",
                table: "work_orders",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "TriggeredByMeterValue",
                table: "work_orders",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "AutoCreateLeadMeterValue",
                table: "maintenance_plans",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "AutoCreateWorkOrder",
                table: "maintenance_plans",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "LastCompletedMeterValue",
                table: "maintenance_plans",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "MeterInterval",
                table: "maintenance_plans",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MeterType",
                table: "maintenance_plans",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "NextDueMeterValue",
                table: "maintenance_plans",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TriggerMode",
                table: "maintenance_plans",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "ScheduledMeterValue",
                table: "maintenance_executions",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ActualValue",
                table: "improvement_ideas",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BaselineMetricName",
                table: "improvement_ideas",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "BaselineValue",
                table: "improvement_ideas",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ImplementedSavingsPerMonth",
                table: "improvement_ideas",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MetricUnit",
                table: "improvement_ideas",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ResultSummary",
                table: "improvement_ideas",
                type: "character varying(4000)",
                maxLength: 4000,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TargetValue",
                table: "improvement_ideas",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DowntimeEndedAtUtc",
                table: "failure_reports",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DowntimeMinutes",
                table: "failure_reports",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DowntimeStartedAtUtc",
                table: "failure_reports",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "FailureCauseCategoryId",
                table: "failure_reports",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ProductionLossUnits",
                table: "failure_reports",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "asset_usage_readings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    AssetId = table.Column<Guid>(type: "uuid", nullable: false),
                    MeterType = table.Column<int>(type: "integer", nullable: false),
                    ReadingValue = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    RecordedByEmployeeId = table.Column<Guid>(type: "uuid", nullable: true),
                    Notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    RecordedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_asset_usage_readings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_asset_usage_readings_assets_AssetId",
                        column: x => x.AssetId,
                        principalTable: "assets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_asset_usage_readings_employee_profiles_RecordedByEmployeeId",
                        column: x => x.RecordedByEmployeeId,
                        principalTable: "employee_profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_asset_usage_readings_tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "employee_skills",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    AssetCategoryId = table.Column<Guid>(type: "uuid", nullable: false),
                    SkillLevel = table.Column<int>(type: "integer", nullable: false),
                    CanOperate = table.Column<bool>(type: "boolean", nullable: false),
                    CanMaintain = table.Column<bool>(type: "boolean", nullable: false),
                    CanApproveMaintenance = table.Column<bool>(type: "boolean", nullable: false),
                    Notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_employee_skills", x => x.Id);
                    table.ForeignKey(
                        name: "FK_employee_skills_asset_categories_AssetCategoryId",
                        column: x => x.AssetCategoryId,
                        principalTable: "asset_categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_employee_skills_employee_profiles_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "employee_profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_employee_skills_tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "tenants",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "failure_cause_categories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Code = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_failure_cause_categories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_failure_cause_categories_tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_work_orders_MaintenancePlanId",
                table: "work_orders",
                column: "MaintenancePlanId");

            migrationBuilder.CreateIndex(
                name: "IX_maintenance_plans_TenantId_AssetId_NextDueMeterValue",
                table: "maintenance_plans",
                columns: new[] { "TenantId", "AssetId", "NextDueMeterValue" });

            migrationBuilder.CreateIndex(
                name: "IX_failure_reports_FailureCauseCategoryId",
                table: "failure_reports",
                column: "FailureCauseCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_asset_usage_readings_AssetId",
                table: "asset_usage_readings",
                column: "AssetId");

            migrationBuilder.CreateIndex(
                name: "IX_asset_usage_readings_RecordedByEmployeeId",
                table: "asset_usage_readings",
                column: "RecordedByEmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_asset_usage_readings_TenantId_AssetId_MeterType_RecordedAtU~",
                table: "asset_usage_readings",
                columns: new[] { "TenantId", "AssetId", "MeterType", "RecordedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_employee_skills_AssetCategoryId",
                table: "employee_skills",
                column: "AssetCategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_employee_skills_EmployeeId_AssetCategoryId",
                table: "employee_skills",
                columns: new[] { "EmployeeId", "AssetCategoryId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_employee_skills_TenantId",
                table: "employee_skills",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_failure_cause_categories_TenantId_Code",
                table: "failure_cause_categories",
                columns: new[] { "TenantId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_failure_cause_categories_TenantId_Name",
                table: "failure_cause_categories",
                columns: new[] { "TenantId", "Name" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_failure_reports_failure_cause_categories_FailureCauseCatego~",
                table: "failure_reports",
                column: "FailureCauseCategoryId",
                principalTable: "failure_cause_categories",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_work_orders_maintenance_plans_MaintenancePlanId",
                table: "work_orders",
                column: "MaintenancePlanId",
                principalTable: "maintenance_plans",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_failure_reports_failure_cause_categories_FailureCauseCatego~",
                table: "failure_reports");

            migrationBuilder.DropForeignKey(
                name: "FK_work_orders_maintenance_plans_MaintenancePlanId",
                table: "work_orders");

            migrationBuilder.DropTable(
                name: "asset_usage_readings");

            migrationBuilder.DropTable(
                name: "employee_skills");

            migrationBuilder.DropTable(
                name: "failure_cause_categories");

            migrationBuilder.DropIndex(
                name: "IX_work_orders_MaintenancePlanId",
                table: "work_orders");

            migrationBuilder.DropIndex(
                name: "IX_maintenance_plans_TenantId_AssetId_NextDueMeterValue",
                table: "maintenance_plans");

            migrationBuilder.DropIndex(
                name: "IX_failure_reports_FailureCauseCategoryId",
                table: "failure_reports");

            migrationBuilder.DropColumn(
                name: "AutoCreated",
                table: "work_orders");

            migrationBuilder.DropColumn(
                name: "MaintenancePlanId",
                table: "work_orders");

            migrationBuilder.DropColumn(
                name: "PlannedForOccurrenceUtc",
                table: "work_orders");

            migrationBuilder.DropColumn(
                name: "Source",
                table: "work_orders");

            migrationBuilder.DropColumn(
                name: "TriggeredByMeterValue",
                table: "work_orders");

            migrationBuilder.DropColumn(
                name: "AutoCreateLeadMeterValue",
                table: "maintenance_plans");

            migrationBuilder.DropColumn(
                name: "AutoCreateWorkOrder",
                table: "maintenance_plans");

            migrationBuilder.DropColumn(
                name: "LastCompletedMeterValue",
                table: "maintenance_plans");

            migrationBuilder.DropColumn(
                name: "MeterInterval",
                table: "maintenance_plans");

            migrationBuilder.DropColumn(
                name: "MeterType",
                table: "maintenance_plans");

            migrationBuilder.DropColumn(
                name: "NextDueMeterValue",
                table: "maintenance_plans");

            migrationBuilder.DropColumn(
                name: "TriggerMode",
                table: "maintenance_plans");

            migrationBuilder.DropColumn(
                name: "ScheduledMeterValue",
                table: "maintenance_executions");

            migrationBuilder.DropColumn(
                name: "ActualValue",
                table: "improvement_ideas");

            migrationBuilder.DropColumn(
                name: "BaselineMetricName",
                table: "improvement_ideas");

            migrationBuilder.DropColumn(
                name: "BaselineValue",
                table: "improvement_ideas");

            migrationBuilder.DropColumn(
                name: "ImplementedSavingsPerMonth",
                table: "improvement_ideas");

            migrationBuilder.DropColumn(
                name: "MetricUnit",
                table: "improvement_ideas");

            migrationBuilder.DropColumn(
                name: "ResultSummary",
                table: "improvement_ideas");

            migrationBuilder.DropColumn(
                name: "TargetValue",
                table: "improvement_ideas");

            migrationBuilder.DropColumn(
                name: "DowntimeEndedAtUtc",
                table: "failure_reports");

            migrationBuilder.DropColumn(
                name: "DowntimeMinutes",
                table: "failure_reports");

            migrationBuilder.DropColumn(
                name: "DowntimeStartedAtUtc",
                table: "failure_reports");

            migrationBuilder.DropColumn(
                name: "FailureCauseCategoryId",
                table: "failure_reports");

            migrationBuilder.DropColumn(
                name: "ProductionLossUnits",
                table: "failure_reports");
        }
    }
}
