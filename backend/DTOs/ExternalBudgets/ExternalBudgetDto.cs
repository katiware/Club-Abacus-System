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
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
