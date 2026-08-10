using System.ComponentModel.DataAnnotations;

namespace Club_Abacus_System.Models;

public class Role
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(50)]
    public string RoleName { get; set; } = string.Empty; // 例: ADMIN, MEMBER

    [MaxLength(255)]
    public string? Description { get; set; } // ロールの説明

    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}
