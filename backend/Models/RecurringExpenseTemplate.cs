using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Club_Abacus_System.Models;

/// <summary>
/// 定期支払いの設定（テンプレート）を保持するクラス。
/// バッチ処理はこの設定を読み取り、NextGenerationDate に基づいて自動的に ExpenseRequest を生成します。
/// </summary>
public class RecurringExpenseTemplate
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid(); // テンプレートの一意な識別子

    [Required]
    public Guid UserId { get; set; } // テンプレート作成者（経費の申請者）のID

    [Required]
    [MaxLength(255)]
    public string TemplateName { get; set; } = string.Empty; // テンプレート名（例：「毎月のサーバー代」「年額のドメイン代」）

    [Required]
    public TemplateStatus TemplateStatus { get; set; } = TemplateStatus.Active; // この定期支払いの状態（有効 / 無効）

    [Required]
    public RecurringFrequency RecurringFrequency { get; set; } // 自動生成の頻度（毎月 / 毎年など）

    [Required]
    public ExpenseType ExpenseType { get; set; } // 経費の種類（立替払い / 事前出金）

    [Required]
    public ReceiptType ReceiptType { get; set; } // 証憑の提出フォーマット（データアップロード / 紙の原本手渡し）

    [Required]
    [MaxLength(255)]
    public string ItemName { get; set; } = string.Empty; // 定期支払いの名目

    [Required]
    public int Amount { get; set; } // 金額

    [Required]
    [MaxLength(255)]
    public string Payee { get; set; } = string.Empty; // 支払先

    [Required]
    [MaxLength(100)]
    public string Category { get; set; } = string.Empty; // 使途カテゴリ

    [Required]
    public DateOnly NextGenerationDate { get; set; } // 次回申請データを生成する基準日（二重生成を防止するためのフラグとしても機能）

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow; // 作成日時

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow; // 更新日時

    public DateTime? DeletedAt { get; set; } // 論理削除用のタイムスタンプ

    // --- Navigation Properties ---

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!; // 紐づくユーザー情報

    // このテンプレートから自動生成された過去の経費申請データのリスト（履歴の追跡用）
    public ICollection<ExpenseRequest> GeneratedRequests { get; set; } = new List<ExpenseRequest>();
}