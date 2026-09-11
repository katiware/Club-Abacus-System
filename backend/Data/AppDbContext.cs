using Club_Abacus_System.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading;
using System.Threading.Tasks;

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

        // 論理削除されたデータを除外するグローバルクエリフィルター
        modelBuilder.Entity<ExpenseRequest>().HasQueryFilter(e => e.DeletedAt == null);
        modelBuilder.Entity<ExpenseDocument>().HasQueryFilter(e => e.DeletedAt == null);
        modelBuilder.Entity<ExpenseItem>().HasQueryFilter(e => e.DeletedAt == null);
        modelBuilder.Entity<RecurringExpenseTemplate>().HasQueryFilter(e => e.DeletedAt == null);

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

    public override int SaveChanges()
    {
        ProcessTrackableEntities();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        ProcessTrackableEntities();
        return base.SaveChangesAsync(cancellationToken);
    }

    private void ProcessTrackableEntities()
    {
        var entries = ChangeTracker.Entries();

        foreach (var entry in entries)
        {
            if (entry.State == EntityState.Added || entry.State == EntityState.Modified)
            {
                var updatedAtProperty = entry.Entity.GetType().GetProperty("UpdatedAt");
                if (updatedAtProperty != null && updatedAtProperty.CanWrite)
                {
                    updatedAtProperty.SetValue(entry.Entity, DateTime.UtcNow);
                }
            }

            if (entry.State == EntityState.Deleted)
            {
                var deletedAtProperty = entry.Entity.GetType().GetProperty("DeletedAt");
                if (deletedAtProperty != null && deletedAtProperty.CanWrite)
                {
                    entry.State = EntityState.Modified;
                    deletedAtProperty.SetValue(entry.Entity, DateTime.UtcNow);

                    // もしエンティティが ExpenseRequest なら、子要素 (ExpenseItems) も論理削除の対象としてマークします。
                    // 実際には子要素がナビゲーションプロパティとしてロードされていればマーク可能ですが、
                    // ロードされていない場合は別途処理が必要になるか、または親を辿ってクエリフィルターで除外する設計にするのが通常です。
                    // 今回はExpenseItemにもDeletedAtを入れたため、ロードされているものだけ処理します。
                    if (entry.Entity is ExpenseRequest request)
                    {
                        if (request.ExpenseItems != null)
                        {
                            foreach (var item in request.ExpenseItems)
                            {
                                item.DeletedAt = DateTime.UtcNow;
                            }
                        }
                        if (request.ExpenseDocuments != null)
                        {
                            foreach (var doc in request.ExpenseDocuments)
                            {
                                doc.DeletedAt = DateTime.UtcNow;
                            }
                        }
                    }
                }
            }
        }
    }
}