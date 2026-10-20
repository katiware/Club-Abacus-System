namespace Club_Abacus_System.DTOs.ExternalBudgets;

public class ExternalBudgetDto
{
    public Guid Id { get; set; }
    public Guid FiscalYearId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int TotalAmount { get; set; }
    public string? Description { get; set; }
    public int UsedAmount { get; set; } // 消化済み金額（承認済＋精算済）
    public int RemainingAmount => Math.Max(0, TotalAmount - UsedAmount); // 残高

    // 形態別の枠・使用額・残高
    public int CashAmount { get; set; }
    public int UsedCashAmount { get; set; }
    public int RemainingCashAmount => Math.Max(0, CashAmount - UsedCashAmount);

    public int AmazonGiftAmount { get; set; }
    public int UsedAmazonGiftAmount { get; set; }
    public int RemainingAmazonGiftAmount => Math.Max(0, AmazonGiftAmount - UsedAmazonGiftAmount);

    public int OtherAmount { get; set; }
    public int UsedOtherAmount { get; set; }
    public int RemainingOtherAmount => Math.Max(0, OtherAmount - UsedOtherAmount);

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
