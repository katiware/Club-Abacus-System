using Club_Abacus_System.DTOs;
using Club_Abacus_System.Models;

namespace Club_Abacus_System.Services;

public interface IExpenseService
{
    /// <summary>
    /// 新規の経費申請（明細含む）を作成します。
    /// </summary>
    Task<ExpenseRequest> CreateExpenseRequestAsync(Guid userId, ExpenseRequestCreateDto dto);

    /// <summary>
    /// 特定の経費申請をIDで取得します（明細と証憑情報を含みます）。
    /// </summary>
    Task<ExpenseRequest?> GetExpenseRequestByIdAsync(Guid id);

    /// <summary>
    /// 特定ユーザーの経費申請一覧を取得します。
    /// </summary>
    Task<List<ExpenseRequest>> GetUserExpenseRequestsAsync(Guid userId);

    /// <summary>
    /// 経費申請を承認待ちとして提出します（ステータス変更）。
    /// </summary>
    Task<bool> SubmitExpenseRequestAsync(Guid id, Guid userId);
}
