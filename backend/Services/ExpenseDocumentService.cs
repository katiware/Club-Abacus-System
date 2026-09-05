using System.Text.Json;
using Club_Abacus_System.Data;
using Club_Abacus_System.DTOs;
using Club_Abacus_System.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Club_Abacus_System.Services;

public class ExpenseDocumentService(
    AppDbContext context,
    IFileStorageService fileStorageService) : IExpenseDocumentService
{
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".webp", ".pdf"
    };

    private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg", "image/png", "image/webp", "application/pdf"
    };

    private const long MaxFileSizeBytes = 10 * 1024 * 1024; // 10MB

    public async Task<ExpenseDocumentResponseDto> UploadDocumentAsync(Guid requestId, IFormFile file, DocumentType documentType, Guid currentUserId, bool hasAdminAccess)
    {
        var expenseRequest = await context.ExpenseRequests
            .Include(e => e.ExpenseDocuments)
            .FirstOrDefaultAsync(e => e.Id == requestId);

        if (expenseRequest == null)
        {
            throw new KeyNotFoundException("指定された経費申請が見つかりません。");
        }

        if (!CanManageDocuments(expenseRequest, currentUserId, hasAdminAccess))
        {
            throw new UnauthorizedAccessException("この申請の証憑ファイルを操作する権限がありません。");
        }

        if (file == null || file.Length == 0)
        {
            throw new ArgumentException("ファイルが選択されていないか、空のファイルです。");
        }

        if (file.Length > MaxFileSizeBytes)
        {
            throw new ArgumentException("ファイルサイズが上限（10MB）を超えています。");
        }

        var fileExtension = Path.GetExtension(file.FileName);
        if (string.IsNullOrEmpty(fileExtension) || !AllowedExtensions.Contains(fileExtension))
        {
            throw new ArgumentException("許可されていないファイル形式です。(.jpg, .jpeg, .png, .webp, .pdf のみ許可)");
        }

        if (!AllowedContentTypes.Contains(file.ContentType))
        {
            throw new ArgumentException($"不正なContent-Typeです: {file.ContentType}");
        }

        var existingDoc = expenseRequest.ExpenseDocuments
            .FirstOrDefault(d => d.DocumentType == documentType && d.DeletedAt == null);

        var isReplacement = existingDoc != null;

        string storageKey;
        await using (var stream = file.OpenReadStream())
        {
            storageKey = await fileStorageService.SaveFileAsync(stream, file.FileName, requestId.ToString());
        }

        if (isReplacement && existingDoc != null)
        {
            existingDoc.DeletedAt = DateTime.UtcNow;
        }

        var newDocument = new ExpenseDocument
        {
            Id = Guid.NewGuid(),
            RequestId = requestId,
            DocumentType = documentType,
            StorageKey = storageKey,
            OriginalFileName = Path.GetFileName(file.FileName),
            ContentType = file.ContentType,
            UploadedAt = DateTime.UtcNow
        };

        context.ExpenseDocuments.Add(newDocument);

        if (expenseRequest.Status == ExpenseStatus.Approved && documentType == DocumentType.Receipt)
        {
            expenseRequest.Status = ExpenseStatus.WaitingConfirmation;
            expenseRequest.UpdatedAt = DateTime.UtcNow;
        }

        var auditLog = new AuditLog
        {
            TargetType = "ExpenseDocuments",
            TargetId = newDocument.Id,
            UserId = currentUserId,
            Action = isReplacement ? "DOCUMENT_REPLACE" : "DOCUMENT_UPLOAD",
            OldValue = isReplacement && existingDoc != null
                ? JsonSerializer.Serialize(new { existingDoc.Id, existingDoc.OriginalFileName, existingDoc.DocumentType })
                : null,
            NewValue = JsonSerializer.Serialize(new { newDocument.Id, newDocument.OriginalFileName, newDocument.DocumentType }),
            CreatedAt = DateTime.UtcNow
        };
        context.AuditLogs.Add(auditLog);

        await context.SaveChangesAsync();

        return new ExpenseDocumentResponseDto
        {
            Id = newDocument.Id,
            RequestId = newDocument.RequestId,
            DocumentType = newDocument.DocumentType,
            OriginalFileName = newDocument.OriginalFileName,
            ContentType = newDocument.ContentType,
            UploadedAt = newDocument.UploadedAt
        };
    }

    public async Task<List<ExpenseDocumentResponseDto>> GetDocumentsAsync(Guid requestId, Guid currentUserId, bool hasAdminAccess)
    {
        var expenseRequest = await context.ExpenseRequests
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == requestId);

        if (expenseRequest == null)
        {
            throw new KeyNotFoundException("指定された経費申請が見つかりません。");
        }

        if (!CanManageDocuments(expenseRequest, currentUserId, hasAdminAccess))
        {
            throw new UnauthorizedAccessException("この申請の証憑ファイルを閲覧する権限がありません。");
        }

        return await context.ExpenseDocuments
            .AsNoTracking()
            .Where(d => d.RequestId == requestId && d.DeletedAt == null)
            .OrderBy(d => d.UploadedAt)
            .Select(d => new ExpenseDocumentResponseDto
            {
                Id = d.Id,
                RequestId = d.RequestId,
                DocumentType = d.DocumentType,
                OriginalFileName = d.OriginalFileName,
                ContentType = d.ContentType,
                UploadedAt = d.UploadedAt
            })
            .ToListAsync();
    }

    public async Task<(Stream Stream, string ContentType, string FileName)> GetDocumentFileAsync(Guid requestId, Guid documentId, Guid currentUserId, bool hasAdminAccess)
    {
        var expenseRequest = await context.ExpenseRequests
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == requestId);

        if (expenseRequest == null)
        {
            throw new KeyNotFoundException("指定された経費申請が見つかりません。");
        }

        if (!CanManageDocuments(expenseRequest, currentUserId, hasAdminAccess))
        {
            throw new UnauthorizedAccessException("この申請の証憑ファイルにアクセスする権限がありません。");
        }

        var document = await context.ExpenseDocuments
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.Id == documentId && d.RequestId == requestId && d.DeletedAt == null);

        if (document == null)
        {
            throw new KeyNotFoundException("指定された証憑ファイルが見つかりません。");
        }

        var fileResult = await fileStorageService.GetFileAsync(document.StorageKey);
        if (fileResult == null)
        {
            throw new KeyNotFoundException("ストレージ上にファイルが存在しません。");
        }

        return (fileResult.Value.Stream, fileResult.Value.ContentType, document.OriginalFileName);
    }

    public async Task DeleteDocumentAsync(Guid requestId, Guid documentId, Guid currentUserId, bool hasAdminAccess)
    {
        var expenseRequest = await context.ExpenseRequests
            .FirstOrDefaultAsync(e => e.Id == requestId);

        if (expenseRequest == null)
        {
            throw new KeyNotFoundException("指定された経費申請が見つかりません。");
        }

        if (!CanManageDocuments(expenseRequest, currentUserId, hasAdminAccess))
        {
            throw new UnauthorizedAccessException("この申請の証憑ファイルを削除する権限がありません。");
        }

        var document = await context.ExpenseDocuments
            .FirstOrDefaultAsync(d => d.Id == documentId && d.RequestId == requestId && d.DeletedAt == null);

        if (document == null)
        {
            throw new KeyNotFoundException("指定された証憑ファイルが見つかりません。");
        }

        document.DeletedAt = DateTime.UtcNow;

        var auditLog = new AuditLog
        {
            TargetType = "ExpenseDocuments",
            TargetId = document.Id,
            UserId = currentUserId,
            Action = "DOCUMENT_DELETE",
            OldValue = JsonSerializer.Serialize(new { document.Id, document.OriginalFileName, document.DocumentType }),
            NewValue = null,
            CreatedAt = DateTime.UtcNow
        };
        context.AuditLogs.Add(auditLog);

        await context.SaveChangesAsync();
    }

    private bool CanManageDocuments(ExpenseRequest request, Guid currentUserId, bool hasAdminAccess)
    {
        if (request.UserId == currentUserId)
        {
            return true;
        }

        return hasAdminAccess;
    }
}
