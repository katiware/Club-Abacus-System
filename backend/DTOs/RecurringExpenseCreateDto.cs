using System.ComponentModel.DataAnnotations;
using Club_Abacus_System.Models;

namespace Club_Abacus_System.DTOs;

public class RecurringExpenseCreateDto
{
    [Required]
    public Guid UserId { get; set; }

    [Required]
    [MaxLength(255)]
    public string TemplateName { get; set; } = string.Empty;

    [Required]
    public RecurringFrequency RecurringFrequency { get; set; }

    [Required]
    public ExpenseType ExpenseType { get; set; }

    [Required]
    public ReceiptType ReceiptType { get; set; }

    [Required]
    [MaxLength(255)]
    public string ItemName { get; set; } = string.Empty;

    [Required]
    public int Amount { get; set; }

    [Required]
    [MaxLength(255)]
    public string Payee { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Category { get; set; } = string.Empty;

    [Required]
    public DateOnly NextGenerationDate { get; set; }
}
