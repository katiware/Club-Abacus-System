using System.ComponentModel.DataAnnotations;

namespace Club_Abacus_System.DTOs;

public class MoveExpenseRequestsDto
{
    /// <summary>移動先のバッチID</summary>
    [Required]
    public Guid TargetBatchId { get; set; }

    /// <summary>移動する経費申請IDのリスト</summary>
    [Required]
    [MinLength(1, ErrorMessage = "移動する申請を1件以上指定してください。")]
    public List<Guid> ExpenseRequestIds { get; set; } = new();
}
