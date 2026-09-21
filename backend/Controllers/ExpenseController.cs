using Club_Abacus_System.Data;
using Club_Abacus_System.DTOs;
using Club_Abacus_System.DTOs.Expenses;
using Club_Abacus_System.DTOs.FiscalYears;
using Club_Abacus_System.DTOs.RecurringExpenses;
using Club_Abacus_System.DTOs.Roles;
using Club_Abacus_System.DTOs.Submissions;
using Club_Abacus_System.DTOs.System;
using Club_Abacus_System.DTOs.Users;
using Club_Abacus_System.Models;
using System.Security.Claims;
using Club_Abacus_System.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IO;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.StaticFiles;

namespace Club_Abacus_System.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ExpenseController(AppDbContext context) : ControllerBase
{
    /// <summary>
    /// ダッシュボード用の集計データを取得します。
    /// </summary>
    [HttpGet("summary")]
    [Authorize] // 誰でも見れるが、権限によって内容を変えることも可能
    public async Task<ActionResult<ExpenseSummaryDto>> GetSummary(CancellationToken cancellationToken = default)
    {
        var pendingCount = await context.ExpenseRequests
            .Where(e => e.Status == ExpenseStatus.PendingApproval || e.Status == ExpenseStatus.WaitingConfirmation)
            .CountAsync(cancellationToken);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var currentFiscalYear = await context.FiscalYears
            .FirstOrDefaultAsync(f => f.StartDate <= today && f.EndDate >= today, cancellationToken);

        // TODO: 本格的な予算残高の計算ロジック
        // 本来は currentFiscalYear.TotalBudget から、今年度のすべての確定済み経費を引く必要がありますが、
        // 現状は固定値をベースとしています。
        var budgetBalance = currentFiscalYear != null ? (decimal)currentFiscalYear.TotalBudget : 125000m;

        // 今年度の確定済み経費を差し引く（簡易的な計算）
        if (currentFiscalYear != null)
        {
            var settledTotal = await context.ExpenseRequests
                .Where(e => e.Status == ExpenseStatus.Settled || e.Status == ExpenseStatus.UniversitySubmitted)
                // 簡易的に CreatedAt で今年度分を判定
                .Where(e => e.CreatedAt >= currentFiscalYear.StartDate.ToDateTime(TimeOnly.MinValue) && 
                            e.CreatedAt <= currentFiscalYear.EndDate.ToDateTime(TimeOnly.MaxValue))
                .SumAsync(e => e.TotalAmount, cancellationToken);
            budgetBalance -= settledTotal;
        }

        // 未生成の有効な定期払いテンプレートの合計金額（予定額）を控除する
        var activeTemplates = await context.RecurringExpenseTemplates
            .Where(t => t.TemplateStatus == TemplateStatus.Active && t.DeletedAt == null)
            .ToListAsync(cancellationToken);

        decimal futureRecurringTotal = 0;
        var endOfCalculation = currentFiscalYear != null ? currentFiscalYear.EndDate : today.AddYears(1);

        foreach (var template in activeTemplates)
        {
            var currentGenDate = template.NextGenerationDate;
            int occurrences = 0;

            while (currentGenDate <= endOfCalculation)
            {
                occurrences++;
                if (template.RecurringFrequency == RecurringFrequency.Monthly)
                {
                    currentGenDate = currentGenDate.AddMonths(1);
                }
                else if (template.RecurringFrequency == RecurringFrequency.Yearly)
                {
                    currentGenDate = currentGenDate.AddYears(1);
                }
                else
                {
                    break; // 万が一未知の頻度があった場合の無限ループ防止
                }
            }

            futureRecurringTotal += template.Amount * occurrences;
        }
        
        budgetBalance -= futureRecurringTotal;

        // TODO: 期限切れの計算（事前出金で未精算かつ期日超過のものなど。とりあえず固定値）
        var overdueCount = 0;

        var userIdString = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
        int unfinalizedCount = 0;
        if (Guid.TryParse(userIdString, out var currentUserId))
        {
            unfinalizedCount = await context.ExpenseRequests
                .Where(e => e.UserId == currentUserId && e.IsAmountVariable && !e.IsAmountFinalized 
                            && e.Status != ExpenseStatus.Rejected && e.Status != ExpenseStatus.Settled)
                .CountAsync(cancellationToken);
        }

        return Ok(new ExpenseSummaryDto
        {
            PendingCount = pendingCount,
            OverdueCount = overdueCount,
            BudgetBalance = budgetBalance,
            UnfinalizedCount = unfinalizedCount
        });
    }
    /// <summary>
    /// 新規の経費申請（明細含む）を作成します。
    /// </summary>
    [HttpPost]
    [RequirePermission(PermissionType.ExpenseManageOwn)]
    public async Task<ActionResult<ExpenseRequest>> CreateExpenseRequest([FromBody] ExpenseRequestCreateDto dto, CancellationToken cancellationToken = default)
    {
        // 🚨 セキュリティ対策: クライアントからの入力は無視し、トークンから自身のIDを取得する
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var currentUserId))
        {
            return Unauthorized("ユーザー情報が取得できません。");
        }

        // ユーザーが存在するか確認
        var userExists = await context.Users.AnyAsync(u => u.Id == currentUserId, cancellationToken);
        if (!userExists)
        {
            return BadRequest("指定されたユーザーは存在しません。");
        }

        // 合計金額の計算（NullReferenceException対策）
        var totalAmount = dto.ExpenseItems?.Sum(item => item.UnitPrice * item.Quantity) ?? 0;

        var expenseRequest = new ExpenseRequest
        {
            UserId = currentUserId,
            Type = dto.Type,
            ReceiptType = dto.ReceiptType,
            Status = ExpenseStatus.Draft, // 初期ステータス（下書き）
            TotalAmount = totalAmount,
            ExpenseItems = dto.ExpenseItems?.Select(itemDto => new ExpenseItem
            {
                ItemName = itemDto.ItemName,
                UnitPrice = itemDto.UnitPrice,
                Quantity = itemDto.Quantity,
                Payee = itemDto.Payee,
                Category = itemDto.Category,
                Description = itemDto.Description
            }).ToList() ?? new List<ExpenseItem>()
        };

        context.ExpenseRequests.Add(expenseRequest);

        context.AuditLogs.Add(new AuditLog
        {
            TargetType = "ExpenseRequests",
            TargetId = expenseRequest.Id,
            UserId = currentUserId,
            Action = "CREATE"
        });

        await context.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(GetExpenseRequestById), new { id = expenseRequest.Id }, expenseRequest);
    }

    /// <summary>
    /// 特定の経費申請をIDで取得します（明細と証憑情報を含みます）。
    /// </summary>
    [HttpGet("{id}")]
    [RequirePermission(PermissionType.ExpenseManageOwn)]
    public async Task<ActionResult<ExpenseRequest>> GetExpenseRequestById(Guid id, CancellationToken cancellationToken = default)
    {
        var expenseRequest = await context.ExpenseRequests
            .AsNoTracking()
            .Include(e => e.User)
            .Include(e => e.ExpenseItems)
            .Include(e => e.ExpenseDocuments)
            .FirstOrDefaultAsync(e => e.Id == id, cancellationToken);

        if (expenseRequest == null)
        {
            return NotFound("指定された申請が見つかりません。");
        }

        // 🚨 セキュリティ対策: 本人のデータか確認 (承認権限がある場合は閲覧可能とする)
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (Guid.TryParse(userIdString, out var currentUserId))
        {
            if (expenseRequest.UserId != currentUserId && !User.HasClaim("Permission", PermissionType.ExpenseApprove.ToString()))
            {
                return Forbid("他人の申請を閲覧する権限がありません。");
            }
        }

        return Ok(expenseRequest);
    }

    /// <summary>
    /// 全ての経費申請一覧を取得します（管理者用）。
    /// </summary>
    [HttpGet("all")]
    [RequirePermission(PermissionType.ExpenseReadAll)]
    public async Task<ActionResult<List<ExpenseRequest>>> GetAllExpenseRequests(CancellationToken cancellationToken = default)
    {
        var requests = await context.ExpenseRequests
            .AsNoTracking()
            .Include(e => e.User)
            .Include(e => e.ExpenseItems)
            .OrderByDescending(e => e.CreatedAt)
            .ToListAsync(cancellationToken);

        return Ok(requests);
    }

    /// <summary>
    /// ログイン中ユーザー自身の経費申請一覧を取得します。
    /// </summary>
    [HttpGet("me")]
    [RequirePermission(PermissionType.ExpenseManageOwn)]
    public async Task<ActionResult<List<ExpenseRequest>>> GetMyExpenseRequests(CancellationToken cancellationToken = default)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var currentUserId))
        {
            return Unauthorized("ユーザー情報が取得できません。");
        }

        var requests = await context.ExpenseRequests
            .AsNoTracking()
            .Include(e => e.ExpenseItems)
            .Where(e => e.UserId == currentUserId)
            .OrderByDescending(e => e.CreatedAt)
            .ToListAsync(cancellationToken);

        return Ok(requests);
    }

    /// <summary>
    /// 経費申請を承認待ちとして提出します（ステータス変更）。
    /// </summary>
    [HttpPost("{id}/submit")]
    [RequirePermission(PermissionType.ExpenseManageOwn)]
    public async Task<IActionResult> SubmitExpenseRequest(Guid id, CancellationToken cancellationToken = default)
    {
        // 🚨 セキュリティ対策: トークンから本人のIDを取得
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var currentUserId))
        {
            return Unauthorized("ユーザー情報が取得できません。");
        }

        var expenseRequest = await context.ExpenseRequests.FindAsync(new object[] { id }, cancellationToken);

        if (expenseRequest == null)
        {
            return NotFound("指定された申請が見つかりません。");
        }

        // 🚨 セキュリティ対策: 偽造可能なuserId変数ではなく、本人のID(currentUserId)と比較する
        if (expenseRequest.UserId != currentUserId)
        {
            return Forbid("他人の申請を操作することはできません。");
        }

        // 下書き状態の場合のみ提出可能
        if (expenseRequest.Status != ExpenseStatus.Draft)
        {
            return BadRequest("この申請はすでに提出されているか、処理が進んでいます。");
        }

        // ステータスを「承認待ち」に進める
        expenseRequest.Status = ExpenseStatus.PendingApproval;
        expenseRequest.UpdatedAt = DateTime.UtcNow;

        context.AuditLogs.Add(new AuditLog
        {
            TargetType = "ExpenseRequests",
            TargetId = expenseRequest.Id,
            UserId = currentUserId,
            Action = "STATUS_CHANGE_SUBMIT"
        });

        await context.SaveChangesAsync(cancellationToken);
        return Ok();
    }

    /// <summary>
    /// 経費申請の事前承認・却下を行います。
    /// </summary>
    [HttpPut("{id}/approve")]
    [RequirePermission(PermissionType.ExpenseApprove)]
    public async Task<IActionResult> ApproveExpenseRequest(Guid id, [FromBody] ExpenseStatusUpdateDto dto, CancellationToken cancellationToken = default)
    {
        // 誰が承認・却下操作を行ったかを取得（失敗時は処理を中断）
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var currentUserId))
        {
            return Unauthorized("ユーザー情報が取得できません。再度ログインしてください。");
        }

        var expenseRequest = await context.ExpenseRequests.FindAsync(new object[] { id }, cancellationToken);

        if (expenseRequest == null)
        {
            return NotFound("指定された申請が見つかりません。");
        }

        // 🚨 セキュリティ対策: 自分の申請は自分で承認・却下できないようにする
        if (expenseRequest.UserId == currentUserId)
        {
            return Forbid("自分の申請を自分で承認・却下することはできません。");
        }

        if (dto.Status != ExpenseStatus.Approved && dto.Status != ExpenseStatus.Rejected)
        {
            return BadRequest("このAPIでは「承認(Approved)」または「却下(Rejected)」のみ指定可能です。");
        }

        if (expenseRequest.Status != ExpenseStatus.PendingApproval)
        {
            return BadRequest("「承認待ち」の状態からのみ承認・却下が可能です。");
        }

        expenseRequest.Status = dto.Status;

        if (dto.Status == ExpenseStatus.Rejected)
        {
            expenseRequest.RejectionReason = dto.RejectionReason;
            expenseRequest.ApprovedById = null;
            expenseRequest.ApprovedAt = null;
        }
        else
        {
            expenseRequest.RejectionReason = null;
            expenseRequest.ApprovedById = currentUserId;
            expenseRequest.ApprovedAt = DateTime.UtcNow;
        }

        context.AuditLogs.Add(new AuditLog
        {
            TargetType = "ExpenseRequests",
            TargetId = expenseRequest.Id,
            UserId = currentUserId,
            Action = $"STATUS_CHANGE_{dto.Status.ToString().ToUpper()}"
        });

        await context.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    /// <summary>
    /// 提出された領収書の確認・精算など、事後処理のステータスを変更します。
    /// </summary>
    [HttpPut("{id}/confirm")]
    [Authorize]
    public async Task<IActionResult> ConfirmExpenseReceipt(Guid id, [FromBody] ExpenseStatusUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var expenseRequest = await context.ExpenseRequests
            .Include(e => e.ExpenseDocuments)
            .FirstOrDefaultAsync(e => e.Id == id, cancellationToken);

        if (expenseRequest == null)
        {
            return NotFound("指定された申請が見つかりません。");
        }

        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (Guid.TryParse(userIdString, out var currentUserId) && expenseRequest.UserId == currentUserId)
        {
            return Forbid("自分の申請に対する事後処理（確認・精算等）を自分で行うことはできません。");
        }

        // 必要な権限のチェック
        if (!User.HasClaim("Permission", PermissionType.ExpenseConfirmReceipt.ToString()) &&
            !User.HasClaim("Permission", PermissionType.ExpenseSettle.ToString()))
        {
            return Forbid("領収書の確認・精算などの操作を行う権限がありません。");
        }

        // 承認前・却下済みの場合は操作不可
        if (expenseRequest.Status == ExpenseStatus.Draft ||
            expenseRequest.Status == ExpenseStatus.PendingApproval ||
            expenseRequest.Status == ExpenseStatus.Rejected)
        {
            return BadRequest("事前承認が完了していないため、このステータスへは進めません。");
        }

        // 金額変動があるが、まだユーザーが実費確定していない場合は進めない
        if (expenseRequest.IsAmountVariable && !expenseRequest.IsAmountFinalized && 
            (dto.Status == ExpenseStatus.WaitingConfirmation || dto.Status == ExpenseStatus.Settled || dto.Status == ExpenseStatus.UniversitySubmitted))
        {
            return BadRequest("為替などによる金額変動が設定されている申請ですが、まだ実費金額が確定されていません。ユーザーに金額を修正・確定してもらってください。");
        }

        // --- ステータス別の詳細バリデーション ---
        if (dto.Status == ExpenseStatus.Advance_MoneyHandedOver)
        {
            // ① 事前出金の現金手渡し処理
            if (expenseRequest.Type != ExpenseType.Advance)
            {
                return BadRequest("このステータス（事前出金渡し済）は、事前出金の申請に対してのみ使用できます。");
            }
            // ※現金手渡し時点では買い物が終わっていないため、領収書画像の必須チェックは行わない
        }
        else if (dto.Status == ExpenseStatus.WaitingConfirmation ||
                 dto.Status == ExpenseStatus.UniversitySubmitted ||
                 dto.Status == ExpenseStatus.Settled)
        {
            // ② 領収書の確認や精算完了の処理（立替・事前出金 共通）
            if (expenseRequest.ReceiptType != ReceiptType.Paper && 
                (expenseRequest.ExpenseDocuments == null || expenseRequest.ExpenseDocuments.Count == 0))
            {
                return BadRequest("証憑（領収書等）がアップロードされていないため、このステータスへは進めません。");
            }
        }
        else
        {
            return BadRequest("このAPIでは事後処理関連のステータスのみ指定可能です。");
        }

        expenseRequest.Status = dto.Status;

        if (currentUserId != Guid.Empty)
        {
            context.AuditLogs.Add(new AuditLog
            {
                TargetType = "ExpenseRequests",
                TargetId = expenseRequest.Id,
                UserId = currentUserId,
                Action = $"STATUS_CHANGE_{dto.Status.ToString().ToUpper()}"
            });
        }

        await context.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    /// <summary>
    /// 定期払いなどで為替変動がある申請（IsAmountVariable=true）の実費金額を確定・修正します。
    /// </summary>
    [HttpPut("{id}/amount")]
    [RequirePermission(PermissionType.ExpenseManageOwn)]
    public async Task<IActionResult> UpdateExpenseAmount(Guid id, [FromBody] int actualAmount, CancellationToken cancellationToken = default)
    {
        var expenseRequest = await context.ExpenseRequests
            .Include(e => e.ExpenseItems)
            .FirstOrDefaultAsync(e => e.Id == id, cancellationToken);

        if (expenseRequest == null) return NotFound("指定された申請が見つかりません。");

        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (Guid.TryParse(userIdString, out var currentUserId))
        {
            if (expenseRequest.UserId != currentUserId && !User.HasClaim("Permission", PermissionType.ExpenseApprove.ToString()))
            {
                return Forbid("他人の申請の金額を変更することはできません。");
            }
        }

        if (!expenseRequest.IsAmountVariable)
        {
            return BadRequest("この申請は金額変動が許可されていません（IsAmountVariable=false）。");
        }

        // 精算済みなど完了済みのものは変更不可とする
        if (expenseRequest.Status == ExpenseStatus.Settled || expenseRequest.Status == ExpenseStatus.UniversitySubmitted)
        {
            return BadRequest("すでに精算や大学提出が完了しているため、金額を変更できません。");
        }

        expenseRequest.TotalAmount = actualAmount;
        expenseRequest.IsAmountFinalized = true;
        
        // 明細が1件だけの場合は、その明細の金額も合わせる
        if (expenseRequest.ExpenseItems.Count == 1)
        {
            expenseRequest.ExpenseItems.First().UnitPrice = actualAmount;
        }

        expenseRequest.UpdatedAt = DateTime.UtcNow;

        if (currentUserId != Guid.Empty)
        {
            context.AuditLogs.Add(new AuditLog
            {
                TargetType = "ExpenseRequests",
                TargetId = expenseRequest.Id,
                UserId = currentUserId,
                Action = "UPDATE_AMOUNT",
                NewValue = $"実費金額が {actualAmount} に修正されました。"
            });
        }

        await context.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    /// <summary>
    /// 複数の経費申請の金種計算を行います。
    /// （個別の申請ごとに必要な金種を計算し、その結果を合算します）
    /// </summary>
    [HttpPost("calculate-denominations")]
    [RequirePermission(PermissionType.ExpenseSettle)]
    public async Task<ActionResult<DenominationResultDto>> CalculateDenominations([FromBody] List<Guid> expenseIds, CancellationToken cancellationToken = default)
    {
        var expenses = await context.ExpenseRequests
            .Where(e => expenseIds.Contains(e.Id))
            .ToListAsync(cancellationToken);

        if (!expenses.Any()) return NotFound("指定された申請が見つかりません。");

        var totalResult = new DenominationResultDto();

        foreach (var expense in expenses)
        {
            var result = CalculateDenominationForAmount(expense.TotalAmount);
            totalResult.Add(result);
        }

        return Ok(totalResult);
    }

    /// <summary>
    /// 特定の月（1ヶ月分）の経費申請すべてを対象に金種計算をまとめて行います。
    /// </summary>
    [HttpGet("denominations/monthly")]
    [RequirePermission(PermissionType.ExpenseSettle)]
    public async Task<ActionResult<DenominationResultDto>> GetMonthlyDenominations(int year, int month, CancellationToken cancellationToken = default)
    {
        // 指定された年月の月初と翌月初を取得
        var startDate = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
        var endDate = startDate.AddMonths(1);

        // 指定月に作成された申請のうち、有効なもの（下書き・却下以外）を取得します。
        // ※ 運用ロジック:
        // 「事前出金 (Advance)」は「承認済 (Approved)」が手渡し待ち
        // 「立替 (Reimbursement)」は「大学へ申請完了 (UniversitySubmitted)」の後に精算するルールと仮定します。
        // さらに、Createdではなくステータス更新日(UpdatedAt)で期間を絞り込みます。
        var expenses = await context.ExpenseRequests
            .Where(e => e.UpdatedAt >= startDate && e.UpdatedAt < endDate)
            .Where(e => (e.Type == ExpenseType.Advance && e.Status == ExpenseStatus.Approved) ||
                        (e.Type == ExpenseType.Reimbursement && e.Status == ExpenseStatus.UniversitySubmitted))
            .ToListAsync(cancellationToken);

        var totalResult = new DenominationResultDto();

        foreach (var expense in expenses)
        {
            var result = CalculateDenominationForAmount(expense.TotalAmount);
            totalResult.Add(result);
        }

        return Ok(totalResult);
    }

    /// <summary>
    /// 特定の経費申請1件の金種計算を行います。
    /// </summary>
    [HttpGet("{id}/denominations")]
    [RequirePermission(PermissionType.ExpenseSettle)]
    public async Task<ActionResult<DenominationResultDto>> GetDenominationForRequest(Guid id, CancellationToken cancellationToken = default)
    {
        var expense = await context.ExpenseRequests.FindAsync(new object[] { id }, cancellationToken);
        if (expense == null) return NotFound("指定された申請が見つかりません。");

        var result = CalculateDenominationForAmount(expense.TotalAmount);
        return Ok(result);
    }

    private DenominationResultDto CalculateDenominationForAmount(int amount)
    {
        var result = new DenominationResultDto { TotalAmount = amount };
        int remaining = amount;

        result.TenThousand = remaining / 10000; remaining %= 10000;
        result.FiveThousand = remaining / 5000; remaining %= 5000;
        result.OneThousand = remaining / 1000; remaining %= 1000;
        result.FiveHundred = remaining / 500; remaining %= 500;
        result.OneHundred = remaining / 100; remaining %= 100;
        result.Fifty = remaining / 50; remaining %= 50;
        result.Ten = remaining / 10; remaining %= 10;
        result.Five = remaining / 5; remaining %= 5;
        result.One = remaining;

        return result;
    }
}