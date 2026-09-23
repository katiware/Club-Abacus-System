using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Club_Abacus_System.Migrations
{
    /// <inheritdoc />
    public partial class AddPurchaseUrl : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PurchaseUrl",
                table: "ExpenseItems",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PurchaseUrl",
                table: "ExpenseItems");
        }
    }
}
