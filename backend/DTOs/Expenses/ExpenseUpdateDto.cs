using System.ComponentModel.DataAnnotations;
using Club_Abacus_System.Models;

namespace Club_Abacus_System.DTOs.Expenses;

public class ExpenseUpdateDto
{
    [Required(ErrorMessage = "申請タイトルは必須です")]
    [MaxLength(255, ErrorMessage = "タイトルは255文字以内で入力してください")]
    public string Title { get; set; } = string.Empty;

    [Required(ErrorMessage = "事前出金か立替払いを選択してください")]
    public ExpenseType Type { get; set; }

    [Required(ErrorMessage = "証憑種別は必須です")]
    public ReceiptType ReceiptType { get; set; }

    [Required(ErrorMessage = "最低でも1つの明細が必要です")]
    [MinLength(1, ErrorMessage = "最低でも1つの明細が必要です")]
    public List<ExpenseItemCreateDto> ExpenseItems { get; set; } = new();
}
