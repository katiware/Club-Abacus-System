using System.ComponentModel.DataAnnotations;

namespace Club_Abacus_System.DTOs.FiscalYears;

public class FiscalYearUpdateDto
{
    [MaxLength(100)]
    public string? YearName { get; set; }

    public int? TotalBudget { get; set; }

    public DateOnly? StartDate { get; set; }

    public DateOnly? EndDate { get; set; }

    public bool? IsActive { get; set; }

    public bool? IsClosed { get; set; }
}
