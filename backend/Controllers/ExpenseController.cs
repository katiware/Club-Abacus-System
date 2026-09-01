using Club_Abacus_System.Data;
using Club_Abacus_System.DTOs;
using Club_Abacus_System.Models;
using System.Security.Claims;
using Club_Abacus_System.Security;
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

        // 合計金額の計算
        var totalAmount = dto.ExpenseItems.Sum(item => item.UnitPrice * item.Quantity);

        var expenseRequest = new ExpenseRequest
        {
            UserId = currentUserId,
            Type = dto.Type,
            ReceiptType = dto.ReceiptType,
            Status = ExpenseStatus.Draft, // 初期ステータス（下書き）
            TotalAmount = totalAmount,
            ExpenseItems = dto.ExpenseItems.Select(itemDto => new ExpenseItem
            {
                ItemName = itemDto.ItemName,
                UnitPrice = itemDto.UnitPrice,
                Quantity = itemDto.Quantity,
                Payee = itemDto.Payee,
                Category = itemDto.Category,
                Description = itemDto.Description
            }).ToList()
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

        await context.SaveChangesAsync();
        return Ok();
    }
}
