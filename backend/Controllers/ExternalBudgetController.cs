using System.Security.Claims;
using Club_Abacus_System.Data;
using Club_Abacus_System.DTOs.ExternalBudgets;
using Club_Abacus_System.Models;
using Club_Abacus_System.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Club_Abacus_System.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ExternalBudgetController(AppDbContext context) : ControllerBase
{
    /// <summary>
    /// 指定された年度（または現在進行中年度）の部費外予算一覧を取得します。
    /// 各部費外予算の消化額（承認済＋精算済の申請額）も計算して返します。
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<ExternalBudgetDto>>> GetExternalBudgets([FromQuery] Guid? fiscalYearId = null, CancellationToken cancellationToken = default)
    {
        // 部費外予算は主将会計・管理者のみ閲覧可能（一般部員には非公開）
        var hasPermission = User.HasClaim("Permission", PermissionType.ExpenseReadAll.ToString()) ||
                            User.HasClaim("Permission", PermissionType.ManageMasterData.ToString());
        if (!hasPermission)
        {
            return Ok(new List<ExternalBudgetDto>());
        }

        Guid targetFyId;
        if (fiscalYearId.HasValue)
        {
            targetFyId = fiscalYearId.Value;
        }
        else
        {
            var activeFy = await context.FiscalYears.FirstOrDefaultAsync(f => f.IsActive, cancellationToken);
            if (activeFy == null)
            {
                return Ok(new List<ExternalBudgetDto>());
            }
            targetFyId = activeFy.Id;
        }

        var externalBudgets = await context.ExternalBudgets
            .AsNoTracking()
            .Where(b => b.FiscalYearId == targetFyId)
            .OrderBy(b => b.CreatedAt)
            .ToListAsync(cancellationToken);

        // 各部費外予算枠から支出された金額を形態別に集計
        // 対象ステータス: 却下(Rejected)と下書き(Draft)と差し戻し(Remanded)以外の有効な申請
        var validRequests = await context.ExpenseRequests
            .AsNoTracking()
            .Where(r => r.ExternalBudgetId.HasValue && 
                        r.Status != ExpenseStatus.Draft && 
                        r.Status != ExpenseStatus.Rejected && 
                        r.Status != ExpenseStatus.Remanded)
            .ToListAsync(cancellationToken);

        var result = externalBudgets.Select(b =>
        {
            var reqs = validRequests.Where(r => r.ExternalBudgetId == b.Id).ToList();
            var usedTotal = reqs.Sum(r => r.ExternalBudgetAmount);
            var usedCash = reqs.Where(r => !r.ExternalBudgetAssetType.HasValue || r.ExternalBudgetAssetType == ExternalBudgetAssetType.Cash).Sum(r => r.ExternalBudgetAmount);
            var usedAmazon = reqs.Where(r => r.ExternalBudgetAssetType == ExternalBudgetAssetType.AmazonGift).Sum(r => r.ExternalBudgetAmount);
            var usedOther = reqs.Where(r => r.ExternalBudgetAssetType == ExternalBudgetAssetType.Other).Sum(r => r.ExternalBudgetAmount);

            return new ExternalBudgetDto
            {
                Id = b.Id,
                FiscalYearId = b.FiscalYearId,
                Name = b.Name,
                TotalAmount = b.TotalAmount,
                CashAmount = b.CashAmount,
                UsedCashAmount = usedCash,
                AmazonGiftAmount = b.AmazonGiftAmount,
                UsedAmazonGiftAmount = usedAmazon,
                OtherAmount = b.OtherAmount,
                UsedOtherAmount = usedOther,
                Description = b.Description,
                UsedAmount = usedTotal,
                CreatedAt = b.CreatedAt,
                UpdatedAt = b.UpdatedAt
            };
        }).ToList();

        return Ok(result);
    }

    /// <summary>
    /// 特定の部費外予算を取得します。
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<ExternalBudgetDto>> GetExternalBudgetById(Guid id, CancellationToken cancellationToken = default)
    {
        var b = await context.ExternalBudgets
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (b == null)
        {
            return NotFound("指定された部費外予算は見つかりません。");
        }

        var reqs = await context.ExpenseRequests
            .AsNoTracking()
            .Where(r => r.ExternalBudgetId == id && 
                        r.Status != ExpenseStatus.Draft && 
                        r.Status != ExpenseStatus.Rejected && 
                        r.Status != ExpenseStatus.Remanded)
            .ToListAsync(cancellationToken);

        var usedTotal = reqs.Sum(r => r.ExternalBudgetAmount);
        var usedCash = reqs.Where(r => !r.ExternalBudgetAssetType.HasValue || r.ExternalBudgetAssetType == ExternalBudgetAssetType.Cash).Sum(r => r.ExternalBudgetAmount);
        var usedAmazon = reqs.Where(r => r.ExternalBudgetAssetType == ExternalBudgetAssetType.AmazonGift).Sum(r => r.ExternalBudgetAmount);
        var usedOther = reqs.Where(r => r.ExternalBudgetAssetType == ExternalBudgetAssetType.Other).Sum(r => r.ExternalBudgetAmount);

        return Ok(new ExternalBudgetDto
        {
            Id = b.Id,
            FiscalYearId = b.FiscalYearId,
            Name = b.Name,
            TotalAmount = b.TotalAmount,
            CashAmount = b.CashAmount,
            UsedCashAmount = usedCash,
            AmazonGiftAmount = b.AmazonGiftAmount,
            UsedAmazonGiftAmount = usedAmazon,
            OtherAmount = b.OtherAmount,
            UsedOtherAmount = usedOther,
            Description = b.Description,
            UsedAmount = usedTotal,
            CreatedAt = b.CreatedAt,
            UpdatedAt = b.UpdatedAt
        });
    }

    /// <summary>
    /// 新しい部費外予算を登録します（主将会計・管理者のみ）。
    /// </summary>
    [HttpPost]
    [RequirePermission(PermissionType.ManageMasterData)]
    public async Task<ActionResult<ExternalBudgetDto>> CreateExternalBudget([FromBody] ExternalBudgetCreateDto dto, CancellationToken cancellationToken = default)
    {
        var fy = await context.FiscalYears.FindAsync(new object[] { dto.FiscalYearId }, cancellationToken);
        if (fy == null)
        {
            return BadRequest("指定された年度が存在しません。");
        }

        int cash = dto.CashAmount;
        int amazon = dto.AmazonGiftAmount;
        int other = dto.OtherAmount;

        // 内訳がすべて0でTotalAmountが設定されている場合は現金を初期内訳とする
        if (cash == 0 && amazon == 0 && other == 0 && dto.TotalAmount > 0)
        {
            cash = dto.TotalAmount;
        }
        int total = cash + amazon + other;

        var newBudget = new ExternalBudget
        {
            Id = Guid.NewGuid(),
            FiscalYearId = dto.FiscalYearId,
            Name = dto.Name.Trim(),
            CashAmount = cash,
            AmazonGiftAmount = amazon,
            OtherAmount = other,
            TotalAmount = total,
            Description = dto.Description?.Trim(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        context.ExternalBudgets.Add(newBudget);
        await context.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(GetExternalBudgetById), new { id = newBudget.Id }, new ExternalBudgetDto
        {
            Id = newBudget.Id,
            FiscalYearId = newBudget.FiscalYearId,
            Name = newBudget.Name,
            TotalAmount = newBudget.TotalAmount,
            CashAmount = newBudget.CashAmount,
            UsedCashAmount = 0,
            AmazonGiftAmount = newBudget.AmazonGiftAmount,
            UsedAmazonGiftAmount = 0,
            OtherAmount = newBudget.OtherAmount,
            UsedOtherAmount = 0,
            Description = newBudget.Description,
            UsedAmount = 0,
            CreatedAt = newBudget.CreatedAt,
            UpdatedAt = newBudget.UpdatedAt
        });
    }

    /// <summary>
    /// 部費外予算の情報を更新します（主将会計・管理者のみ）。
    /// </summary>
    [HttpPut("{id}")]
    [RequirePermission(PermissionType.ManageMasterData)]
    public async Task<IActionResult> UpdateExternalBudget(Guid id, [FromBody] ExternalBudgetUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var budget = await context.ExternalBudgets.FindAsync(new object[] { id }, cancellationToken);
        if (budget == null)
        {
            return NotFound("指定された部費外予算は見つかりません。");
        }

        // 既存の消化額をチェックして、消化済み額を下回る減額を防ぐ
        var reqs = await context.ExpenseRequests
            .AsNoTracking()
            .Where(r => r.ExternalBudgetId == id && 
                        r.Status != ExpenseStatus.Draft && 
                        r.Status != ExpenseStatus.Rejected && 
                        r.Status != ExpenseStatus.Remanded)
            .ToListAsync(cancellationToken);

        var usedCash = reqs.Where(r => !r.ExternalBudgetAssetType.HasValue || r.ExternalBudgetAssetType == ExternalBudgetAssetType.Cash).Sum(r => r.ExternalBudgetAmount);
        var usedAmazon = reqs.Where(r => r.ExternalBudgetAssetType == ExternalBudgetAssetType.AmazonGift).Sum(r => r.ExternalBudgetAmount);
        var usedOther = reqs.Where(r => r.ExternalBudgetAssetType == ExternalBudgetAssetType.Other).Sum(r => r.ExternalBudgetAmount);

        if (dto.CashAmount < usedCash)
        {
            return BadRequest($"現金の枠金額は、現在の使用済み額（¥{usedCash:N0}）以上である必要があります。");
        }
        if (dto.AmazonGiftAmount < usedAmazon)
        {
            return BadRequest($"Amazonギフト券の枠金額は、現在の使用済み額（¥{usedAmazon:N0}）以上である必要があります。");
        }
        if (dto.OtherAmount < usedOther)
        {
            return BadRequest($"その他の枠金額は、現在の使用済み額（¥{usedOther:N0}）以上である必要があります。");
        }

        budget.Name = dto.Name.Trim();
        budget.CashAmount = dto.CashAmount;
        budget.AmazonGiftAmount = dto.AmazonGiftAmount;
        budget.OtherAmount = dto.OtherAmount;
        budget.TotalAmount = dto.CashAmount + dto.AmazonGiftAmount + dto.OtherAmount;
        budget.Description = dto.Description?.Trim();
        budget.UpdatedAt = DateTime.UtcNow;

        await context.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    /// <summary>
    /// 部費外予算の資産形態間振替（アマギフを現金化、現金をアマギフ化など）を実行します。
    /// </summary>
    [HttpPost("{id}/convert")]
    [RequirePermission(PermissionType.ManageMasterData)]
    public async Task<ActionResult<ExternalBudgetDto>> ConvertAsset(Guid id, [FromBody] ExternalBudgetConvertDto dto, CancellationToken cancellationToken = default)
    {
        var budget = await context.ExternalBudgets.FindAsync(new object[] { id }, cancellationToken);
        if (budget == null)
        {
            return NotFound("指定された部費外予算は見つかりません。");
        }

        if (dto.FromType == dto.ToType)
        {
            return BadRequest("振替元と振替先には異なる形態を指定してください。");
        }

        // 振替元の現在の使用状況を集計して残高をチェック
        var reqs = await context.ExpenseRequests
            .AsNoTracking()
            .Where(r => r.ExternalBudgetId == id && 
                        r.Status != ExpenseStatus.Draft && 
                        r.Status != ExpenseStatus.Rejected && 
                        r.Status != ExpenseStatus.Remanded)
            .ToListAsync(cancellationToken);

        int availableFromAmount = dto.FromType switch
        {
            ExternalBudgetAssetType.Cash => budget.CashAmount - reqs.Where(r => !r.ExternalBudgetAssetType.HasValue || r.ExternalBudgetAssetType == ExternalBudgetAssetType.Cash).Sum(r => r.ExternalBudgetAmount),
            ExternalBudgetAssetType.AmazonGift => budget.AmazonGiftAmount - reqs.Where(r => r.ExternalBudgetAssetType == ExternalBudgetAssetType.AmazonGift).Sum(r => r.ExternalBudgetAmount),
            ExternalBudgetAssetType.Other => budget.OtherAmount - reqs.Where(r => r.ExternalBudgetAssetType == ExternalBudgetAssetType.Other).Sum(r => r.ExternalBudgetAmount),
            _ => 0
        };

        if (availableFromAmount < dto.Amount)
        {
            return BadRequest($"振替元の残高が不足しています。（振替可能額: ¥{Math.Max(0, availableFromAmount):N0}、振替希望額: ¥{dto.Amount:N0}）");
        }

        // 振替元から減額
        switch (dto.FromType)
        {
            case ExternalBudgetAssetType.Cash:
                budget.CashAmount -= dto.Amount;
                break;
            case ExternalBudgetAssetType.AmazonGift:
                budget.AmazonGiftAmount -= dto.Amount;
                break;
            case ExternalBudgetAssetType.Other:
                budget.OtherAmount -= dto.Amount;
                break;
        }

        // 振替先へ加算
        switch (dto.ToType)
        {
            case ExternalBudgetAssetType.Cash:
                budget.CashAmount += dto.ConvertedAmount;
                break;
            case ExternalBudgetAssetType.AmazonGift:
                budget.AmazonGiftAmount += dto.ConvertedAmount;
                break;
            case ExternalBudgetAssetType.Other:
                budget.OtherAmount += dto.ConvertedAmount;
                break;
        }

        budget.TotalAmount = budget.CashAmount + budget.AmazonGiftAmount + budget.OtherAmount;
        budget.UpdatedAt = DateTime.UtcNow;

        var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        Guid.TryParse(userIdString, out var currentUserId);

        var fromName = dto.FromType switch { ExternalBudgetAssetType.Cash => "現金", ExternalBudgetAssetType.AmazonGift => "Amazonギフトカード", _ => "その他" };
        var toName = dto.ToType switch { ExternalBudgetAssetType.Cash => "現金", ExternalBudgetAssetType.AmazonGift => "Amazonギフトカード", _ => "その他" };

        context.AuditLogs.Add(new AuditLog
        {
            TargetType = "ExternalBudgets",
            TargetId = budget.Id,
            UserId = currentUserId,
            Action = "CONVERT_ASSET",
            NewValue = $"[{budget.Name}] {fromName} ¥{dto.Amount:N0} → {toName} ¥{dto.ConvertedAmount:N0} へ振替（メモ: {dto.Note ?? "なし"}）"
        });

        await context.SaveChangesAsync(cancellationToken);

        // 最新の集計結果を返却
        return await GetExternalBudgetById(id, cancellationToken);
    }

    /// <summary>
    /// 部費外予算を削除します（主将会計・管理者のみ）。
    /// </summary>
    [HttpDelete("{id}")]
    [RequirePermission(PermissionType.ManageMasterData)]
    public async Task<IActionResult> DeleteExternalBudget(Guid id, CancellationToken cancellationToken = default)
    {
        var budget = await context.ExternalBudgets
            .Include(b => b.ExpenseRequests)
            .FirstOrDefaultAsync(b => b.Id == id, cancellationToken);

        if (budget == null)
        {
            return NotFound("指定された部費外予算は見つかりません。");
        }

        if (budget.ExpenseRequests.Any(r => r.Status != ExpenseStatus.Draft && r.Status != ExpenseStatus.Rejected))
        {
            return BadRequest("この部費外予算はすでに申請に紐づけられて使用されているため削除できません。金額を0にするか説明を変更してください。");
        }

        context.ExternalBudgets.Remove(budget);
        await context.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}
