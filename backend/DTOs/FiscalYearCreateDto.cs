using System.ComponentModel.DataAnnotations;

namespace Club_Abacus_System.DTOs;

public class FiscalYearCreateDto
{
    [Required]
    [MaxLength(100)]
    public string YearName { get; set; } = string.Empty; // 例: "2026年度"

    [Required]
    public DateOnly StartDate { get; set; }

    [Required]
    public DateOnly EndDate { get; set; }

    [Required]
    public int TotalBudget { get; set; } = 0;
}
