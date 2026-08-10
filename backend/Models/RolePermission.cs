using System.ComponentModel.DataAnnotations.Schema;

namespace Club_Abacus_System.Models;

// ロール・権限 中間テーブル（複合主キー）
public class RolePermission
{
    public Guid RoleId { get; set; } // Primary Key, FK → Roles

    public Guid PermissionId { get; set; } // Primary Key, FK → Permissions

    // --- Navigation Properties ---

    [ForeignKey(nameof(RoleId))]
    public Role Role { get; set; } = null!;

    [ForeignKey(nameof(PermissionId))]
    public Permission Permission { get; set; } = null!;
}
