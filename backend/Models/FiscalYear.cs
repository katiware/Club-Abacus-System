using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Club_Abacus_System.Models;

public class FiscalYear
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(100)]
    public string YearName { get; set; } = string.Empty; // 例: "2026年度"

    [Required]
    public DateOnly StartDate { get; set; }

    [Required]
    public DateOnly EndDate { get; set; }

    [Required]
    public int TotalBudget { get; set; } = 0; // 今年度の部費予算総額

    public bool IsClosed { get; set; } = false; // 年度締めフラグ

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
