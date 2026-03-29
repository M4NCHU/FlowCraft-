using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class MachineCategoriesAndParameters : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CategoryId",
                table: "assets",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "asset_categories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Code = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    AssetType = table.Column<int>(type: "integer", nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_asset_categories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_asset_categories_tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "asset_category_parameters",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AssetCategoryId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Code = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    Unit = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    OptionsJson = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    DefaultValue = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    IsRequired = table.Column<bool>(type: "boolean", nullable: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_asset_category_parameters", x => x.Id);
                    table.ForeignKey(
                        name: "FK_asset_category_parameters_asset_categories_AssetCategoryId",
                        column: x => x.AssetCategoryId,
                        principalTable: "asset_categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "asset_parameter_values",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AssetId = table.Column<Guid>(type: "uuid", nullable: false),
                    AssetCategoryParameterId = table.Column<Guid>(type: "uuid", nullable: false),
                    Value = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_asset_parameter_values", x => x.Id);
                    table.ForeignKey(
                        name: "FK_asset_parameter_values_asset_category_parameters_AssetCateg~",
                        column: x => x.AssetCategoryParameterId,
                        principalTable: "asset_category_parameters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_asset_parameter_values_assets_AssetId",
                        column: x => x.AssetId,
                        principalTable: "assets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_assets_CategoryId",
                table: "assets",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_asset_categories_TenantId_Code",
                table: "asset_categories",
                columns: new[] { "TenantId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_asset_categories_TenantId_Name_AssetType",
                table: "asset_categories",
                columns: new[] { "TenantId", "Name", "AssetType" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_asset_category_parameters_AssetCategoryId_Code",
                table: "asset_category_parameters",
                columns: new[] { "AssetCategoryId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_asset_parameter_values_AssetCategoryParameterId",
                table: "asset_parameter_values",
                column: "AssetCategoryParameterId");

            migrationBuilder.CreateIndex(
                name: "IX_asset_parameter_values_AssetId_AssetCategoryParameterId",
                table: "asset_parameter_values",
                columns: new[] { "AssetId", "AssetCategoryParameterId" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_assets_asset_categories_CategoryId",
                table: "assets",
                column: "CategoryId",
                principalTable: "asset_categories",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_assets_asset_categories_CategoryId",
                table: "assets");

            migrationBuilder.DropTable(
                name: "asset_parameter_values");

            migrationBuilder.DropTable(
                name: "asset_category_parameters");

            migrationBuilder.DropTable(
                name: "asset_categories");

            migrationBuilder.DropIndex(
                name: "IX_assets_CategoryId",
                table: "assets");

            migrationBuilder.DropColumn(
                name: "CategoryId",
                table: "assets");
        }
    }
}
