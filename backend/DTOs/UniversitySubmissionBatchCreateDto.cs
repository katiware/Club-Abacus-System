using System.ComponentModel.DataAnnotations;

namespace Club_Abacus_System.DTOs;

public class UniversitySubmissionBatchCreateDto
{
    [Required]
    public DateOnly TargetMonth { get; set; } // 対象月 (例: 2027-04-01)

    [Required]
    public Guid FiscalYearId { get; set; }
}
