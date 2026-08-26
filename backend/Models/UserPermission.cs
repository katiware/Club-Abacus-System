using System.ComponentModel.DataAnnotations.Schema;

namespace Club_Abacus_System.Models;

// ユーザー・権限 中間テーブル（複合主キー）
public class UserPermission
{
    public Guid UserId { get; set; } // Primary Key, FK → Users

    public PermissionType Permission { get; set; } // Enum

    // --- Navigation Properties ---

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;
}
