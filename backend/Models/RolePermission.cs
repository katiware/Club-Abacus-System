using System.ComponentModel.DataAnnotations.Schema;

namespace Club_Abacus_System.Models;

// ロール・権限 中間テーブル（複合主キー）
public class RolePermission
{
    public Guid RoleId { get; set; } // Primary Key, FK → Roles

    public PermissionType Permission { get; set; } // Enum

    // --- Navigation Properties ---

    [ForeignKey(nameof(RoleId))]
    public Role Role { get; set; } = null!;
}
