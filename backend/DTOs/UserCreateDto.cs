using System.ComponentModel.DataAnnotations;

namespace Club_Abacus_System.DTOs;

public class UserCreateDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    public Guid RoleId { get; set; }

    [MaxLength(100)]
    public string DiscordId { get; set; } = string.Empty;
}
