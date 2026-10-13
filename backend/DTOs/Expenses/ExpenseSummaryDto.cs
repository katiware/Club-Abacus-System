namespace Club_Abacus_System.DTOs.Expenses;

public class ExpenseSummaryDto
{
    public int PendingCount { get; set; }
    public int OverdueCount { get; set; }
    public decimal BudgetBalance { get; set; }
    public int UnfinalizedCount { get; set; }
    public string? YearName { get; set; }
    
    // 追加の統計データ
    public decimal TotalBudget { get; set; }
    public decimal SettledTotal { get; set; }
    public decimal ApprovedTotal { get; set; }
    public decimal PendingTotal { get; set; }
    public decimal FutureRecurringTotal { get; set; }
    public decimal EffectiveBalance { get; set; }
    public bool IsBudgetOver { get; set; }
    public bool IsPendingOver { get; set; }
    
    public int WaitingConfirmationCount { get; set; }
    public int SettledCount { get; set; }
    public int DraftCount { get; set; }
    public int TotalRequestsCount { get; set; }
    
    public Dictionary<string, decimal> CategoryTotals { get; set; } = new();
}

