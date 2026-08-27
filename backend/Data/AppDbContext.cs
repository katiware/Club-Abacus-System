using Club_Abacus_System.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Club_Abacus_System.Data;

public class AppDbContext(
    DbContextOptions<AppDbContext> options)
    : IdentityDbContext<User, Role, Guid>(options)
{
    public DbSet<AuditLog> AuditLogs =>
        Set<AuditLog>();

    public DbSet<ExpenseRequest> ExpenseRequests =>
        Set<ExpenseRequest>();

    public DbSet<ExpenseItem> ExpenseItems =>
        Set<ExpenseItem>();

    public DbSet<ExpenseDocument> ExpenseDocuments =>
        Set<ExpenseDocument>();

    public DbSet<RecurringExpenseTemplate> RecurringExpenseTemplates =>
        Set<RecurringExpenseTemplate>();

    public DbSet<FiscalYear> FiscalYears =>
        Set<FiscalYear>();

    public DbSet<UniversitySubmissionBatch> UniversitySubmissionBatches =>
        Set<UniversitySubmissionBatch>();

    protected override void OnModelCreating(
        ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<ExpenseDocument>()
            .HasIndex(document => new
            {
                document.RequestId,
                document.DocumentType
            });

        // 定期払いテンプレート削除時の安全設定
        // テンプレートを削除しても、そこから生成された過去の申請データは削除されないようにする
        modelBuilder.Entity<ExpenseRequest>()
            .HasOne(r => r.RecurringTemplate)
            .WithMany(t => t.GeneratedRequests)
            .HasForeignKey(r => r.RecurringTemplateId)
            .OnDelete(DeleteBehavior.Restrict);

        // バッチ削除時の安全設定
        modelBuilder.Entity<ExpenseRequest>()
            .HasOne(r => r.UniversitySubmissionBatch)
            .WithMany(b => b.ExpenseRequests)
            .HasForeignKey(r => r.UniversitySubmissionBatchId)
            .OnDelete(DeleteBehavior.Restrict);

        // 年度削除時の安全設定
        modelBuilder.Entity<UniversitySubmissionBatch>()
            .HasOne(b => b.FiscalYear)
            .WithMany()
            .HasForeignKey(b => b.FiscalYearId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}