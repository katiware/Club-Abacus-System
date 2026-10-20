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

        // 各部費外予算枠から支出された金額を集計
        // 対象ステータス: 却下(Rejected)と下書き(Draft)以外の有効な申請
        var usageByBudget = await context.ExpenseRequests
            .AsNoTracking()
            .Where(r => r.ExternalBudgetId.HasValue && 
                        r.Status != ExpenseStatus.Draft && 
                        r.Status != ExpenseStatus.Rejected && 
                        r.Status != ExpenseStatus.Remanded)
            .GroupBy(r => r.ExternalBudgetId!.Value)
            .Select(g => new { BudgetId = g.Key, TotalUsed = g.Sum(r => r.ExternalBudgetAmount) })
            .ToDictionaryAsync(x => x.BudgetId, x => x.TotalUsed, cancellationToken);

        var result = externalBudgets.Select(b => new ExternalBudgetDto
        {
            Id = b.Id,
            FiscalYearId = b.FiscalYearId,
            Name = b.Name,
            TotalAmount = b.TotalAmount,
            Description = b.Description,
            UsedAmount = usageByBudget.GetValueOrDefault(b.Id, 0),
            CreatedAt = b.CreatedAt,
            UpdatedAt = b.UpdatedAt
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

        var usedAmount = await context.ExpenseRequests
            .AsNoTracking()
            .Where(r => r.ExternalBudgetId == id && 
                        r.Status != ExpenseStatus.Draft && 
                        r.Status != ExpenseStatus.Rejected && 
                        r.Status != ExpenseStatus.Remanded)
            .SumAsync(r => r.ExternalBudgetAmount, cancellationToken);

        return Ok(new ExternalBudgetDto
        {
            Id = b.Id,
            FiscalYearId = b.FiscalYearId,
            Name = b.Name,
            TotalAmount = b.TotalAmount,
            Description = b.Description,
            UsedAmount = usedAmount,
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

        var newBudget = new ExternalBudget
        {
            Id = Guid.NewGuid(),
            FiscalYearId = dto.FiscalYearId,
            Name = dto.Name.Trim(),
            TotalAmount = dto.TotalAmount,
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

        budget.Name = dto.Name.Trim();
        budget.TotalAmount = dto.TotalAmount;
        budget.Description = dto.Description?.Trim();
        budget.UpdatedAt = DateTime.UtcNow;

        await context.SaveChangesAsync(cancellationToken);
        return NoContent();
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
