using Club_Abacus_System.Models;

namespace Club_Abacus_System.DTOs;

public class ExpenseDocumentResponseDto
{
    public Guid Id { get; set; }
    public Guid RequestId { get; set; }
    public DocumentType DocumentType { get; set; }
    public string OriginalFileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public DateTime UploadedAt { get; set; }
}
