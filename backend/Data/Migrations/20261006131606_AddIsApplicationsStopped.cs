using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Club_Abacus_System.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddIsApplicationsStopped : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "FiscalYears",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsApplicationsStopped",
                table: "FiscalYears",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "FiscalYears");

            migrationBuilder.DropColumn(
                name: "IsApplicationsStopped",
                table: "FiscalYears");
        }
    }
}
