using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Club_Abacus_System.Models;

public class ExpenseRequest
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid UserId { get; set; } // 外部キー → Users（申請者）

    [Required]
    public ExpenseType Type { get; set; } // REIMBURSEMENT（立替）/ ADVANCE（事前出金）

    [Required]
    public ReceiptType ReceiptType { get; set; } // Digital / Paper

    [Required]
    public ExpenseStatus Status { get; set; } = ExpenseStatus.PendingApproval; // 進行状況

    public Guid? RecurringTemplateId { get; set; } // 定期払いバッチによって自動生成された場合、その親テンプレートIDが入る

    public int TotalAmount { get; set; } // 申請の合計金額（明細の合計キャッシュ）

    public Guid? ApprovedById { get; set; } // 承認者のユーザーID

    public DateTime? ApprovedAt { get; set; } // 承認日時

    public string? RejectionReason { get; set; } // 却下・差し戻し時の理由

    public PeriodAssignmentStatus PeriodAssignmentStatus { get; set; } = PeriodAssignmentStatus.Provisional; // 割当ステータス

    public Guid? UniversitySubmissionBatchId { get; set; } // どの提出バッチ（箱）に入っているか

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? DeletedAt { get; set; } // 論理削除用タイムスタンプ

    // --- Navigation Properties ---

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    [ForeignKey(nameof(ApprovedById))]
    public User? ApprovedBy { get; set; } // 承認者

    [ForeignKey(nameof(UniversitySubmissionBatchId))]
    public UniversitySubmissionBatch? UniversitySubmissionBatch { get; set; } // 提出バッチへの参照

    [ForeignKey(nameof(RecurringTemplateId))]
    public RecurringExpenseTemplate? RecurringTemplate { get; set; } // 親テンプレートへの参照

    public ICollection<ExpenseItem> ExpenseItems { get; set; } = new List<ExpenseItem>();//明細
    public ICollection<ExpenseDocument> ExpenseDocuments { get; set; } = new List<ExpenseDocument>();//証憑

}
