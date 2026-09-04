using System.ComponentModel.DataAnnotations;

namespace Club_Abacus_System.DTOs;

public class FiscalYearUpdateDto
{
    [MaxLength(100)]
    public string? YearName { get; set; }

    public int? TotalBudget { get; set; }
}
