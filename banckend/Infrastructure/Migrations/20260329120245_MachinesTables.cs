using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class MachinesTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "MachineId",
                table: "LayoutElement",
                newName: "AssetId");

            migrationBuilder.AlterColumn<string>(
                name: "Code",
                table: "hall_sections",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.CreateTable(
                name: "assets",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Code = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Category = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    Description = table.Column<string>(type: "text", nullable: true),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    SerialNumber = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    Manufacturer = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    Model = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    IsMobile = table.Column<bool>(type: "boolean", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    PurchasedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CommissionedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    WarrantyUntilUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastInventoryCheckAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_assets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_assets_tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "employee_profiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    EmployeeNumber = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    FirstName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    LastName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    JobTitle = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    Department = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    Phone = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    HireDateUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_employee_profiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_employee_profiles_tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_employee_profiles_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "asset_placements",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    AssetId = table.Column<Guid>(type: "uuid", nullable: false),
                    HallId = table.Column<Guid>(type: "uuid", nullable: false),
                    SectionId = table.Column<Guid>(type: "uuid", nullable: true),
                    X = table.Column<decimal>(type: "numeric", nullable: false),
                    Y = table.Column<decimal>(type: "numeric", nullable: false),
                    Width = table.Column<decimal>(type: "numeric", nullable: false),
                    Height = table.Column<decimal>(type: "numeric", nullable: false),
                    RotationDeg = table.Column<decimal>(type: "numeric", nullable: false),
                    IsCurrent = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    PlacedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RemovedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_asset_placements", x => x.Id);
                    table.ForeignKey(
                        name: "FK_asset_placements_assets_AssetId",
                        column: x => x.AssetId,
                        principalTable: "assets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_asset_placements_hall_sections_SectionId",
                        column: x => x.SectionId,
                        principalTable: "hall_sections",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_asset_placements_production_halls_HallId",
                        column: x => x.HallId,
                        principalTable: "production_halls",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_asset_placements_tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "asset_assignments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    AssetId = table.Column<Guid>(type: "uuid", nullable: false),
                    EmployeeId = table.Column<Guid>(type: "uuid", nullable: false),
                    IssuedByEmployeeId = table.Column<Guid>(type: "uuid", nullable: true),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    AssignedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DueBackAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReturnedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_asset_assignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_asset_assignments_assets_AssetId",
                        column: x => x.AssetId,
                        principalTable: "assets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_asset_assignments_employee_profiles_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "employee_profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_asset_assignments_employee_profiles_IssuedByEmployeeId",
                        column: x => x.IssuedByEmployeeId,
                        principalTable: "employee_profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_asset_assignments_tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "failure_reports",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    AssetId = table.Column<Guid>(type: "uuid", nullable: true),
                    HallId = table.Column<Guid>(type: "uuid", nullable: true),
                    SectionId = table.Column<Guid>(type: "uuid", nullable: true),
                    ReportedByEmployeeId = table.Column<Guid>(type: "uuid", nullable: true),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    Severity = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CausesDowntime = table.Column<bool>(type: "boolean", nullable: false),
                    ReportedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    TriagedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ResolvedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ClosedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RootCause = table.Column<string>(type: "text", nullable: true),
                    ResolutionSummary = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_failure_reports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_failure_reports_assets_AssetId",
                        column: x => x.AssetId,
                        principalTable: "assets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_failure_reports_employee_profiles_ReportedByEmployeeId",
                        column: x => x.ReportedByEmployeeId,
                        principalTable: "employee_profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_failure_reports_hall_sections_SectionId",
                        column: x => x.SectionId,
                        principalTable: "hall_sections",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_failure_reports_production_halls_HallId",
                        column: x => x.HallId,
                        principalTable: "production_halls",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_failure_reports_tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "work_orders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    FailureReportId = table.Column<Guid>(type: "uuid", nullable: true),
                    AssetId = table.Column<Guid>(type: "uuid", nullable: true),
                    HallId = table.Column<Guid>(type: "uuid", nullable: true),
                    SectionId = table.Column<Guid>(type: "uuid", nullable: true),
                    RequestedByEmployeeId = table.Column<Guid>(type: "uuid", nullable: true),
                    AssignedToEmployeeId = table.Column<Guid>(type: "uuid", nullable: true),
                    Number = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    Priority = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    RequestedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PlannedStartAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    StartedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CompletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DueAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    EstimatedMinutes = table.Column<int>(type: "integer", nullable: true),
                    ActualMinutes = table.Column<int>(type: "integer", nullable: true),
                    EstimatedCost = table.Column<decimal>(type: "numeric", nullable: true),
                    ActualCost = table.Column<decimal>(type: "numeric", nullable: true),
                    ExternalVendor = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    ResolutionSummary = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_work_orders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_work_orders_assets_AssetId",
                        column: x => x.AssetId,
                        principalTable: "assets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_work_orders_employee_profiles_AssignedToEmployeeId",
                        column: x => x.AssignedToEmployeeId,
                        principalTable: "employee_profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_work_orders_employee_profiles_RequestedByEmployeeId",
                        column: x => x.RequestedByEmployeeId,
                        principalTable: "employee_profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_work_orders_failure_reports_FailureReportId",
                        column: x => x.FailureReportId,
                        principalTable: "failure_reports",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_work_orders_hall_sections_SectionId",
                        column: x => x.SectionId,
                        principalTable: "hall_sections",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_work_orders_production_halls_HallId",
                        column: x => x.HallId,
                        principalTable: "production_halls",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_work_orders_tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LayoutElement_AssetId",
                table: "LayoutElement",
                column: "AssetId");

            migrationBuilder.CreateIndex(
                name: "IX_asset_assignments_AssetId",
                table: "asset_assignments",
                column: "AssetId");

            migrationBuilder.CreateIndex(
                name: "IX_asset_assignments_EmployeeId",
                table: "asset_assignments",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_asset_assignments_IssuedByEmployeeId",
                table: "asset_assignments",
                column: "IssuedByEmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_asset_assignments_TenantId",
                table: "asset_assignments",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_asset_placements_AssetId_IsCurrent",
                table: "asset_placements",
                columns: new[] { "AssetId", "IsCurrent" });

            migrationBuilder.CreateIndex(
                name: "IX_asset_placements_HallId",
                table: "asset_placements",
                column: "HallId");

            migrationBuilder.CreateIndex(
                name: "IX_asset_placements_SectionId",
                table: "asset_placements",
                column: "SectionId");

            migrationBuilder.CreateIndex(
                name: "IX_asset_placements_TenantId",
                table: "asset_placements",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_assets_TenantId_Code",
                table: "assets",
                columns: new[] { "TenantId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_employee_profiles_TenantId_EmployeeNumber",
                table: "employee_profiles",
                columns: new[] { "TenantId", "EmployeeNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_employee_profiles_UserId",
                table: "employee_profiles",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_failure_reports_AssetId",
                table: "failure_reports",
                column: "AssetId");

            migrationBuilder.CreateIndex(
                name: "IX_failure_reports_HallId",
                table: "failure_reports",
                column: "HallId");

            migrationBuilder.CreateIndex(
                name: "IX_failure_reports_ReportedByEmployeeId",
                table: "failure_reports",
                column: "ReportedByEmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_failure_reports_SectionId",
                table: "failure_reports",
                column: "SectionId");

            migrationBuilder.CreateIndex(
                name: "IX_failure_reports_TenantId",
                table: "failure_reports",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_work_orders_AssetId",
                table: "work_orders",
                column: "AssetId");

            migrationBuilder.CreateIndex(
                name: "IX_work_orders_AssignedToEmployeeId",
                table: "work_orders",
                column: "AssignedToEmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_work_orders_FailureReportId",
                table: "work_orders",
                column: "FailureReportId");

            migrationBuilder.CreateIndex(
                name: "IX_work_orders_HallId",
                table: "work_orders",
                column: "HallId");

            migrationBuilder.CreateIndex(
                name: "IX_work_orders_RequestedByEmployeeId",
                table: "work_orders",
                column: "RequestedByEmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_work_orders_SectionId",
                table: "work_orders",
                column: "SectionId");

            migrationBuilder.CreateIndex(
                name: "IX_work_orders_TenantId_Number",
                table: "work_orders",
                columns: new[] { "TenantId", "Number" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_LayoutElement_assets_AssetId",
                table: "LayoutElement",
                column: "AssetId",
                principalTable: "assets",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_LayoutElement_assets_AssetId",
                table: "LayoutElement");

            migrationBuilder.DropTable(
                name: "asset_assignments");

            migrationBuilder.DropTable(
                name: "asset_placements");

            migrationBuilder.DropTable(
                name: "work_orders");

            migrationBuilder.DropTable(
                name: "failure_reports");

            migrationBuilder.DropTable(
                name: "assets");

            migrationBuilder.DropTable(
                name: "employee_profiles");

            migrationBuilder.DropIndex(
                name: "IX_LayoutElement_AssetId",
                table: "LayoutElement");

            migrationBuilder.RenameColumn(
                name: "AssetId",
                table: "LayoutElement",
                newName: "MachineId");

            migrationBuilder.AlterColumn<string>(
                name: "Code",
                table: "hall_sections",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(64)",
                oldMaxLength: 64,
                oldNullable: true);
        }
    }
}
