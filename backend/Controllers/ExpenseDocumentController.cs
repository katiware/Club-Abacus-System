using System.Security.Claims;
using Club_Abacus_System.DTOs;
using Club_Abacus_System.Models;
using Club_Abacus_System.Security;
using Club_Abacus_System.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Club_Abacus_System.Controllers;

[ApiController]
[Route("api/expenses/{requestId}/documents")]
[Authorize]
public class ExpenseDocumentController(IExpenseDocumentService expenseDocumentService) : ControllerBase
{
    /// <summary>
    /// 経費申請に対する証憑ファイル（領収書・見積書・請求書等）をアップロードします。
    /// </summary>
    [HttpPost]
    [RequestSizeLimit(12 * 1024 * 1024)]
    [RequirePermission(PermissionType.ExpenseManageOwn)]
    public async Task<ActionResult<ExpenseDocumentResponseDto>> UploadDocument(
        Guid requestId,
        [FromForm] IFormFile file,
        [FromForm] DocumentType documentType)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
        {
            return Unauthorized("ユーザー情報が取得できません。再度ログインしてください。");
        }

        var hasAdminAccess = HasAdminAccess();

        try
        {
            var responseDto = await expenseDocumentService.UploadDocumentAsync(requestId, file, documentType, currentUserId.Value, hasAdminAccess);
            return CreatedAtAction(nameof(GetDocumentFile), new { requestId, documentId = responseDto.Id }, responseDto);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>
    /// 指定された申請に紐づくアクティブな証憑ファイル一覧を取得します。
    /// </summary>
    [HttpGet]
    [RequirePermission(PermissionType.ExpenseManageOwn)]
    public async Task<ActionResult<List<ExpenseDocumentResponseDto>>> GetDocuments(Guid requestId)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
        {
            return Unauthorized("ユーザー情報が取得できません。");
        }

        var hasAdminAccess = HasAdminAccess();

        try
        {
            var documents = await expenseDocumentService.GetDocumentsAsync(requestId, currentUserId.Value, hasAdminAccess);
            return Ok(documents);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
    }

    /// <summary>
    /// 証憑ファイル本体をストリームで取得（表示・ダウンロード）します。
    /// </summary>
    [HttpGet("{documentId}/file")]
    [RequirePermission(PermissionType.ExpenseManageOwn)]
    public async Task<IActionResult> GetDocumentFile(Guid requestId, Guid documentId, [FromQuery] bool download = false)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
        {
            return Unauthorized("ユーザー情報が取得できません。");
        }

        var hasAdminAccess = HasAdminAccess();

        try
        {
            var (stream, contentType, fileName) = await expenseDocumentService.GetDocumentFileAsync(requestId, documentId, currentUserId.Value, hasAdminAccess);
            
            if (download)
            {
                return File(stream, contentType, fileName);
            }

            // インラインプレビュー用（ヘッダーでファイル名も指定）
            Response.Headers.Append("Content-Disposition", $"inline; filename=\"{Uri.EscapeDataString(fileName)}\"");
            return File(stream, contentType);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
    }

    /// <summary>
    /// 証憑ファイルを論理削除します。
    /// </summary>
    [HttpDelete("{documentId}")]
    [RequirePermission(PermissionType.ExpenseManageOwn)]
    public async Task<IActionResult> DeleteDocument(Guid requestId, Guid documentId)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
        {
            return Unauthorized("ユーザー情報が取得できません。");
        }

        var hasAdminAccess = HasAdminAccess();

        try
        {
            await expenseDocumentService.DeleteDocumentAsync(requestId, documentId, currentUserId.Value, hasAdminAccess);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
    }

    private Guid? GetCurrentUserId()
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(userIdString, out var currentUserId) ? currentUserId : null;
    }

    private bool HasAdminAccess()
    {
        return User.HasClaim("Permission", PermissionType.ExpenseConfirmReceipt.ToString()) ||
               User.HasClaim("Permission", PermissionType.ExpenseApprove.ToString()) ||
               User.HasClaim("Permission", PermissionType.ManageMasterData.ToString());
    }
}
