using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class EmployeeMachinePermissions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_employee_skills_EmployeeId_AssetCategoryId",
                table: "employee_skills");

            migrationBuilder.AddColumn<Guid>(
                name: "AssetId",
                table: "employee_skills",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_employee_skills_AssetId",
                table: "employee_skills",
                column: "AssetId");

            migrationBuilder.CreateIndex(
                name: "IX_employee_skills_EmployeeId_AssetCategoryId",
                table: "employee_skills",
                columns: new[] { "EmployeeId", "AssetCategoryId" },
                unique: true,
                filter: "\"AssetId\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_employee_skills_EmployeeId_AssetId",
                table: "employee_skills",
                columns: new[] { "EmployeeId", "AssetId" },
                unique: true,
                filter: "\"AssetId\" IS NOT NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_employee_skills_assets_AssetId",
                table: "employee_skills",
                column: "AssetId",
                principalTable: "assets",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_employee_skills_assets_AssetId",
                table: "employee_skills");

            migrationBuilder.DropIndex(
                name: "IX_employee_skills_AssetId",
                table: "employee_skills");

            migrationBuilder.DropIndex(
                name: "IX_employee_skills_EmployeeId_AssetCategoryId",
                table: "employee_skills");

            migrationBuilder.DropIndex(
                name: "IX_employee_skills_EmployeeId_AssetId",
                table: "employee_skills");

            migrationBuilder.DropColumn(
                name: "AssetId",
                table: "employee_skills");

            migrationBuilder.CreateIndex(
                name: "IX_employee_skills_EmployeeId_AssetCategoryId",
                table: "employee_skills",
                columns: new[] { "EmployeeId", "AssetCategoryId" },
                unique: true);
        }
    }
}
