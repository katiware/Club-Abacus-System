using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Club_Abacus_System.Models;

public class User
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid RoleId { get; set; } // 外部キー → Roles

    [Required]
    [MaxLength(255)]
    [EmailAddress]
    public string Email { get; set; } = string.Empty; // 大学のGoogleアカウントのアドレス（Unique）

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty; // 氏名

    [MaxLength(100)]
    public string DiscordId { get; set; } = string.Empty; // DiscordユーザーID

    public bool IsActive { get; set; } = true; // ログイン可否制御（Default: true）

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow; // 作成日時

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow; // 更新日時

    // --- Navigation Properties ---

    [ForeignKey(nameof(RoleId))]
    public Role Role { get; set; } = null!; // ロール（多対一）

    public ICollection<UserPermission> UserPermissions { get; set; } = new List<UserPermission>();
}
