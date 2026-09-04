using System.ComponentModel.DataAnnotations;

namespace Club_Abacus_System.DTOs;

public class ExpenseItemCreateDto
{
    [Required(ErrorMessage = "商品名・書籍名は必須です")]
    [MaxLength(255)]
    public string ItemName { get; set; } = string.Empty;

    [Required]
    [Range(1, int.MaxValue, ErrorMessage = "単価は1円以上である必要があります")]
    public int UnitPrice { get; set; }

    [Required]
    [Range(1, 1000, ErrorMessage = "数量は1以上である必要があります")]
    public int Quantity { get; set; } = 1;

    [Required(ErrorMessage = "支払先は必須です")]
    [MaxLength(255)]
    public string Payee { get; set; } = string.Empty;

    [Required(ErrorMessage = "使途カテゴリは必須です")]
    [MaxLength(100)]
    public string Category { get; set; } = string.Empty;

    public string? Description { get; set; }
}
