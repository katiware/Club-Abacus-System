using System.ComponentModel.DataAnnotations;
using Club_Abacus_System.Models;

namespace Club_Abacus_System.DTOs;

public class RolePermissionDto
{
    [Required]
    public PermissionType Permission { get; set; }
}
