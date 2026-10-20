using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Club_Abacus_System.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddExternalBudgetAndUniversityRejection : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ExternalBudgetAmount",
                table: "ExpenseRequests",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<Guid>(
                name: "ExternalBudgetId",
                table: "ExpenseRequests",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ExternalBudgets",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FiscalYearId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    TotalAmount = table.Column<int>(type: "integer", nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExternalBudgets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ExternalBudgets_FiscalYears_FiscalYearId",
                        column: x => x.FiscalYearId,
                        principalTable: "FiscalYears",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ExpenseRequests_ExternalBudgetId",
                table: "ExpenseRequests",
                column: "ExternalBudgetId");

            migrationBuilder.CreateIndex(
                name: "IX_ExternalBudgets_FiscalYearId",
                table: "ExternalBudgets",
                column: "FiscalYearId");

            migrationBuilder.AddForeignKey(
                name: "FK_ExpenseRequests_ExternalBudgets_ExternalBudgetId",
                table: "ExpenseRequests",
                column: "ExternalBudgetId",
                principalTable: "ExternalBudgets",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ExpenseRequests_ExternalBudgets_ExternalBudgetId",
                table: "ExpenseRequests");

            migrationBuilder.DropTable(
                name: "ExternalBudgets");

            migrationBuilder.DropIndex(
                name: "IX_ExpenseRequests_ExternalBudgetId",
                table: "ExpenseRequests");

            migrationBuilder.DropColumn(
                name: "ExternalBudgetAmount",
                table: "ExpenseRequests");

            migrationBuilder.DropColumn(
                name: "ExternalBudgetId",
                table: "ExpenseRequests");
        }
    }
}
