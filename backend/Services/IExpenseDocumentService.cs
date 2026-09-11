using Club_Abacus_System.DTOs;
using Club_Abacus_System.Models;
using Microsoft.AspNetCore.Http;

namespace Club_Abacus_System.Services;

public interface IExpenseDocumentService
{
    Task<ExpenseDocumentResponseDto> UploadDocumentAsync(Guid requestId, IFormFile file, DocumentType documentType, Guid currentUserId, bool hasAdminAccess);
    
    Task<List<ExpenseDocumentResponseDto>> GetDocumentsAsync(Guid requestId, Guid currentUserId, bool hasAdminAccess);
    
    Task<(Stream Stream, string ContentType, string FileName)> GetDocumentFileAsync(Guid requestId, Guid documentId, Guid currentUserId, bool hasAdminAccess);
    
    Task DeleteDocumentAsync(Guid requestId, Guid documentId, Guid currentUserId, bool hasAdminAccess);
}
