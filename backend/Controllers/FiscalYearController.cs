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
using Club_Abacus_System.Security;
using Microsoft.AspNetCore.Authorization;
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
    /// 年度情報（名称・予算・期間）を更新します（システム管理者専用の保険措置）。
    /// </summary>
    [HttpPut("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> UpdateFiscalYear(Guid id, [FromBody] FiscalYearUpdateDto dto)
    {
        var fiscalYear = await context.FiscalYears.FindAsync(id);

        if (fiscalYear == null)
        {
            return NotFound("指定された年度は見つかりません。");
        }

        var newStartDate = dto.StartDate ?? fiscalYear.StartDate;
        var newEndDate = dto.EndDate ?? fiscalYear.EndDate;

        if (newEndDate <= newStartDate)
        {
            return BadRequest("終了日は開始日より後に設定してください。");
        }

        // 期間が変更された場合、他年度との重複チェック
        if (dto.StartDate.HasValue || dto.EndDate.HasValue)
        {
            var overlapping = await context.FiscalYears.AnyAsync(f =>
                f.Id != id &&
                f.StartDate <= newEndDate && f.EndDate >= newStartDate);

            if (overlapping)
            {
                return BadRequest("指定した期間は既存の他年度と重複しています。");
            }
        }

        if (dto.YearName != null) fiscalYear.YearName = dto.YearName;
        if (dto.TotalBudget.HasValue) fiscalYear.TotalBudget = dto.TotalBudget.Value;
        if (dto.StartDate.HasValue) fiscalYear.StartDate = dto.StartDate.Value;
        if (dto.EndDate.HasValue) fiscalYear.EndDate = dto.EndDate.Value;
        if (dto.IsActive.HasValue) fiscalYear.IsActive = dto.IsActive.Value;
        if (dto.IsClosed.HasValue) fiscalYear.IsClosed = dto.IsClosed.Value;

        fiscalYear.UpdatedAt = DateTime.UtcNow;
        await context.SaveChangesAsync();

        return Ok(fiscalYear);
    }

    /// <summary>
    /// 年度を開始します（IsActive = true）。
    /// すでに進行中の年度がある場合はエラーになります。
    /// </summary>
    [HttpPost("{id}/start")]
    [RequirePermission(PermissionType.ManageMasterData)]
    public async Task<IActionResult> StartFiscalYear(Guid id)
    {
        var fiscalYear = await context.FiscalYears.FindAsync(id);

        if (fiscalYear == null)
        {
            return NotFound("指定された年度は見つかりません。");
        }

        if (fiscalYear.IsClosed)
        {
            return BadRequest("締め済みの年度は開始できません。");
        }

        if (fiscalYear.IsActive)
        {
            return BadRequest("この年度はすでに進行中です。");
        }

        var hasActive = await context.FiscalYears.AnyAsync(f => f.IsActive);
        if (hasActive)
        {
            return BadRequest("すでに進行中の年度が存在します。現在の年度を締めてから新しい年度を開始してください。");
        }

        fiscalYear.IsActive = true;
        fiscalYear.UpdatedAt = DateTime.UtcNow;

        await context.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// 新規申請の停止/再開を切り替えます。
    /// </summary>
    [HttpPost("{id}/toggle-applications")]
    [RequirePermission(PermissionType.ManageMasterData)]
    public async Task<IActionResult> ToggleApplications(Guid id)
    {
        var fiscalYear = await context.FiscalYears.FindAsync(id);

        if (fiscalYear == null)
        {
            return NotFound("指定された年度は見つかりません。");
        }

        if (fiscalYear.IsClosed)
        {
            return BadRequest("締め済みの年度の設定は変更できません。");
        }

        fiscalYear.IsApplicationsStopped = !fiscalYear.IsApplicationsStopped;
        fiscalYear.UpdatedAt = DateTime.UtcNow;

        await context.SaveChangesAsync();

        return Ok(new { fiscalYear.IsApplicationsStopped });
    }

    /// <summary>
    /// 年度を締めます（IsClosed = true）。締め後は変更不可になります。
    /// 未完了の申請がある場合、force=false だと 409 Conflict を返し、
    /// force=true だとそれらを自動却下して締め処理を完了します。
    /// </summary>
    [HttpPost("{id}/close")]
    [RequirePermission(PermissionType.ManageMasterData)]
    public async Task<IActionResult> CloseFiscalYear(Guid id, [FromQuery] bool force = false)
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

        // 未完了の申請を検索 (Settled, Rejected, UniversitySubmitted 以外)
        var pendingRequests = await context.ExpenseRequests
            .Where(e => e.Status != ExpenseStatus.Settled && e.Status != ExpenseStatus.Rejected && e.Status != ExpenseStatus.UniversitySubmitted)
            .Where(e => e.CreatedAt >= fiscalYear.StartDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc) && 
                        e.CreatedAt <= fiscalYear.EndDate.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc))
            .ToListAsync();

        if (pendingRequests.Any() && !force)
        {
            return StatusCode(409, new 
            { 
                message = $"申請途中の経費が {pendingRequests.Count} 件残っています。年度を締めるとこれらは自動的に却下されます。本当に締めますか？", 
                pendingCount = pendingRequests.Count 
            });
        }

        if (pendingRequests.Any() && force)
        {
            foreach (var req in pendingRequests)
            {
                req.Status = ExpenseStatus.Rejected;
                req.RejectionReason = "年度締め処理による自動却下";
                req.UpdatedAt = DateTime.UtcNow;
            }
        }

        fiscalYear.IsActive = false;
        fiscalYear.IsClosed = true;
        fiscalYear.UpdatedAt = DateTime.UtcNow;

        await context.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// 誤って開始した年度を「未開始」ステータスに戻します（システム管理者専用の保険措置）。
    /// </summary>
    [HttpPost("{id}/stop")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> StopFiscalYear(Guid id)
    {
        var fiscalYear = await context.FiscalYears.FindAsync(id);

        if (fiscalYear == null)
        {
            return NotFound("指定された年度は見つかりません。");
        }

        if (!fiscalYear.IsActive)
        {
            return BadRequest("この年度は進行中ではありません。");
        }

        fiscalYear.IsActive = false;
        fiscalYear.UpdatedAt = DateTime.UtcNow;

        await context.SaveChangesAsync();

        return Ok(fiscalYear);
    }

    /// <summary>
    /// 年度の締め解除は規程上基本的に禁止されています。
    /// </summary>
    [HttpPost("{id}/reopen")]
    [Authorize(Roles = "ADMIN")]
    public Task<IActionResult> ReopenFiscalYear(Guid id, [FromQuery] bool makeActive = true)
    {
        return Task.FromResult<IActionResult>(BadRequest("年度の締め解除は会計監査・規程上、原則として禁止されています。締められた過去年度を再オープンすることはできません。"));
    }

    /// <summary>
    /// 誤って作成した年度を削除します（システム管理者専用の保険措置。期間内の申請が存在しない場合のみ可能）。
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> DeleteFiscalYear(Guid id, [FromQuery] bool force = false)
    {
        var fiscalYear = await context.FiscalYears.FindAsync(id);

        if (fiscalYear == null)
        {
            return NotFound("指定された年度は見つかりません。");
        }

        var startDateTime = fiscalYear.StartDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var endDateTime = fiscalYear.EndDate.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);

        var hasRequests = await context.ExpenseRequests
            .AnyAsync(e => e.CreatedAt >= startDateTime && e.CreatedAt <= endDateTime);

        if (hasRequests && !force)
        {
            return BadRequest("この年度の期間内に申請データが存在するため削除できません。");
        }

        context.FiscalYears.Remove(fiscalYear);
        await context.SaveChangesAsync();

        return NoContent();
    }
}
