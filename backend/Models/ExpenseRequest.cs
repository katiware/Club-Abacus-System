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
    public PurchaseMethod PurchaseMethod { get; set; } // WEB / PHYSICAL

    [Required]
    public ExpenseStatus Status { get; set; } = ExpenseStatus.PendingApproval; // 進行状況

    public bool IsRecurringTemplate { get; set; } = false; // 定期支払いテンプレートか否か

    public TemplateStatus? TemplateStatus { get; set; } // 定期払い用のACTIVE / INACTIVE（定期のON/OFF）

    public RecurringFrequency? RecurringFrequency { get; set; } // 定期支払い用のMONTHLY / YEARLY

    public DateOnly? NextGenerationDate { get; set; } // 定期払い用の次回実データを生成する日付

    public Guid? ParentRequestId { get; set; } // 定期払い用の自己参照FK（自動生成データの大元テンプレートID）

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? DeletedAt { get; set; } // 論理削除用タイムスタンプ

    // --- Navigation Properties ---

    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;

    [ForeignKey(nameof(ParentRequestId))]
    public ExpenseRequest? ParentRequest { get; set; } // 定期払い用の自己参照（親テンプレート）

    public ICollection<ExpenseRequest> ChildRequests { get; set; } = new List<ExpenseRequest>(); // 定期払い用の自動生成された子データ

    public ICollection<ExpenseItem> ExpenseItems { get; set; } = new List<ExpenseItem>();//明細
    public ICollection<ExpenseDocument> ExpenseDocuments { get; set; } = new List<ExpenseDocument>();//証憑

}
