using System.ComponentModel.DataAnnotations;
using Club_Abacus_System.Models;

namespace Club_Abacus_System.DTOs;

public class RoleCreateDto
{
    [Required]
    [MaxLength(256)]
    public string Name { get; set; } = string.Empty; // 例: "会計", "部員", "監査"

    [MaxLength(255)]
    public string? Description { get; set; }

    /// <summary>
    /// ロール作成時に付与する権限（1件以上必須）
    /// </summary>
    [Required]
    [MinLength(1, ErrorMessage = "権限を1件以上指定してください。")]
    public List<PermissionType> Permissions { get; set; } = new();
}
