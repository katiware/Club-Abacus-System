using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Club_Abacus_System.Migrations
{
    /// <inheritdoc />
    public partial class AddFiscalYearAndBatches : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ExpenseRequests_ExpenseRequests_ParentRequestId",
                table: "ExpenseRequests");

            migrationBuilder.DropColumn(
                name: "IsRecurringTemplate",
                table: "ExpenseRequests");

            migrationBuilder.DropColumn(
                name: "NextGenerationDate",
                table: "ExpenseRequests");

            migrationBuilder.DropColumn(
                name: "RecurringFrequency",
                table: "ExpenseRequests");

            migrationBuilder.DropColumn(
                name: "TemplateStatus",
                table: "ExpenseRequests");

            migrationBuilder.RenameColumn(
                name: "PurchaseMethod",
                table: "ExpenseRequests",
                newName: "TotalAmount");

            migrationBuilder.RenameColumn(
                name: "ParentRequestId",
                table: "ExpenseRequests",
                newName: "UniversitySubmissionBatchId");

            migrationBuilder.RenameIndex(
                name: "IX_ExpenseRequests_ParentRequestId",
                table: "ExpenseRequests",
                newName: "IX_ExpenseRequests_UniversitySubmissionBatchId");

            migrationBuilder.AlterColumn<string>(
                name: "DiscordId",
                table: "Users",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100,
                oldNullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ApprovedAt",
                table: "ExpenseRequests",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ApprovedById",
                table: "ExpenseRequests",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PeriodAssignmentStatus",
                table: "ExpenseRequests",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "ReceiptType",
                table: "ExpenseRequests",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<Guid>(
                name: "RecurringTemplateId",
                table: "ExpenseRequests",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RejectionReason",
                table: "ExpenseRequests",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "FiscalYears",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    YearName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: false),
                    TotalBudget = table.Column<int>(type: "integer", nullable: false),
                    IsClosed = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FiscalYears", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RecurringExpenseTemplates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    TemplateName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    TemplateStatus = table.Column<int>(type: "integer", nullable: false),
                    RecurringFrequency = table.Column<int>(type: "integer", nullable: false),
                    ExpenseType = table.Column<int>(type: "integer", nullable: false),
                    ReceiptType = table.Column<int>(type: "integer", nullable: false),
                    ItemName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Amount = table.Column<int>(type: "integer", nullable: false),
                    Payee = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Category = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    NextGenerationDate = table.Column<DateOnly>(type: "date", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecurringExpenseTemplates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RecurringExpenseTemplates_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UniversitySubmissionBatches",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TargetMonth = table.Column<DateOnly>(type: "date", nullable: false),
                    FiscalYearId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsSubmitted = table.Column<bool>(type: "boolean", nullable: false),
                    SubmittedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UniversitySubmissionBatches", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UniversitySubmissionBatches_FiscalYears_FiscalYearId",
                        column: x => x.FiscalYearId,
                        principalTable: "FiscalYears",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ExpenseRequests_ApprovedById",
                table: "ExpenseRequests",
                column: "ApprovedById");

            migrationBuilder.CreateIndex(
                name: "IX_ExpenseRequests_RecurringTemplateId",
                table: "ExpenseRequests",
                column: "RecurringTemplateId");

            migrationBuilder.CreateIndex(
                name: "IX_RecurringExpenseTemplates_UserId",
                table: "RecurringExpenseTemplates",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_UniversitySubmissionBatches_FiscalYearId",
                table: "UniversitySubmissionBatches",
                column: "FiscalYearId");

            migrationBuilder.AddForeignKey(
                name: "FK_ExpenseRequests_RecurringExpenseTemplates_RecurringTemplate~",
                table: "ExpenseRequests",
                column: "RecurringTemplateId",
                principalTable: "RecurringExpenseTemplates",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ExpenseRequests_UniversitySubmissionBatches_UniversitySubmi~",
                table: "ExpenseRequests",
                column: "UniversitySubmissionBatchId",
                principalTable: "UniversitySubmissionBatches",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ExpenseRequests_Users_ApprovedById",
                table: "ExpenseRequests",
                column: "ApprovedById",
                principalTable: "Users",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ExpenseRequests_RecurringExpenseTemplates_RecurringTemplate~",
                table: "ExpenseRequests");

            migrationBuilder.DropForeignKey(
                name: "FK_ExpenseRequests_UniversitySubmissionBatches_UniversitySubmi~",
                table: "ExpenseRequests");

            migrationBuilder.DropForeignKey(
                name: "FK_ExpenseRequests_Users_ApprovedById",
                table: "ExpenseRequests");

            migrationBuilder.DropTable(
                name: "RecurringExpenseTemplates");

            migrationBuilder.DropTable(
                name: "UniversitySubmissionBatches");

            migrationBuilder.DropTable(
                name: "FiscalYears");

            migrationBuilder.DropIndex(
                name: "IX_ExpenseRequests_ApprovedById",
                table: "ExpenseRequests");

            migrationBuilder.DropIndex(
                name: "IX_ExpenseRequests_RecurringTemplateId",
                table: "ExpenseRequests");

            migrationBuilder.DropColumn(
                name: "ApprovedAt",
                table: "ExpenseRequests");

            migrationBuilder.DropColumn(
                name: "ApprovedById",
                table: "ExpenseRequests");

            migrationBuilder.DropColumn(
                name: "PeriodAssignmentStatus",
                table: "ExpenseRequests");

            migrationBuilder.DropColumn(
                name: "ReceiptType",
                table: "ExpenseRequests");

            migrationBuilder.DropColumn(
                name: "RecurringTemplateId",
                table: "ExpenseRequests");

            migrationBuilder.DropColumn(
                name: "RejectionReason",
                table: "ExpenseRequests");

            migrationBuilder.RenameColumn(
                name: "UniversitySubmissionBatchId",
                table: "ExpenseRequests",
                newName: "ParentRequestId");

            migrationBuilder.RenameColumn(
                name: "TotalAmount",
                table: "ExpenseRequests",
                newName: "PurchaseMethod");

            migrationBuilder.RenameIndex(
                name: "IX_ExpenseRequests_UniversitySubmissionBatchId",
                table: "ExpenseRequests",
                newName: "IX_ExpenseRequests_ParentRequestId");

            migrationBuilder.AlterColumn<string>(
                name: "DiscordId",
                table: "Users",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100);

            migrationBuilder.AddColumn<bool>(
                name: "IsRecurringTemplate",
                table: "ExpenseRequests",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateOnly>(
                name: "NextGenerationDate",
                table: "ExpenseRequests",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RecurringFrequency",
                table: "ExpenseRequests",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TemplateStatus",
                table: "ExpenseRequests",
                type: "integer",
                nullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_ExpenseRequests_ExpenseRequests_ParentRequestId",
                table: "ExpenseRequests",
                column: "ParentRequestId",
                principalTable: "ExpenseRequests",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
