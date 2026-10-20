using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Club_Abacus_System.Models;

public class ExternalBudget
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid FiscalYearId { get; set; } // 所属する年度

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty; // 予算名（例: OB・OG寄付金、特別助成金など）

    [Required]
    public int TotalAmount { get; set; } = 0; // 予算枠総額（円）

    // 形態別の内訳保有額（円）
    public int CashAmount { get; set; } = 0;       // 現金枠
    public int AmazonGiftAmount { get; set; } = 0; // Amazonギフトカード枠
    public int OtherAmount { get; set; } = 0;      // その他枠

    [MaxLength(500)]
    public string? Description { get; set; } // 備考・使途説明

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // --- Navigation Properties ---

    [ForeignKey(nameof(FiscalYearId))]
    public FiscalYear FiscalYear { get; set; } = null!;

    public ICollection<ExpenseRequest> ExpenseRequests { get; set; } = new List<ExpenseRequest>();
}
