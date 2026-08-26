using System.ComponentModel.DataAnnotations;

namespace Club_Abacus_System.Models;

public class Permission
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(100)]
    public string PermissionName { get; set; } = string.Empty; // 権限名（例: APPROVE_EXPENSE, MANAGE_USERS）（Unique）

    [MaxLength(255)]
    public string? Description { get; set; } // 権限の詳細な説明

    // --- Navigation Properties ---

    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
    public ICollection<UserPermission> UserPermissions { get; set; } = new List<UserPermission>();
}
