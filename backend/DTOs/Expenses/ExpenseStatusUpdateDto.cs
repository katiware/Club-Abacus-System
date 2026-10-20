using System.ComponentModel.DataAnnotations;
using Club_Abacus_System.Models;

namespace Club_Abacus_System.DTOs.Expenses;

public class ExpenseStatusUpdateDto
{
    [Required]
    public ExpenseStatus Status { get; set; }

    public string? RejectionReason { get; set; }

    public int? ExternalBudgetAmount { get; set; }

    public Guid? ExternalBudgetId { get; set; }

    public ExternalBudgetAssetType? ExternalBudgetAssetType { get; set; }
}
