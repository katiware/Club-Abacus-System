using Club_Abacus_System.Data;
using Club_Abacus_System.DTOs;
using Club_Abacus_System.Models;
using System.Security.Claims;
using Club_Abacus_System.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Club_Abacus_System.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ExpenseController(AppDbContext context) : ControllerBase
{
    /// <summary>
    /// 新規の経費申請（明細含む）を作成します。
    /// </summary>
    [HttpPost]
    [RequirePermission(PermissionType.ExpenseManageOwn)]
    public async Task<ActionResult<ExpenseRequest>> CreateExpenseRequest([FromBody] ExpenseRequestCreateDto dto)
    {
        // 🚨 セキュリティ対策: クライアントからの入力は無視し、トークンから自身のIDを取得する
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var currentUserId))
        {
            return Unauthorized("ユーザー情報が取得できません。");
        }

        // ユーザーが存在するか確認
        var userExists = await context.Users.AnyAsync(u => u.Id == currentUserId);
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
        await context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetExpenseRequestById), new { id = expenseRequest.Id }, expenseRequest);
    }

    /// <summary>
    /// 特定の経費申請をIDで取得します（明細と証憑情報を含みます）。
    /// </summary>
    [HttpGet("{id}")]
    [RequirePermission(PermissionType.ExpenseManageOwn)]
    public async Task<ActionResult<ExpenseRequest>> GetExpenseRequestById(Guid id)
    {
        var expenseRequest = await context.ExpenseRequests
            .AsNoTracking()
            .Include(e => e.ExpenseItems)
            .Include(e => e.ExpenseDocuments)
            .FirstOrDefaultAsync(e => e.Id == id);
            
        if (expenseRequest == null)
        {
            return NotFound("指定された申請が見つかりません。");
        }
        
        return Ok(expenseRequest);
    }

    /// <summary>
    /// 特定ユーザーの経費申請一覧を取得します。
    /// </summary>
    [HttpGet("user/{userId}")]
    [RequirePermission(PermissionType.ExpenseManageOwn)]
    public async Task<ActionResult<List<ExpenseRequest>>> GetUserExpenseRequests(Guid userId)
    {
        // 🚨 セキュリティ対策: 他人の申請一覧の覗き見を防止
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var currentUserId) || userId != currentUserId)
        {
            return Forbid("他人の経費申請一覧にはアクセスできません。");
        }

        var requests = await context.ExpenseRequests
            .AsNoTracking()
            .Where(e => e.UserId == userId)
            .OrderByDescending(e => e.CreatedAt)
            .ToListAsync();
            
        return Ok(requests);
    }

    /// <summary>
    /// 経費申請を承認待ちとして提出します（ステータス変更）。
    /// </summary>
    [HttpPost("{id}/submit")]
    [RequirePermission(PermissionType.ExpenseManageOwn)]
    public async Task<IActionResult> SubmitExpenseRequest(Guid id)
    {
        // 🚨 セキュリティ対策: トークンから本人のIDを取得
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var currentUserId))
        {
            return Unauthorized("ユーザー情報が取得できません。");
        }

        var expenseRequest = await context.ExpenseRequests.FindAsync(id);

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

        await context.SaveChangesAsync();
        return Ok();
    }

    /// <summary>
    /// 経費申請のステータスを変更（承認・却下など）します。
    /// </summary>
    [HttpPut("{id}/status")]
    [Authorize]
    public async Task<IActionResult> UpdateExpenseStatus(Guid id, [FromBody] ExpenseStatusUpdateDto dto)
    {
        var expenseRequest = await context.ExpenseRequests
            .Include(e => e.ExpenseDocuments)
            .FirstOrDefaultAsync(e => e.Id == id);
            
        if (expenseRequest == null)
        {
            return NotFound("指定された申請が見つかりません。");
        }

        // 状態遷移の検証と必要な権限のチェック
        switch (dto.Status)
        {
            case ExpenseStatus.Approved:
            case ExpenseStatus.Rejected:
                if (!User.HasClaim("Permission", PermissionType.ExpenseApprove.ToString()))
                    return Forbid("申請を承認・却下する権限がありません。");
                    
                if (expenseRequest.Status != ExpenseStatus.PendingApproval)
                    return BadRequest("「承認待ち」の状態からのみ承認・却下が可能です。");
                break;
                
            case ExpenseStatus.WaitingConfirmation:
            case ExpenseStatus.UniversitySubmitted:
            case ExpenseStatus.Settled:
                if (!User.HasClaim("Permission", PermissionType.ExpenseConfirmReceipt.ToString()) &&
                    !User.HasClaim("Permission", PermissionType.ExpenseSettle.ToString()))
                    return Forbid("領収書の確認・精算を行う権限がありません。");
                
                if (expenseRequest.Status == ExpenseStatus.Draft || expenseRequest.Status == ExpenseStatus.PendingApproval || expenseRequest.Status == ExpenseStatus.Rejected)
                    return BadRequest("事前承認が完了していないため、このステータスへは進めません。");

                if (expenseRequest.ExpenseDocuments == null || expenseRequest.ExpenseDocuments.Count == 0)
                    return BadRequest("証憑（領収書等）がアップロードされていないため、このステータスへは進めません。");
                break;

            default:
                return BadRequest("無効または許可されていないステータス変更です。");
        }

        expenseRequest.Status = dto.Status;
        
        // 却下時の処理
        if (dto.Status == ExpenseStatus.Rejected)
        {
            expenseRequest.RejectionReason = dto.RejectionReason;
            // 承認履歴をクリア
            expenseRequest.ApprovedById = null;
            expenseRequest.ApprovedAt = null;
        }
        else
        {
            expenseRequest.RejectionReason = null; // 他のステータスの場合はクリア
        }

        // 承認された場合、承認者と日時を記録
        if (dto.Status == ExpenseStatus.Approved)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (Guid.TryParse(userIdString, out var currentUserId))
            {
                expenseRequest.ApprovedById = currentUserId;
                expenseRequest.ApprovedAt = DateTime.UtcNow;
            }
        }

        expenseRequest.UpdatedAt = DateTime.UtcNow;

        await context.SaveChangesAsync();
        return NoContent();
    }
}