namespace Club_Abacus_System.Models;

public enum ExpenseType
{
    Reimbursement, // 立替払い
    Advance        // 事前出金
}

public enum ReceiptType
{
    Digital,      // Web購入（画像/PDF提出）
    Paper  // 実店舗購入（紙の領収書手渡し）
}

public enum ExpenseStatus
{
    // --- 共通 ---
    Draft = 10,               // DRAFT: 下書き（部員が入力中）
    PendingApproval = 20,     // PENDING_APPROVAL: 承認待ち（部員が申請提出）
    Approved = 30,            // 事前承認済（立替:購入待ち / 事前出金:現金渡し待ち）
    WaitingConfirmation = 40, // 領収書確認待ち（会計によるチェック待ち）
    UniversitySubmitted = 50, // 大学へ申請完了（UNIPA提出済）
    Settled = 60,             // 精算完了（立替:現金手渡し済 / 事前出金:お釣り回収済など）
    Rejected = 99,            // REJECTED: 却下

    // --- 事前出金フロー専用 ---
    Advance_MoneyHandedOver = 35 // 事前出金渡し済（部員へ現金手渡し済。購入・領収書提出待ち）
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

public enum PeriodAssignmentStatus
{
    Provisional, // 仮
    Confirmed,   // 確定
    Corrected    // 訂正（管理者による取消等）
}

public enum PermissionType
{
    // --- 一般部員向け権限 ---
    ExpenseManageOwn = 10,
    ExpenseReadAll = 20,//証憑を除く

    // --- 会計・監査向け権限 ---
    ExpenseApprove = 21,
    ExpenseConfirmReceipt = 22,
    ExpenseSubmitToUniversity = 23,
    ExpenseSettle = 24,

    // --- システム管理向け権限 ---
    ManageMasterData = 30,
    ManageUsers = 40,
    ManageRoles = 41,
    ViewAuditLogs = 50
}
