using System.ComponentModel.DataAnnotations;
using Club_Abacus_System.Models;

namespace Club_Abacus_System.DTOs.ExternalBudgets;

/// <summary>
/// 部費外予算の資産形態間の振替（換金・交換）リクエストDTO
/// 例: Amazonギフトカードを現金化、現金をAmazonギフトカードで購入など
/// </summary>
public class ExternalBudgetConvertDto
{
    [Required]
    public ExternalBudgetAssetType FromType { get; set; } // 振替元形態

    [Required]
    public ExternalBudgetAssetType ToType { get; set; }   // 振替先形態

    [Range(1, int.MaxValue, ErrorMessage = "振替金額は1円以上を指定してください。")]
    public int Amount { get; set; }                      // 振替元から減額する金額（円）

    [Range(1, int.MaxValue, ErrorMessage = "受取金額は1円以上を指定してください。")]
    public int ConvertedAmount { get; set; }             // 振替先へ加算する金額（円、換金率等を考慮）

    [MaxLength(200)]
    public string? Note { get; set; }                    // 振替・換金の理由やメモ（例: 金券ショップ換金、手数料控除など）
}
