using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Schedule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "maintenance_plans",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    AssetId = table.Column<Guid>(type: "uuid", nullable: false),
                    AssignedToEmployeeId = table.Column<Guid>(type: "uuid", nullable: true),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    ScheduleType = table.Column<int>(type: "integer", nullable: false),
                    StartsAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    NextDueAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RecurrenceUnit = table.Column<int>(type: "integer", nullable: true),
                    RecurrenceInterval = table.Column<int>(type: "integer", nullable: true),
                    LeadTimeDays = table.Column<int>(type: "integer", nullable: false, defaultValue: 14),
                    EstimatedDurationMinutes = table.Column<int>(type: "integer", nullable: true),
                    Checklist = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    Instructions = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    LastCompletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_maintenance_plans", x => x.Id);
                    table.ForeignKey(
                        name: "FK_maintenance_plans_assets_AssetId",
                        column: x => x.AssetId,
                        principalTable: "assets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_maintenance_plans_employee_profiles_AssignedToEmployeeId",
                        column: x => x.AssignedToEmployeeId,
                        principalTable: "employee_profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_maintenance_plans_tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "maintenance_executions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    MaintenancePlanId = table.Column<Guid>(type: "uuid", nullable: false),
                    AssetId = table.Column<Guid>(type: "uuid", nullable: false),
                    CompletedByEmployeeId = table.Column<Guid>(type: "uuid", nullable: true),
                    ScheduledForUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CompletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Outcome = table.Column<int>(type: "integer", nullable: false),
                    ActualMinutes = table.Column<int>(type: "integer", nullable: true),
                    Notes = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_maintenance_executions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_maintenance_executions_assets_AssetId",
                        column: x => x.AssetId,
                        principalTable: "assets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_maintenance_executions_employee_profiles_CompletedByEmploye~",
                        column: x => x.CompletedByEmployeeId,
                        principalTable: "employee_profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_maintenance_executions_maintenance_plans_MaintenancePlanId",
                        column: x => x.MaintenancePlanId,
                        principalTable: "maintenance_plans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_maintenance_executions_tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_maintenance_executions_AssetId",
                table: "maintenance_executions",
                column: "AssetId");

            migrationBuilder.CreateIndex(
                name: "IX_maintenance_executions_CompletedByEmployeeId",
                table: "maintenance_executions",
                column: "CompletedByEmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_maintenance_executions_MaintenancePlanId_ScheduledForUtc",
                table: "maintenance_executions",
                columns: new[] { "MaintenancePlanId", "ScheduledForUtc" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_maintenance_executions_TenantId_AssetId_ScheduledForUtc",
                table: "maintenance_executions",
                columns: new[] { "TenantId", "AssetId", "ScheduledForUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_maintenance_plans_AssetId",
                table: "maintenance_plans",
                column: "AssetId");

            migrationBuilder.CreateIndex(
                name: "IX_maintenance_plans_AssignedToEmployeeId",
                table: "maintenance_plans",
                column: "AssignedToEmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_maintenance_plans_TenantId_AssetId_NextDueAtUtc",
                table: "maintenance_plans",
                columns: new[] { "TenantId", "AssetId", "NextDueAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "maintenance_executions");

            migrationBuilder.DropTable(
                name: "maintenance_plans");
        }
    }
}
