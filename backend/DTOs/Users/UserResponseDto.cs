namespace Club_Abacus_System.DTOs.Users;

public class UserResponseDto
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public Guid RoleId { get; set; }
    public string? RoleName { get; set; } 
    public string DiscordId { get; set; } = string.Empty;
    public string StudentId { get; set; } = string.Empty;
    public int? EnrollmentYear { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}
