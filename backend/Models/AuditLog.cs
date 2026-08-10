using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Club_Abacus_System.Models;

public class AuditLog
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(100)]
    public string TargetType { get; set; } = string.Empty; // 操作対象テーブル名（例: "ExpenseRequests", "Users"）

    [Required]
    public Guid TargetId { get; set; } // 操作対象レコードのID（ポリモーフィック）

    [Required]
    public Guid UserId { get; set; } // 外部キー → Users（操作を行ったユーザー）

    [Required]
    [MaxLength(100)]
    public string Action { get; set; } = string.Empty; // 操作種類（例: "UPDATE", "DELETE", "STATUS_CHANGE"）

    public string? OldValue { get; set; } // 変更前の値（JSON文字列）

    public string? NewValue { get; set; } // 変更後の値（JSON文字列）

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow; // 操作が行われた日時

    // --- Navigation Properties ---

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;
}
