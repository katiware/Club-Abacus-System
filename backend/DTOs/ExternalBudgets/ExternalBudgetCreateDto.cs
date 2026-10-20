using System.ComponentModel.DataAnnotations;

namespace Club_Abacus_System.DTOs.ExternalBudgets;

public class ExternalBudgetCreateDto
{
    [Required]
    public Guid FiscalYearId { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [Range(0, int.MaxValue, ErrorMessage = "予算額は0以上である必要があります。")]
    public int TotalAmount { get; set; }

    public int CashAmount { get; set; } = 0;
    public int AmazonGiftAmount { get; set; } = 0;
    public int OtherAmount { get; set; } = 0;

    [MaxLength(500)]
    public string? Description { get; set; }
}
