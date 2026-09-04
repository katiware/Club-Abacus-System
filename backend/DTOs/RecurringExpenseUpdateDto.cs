using System.ComponentModel.DataAnnotations;
using Club_Abacus_System.Models;

namespace Club_Abacus_System.DTOs;

public class RecurringExpenseUpdateDto
{
    [MaxLength(255)]
    public string? TemplateName { get; set; }

    public TemplateStatus? TemplateStatus { get; set; }

    [MaxLength(255)]
    public string? ItemName { get; set; }

    public int? Amount { get; set; }

    [MaxLength(255)]
    public string? Payee { get; set; }

    [MaxLength(100)]
    public string? Category { get; set; }

    public DateOnly? NextGenerationDate { get; set; }
}
