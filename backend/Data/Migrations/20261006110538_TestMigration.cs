using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Club_Abacus_System.Data.Migrations
{
    /// <inheritdoc />
    public partial class TestMigration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Title",
                table: "RecurringExpenseTemplates");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Title",
                table: "RecurringExpenseTemplates",
                type: "character varying(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "");
        }
    }
}
