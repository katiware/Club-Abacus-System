using System.ComponentModel.DataAnnotations;

namespace Club_Abacus_System.DTOs.Users;

public class UserUpdateDto
{
    [MaxLength(100)]
    public string? Name { get; set; }

    public Guid? RoleId { get; set; }

    [MaxLength(20)]
    public string? StudentId { get; set; }

    public int? EnrollmentYear { get; set; }

    [MaxLength(100)]
    public string? DiscordId { get; set; }

    public bool? IsActive { get; set; }
}
