using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Club_Abacus_System.Models;

public class ExpenseDocument
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid RequestId { get; set; }//外部キー

    [Required]
    public DocumentType DocumentType { get; set; }//書類種別。RECEIPT、ESTIMATE_OR_INVOICE、STATEMENT

    [Required]
    [MaxLength(1000)]
    public string StorageKey { get; set; } = string.Empty;// S3などのストレージ内でファイルを識別するためのキー

    [Required]
    [MaxLength(255)]
    public string OriginalFileName { get; set; } = string.Empty;//表示用のファイル名

    [Required]
    [MaxLength(100)]
    public string ContentType { get; set; } = string.Empty;//application/pdf、image/jpeg、image/pngなど

    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

    public DateTime? DeletedAt { get; set; }

    [ForeignKey(nameof(RequestId))]
    [System.Text.Json.Serialization.JsonIgnore]
    public ExpenseRequest ExpenseRequest { get; set; } = null!;
}