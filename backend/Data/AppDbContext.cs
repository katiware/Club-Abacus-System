using Club_Abacus_System.Models;
using Microsoft.EntityFrameworkCore;

namespace Club_Abacus_System.Data;

public class AppDbContext(
    DbContextOptions<AppDbContext> options)
    : DbContext(options)
{
    public DbSet<User> Users => Set<User>();

    public DbSet<Role> Roles => Set<Role>();

    public DbSet<RolePermission> RolePermissions =>
        Set<RolePermission>();

    public DbSet<UserPermission> UserPermissions =>
        Set<UserPermission>();

    public DbSet<Permission> Permissions =>
        Set<Permission>();

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

        // 複合主キーの設定
        modelBuilder.Entity<RolePermission>()
            .HasKey(rp => new { rp.RoleId, rp.PermissionId });

        modelBuilder.Entity<UserPermission>()
            .HasKey(up => new { up.UserId, up.PermissionId });

        // 一意制約の設定
        modelBuilder.Entity<Permission>()
            .HasIndex(p => p.PermissionName)
            .IsUnique();
        modelBuilder.Entity<Role>()
            .HasIndex(p => p.RoleName)
            .IsUnique();
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

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