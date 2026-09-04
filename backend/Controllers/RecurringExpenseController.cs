using Club_Abacus_System.Data;
using Club_Abacus_System.DTOs;
using Club_Abacus_System.Models;
using Club_Abacus_System.Security;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Club_Abacus_System.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RecurringExpenseController(AppDbContext context) : ControllerBase
{
    /// <summary>
    /// 定期支払いテンプレート一覧を取得します（論理削除済みは除外）。
    /// </summary>
    [HttpGet]
    [RequirePermission(PermissionType.ExpenseReadAll)]
    public async Task<ActionResult<List<RecurringExpenseTemplate>>> GetTemplates()
    {
        var templates = await context.RecurringExpenseTemplates
            .AsNoTracking()
            .Where(t => t.DeletedAt == null)
            .Include(t => t.User)
            .OrderBy(t => t.TemplateName)
            .ToListAsync();

        return Ok(templates);
    }

    /// <summary>
    /// 特定の定期支払いテンプレートをIDで取得します。
    /// </summary>
    [HttpGet("{id}")]
    [RequirePermission(PermissionType.ExpenseReadAll)]
    public async Task<ActionResult<RecurringExpenseTemplate>> GetTemplateById(Guid id)
    {
        var template = await context.RecurringExpenseTemplates
            .AsNoTracking()
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Id == id && t.DeletedAt == null);

        if (template == null)
        {
            return NotFound("指定されたテンプレートは見つかりません。");
        }

        return Ok(template);
    }

    /// <summary>
    /// 定期支払いテンプレートを新規作成します。
    /// </summary>
    [HttpPost]
    [RequirePermission(PermissionType.ManageMasterData)]
    public async Task<ActionResult<RecurringExpenseTemplate>> CreateTemplate([FromBody] RecurringExpenseCreateDto dto)
    {
        // ユーザーの存在確認
        var userExists = await context.Users.AnyAsync(u => u.Id == dto.UserId);
        if (!userExists)
        {
            return BadRequest("指定されたユーザーは存在しません。");
        }

        var template = new RecurringExpenseTemplate
        {
            UserId = dto.UserId,
            TemplateName = dto.TemplateName,
            RecurringFrequency = dto.RecurringFrequency,
            ExpenseType = dto.ExpenseType,
            ReceiptType = dto.ReceiptType,
            ItemName = dto.ItemName,
            Amount = dto.Amount,
            Payee = dto.Payee,
            Category = dto.Category,
            NextGenerationDate = dto.NextGenerationDate,
            TemplateStatus = TemplateStatus.Active,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        context.RecurringExpenseTemplates.Add(template);
        await context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetTemplateById), new { id = template.Id }, template);
    }

    /// <summary>
    /// 定期支払いテンプレートを更新します。
    /// </summary>
    [HttpPut("{id}")]
    [RequirePermission(PermissionType.ManageMasterData)]
    public async Task<IActionResult> UpdateTemplate(Guid id, [FromBody] RecurringExpenseUpdateDto dto)
    {
        var template = await context.RecurringExpenseTemplates
            .FirstOrDefaultAsync(t => t.Id == id && t.DeletedAt == null);

        if (template == null)
        {
            return NotFound("指定されたテンプレートは見つかりません。");
        }

        if (dto.TemplateName != null) template.TemplateName = dto.TemplateName;
        if (dto.TemplateStatus.HasValue) template.TemplateStatus = dto.TemplateStatus.Value;
        if (dto.ItemName != null) template.ItemName = dto.ItemName;
        if (dto.Amount.HasValue) template.Amount = dto.Amount.Value;
        if (dto.Payee != null) template.Payee = dto.Payee;
        if (dto.Category != null) template.Category = dto.Category;
        if (dto.NextGenerationDate.HasValue) template.NextGenerationDate = dto.NextGenerationDate.Value;

        await context.SaveChangesAsync();

        template.UpdatedAt = DateTime.UtcNow;
        await context.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// 定期支払いテンプレートを論理削除します（DeletedAt に日時をセット）。
    /// </summary>
    [HttpDelete("{id}")]
    [RequirePermission(PermissionType.ManageMasterData)]
    public async Task<IActionResult> DeleteTemplate(Guid id)
    {
        var template = await context.RecurringExpenseTemplates
            .FirstOrDefaultAsync(t => t.Id == id && t.DeletedAt == null);

        if (template == null)
        {
            return NotFound("指定されたテンプレートは見つかりません。");
        }

        template.DeletedAt = DateTime.UtcNow;
        template.TemplateStatus = TemplateStatus.Inactive;
        template.UpdatedAt = DateTime.UtcNow;

        await context.SaveChangesAsync();

        return NoContent();
    }
}
