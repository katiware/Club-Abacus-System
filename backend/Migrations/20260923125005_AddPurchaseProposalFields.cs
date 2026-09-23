using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Club_Abacus_System.Migrations
{
    /// <inheritdoc />
    public partial class AddPurchaseProposalFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DiscordThreadId",
                table: "ExpenseRequests",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DiscordThreadUrl",
                table: "ExpenseRequests",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsProductUndecided",
                table: "ExpenseItems",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DiscordThreadId",
                table: "ExpenseRequests");

            migrationBuilder.DropColumn(
                name: "DiscordThreadUrl",
                table: "ExpenseRequests");

            migrationBuilder.DropColumn(
                name: "IsProductUndecided",
                table: "ExpenseItems");
        }
    }
}
