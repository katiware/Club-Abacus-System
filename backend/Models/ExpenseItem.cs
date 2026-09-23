using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Club_Abacus_System.Models;

public class ExpenseItem
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid RequestId { get; set; } // 外部キー → ExpenseRequests

    [Required]
    [MaxLength(255)]
    public string ItemName { get; set; } = string.Empty; // 商品名・書籍名

    [Required]
    public int UnitPrice { get; set; } // 単価

    [Required]
    public int Quantity { get; set; } = 1; // 数量

    [Required]
    [MaxLength(255)]
    public string Payee { get; set; } = string.Empty; // 支払先

    [Required]
    [MaxLength(100)]
    public string Category { get; set; } = string.Empty; // 使途カテゴリ(後々Enumにしたいかも)

    public string? Description { get; set; } // 用途詳細

    [MaxLength(2000)]
    public string? PurchaseUrl { get; set; } // Web/Amazon購入時のURL

    public bool IsProductUndecided { get; set; } = false; // 商品未定フラグ（Discordでの議論用）

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? DeletedAt { get; set; }

    // --- Navigation Properties ---

    [ForeignKey(nameof(RequestId))]
    public ExpenseRequest ExpenseRequest { get; set; } = null!;
}
