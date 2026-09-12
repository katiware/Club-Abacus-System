namespace Club_Abacus_System.DTOs.Expenses;

public class ExpenseSummaryDto
{
    public int PendingCount { get; set; }
    public int OverdueCount { get; set; }
    public decimal BudgetBalance { get; set; }
}
