using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;

namespace Club_Abacus_System.Models;

public class Role : IdentityRole<Guid>
{
    [MaxLength(255)]
    public string? Description { get; set; } // ロールの説明

    public ICollection<User> Users { get; set; } = new List<User>();
}
