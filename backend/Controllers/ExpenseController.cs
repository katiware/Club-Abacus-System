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
public class ExpenseController(AppDbContext context, Club_Abacus_System.Services.IDiscordIntegrationService discordService) : ControllerBase
{
    /// <summary>
    /// ダッシュボード用の集計データを取得します。
    /// </summary>
    [HttpGet("summary")]
    [Authorize] // 誰でも見れるが、権限によって内容を変えることも可能
    public async Task<ActionResult<ExpenseSummaryDto>> GetSummary([FromQuery] string viewMode = "me", [FromQuery] Guid? fiscalYearId = null, CancellationToken cancellationToken = default)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        _ = Guid.TryParse(userIdString, out var currentUserId);

        var isAdmin = User.HasClaim("Permission", PermissionType.ExpenseReadAll.ToString());

        if (!isAdmin)
        {
            viewMode = "me";
        }

        var query = context.ExpenseRequests.AsQueryable();
        if (viewMode == "me")
        {
            query = query.Where(e => e.UserId == currentUserId);
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        FiscalYear? currentFiscalYear = null;

        if (fiscalYearId.HasValue)
        {
            currentFiscalYear = await context.FiscalYears.FirstOrDefaultAsync(f => f.Id == fiscalYearId.Value, cancellationToken);
        }
        else
        {
            currentFiscalYear = await context.FiscalYears
                .FirstOrDefaultAsync(f => f.IsActive, cancellationToken);
        }

        // 年度指定がある場合、または完了・実績系の集計用にクエリを準備
        var fyScopedQuery = query;
        if (currentFiscalYear != null)
        {
            var startDateTime = currentFiscalYear.StartDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            var endDateTime = currentFiscalYear.EndDate.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);
            fyScopedQuery = query.Where(e => e.CreatedAt >= startDateTime && e.CreatedAt <= endDateTime);
        }

        // 承認待ち件数（現在アクションが必要な件数）
        var pendingCount = await (fiscalYearId.HasValue ? fyScopedQuery : query)
            .Where(e => e.Status == ExpenseStatus.PendingApproval)
            .CountAsync(cancellationToken);

        // 進行中・証憑提出待ち・確認待ち（Approved＝事前承認済も含める）
        var waitingConfirmationCount = await (fiscalYearId.HasValue ? fyScopedQuery : query)
            .Where(e => e.Status == ExpenseStatus.Approved || 
                        e.Status == ExpenseStatus.Advance_MoneyHandedOver || 
                        e.Status == ExpenseStatus.WaitingConfirmation ||
                        e.Status == ExpenseStatus.WaitingUniversitySubmission)
            .CountAsync(cancellationToken);

        // 精算完了件数（年度内の完了実績、年度指定がなければ当年度、それもなければ全完了）
        var settledCount = await fyScopedQuery
            .Where(e => e.Status == ExpenseStatus.Settled || e.Status == ExpenseStatus.UniversitySubmitted)
            .CountAsync(cancellationToken);

        // 下書き・差し戻し件数
        var draftCount = await query
            .Where(e => e.Status == ExpenseStatus.Draft || e.Status == ExpenseStatus.Remanded)
            .CountAsync(cancellationToken);

        var totalBudget = currentFiscalYear != null ? (decimal)currentFiscalYear.TotalBudget : 0m;
        decimal settledTotal = 0;
        decimal approvedTotal = 0;
        decimal pendingTotal = 0;
        decimal mySpentTotal = 0;
        decimal myPendingTotal = 0;
        decimal externalBudgetTotal = 0;
        decimal externalBudgetUsedTotal = 0;
        var categoryTotals = new Dictionary<string, decimal>();

        if (currentFiscalYear != null)
        {
            var fyStart = currentFiscalYear.StartDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            var fyEnd = currentFiscalYear.EndDate.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);

            // 当年度の全申請（部全体の部費残高および部費外予算を計算するため、常に年度全体で取得）
            var allFyRequests = await context.ExpenseRequests
                .Include(e => e.ExpenseItems)
                .Where(e => e.CreatedAt >= fyStart && e.CreatedAt <= fyEnd && e.Status != ExpenseStatus.Rejected)
                .ToListAsync(cancellationToken);

            // ① 部全体の確定済み部費支出（Settled / UniversitySubmitted）
            // 実質部費負担分 = TotalAmount - ExternalBudgetAmount
            settledTotal = allFyRequests
                .Where(e => e.Status == ExpenseStatus.Settled || e.Status == ExpenseStatus.UniversitySubmitted)
                .Sum(e => Math.Max(0, e.TotalAmount - e.ExternalBudgetAmount));

            // ② 部全体の事前承認済み部費枠（承認済・現金渡し済・領収書確認待ち・大学提出待ち）
            approvedTotal = allFyRequests
                .Where(e => e.Status == ExpenseStatus.Approved || 
                            e.Status == ExpenseStatus.Advance_MoneyHandedOver || 
                            e.Status == ExpenseStatus.WaitingConfirmation ||
                            e.Status == ExpenseStatus.WaitingUniversitySubmission)
                .Sum(e => Math.Max(0, e.TotalAmount - e.ExternalBudgetAmount));

            // ③ 部全体の承認待ち部費枠
            pendingTotal = allFyRequests
                .Where(e => e.Status == ExpenseStatus.PendingApproval)
                .Sum(e => Math.Max(0, e.TotalAmount - e.ExternalBudgetAmount));

            // ④ 部費外予算の集計
            externalBudgetTotal = await context.ExternalBudgets
                .Where(b => b.FiscalYearId == currentFiscalYear.Id)
                .SumAsync(b => b.TotalAmount, cancellationToken);

            externalBudgetUsedTotal = allFyRequests
                .Where(e => e.Status != ExpenseStatus.Draft && e.Status != ExpenseStatus.Remanded)
                .Sum(e => e.ExternalBudgetAmount);

            // ⑤ ログインユーザー自身の個人利用実績（自分モード時に表示: 部費実質負担額ベース）
            if (currentUserId != Guid.Empty)
            {
                var myRequests = allFyRequests.Where(e => e.UserId == currentUserId);
                mySpentTotal = myRequests
                    .Where(e => e.Status == ExpenseStatus.Settled || e.Status == ExpenseStatus.UniversitySubmitted)
                    .Sum(e => Math.Max(0, e.TotalAmount - e.ExternalBudgetAmount));
                myPendingTotal = myRequests
                    .Where(e => e.Status == ExpenseStatus.PendingApproval ||
                                e.Status == ExpenseStatus.Approved ||
                                e.Status == ExpenseStatus.Advance_MoneyHandedOver ||
                                e.Status == ExpenseStatus.WaitingConfirmation ||
                                e.Status == ExpenseStatus.WaitingUniversitySubmission)
                    .Sum(e => Math.Max(0, e.TotalAmount - e.ExternalBudgetAmount));
            }

            // カテゴリ別集計（部費実質負担額ベースで按分）
            var categoryRequests = (viewMode == "me" && currentUserId != Guid.Empty)
                ? allFyRequests.Where(e => e.UserId == currentUserId && e.Status != ExpenseStatus.Draft && e.Status != ExpenseStatus.Remanded)
                : allFyRequests.Where(e => e.Status != ExpenseStatus.Draft && e.Status != ExpenseStatus.Remanded);

            foreach (var req in categoryRequests)
            {
                var reqClubBudget = Math.Max(0, req.TotalAmount - req.ExternalBudgetAmount);
                if (reqClubBudget == 0) continue; // 全額部費外予算の場合は部費カテゴリ集計から除外

                decimal ratio = req.TotalAmount > 0 ? (decimal)reqClubBudget / req.TotalAmount : 1m;

                foreach (var item in req.ExpenseItems)
                {
                    var cat = string.IsNullOrWhiteSpace(item.Category) ? "その他" : item.Category;
                    if (!categoryTotals.ContainsKey(cat))
                    {
                        categoryTotals[cat] = 0;
                    }
                    categoryTotals[cat] += Math.Round((item.UnitPrice * item.Quantity) * ratio);
                }
            }
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
                    break;
                }
            }

            futureRecurringTotal += template.Amount * occurrences;
        }

        var budgetBalance = totalBudget - (settledTotal + futureRecurringTotal);
        var effectiveBalance = totalBudget - (settledTotal + approvedTotal + futureRecurringTotal);
        var isBudgetOver = totalBudget > 0 && (settledTotal + approvedTotal + futureRecurringTotal) > totalBudget;
        var isPendingOver = totalBudget > 0 && (settledTotal + approvedTotal + pendingTotal + futureRecurringTotal) > totalBudget;

        // 期限切れ・要確認カウント（事前出金で現金手渡し済みだが、領収書未提出で30日以上経過したものなど）
        var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);
        var overdueCount = await query
            .Where(e => e.Type == ExpenseType.Advance && 
                        e.Status == ExpenseStatus.Advance_MoneyHandedOver && 
                        e.UpdatedAt <= thirtyDaysAgo)
            .CountAsync(cancellationToken);

        int unfinalizedCount = 0;
        if (currentUserId != Guid.Empty)
        {
            unfinalizedCount = await context.ExpenseRequests
                .Where(e => e.UserId == currentUserId && e.IsAmountVariable && !e.IsAmountFinalized 
                            && e.Status != ExpenseStatus.Rejected && e.Status != ExpenseStatus.Settled)
                .CountAsync(cancellationToken);
        }

        var totalRequestsCount = await query.CountAsync(cancellationToken);

        return Ok(new ExpenseSummaryDto
        {
            PendingCount = pendingCount,
            WaitingConfirmationCount = waitingConfirmationCount,
            SettledCount = settledCount,
            DraftCount = draftCount,
            OverdueCount = overdueCount,
            BudgetBalance = budgetBalance,
            EffectiveBalance = effectiveBalance,
            IsBudgetOver = isBudgetOver,
            IsPendingOver = isPendingOver,
            UnfinalizedCount = unfinalizedCount,
            YearName = currentFiscalYear?.YearName,
            TotalBudget = totalBudget,
            SettledTotal = settledTotal,
            ApprovedTotal = approvedTotal,
            PendingTotal = pendingTotal,
            FutureRecurringTotal = futureRecurringTotal,
            TotalRequestsCount = totalRequestsCount,
            ExternalBudgetTotal = externalBudgetTotal,
            ExternalBudgetUsedTotal = externalBudgetUsedTotal,
            MySpentTotal = mySpentTotal,
            MyPendingTotal = myPendingTotal,
            CategoryTotals = categoryTotals
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

        var activeFiscalYear = await context.FiscalYears
            .FirstOrDefaultAsync(f => f.IsActive, cancellationToken);

        if (activeFiscalYear == null)
        {
            return BadRequest("現在進行中の年度が存在しないか、締め処理されています。経費申請は行えません。");
        }

        if (activeFiscalYear.IsApplicationsStopped)
        {
            return BadRequest("現在、この年度の新規申請は停止されています。");
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
            Title = dto.Title,
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
                Description = itemDto.Description,
                PurchaseUrl = itemDto.PurchaseUrl,
                IsProductUndecided = itemDto.IsProductUndecided
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
            .Include(e => e.ExternalBudget)
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
                return StatusCode(403, "他人の申請を閲覧する権限がありません。");
            }
        }

        return Ok(expenseRequest);
    }

    /// <summary>
    /// 全ての経費申請一覧を取得します（管理者用）。
    /// </summary>
    [HttpGet("all")]
    [RequirePermission(PermissionType.ExpenseReadAll)]
    public async Task<ActionResult<List<ExpenseRequest>>> GetAllExpenseRequests([FromQuery] Guid? fiscalYearId = null, CancellationToken cancellationToken = default)
    {
        var query = context.ExpenseRequests
            .AsNoTracking()
            .Include(e => e.User)
            .Include(e => e.ExpenseItems)
            .Include(e => e.ExternalBudget)
            .AsQueryable();

        if (fiscalYearId.HasValue)
        {
            var fy = await context.FiscalYears.FindAsync(new object[] { fiscalYearId.Value }, cancellationToken);
            if (fy != null)
            {
                query = query.Where(e => e.CreatedAt >= fy.StartDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc) && 
                                         e.CreatedAt <= fy.EndDate.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc));
            }
        }

        var requests = await query
            .OrderByDescending(e => e.CreatedAt)
            .ToListAsync(cancellationToken);

        return Ok(requests);
    }

    /// <summary>
    /// ログイン中ユーザー自身の経費申請一覧を取得します。
    /// </summary>
    [HttpGet("me")]
    [RequirePermission(PermissionType.ExpenseManageOwn)]
    public async Task<ActionResult<List<ExpenseRequest>>> GetMyExpenseRequests([FromQuery] Guid? fiscalYearId = null, CancellationToken cancellationToken = default)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var currentUserId))
        {
            return Unauthorized("ユーザー情報が取得できません。");
        }

        var query = context.ExpenseRequests
            .AsNoTracking()
            .Include(e => e.ExpenseItems)
            .Include(e => e.ExternalBudget)
            .Where(e => e.UserId == currentUserId)
            .AsQueryable();

        if (fiscalYearId.HasValue)
        {
            var fy = await context.FiscalYears.FindAsync(new object[] { fiscalYearId.Value }, cancellationToken);
            if (fy != null)
            {
                query = query.Where(e => e.CreatedAt >= fy.StartDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc) && 
                                         e.CreatedAt <= fy.EndDate.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc));
            }
        }

        var requests = await query
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

        var expenseRequest = await context.ExpenseRequests
            .Include(e => e.ExpenseItems)
            .FirstOrDefaultAsync(e => e.Id == id, cancellationToken);

        if (expenseRequest == null)
        {
            return NotFound("指定された申請が見つかりません。");
        }

        // 🚨 セキュリティ対策: 偽造可能なuserId変数ではなく、本人のID(currentUserId)と比較する
        if (expenseRequest.UserId != currentUserId)
        {
            return StatusCode(403, "他人の申請を操作することはできません。");
        }

        // 下書き、または差し戻し状態の場合のみ提出可能
        if (expenseRequest.Status != ExpenseStatus.Draft && expenseRequest.Status != ExpenseStatus.Remanded)
        {
            return BadRequest("この申請はすでに提出されているか、処理が進んでいます。");
        }

        // ステータスを「承認待ち」に進める
        expenseRequest.Status = ExpenseStatus.PendingApproval;
        expenseRequest.UpdatedAt = DateTime.UtcNow;
        expenseRequest.IsEditedAfterApproval = false;
        expenseRequest.EditReason = null;

        context.AuditLogs.Add(new AuditLog
        {
            TargetType = "ExpenseRequests",
            TargetId = expenseRequest.Id,
            UserId = currentUserId,
            Action = "STATUS_CHANGE_SUBMIT"
        });

        await context.SaveChangesAsync(cancellationToken);

        // 商品未定フラグが立っている明細がある場合、Discordに通知する（提出タイミング）
        if (expenseRequest.ExpenseItems.Any(i => i.IsProductUndecided))
        {
            await discordService.CreatePurchaseDiscussionThreadAsync(expenseRequest);
        }

        return Ok();
    }

    /// <summary>
    /// 経費申請を差し戻します。
    /// </summary>
    [HttpPost("{id}/remand")]
    [RequirePermission(PermissionType.ExpenseApprove)] // 承認権限を持つユーザーが差し戻し可能
    public async Task<IActionResult> RemandExpenseRequest(Guid id, [FromBody] RemandRequestDto dto, CancellationToken cancellationToken = default)
    {
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

        if (expenseRequest.Status != ExpenseStatus.PendingApproval && 
            expenseRequest.Status != ExpenseStatus.WaitingConfirmation &&
            expenseRequest.Status != ExpenseStatus.WaitingUniversitySubmission)
        {
            return BadRequest("この申請は差し戻しできるステータスではありません。");
        }

        expenseRequest.Status = ExpenseStatus.Remanded;
        expenseRequest.RejectionReason = dto.Reason;
        expenseRequest.UpdatedAt = DateTime.UtcNow;
        expenseRequest.IsEditedAfterApproval = false;

        context.AuditLogs.Add(new AuditLog
        {
            TargetType = "ExpenseRequests",
            TargetId = expenseRequest.Id,
            UserId = currentUserId,
            Action = "STATUS_CHANGE_REMAND"
        });

        await context.SaveChangesAsync(cancellationToken);
        return Ok();
    }

    /// <summary>
    /// 申請内容（金額や品目など）を編集します。（下書き・差し戻し中のみ可能）
    /// </summary>
    [HttpPut("{id}")]
    [RequirePermission(PermissionType.ExpenseManageOwn)]
    public async Task<IActionResult> EditExpenseRequest(Guid id, [FromBody] ExpenseUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var currentUserId))
        {
            return Unauthorized();
        }

        var expenseRequest = await context.ExpenseRequests
            .Include(e => e.ExpenseItems)
            .FirstOrDefaultAsync(e => e.Id == id, cancellationToken);

        if (expenseRequest == null) return NotFound();

        if (expenseRequest.UserId != currentUserId)
        {
            return StatusCode(403, "他人の申請を操作することはできません。");
        }

        if (expenseRequest.Status != ExpenseStatus.Draft && 
            expenseRequest.Status != ExpenseStatus.Remanded &&
            expenseRequest.Status != ExpenseStatus.PendingApproval &&
            expenseRequest.Status != ExpenseStatus.Approved)
        {
            return BadRequest("承認プロセスが進行中のため、編集できません。");
        }

        if ((expenseRequest.Status == ExpenseStatus.PendingApproval || expenseRequest.Status == ExpenseStatus.Approved) && string.IsNullOrWhiteSpace(dto.EditReason))
        {
            return BadRequest("提出済みの申請を編集する場合は、変更理由（EditReason）を入力してください。");
        }

        // 申請ヘッダの更新
        expenseRequest.Title = dto.Title;
        expenseRequest.Type = dto.Type;
        expenseRequest.ReceiptType = dto.ReceiptType;
        expenseRequest.TotalAmount = dto.ExpenseItems.Sum(x => x.UnitPrice * x.Quantity);
        if (expenseRequest.ExternalBudgetAmount > expenseRequest.TotalAmount)
        {
            expenseRequest.ExternalBudgetAmount = expenseRequest.TotalAmount;
        }
        expenseRequest.UpdatedAt = DateTime.UtcNow;

        // 明細の更新（既存を全削除して新規追加するシンプルアプローチ）
        context.ExpenseItems.RemoveRange(expenseRequest.ExpenseItems);
        var newItems = dto.ExpenseItems.Select(item => new ExpenseItem
        {
            Id = Guid.NewGuid(),
            RequestId = id,
            ItemName = item.ItemName,
            UnitPrice = item.UnitPrice,
            Quantity = item.Quantity,
            Payee = item.Payee,
            Category = item.Category,
            Description = item.Description,
            PurchaseUrl = item.PurchaseUrl,
            IsProductUndecided = item.IsProductUndecided
        }).ToList();
        
        context.ExpenseItems.AddRange(newItems);

        context.AuditLogs.Add(new AuditLog
        {
            TargetType = "ExpenseRequests",
            TargetId = expenseRequest.Id,
            UserId = currentUserId,
            Action = "EDIT_CONTENT"
        });

        if (expenseRequest.Status == ExpenseStatus.PendingApproval || 
            expenseRequest.Status == ExpenseStatus.Approved)
        {
            expenseRequest.Status = ExpenseStatus.PendingApproval;
            expenseRequest.ApprovedById = null;
            expenseRequest.ApprovedAt = null;
            expenseRequest.IsEditedAfterApproval = true;
            expenseRequest.EditReason = dto.EditReason;

            await discordService.NotifyExpenseReApprovalRequiredAsync(expenseRequest);
            
            context.AuditLogs.Add(new AuditLog
            {
                TargetType = "ExpenseRequests",
                TargetId = expenseRequest.Id,
                UserId = currentUserId,
                Action = "REVERT_TO_PENDING_DUE_TO_EDIT",
                NewValue = $"内容が編集されたため、再度承認待ちに戻りました。理由: {dto.EditReason}"
            });
        }

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

        // 🚨 ガバナンス・セキュリティ対策: 自分の申請は自分では承認・却下できない（主将会計であっても自己承認は禁止）
        if (expenseRequest.UserId == currentUserId)
        {
            return StatusCode(StatusCodes.Status403Forbidden, "自分自身の申請を自分で承認・却下することはできません。不正防止のため、他の役員またはシステム管理者による承認が必要です。");
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
        expenseRequest.IsEditedAfterApproval = false;

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

            // 部費外予算の充当処理（主将会計以上）
            if (dto.ExternalBudgetAmount.HasValue)
            {
                if (dto.ExternalBudgetAmount.Value < 0 || dto.ExternalBudgetAmount.Value > expenseRequest.TotalAmount)
                {
                    return BadRequest("部費外充当金額は0円以上、申請総額以下である必要があります。");
                }

                if (dto.ExternalBudgetId.HasValue && dto.ExternalBudgetAmount.Value > 0)
                {
                    var budget = await context.ExternalBudgets.FindAsync(new object[] { dto.ExternalBudgetId.Value }, cancellationToken);
                    if (budget == null)
                    {
                        return BadRequest("指定された部費外予算が存在しません。");
                    }
                    var assetType = dto.ExternalBudgetAssetType ?? ExternalBudgetAssetType.Cash;
                    var otherUsed = await context.ExpenseRequests
                        .Where(r => r.ExternalBudgetId == budget.Id && r.Id != expenseRequest.Id &&
                                    r.Status != ExpenseStatus.Draft && r.Status != ExpenseStatus.Rejected && r.Status != ExpenseStatus.Remanded)
                        .Where(r => (!r.ExternalBudgetAssetType.HasValue && assetType == ExternalBudgetAssetType.Cash) || r.ExternalBudgetAssetType == assetType)
                        .SumAsync(r => r.ExternalBudgetAmount, cancellationToken);

                    int maxAvailable = assetType switch
                    {
                        ExternalBudgetAssetType.Cash => budget.CashAmount - otherUsed,
                        ExternalBudgetAssetType.AmazonGift => budget.AmazonGiftAmount - otherUsed,
                        ExternalBudgetAssetType.Other => budget.OtherAmount - otherUsed,
                        _ => 0
                    };

                    if (dto.ExternalBudgetAmount.Value > maxAvailable)
                    {
                        var typeName = assetType switch { ExternalBudgetAssetType.Cash => "現金", ExternalBudgetAssetType.AmazonGift => "Amazonギフトカード", _ => "その他" };
                        return BadRequest($"部費外予算「{budget.Name}」の{typeName}残高（¥{Math.Max(0, maxAvailable):N0}）を超過しています。");
                    }

                    expenseRequest.ExternalBudgetAssetType = assetType;
                }
                else
                {
                    expenseRequest.ExternalBudgetAssetType = null;
                }

                expenseRequest.ExternalBudgetAmount = dto.ExternalBudgetAmount.Value;
                expenseRequest.ExternalBudgetId = dto.ExternalBudgetId;
            }
        }

        context.AuditLogs.Add(new AuditLog
        {
            TargetType = "ExpenseRequests",
            TargetId = expenseRequest.Id,
            UserId = currentUserId,
            Action = $"STATUS_CHANGE_{dto.Status.ToString().ToUpper()}",
            NewValue = $"Status={dto.Status}, ExternalBudgetAmount={expenseRequest.ExternalBudgetAmount}, AssetType={expenseRequest.ExternalBudgetAssetType}"
        });

        await context.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    /// <summary>
    /// 提出された領収書の確認・大学申請・精算、または大学不認可による却下・差し戻しなど、事後処理のステータスを変更します。
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
            return StatusCode(StatusCodes.Status403Forbidden, "自分の申請に対する事後処理（確認・精算等）を自分で行うことはできません。");
        }

        // 必要な権限のチェック（確認・精算・大学提出権限）
        if (!User.HasClaim("Permission", PermissionType.ExpenseConfirmReceipt.ToString()) &&
            !User.HasClaim("Permission", PermissionType.ExpenseSettle.ToString()) &&
            !User.HasClaim("Permission", PermissionType.ExpenseSubmitToUniversity.ToString()) &&
            !User.HasClaim("Permission", PermissionType.ExpenseApprove.ToString()))
        {
            return StatusCode(StatusCodes.Status403Forbidden, "領収書の確認・精算・却下などの操作を行う権限がありません。");
        }

        // 承認前・下書きの場合は操作不可
        if (expenseRequest.Status == ExpenseStatus.Draft ||
            expenseRequest.Status == ExpenseStatus.PendingApproval)
        {
            return BadRequest("事前承認が完了していないため、このステータスへは進めません。");
        }

        // 事前出金または金額変動がある場合、まだユーザーが実費確定していない場合は進めない（却下・差し戻し時を除く）
        bool requiresAmountFinalization = expenseRequest.IsAmountVariable || expenseRequest.Type == ExpenseType.Advance;
        if (requiresAmountFinalization && !expenseRequest.IsAmountFinalized && 
            dto.Status != ExpenseStatus.Rejected && dto.Status != ExpenseStatus.Remanded &&
            (dto.Status == ExpenseStatus.WaitingConfirmation || 
             dto.Status == ExpenseStatus.WaitingUniversitySubmission || 
             dto.Status == ExpenseStatus.Settled || 
             dto.Status == ExpenseStatus.UniversitySubmitted))
        {
            return BadRequest("事前出金または金額変動が設定されている申請ですが、まだ実費金額が確定されていません。ユーザーに金額を入力・確定してもらってください。");
        }

        // --- ステータス別の詳細バリデーション ---
        if (dto.Status == ExpenseStatus.Advance_MoneyHandedOver)
        {
            // ① 事前出金の現金手渡し処理
            if (expenseRequest.Type != ExpenseType.Advance)
            {
                return BadRequest("このステータス（事前出金渡し済）は、事前出金の申請に対してのみ使用できます。");
            }
        }
        else if (dto.Status == ExpenseStatus.WaitingConfirmation ||
                 dto.Status == ExpenseStatus.WaitingUniversitySubmission ||
                 dto.Status == ExpenseStatus.UniversitySubmitted ||
                 dto.Status == ExpenseStatus.Settled)
        {
            // ② 領収書の確認や精算完了の処理（立替・事前出金 共通）
            if (expenseRequest.ReceiptType != ReceiptType.Paper && 
                (expenseRequest.ExpenseDocuments == null || expenseRequest.ExpenseDocuments.Count == 0))
            {
                return BadRequest("証憑（領収書等）がアップロードされていないため、このステータスへは進めません。");
            }

            // 部費外予算の振替・調整（大学不認可による部費外救済や金額確定時の再割当）
            if (dto.ExternalBudgetAmount.HasValue)
            {
                if (dto.ExternalBudgetAmount.Value < 0 || dto.ExternalBudgetAmount.Value > expenseRequest.TotalAmount)
                {
                    return BadRequest("部費外充当金額は0円以上、申請総額以下である必要があります。");
                }

                if (dto.ExternalBudgetId.HasValue && dto.ExternalBudgetAmount.Value > 0)
                {
                    var budget = await context.ExternalBudgets.FindAsync(new object[] { dto.ExternalBudgetId.Value }, cancellationToken);
                    if (budget == null)
                    {
                        return BadRequest("指定された部費外予算が存在しません。");
                    }
                    var assetType = dto.ExternalBudgetAssetType ?? ExternalBudgetAssetType.Cash;
                    var otherUsed = await context.ExpenseRequests
                        .Where(r => r.ExternalBudgetId == budget.Id && r.Id != expenseRequest.Id &&
                                    r.Status != ExpenseStatus.Draft && r.Status != ExpenseStatus.Rejected && r.Status != ExpenseStatus.Remanded)
                        .Where(r => (!r.ExternalBudgetAssetType.HasValue && assetType == ExternalBudgetAssetType.Cash) || r.ExternalBudgetAssetType == assetType)
                        .SumAsync(r => r.ExternalBudgetAmount, cancellationToken);

                    int maxAvailable = assetType switch
                    {
                        ExternalBudgetAssetType.Cash => budget.CashAmount - otherUsed,
                        ExternalBudgetAssetType.AmazonGift => budget.AmazonGiftAmount - otherUsed,
                        ExternalBudgetAssetType.Other => budget.OtherAmount - otherUsed,
                        _ => 0
                    };

                    if (dto.ExternalBudgetAmount.Value > maxAvailable)
                    {
                        var typeName = assetType switch { ExternalBudgetAssetType.Cash => "現金", ExternalBudgetAssetType.AmazonGift => "Amazonギフトカード", _ => "その他" };
                        return BadRequest($"部費外予算「{budget.Name}」の{typeName}残高（¥{Math.Max(0, maxAvailable):N0}）を超過しています。");
                    }

                    expenseRequest.ExternalBudgetAssetType = assetType;
                }
                else
                {
                    expenseRequest.ExternalBudgetAssetType = null;
                }

                expenseRequest.ExternalBudgetAmount = dto.ExternalBudgetAmount.Value;
                expenseRequest.ExternalBudgetId = dto.ExternalBudgetId;
            }
        }
        else if (dto.Status == ExpenseStatus.Rejected)
        {
            // ③ 大学等による却下（申請不承認）
            expenseRequest.RejectionReason = dto.RejectionReason ?? "大学の確認・申請において却下されました。";
        }
        else if (dto.Status == ExpenseStatus.Remanded)
        {
            // ④ 大学等による書類不備の差し戻し
            expenseRequest.RejectionReason = dto.RejectionReason ?? "大学提出時の書類不備等により差し戻されました。内容を修正して再提出してください。";
            expenseRequest.IsEditedAfterApproval = false;
        }
        else
        {
            return BadRequest("このAPIでは指定できないステータスです。");
        }

        expenseRequest.Status = dto.Status;

        if (currentUserId != Guid.Empty)
        {
            context.AuditLogs.Add(new AuditLog
            {
                TargetType = "ExpenseRequests",
                TargetId = expenseRequest.Id,
                UserId = currentUserId,
                Action = $"STATUS_CHANGE_{dto.Status.ToString().ToUpper()}",
                NewValue = $"Status={dto.Status}, Reason={expenseRequest.RejectionReason}, ExternalBudgetAmount={expenseRequest.ExternalBudgetAmount}"
            });
        }

        await context.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    /// <summary>
    /// 定期払いなどで為替変動がある申請（IsAmountVariable=true）、または事前出金の実費金額を確定・修正します。
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
                return StatusCode(403, "他人の申請の金額を変更することはできません。");
            }
        }

        if (!expenseRequest.IsAmountVariable && expenseRequest.Type != ExpenseType.Advance)
        {
            return BadRequest("この申請は金額変更が許可されていません。");
        }

        // 精算済みなど完了済みのものは変更不可とする
        if (expenseRequest.Status == ExpenseStatus.Settled || expenseRequest.Status == ExpenseStatus.UniversitySubmitted)
        {
            return BadRequest("すでに精算や大学提出が完了しているため、金額を変更できません。");
        }

        if (expenseRequest.TotalAmount != actualAmount)
        {
            if (expenseRequest.Type == ExpenseType.Advance || expenseRequest.IsAmountVariable)
            {
                var note = $"\n\n[システム追記] 実費確定により、元の金額(¥{expenseRequest.TotalAmount})から¥{actualAmount}に変更されました。";
                if (expenseRequest.ExpenseItems.Any())
                {
                    expenseRequest.ExpenseItems.First().Description += note;
                }
            }
        }

        expenseRequest.TotalAmount = actualAmount;
        if (expenseRequest.ExternalBudgetAmount > expenseRequest.TotalAmount)
        {
            expenseRequest.ExternalBudgetAmount = expenseRequest.TotalAmount;
        }
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

    /// <summary>
    /// 選択した複数の経費申請に紐づく証憑ファイルをまとめてZIPダウンロードします。
    /// </summary>
    [HttpPost("export-zip")]
    [Authorize]
    public async Task<IActionResult> ExportMultipleDocumentsZip(
        [FromBody] List<Guid> requestIds, 
        [FromServices] Club_Abacus_System.Services.IDocumentExportService exportService)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        _ = Guid.TryParse(userIdString, out var currentUserId);

        var hasAdminAccess = User.HasClaim("Permission", PermissionType.ExpenseReadAll.ToString()) ||
                             User.IsInRole("ADMIN") || User.IsInRole("MANAGER");

        try
        {
            var zipStream = await exportService.ExportMultipleDocumentsToZipAsync(requestIds, currentUserId, hasAdminAccess);
            var fileName = $"ClubAbacus_証憑まとめ_{DateTime.Now:yyyyMMdd_HHmmss}.zip";
            return File(zipStream, "application/zip", fileName);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }
}