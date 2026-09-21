using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Club_Abacus_System.Migrations
{
    /// <inheritdoc />
    public partial class AddIsAmountFinalizedToExpenseRequest : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsAmountFinalized",
                table: "ExpenseRequests",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsAmountFinalized",
                table: "ExpenseRequests");
        }
    }
}
