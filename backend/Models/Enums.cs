namespace Club_Abacus_System.Models;

public enum ExpenseType
{
    Reimbursement, // 立替払い
    Advance        // 事前出金
}

public enum PurchaseMethod
{
    Web,      // Web購入（画像/PDF提出）
    Physical  // 実店舗購入（紙の領収書手渡し）
}

public enum ExpenseStatus
{
    PendingApproval,     // PENDING_APPROVAL: 承認待ち（部員が申請提出）
    Approved,            // APPROVED: 事前承認済（証憑提出待ち）
    WaitingConfirmation, // WAITING_CONFIRMATION: 証憑確認待ち（会計による領収書チェック待ち）
    UniversitySubmitted, // UNIVERSITY_SUBMITTED: 大学へ申請完了（UNIPA提出済）
    Settled,             // SETTLED: 精算完了（部員への現金手渡し済み）
    Rejected             // REJECTED: 却下
}
//定期払い用
public enum TemplateStatus
{
    Active,   // 有効
    Inactive // 無効
}
//定期払い用
public enum RecurringFrequency
{
    Monthly, // 月次
    Yearly   // 年次
}

public enum DocumentType
{
    Receipt, // 領収書
    Quotation, // 見積書(事前出金の場合)
    Invoice, // Amazonでは適格請求書(明細書)が必要
}
