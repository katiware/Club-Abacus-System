using Club_Abacus_System.Data;
using Club_Abacus_System.Models;
using Club_Abacus_System.Security;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Club_Abacus_System.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuditLogController(AppDbContext context) : ControllerBase
{
    /// <summary>
    /// 監査ログ一覧を取得します。
    /// クエリパラメーターで対象テーブル・対象ID・日付範囲によるフィルタが可能です。
    /// </summary>
    [HttpGet]
    [RequirePermission(PermissionType.ViewAuditLogs)]
    public async Task<ActionResult<List<AuditLog>>> GetAuditLogs(
        [FromQuery] string? targetType,
        [FromQuery] Guid? targetId,
        [FromQuery] Guid? userId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        var query = context.AuditLogs
            .AsNoTracking()
            .Include(a => a.User)
            .AsQueryable();

        // フィルタリング
        if (!string.IsNullOrWhiteSpace(targetType))
            query = query.Where(a => a.TargetType == targetType);

        if (targetId.HasValue)
            query = query.Where(a => a.TargetId == targetId.Value);

        if (userId.HasValue)
            query = query.Where(a => a.UserId == userId.Value);

        if (from.HasValue)
            query = query.Where(a => a.CreatedAt >= from.Value);

        if (to.HasValue)
            query = query.Where(a => a.CreatedAt <= to.Value);

        var logs = await query
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();

        return Ok(logs);
    }

    /// <summary>
    /// 特定の監査ログをIDで取得します。
    /// </summary>
    [HttpGet("{id}")]
    [RequirePermission(PermissionType.ViewAuditLogs)]
    public async Task<ActionResult<AuditLog>> GetAuditLogById(Guid id)
    {
        var log = await context.AuditLogs
            .AsNoTracking()
            .Include(a => a.User)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (log == null)
        {
            return NotFound("指定された監査ログは見つかりません。");
        }

        return Ok(log);
    }
}
