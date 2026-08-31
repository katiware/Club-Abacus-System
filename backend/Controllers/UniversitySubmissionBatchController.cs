using Club_Abacus_System.Data;
using Club_Abacus_System.DTOs;
using Club_Abacus_System.Models;
using Club_Abacus_System.Security;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Club_Abacus_System.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UniversitySubmissionBatchController(AppDbContext context) : ControllerBase
{
    /// <summary>
    /// 提出バッチ一覧を取得します（新しい月順）。
    /// </summary>
    [HttpGet]
    [RequirePermission(PermissionType.ExpenseReadAll)]
    public async Task<ActionResult<List<UniversitySubmissionBatch>>> GetBatches()
    {
        var batches = await context.UniversitySubmissionBatches
            .AsNoTracking()
            .Include(b => b.FiscalYear)
            .OrderByDescending(b => b.TargetMonth)
            .ToListAsync();

        return Ok(batches);
    }

    /// <summary>
    /// 特定の提出バッチをIDで取得します（紐づく経費申請含む）。
    /// </summary>
    [HttpGet("{id}")]
    [RequirePermission(PermissionType.ExpenseReadAll)]
    public async Task<ActionResult<UniversitySubmissionBatch>> GetBatchById(Guid id)
    {
        var batch = await context.UniversitySubmissionBatches
            .AsNoTracking()
            .Include(b => b.FiscalYear)
            .Include(b => b.ExpenseRequests)
                .ThenInclude(e => e.User)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (batch == null)
        {
            return NotFound("指定された提出バッチは見つかりません。");
        }

        return Ok(batch);
    }

    /// <summary>
    /// 提出バッチを新規作成します。
    /// </summary>
    [HttpPost]
    [RequirePermission(PermissionType.ExpenseSubmitToUniversity)]
    public async Task<ActionResult<UniversitySubmissionBatch>> CreateBatch([FromBody] UniversitySubmissionBatchCreateDto dto)
    {
        // 年度の存在確認
        var fiscalYear = await context.FiscalYears.FindAsync(dto.FiscalYearId);
        if (fiscalYear == null)
        {
            return BadRequest("指定された年度は存在しません。");
        }

        if (fiscalYear.IsClosed)
        {
            return BadRequest("締め済みの年度にはバッチを作成できません。");
        }

        // 同じ対象月のバッチが既に存在しないかチェック
        var exists = await context.UniversitySubmissionBatches
            .AnyAsync(b => b.TargetMonth == dto.TargetMonth && b.FiscalYearId == dto.FiscalYearId);

        if (exists)
        {
            return BadRequest("同じ年度・対象月の提出バッチがすでに存在します。");
        }

        var batch = new UniversitySubmissionBatch
        {
            TargetMonth = dto.TargetMonth,
            FiscalYearId = dto.FiscalYearId,
            IsSubmitted = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        context.UniversitySubmissionBatches.Add(batch);
        await context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetBatchById), new { id = batch.Id }, batch);
    }

    /// <summary>
    /// バッチを提出済みにします（IsSubmitted = true）。
    /// </summary>
    [HttpPost("{id}/submit")]
    [RequirePermission(PermissionType.ExpenseSubmitToUniversity)]
    public async Task<IActionResult> SubmitBatch(Guid id)
    {
        var batch = await context.UniversitySubmissionBatches.FindAsync(id);

        if (batch == null)
        {
            return NotFound("指定された提出バッチは見つかりません。");
        }

        if (batch.IsSubmitted)
        {
            return BadRequest("このバッチはすでに提出済みです。");
        }

        batch.IsSubmitted = true;
        batch.SubmittedAt = DateTime.UtcNow;
        batch.UpdatedAt = DateTime.UtcNow;

        await context.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// バッチ内の経費申請を選択して別のバッチへ移動します。
    /// </summary>
    [HttpPost("{id}/move-requests")]
    [RequirePermission(PermissionType.ExpenseSubmitToUniversity)]
    public async Task<IActionResult> MoveExpenseRequests(Guid id, [FromBody] MoveExpenseRequestsDto dto)
    {
        // 移動元バッチの確認
        var sourceBatch = await context.UniversitySubmissionBatches.FindAsync(id);
        if (sourceBatch == null)
        {
            return NotFound("移動元のバッチが見つかりません。");
        }

        if (sourceBatch.IsSubmitted)
        {
            return BadRequest("提出済みのバッチから申請を移動することはできません。");
        }

        // 移動先バッチの確認
        var targetBatch = await context.UniversitySubmissionBatches.FindAsync(dto.TargetBatchId);
        if (targetBatch == null)
        {
            return NotFound("移動先のバッチが見つかりません。");
        }

        if (targetBatch.IsSubmitted)
        {
            return BadRequest("提出済みのバッチへ申請を移動することはできません。");
        }

        if (sourceBatch.Id == targetBatch.Id)
        {
            return BadRequest("移動元と移動先が同じバッチです。");
        }

        // 指定された申請が全て移動元バッチに属しているか確認
        var requests = await context.ExpenseRequests
            .Where(e => dto.ExpenseRequestIds.Contains(e.Id))
            .ToListAsync();

        // 存在しないIDが含まれていないか確認
        if (requests.Count != dto.ExpenseRequestIds.Count)
        {
            return BadRequest("指定された経費申請IDの一部が存在しません。");
        }

        // 移動元バッチに属していない申請が含まれていないか確認
        var notInSource = requests.Any(e => e.UniversitySubmissionBatchId != id);
        if (notInSource)
        {
            return BadRequest("指定された申請の一部がこのバッチに属していません。");
        }

        // 申請を移動先バッチへ付け替え
        foreach (var request in requests)
        {
            request.UniversitySubmissionBatchId = dto.TargetBatchId;
            request.UpdatedAt = DateTime.UtcNow;
        }

        sourceBatch.UpdatedAt = DateTime.UtcNow;
        targetBatch.UpdatedAt = DateTime.UtcNow;

        await context.SaveChangesAsync();

        return Ok(new
        {
            MovedCount = requests.Count,
            TargetBatchId = dto.TargetBatchId
        });
    }
}

