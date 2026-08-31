using System.ComponentModel.DataAnnotations;

namespace Club_Abacus_System.DTOs;

public class RoleUpdateDto
{
    [MaxLength(256)]
    public string? Name { get; set; }

    [MaxLength(255)]
    public string? Description { get; set; }
}
