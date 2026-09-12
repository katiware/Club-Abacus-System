using Club_Abacus_System.Models;
using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations;

namespace Club_Abacus_System.DTOs.Expenses;

public class ExpenseDocumentUploadDto
{
    [Required]
    public DocumentType DocumentType { get; set; }

    [Required]
    public IFormFile File { get; set; } = null!;
}
