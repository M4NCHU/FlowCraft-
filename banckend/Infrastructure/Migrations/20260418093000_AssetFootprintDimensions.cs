using FlowCraft.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    [DbContext(typeof(FlowCraftDbContext))]
    [Migration("20260418093000_AssetFootprintDimensions")]
    public partial class AssetFootprintDimensions : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "FootprintLengthMeters",
                table: "assets",
                type: "numeric(10,2)",
                precision: 10,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "FootprintWidthMeters",
                table: "assets",
                type: "numeric(10,2)",
                precision: 10,
                scale: 2,
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FootprintLengthMeters",
                table: "assets");

            migrationBuilder.DropColumn(
                name: "FootprintWidthMeters",
                table: "assets");
        }
    }
}
