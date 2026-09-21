using System.ComponentModel.DataAnnotations;

namespace Club_Abacus_System.DTOs.Expenses;

public class RemandRequestDto
{
    [Required]
    [MaxLength(1000)]
    public string Reason { get; set; } = string.Empty;
}
