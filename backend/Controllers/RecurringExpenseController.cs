using System.Security.Claims;
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
public class RecurringExpenseController(AppDbContext context) : ControllerBase
{
    private Guid? GetCurrentUserId()
    {
        var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(idStr, out var id) ? id : null;
    }

    private bool IsAdminOrManager()
    {
        return User.IsInRole("ADMIN") ||
               User.IsInRole("MANAGER") ||
               User.HasClaim("Permission", PermissionType.ExpenseApprove.ToString()) ||
               User.HasClaim("Permission", PermissionType.ManageMasterData.ToString()) ||
               User.HasClaim("Permission", PermissionType.ExpenseReadAll.ToString());
    }

    /// <summary>
    /// 定期支払いテンプレート一覧を取得します（論理削除済みは除外）。
    /// 一般部員は自身のテンプレートのみ、管理者・主将会計は全員分を取得できます。
    /// </summary>
    [HttpGet]
    [Authorize]
    public async Task<ActionResult<List<RecurringExpenseTemplate>>> GetTemplates()
    {
        var currentUserId = GetCurrentUserId();
        var isAdminOrManager = IsAdminOrManager();

        var query = context.RecurringExpenseTemplates
            .AsNoTracking()
            .Where(t => t.DeletedAt == null)
            .Include(t => t.User)
            .AsQueryable();

        // 一般部員は自身が作成したテンプレートのみにスコープを制限
        if (!isAdminOrManager)
        {
            if (currentUserId == null) return Unauthorized();
            query = query.Where(t => t.UserId == currentUserId.Value);
        }

        var templates = await query
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

        return Ok(templates);
    }

    /// <summary>
    /// 特定の定期支払いテンプレートをIDで取得します。
    /// 一般部員は他人のテンプレートを閲覧できません。
    /// </summary>
    [HttpGet("{id}")]
    [Authorize]
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

        var currentUserId = GetCurrentUserId();
        var isAdminOrManager = IsAdminOrManager();

        if (!isAdminOrManager && template.UserId != currentUserId)
        {
            return Forbid("他人の定期テンプレートは閲覧できません。");
        }

        return Ok(template);
    }

    /// <summary>
    /// 定期支払いテンプレートを新規作成（申請）します。
    /// 管理者・主将会計が作成した場合は即時Active、一般部員が作成した場合は承認待ち(PendingApproval)となります。
    /// </summary>
    [HttpPost]
    [Authorize]
    public async Task<ActionResult<RecurringExpenseTemplate>> CreateTemplate([FromBody] RecurringExpenseCreateDto dto)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null) return Unauthorized();

        var isAdminOrManager = IsAdminOrManager();
        var targetUserId = isAdminOrManager ? dto.UserId : currentUserId.Value;

        // ユーザーの存在確認
        var userExists = await context.Users.AnyAsync(u => u.Id == targetUserId);
        if (!userExists)
        {
            return BadRequest("指定されたユーザーは存在しません。");
        }

        // Web購入(Digital)の場合、購入先URLは必須
        if (dto.ReceiptType == ReceiptType.Digital && string.IsNullOrWhiteSpace(dto.PurchaseUrl))
        {
            return BadRequest("Web購入(Digital)を選択した場合、購入先・サービスURLは必須です。");
        }

        // 管理者・主将会計は即時Active・承認済。一般部員は承認待ち(PendingApproval)・Inactive
        var template = new RecurringExpenseTemplate
        {
            UserId = targetUserId,
            TemplateName = dto.TemplateName,
            RecurringFrequency = dto.RecurringFrequency,
            ExpenseType = dto.ExpenseType,
            ReceiptType = dto.ReceiptType,
            ItemName = dto.ItemName,
            Amount = dto.Amount,
            IsAmountVariable = dto.IsAmountVariable,
            Payee = dto.Payee,
            Category = dto.Category,
            Description = dto.Description,
            PurchaseUrl = dto.PurchaseUrl,
            NextGenerationDate = dto.NextGenerationDate,
            TemplateStatus = isAdminOrManager ? TemplateStatus.Active : TemplateStatus.Inactive,
            ApprovalStatus = isAdminOrManager ? ExpenseStatus.Approved : ExpenseStatus.PendingApproval,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        context.RecurringExpenseTemplates.Add(template);

        context.AuditLogs.Add(new AuditLog
        {
            TargetType = "RecurringExpenseTemplates",
            TargetId = template.Id,
            UserId = currentUserId.Value,
            Action = isAdminOrManager ? "CREATE_TEMPLATE_ACTIVE" : "CREATE_TEMPLATE_PENDING",
            NewValue = $"定期テンプレート '{template.TemplateName}' (金額: ¥{template.Amount}) を作成しました。(ステータス: {template.ApprovalStatus})"
        });

        await context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetTemplateById), new { id = template.Id }, template);
    }

    /// <summary>
    /// 定期支払いテンプレートを承認します（管理者・主将会計専用）。
    /// 承認されると Active（有効）になり、自動生成の対象になります。
    /// </summary>
    [HttpPost("{id}/approve")]
    [Authorize]
    public async Task<IActionResult> ApproveTemplate(Guid id)
    {
        if (!IsAdminOrManager())
        {
            return Forbid("定期テンプレートの承認は管理者または主将会計のみ実行できます。");
        }

        var template = await context.RecurringExpenseTemplates
            .FirstOrDefaultAsync(t => t.Id == id && t.DeletedAt == null);

        if (template == null)
        {
            return NotFound("指定されたテンプレートは見つかりません。");
        }

        template.ApprovalStatus = ExpenseStatus.Approved;
        template.TemplateStatus = TemplateStatus.Active;
        template.UpdatedAt = DateTime.UtcNow;

        var currentUserId = GetCurrentUserId();
        context.AuditLogs.Add(new AuditLog
        {
            TargetType = "RecurringExpenseTemplates",
            TargetId = template.Id,
            UserId = currentUserId ?? Guid.Empty,
            Action = "APPROVE_TEMPLATE",
            NewValue = $"定期テンプレート '{template.TemplateName}' が承認され、有効化(Active)されました。"
        });

        await context.SaveChangesAsync();

        return Ok(new { message = "定期テンプレートを承認し、有効化しました。", template });
    }

    /// <summary>
    /// 定期支払いテンプレートを却下します（管理者・主将会計専用）。
    /// </summary>
    [HttpPost("{id}/reject")]
    [Authorize]
    public async Task<IActionResult> RejectTemplate(Guid id)
    {
        if (!IsAdminOrManager())
        {
            return Forbid("定期テンプレートの却下は管理者または主将会計のみ実行できます。");
        }

        var template = await context.RecurringExpenseTemplates
            .FirstOrDefaultAsync(t => t.Id == id && t.DeletedAt == null);

        if (template == null)
        {
            return NotFound("指定されたテンプレートは見つかりません。");
        }

        template.ApprovalStatus = ExpenseStatus.Rejected;
        template.TemplateStatus = TemplateStatus.Inactive;
        template.UpdatedAt = DateTime.UtcNow;

        var currentUserId = GetCurrentUserId();
        context.AuditLogs.Add(new AuditLog
        {
            TargetType = "RecurringExpenseTemplates",
            TargetId = template.Id,
            UserId = currentUserId ?? Guid.Empty,
            Action = "REJECT_TEMPLATE",
            NewValue = $"定期テンプレート '{template.TemplateName}' が却下されました。"
        });

        await context.SaveChangesAsync();

        return Ok(new { message = "定期テンプレートを却下しました。", template });
    }

    /// <summary>
    /// 定期支払いテンプレートを更新します。
    /// 一般部員が内容を変更した場合は再承認待ち(PendingApproval)になります。
    /// </summary>
    [HttpPut("{id}")]
    [Authorize]
    public async Task<IActionResult> UpdateTemplate(Guid id, [FromBody] RecurringExpenseUpdateDto dto)
    {
        var template = await context.RecurringExpenseTemplates
            .FirstOrDefaultAsync(t => t.Id == id && t.DeletedAt == null);

        if (template == null)
        {
            return NotFound("指定されたテンプレートは見つかりません。");
        }

        var currentUserId = GetCurrentUserId();
        var isAdminOrManager = IsAdminOrManager();

        if (!isAdminOrManager && template.UserId != currentUserId)
        {
            return Forbid("他人の定期テンプレートは編集できません。");
        }

        var effectiveReceiptType = dto.ReceiptType ?? template.ReceiptType;
        var effectiveUrl = dto.PurchaseUrl ?? template.PurchaseUrl;
        if (effectiveReceiptType == ReceiptType.Digital && string.IsNullOrWhiteSpace(effectiveUrl))
        {
            return BadRequest("Web購入(Digital)を選択した場合、購入先・サービスURLは必須です。");
        }

        if (dto.TemplateName != null) template.TemplateName = dto.TemplateName;
        if (dto.ItemName != null) template.ItemName = dto.ItemName;
        if (dto.Amount.HasValue) template.Amount = dto.Amount.Value;
        if (dto.IsAmountVariable.HasValue) template.IsAmountVariable = dto.IsAmountVariable.Value;
        if (dto.Payee != null) template.Payee = dto.Payee;
        if (dto.Category != null) template.Category = dto.Category;
        if (dto.Description != null) template.Description = dto.Description;
        if (dto.PurchaseUrl != null) template.PurchaseUrl = dto.PurchaseUrl;
        if (dto.NextGenerationDate.HasValue) template.NextGenerationDate = dto.NextGenerationDate.Value;
        if (dto.RecurringFrequency.HasValue) template.RecurringFrequency = dto.RecurringFrequency.Value;
        if (dto.ExpenseType.HasValue) template.ExpenseType = dto.ExpenseType.Value;
        if (dto.ReceiptType.HasValue) template.ReceiptType = dto.ReceiptType.Value;

        if (isAdminOrManager)
        {
            if (dto.TemplateStatus.HasValue) template.TemplateStatus = dto.TemplateStatus.Value;
            if (dto.ApprovalStatus.HasValue) template.ApprovalStatus = dto.ApprovalStatus.Value;
        }
        else
        {
            // 一般部員は稼働ステータス(TemplateStatus)を直接変更できない（一時停止・再開の禁止）
            if (dto.TemplateStatus.HasValue)
            {
                return StatusCode(StatusCodes.Status403Forbidden, "一般部員は定期テンプレートの一時停止や再開を行うことはできません。主将会計または管理者にお問い合わせください。");
            }

            // 一般部員が内容を変更した場合は再承認待ちに戻す
            template.ApprovalStatus = ExpenseStatus.PendingApproval;
            template.TemplateStatus = TemplateStatus.Inactive;
        }

        template.UpdatedAt = DateTime.UtcNow;
        await context.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// 定期支払いテンプレートを論理削除します（管理者・主将会計専用）。
    /// 一般部員は削除できません。
    /// </summary>
    [HttpDelete("{id}")]
    [RequirePermission(PermissionType.ManageMasterData)]
    public async Task<IActionResult> DeleteTemplate(Guid id)
    {
        var template = await context.RecurringExpenseTemplates
            .FirstOrDefaultAsync(t => t.Id == id);

        if (template == null)
        {
            return NotFound("指定されたテンプレートは見つかりません。");
        }

        template.DeletedAt = DateTime.UtcNow;
        template.TemplateStatus = TemplateStatus.Inactive;
        template.UpdatedAt = DateTime.UtcNow;

        var currentUserId = GetCurrentUserId();
        context.AuditLogs.Add(new AuditLog
        {
            TargetType = "RecurringExpenseTemplates",
            TargetId = template.Id,
            UserId = currentUserId ?? Guid.Empty,
            Action = "DELETE_TEMPLATE",
            NewValue = $"定期テンプレート '{template.TemplateName}' が削除されました。"
        });

        await context.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// 定期支払いテンプレートから手動で申請を下書き生成します（保険機能）。
    /// </summary>
    [HttpPost("{id}/generate")]
    [RequirePermission(PermissionType.ManageMasterData)]
    public async Task<IActionResult> GenerateManual(Guid id)
    {
        var template = await context.RecurringExpenseTemplates
            .FirstOrDefaultAsync(t => t.Id == id);

        if (template == null)
        {
            return NotFound("指定されたテンプレートは見つかりません。");
        }

        if (template.TemplateStatus != TemplateStatus.Active || template.DeletedAt != null)
        {
            return BadRequest("有効かつ稼働中のテンプレートからのみ生成できます。");
        }

        // 下書き状態の ExpenseRequest を生成
        var expenseRequest = new ExpenseRequest
        {
            UserId = template.UserId,
            Title = template.TemplateName,
            Type = template.ExpenseType,
            ReceiptType = template.ReceiptType,
            Status = ExpenseStatus.PendingApproval, // 承認待ち状態で生成
            RecurringTemplateId = template.Id,
            TotalAmount = template.Amount,
            IsAmountVariable = template.IsAmountVariable,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            ExpenseItems = new List<ExpenseItem>
            {
                new ExpenseItem
                {
                    ItemName = template.ItemName,
                    UnitPrice = template.Amount,
                    Quantity = 1,
                    Payee = template.Payee,
                    Category = template.Category,
                    Description = string.IsNullOrEmpty(template.Description) ? "【手動臨時生成】" : $"【手動臨時生成】\n{template.Description}",
                    PurchaseUrl = template.PurchaseUrl
                }
            }
        };

        context.ExpenseRequests.Add(expenseRequest);

        // AuditLogの記録
        context.AuditLogs.Add(new AuditLog
        {
            TargetType = "ExpenseRequests",
            TargetId = expenseRequest.Id,
            UserId = template.UserId,
            Action = "CREATE_MANUAL_FROM_RECURRING",
            NewValue = "手動で定期払いテンプレートから下書き生成されました。"
        });

        // 次回生成日の計算（ユーザー指示により進める）
        if (template.RecurringFrequency == RecurringFrequency.Monthly)
        {
            template.NextGenerationDate = template.NextGenerationDate.AddMonths(1);
        }
        else if (template.RecurringFrequency == RecurringFrequency.Yearly)
        {
            template.NextGenerationDate = template.NextGenerationDate.AddYears(1);
        }

        template.UpdatedAt = DateTime.UtcNow;

        await context.SaveChangesAsync();

        return Ok(new { expenseRequestId = expenseRequest.Id });
    }
}
