using System.ComponentModel.DataAnnotations;
using Club_Abacus_System.Models;

namespace Club_Abacus_System.DTOs;

public class ExpenseStatusUpdateDto
{
    [Required]
    public ExpenseStatus Status { get; set; }

    public string? RejectionReason { get; set; }
}
