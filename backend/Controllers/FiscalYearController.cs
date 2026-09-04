using Club_Abacus_System.Data;
using Club_Abacus_System.DTOs;
using Club_Abacus_System.Models;
using Club_Abacus_System.Security;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Club_Abacus_System.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FiscalYearController(AppDbContext context) : ControllerBase
{
    /// <summary>
    /// 年度一覧を取得します。
    /// </summary>
    [HttpGet]
    [RequirePermission(PermissionType.ExpenseManageOwn)]
    public async Task<ActionResult<List<FiscalYear>>> GetFiscalYears()
    {
        var fiscalYears = await context.FiscalYears
            .AsNoTracking()
            .OrderByDescending(f => f.StartDate)
            .ToListAsync();

        return Ok(fiscalYears);
    }

    /// <summary>
    /// 特定の年度をIDで取得します。
    /// </summary>
    [HttpGet("{id}")]
    [RequirePermission(PermissionType.ExpenseManageOwn)]
    public async Task<ActionResult<FiscalYear>> GetFiscalYearById(Guid id)
    {
        var fiscalYear = await context.FiscalYears
            .AsNoTracking()
            .FirstOrDefaultAsync(f => f.Id == id);

        if (fiscalYear == null)
        {
            return NotFound("指定された年度は見つかりません。");
        }

        return Ok(fiscalYear);
    }

    /// <summary>
    /// 年度を新規作成します。
    /// </summary>
    [HttpPost]
    [RequirePermission(PermissionType.ManageMasterData)]
    public async Task<ActionResult<FiscalYear>> CreateFiscalYear([FromBody] FiscalYearCreateDto dto)
    {
        // 期間の整合性チェック
        if (dto.EndDate <= dto.StartDate)
        {
            return BadRequest("終了日は開始日より後に設定してください。");
        }

        // 既存の年度と期間が重複していないかチェック
        var overlapping = await context.FiscalYears.AnyAsync(f =>
            f.StartDate <= dto.EndDate && f.EndDate >= dto.StartDate);

        if (overlapping)
        {
            return BadRequest("指定した期間は既存の年度と重複しています。");
        }

        var fiscalYear = new FiscalYear
        {
            YearName = dto.YearName,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            TotalBudget = dto.TotalBudget,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        context.FiscalYears.Add(fiscalYear);
        await context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetFiscalYearById), new { id = fiscalYear.Id }, fiscalYear);
    }

    /// <summary>
    /// 年度情報（名称・予算）を更新します。
    /// </summary>
    [HttpPut("{id}")]
    [RequirePermission(PermissionType.ManageMasterData)]
    public async Task<IActionResult> UpdateFiscalYear(Guid id, [FromBody] FiscalYearUpdateDto dto)
    {
        var fiscalYear = await context.FiscalYears.FindAsync(id);

        if (fiscalYear == null)
        {
            return NotFound("指定された年度は見つかりません。");
        }

        if (fiscalYear.IsClosed)
        {
            return BadRequest("締め済みの年度は変更できません。");
        }

        if (dto.YearName != null) fiscalYear.YearName = dto.YearName;
        if (dto.TotalBudget.HasValue) fiscalYear.TotalBudget = dto.TotalBudget.Value;

        await context.SaveChangesAsync();

        fiscalYear.UpdatedAt = DateTime.UtcNow;
        await context.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// 年度を締めます（IsClosed = true）。締め後は変更不可になります。
    /// </summary>
    [HttpPost("{id}/close")]
    [RequirePermission(PermissionType.ManageMasterData)]
    public async Task<IActionResult> CloseFiscalYear(Guid id)
    {
        var fiscalYear = await context.FiscalYears.FindAsync(id);

        if (fiscalYear == null)
        {
            return NotFound("指定された年度は見つかりません。");
        }

        if (fiscalYear.IsClosed)
        {
            return BadRequest("この年度はすでに締め済みです。");
        }

        fiscalYear.IsClosed = true;
        fiscalYear.UpdatedAt = DateTime.UtcNow;

        await context.SaveChangesAsync();

        return NoContent();
    }
}
