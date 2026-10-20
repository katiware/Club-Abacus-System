using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Club_Abacus_System.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddExternalBudgetAssetTypeAndConversion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AmazonGiftAmount",
                table: "ExternalBudgets",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "CashAmount",
                table: "ExternalBudgets",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "OtherAmount",
                table: "ExternalBudgets",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "ExternalBudgetAssetType",
                table: "ExpenseRequests",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AmazonGiftAmount",
                table: "ExternalBudgets");

            migrationBuilder.DropColumn(
                name: "CashAmount",
                table: "ExternalBudgets");

            migrationBuilder.DropColumn(
                name: "OtherAmount",
                table: "ExternalBudgets");

            migrationBuilder.DropColumn(
                name: "ExternalBudgetAssetType",
                table: "ExpenseRequests");
        }
    }
}
