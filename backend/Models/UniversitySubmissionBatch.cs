using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Club_Abacus_System.Models;

public class UniversitySubmissionBatch
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public DateOnly TargetMonth { get; set; } // 対象月 (例: 2027-04-01)

    [Required]
    public Guid FiscalYearId { get; set; } // 所属する年度

    [Required]
    public bool IsSubmitted { get; set; } = false; // 提出済みフラグ

    public DateTime? SubmittedAt { get; set; } // 提出済みへのステータス変更日時

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // --- Navigation Properties ---

    [ForeignKey(nameof(FiscalYearId))]
    public FiscalYear FiscalYear { get; set; } = null!;

    public ICollection<ExpenseRequest> ExpenseRequests { get; set; } = new List<ExpenseRequest>();
}
