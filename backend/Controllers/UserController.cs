using Club_Abacus_System.Data;
using Club_Abacus_System.DTOs;
using Club_Abacus_System.Models;
using Club_Abacus_System.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Club_Abacus_System.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UserController(UserManager<User> userManager, AppDbContext context) : ControllerBase
{
    /// <summary>
    /// ユーザー一覧を取得します。
    /// </summary>
    [HttpGet]
    [RequirePermission(PermissionType.ManageUsers)]
    public async Task<ActionResult<List<UserResponseDto>>> GetUsers()
    {
        var users = await context.Users
            .AsNoTracking()
            .Include(u => u.Role)
            .Select(u => new UserResponseDto
            {
                Id = u.Id,
                Email = u.Email ?? "",
                Name = u.Name,
                RoleId = u.RoleId,
                RoleName = u.Role != null ? u.Role.Name : null,
                DiscordId = u.DiscordId,
                IsActive = u.IsActive,
                CreatedAt = u.CreatedAt
            })
            .ToListAsync();

        return Ok(users);
    }

    /// <summary>
    /// 特定のユーザーをIDで取得します。
    /// </summary>
    [HttpGet("{id}")]
    [RequirePermission(PermissionType.ManageUsers)]
    public async Task<ActionResult<UserResponseDto>> GetUserById(Guid id)
    {
        var user = await context.Users
            .AsNoTracking()
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user == null)
        {
            return NotFound("指定されたユーザーは見つかりません。");
        }

        var responseDto = new UserResponseDto
        {
            Id = user.Id,
            Email = user.Email ?? "",
            Name = user.Name,
            RoleId = user.RoleId,
            RoleName = user.Role?.Name,
            DiscordId = user.DiscordId,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt
        };

        return Ok(responseDto);
    }

    /// <summary>
    /// 新規ユーザーを作成します（手動追加用）。
    /// </summary>
    [HttpPost]
    [RequirePermission(PermissionType.ManageUsers)]
    public async Task<ActionResult<UserResponseDto>> CreateUser([FromBody] UserCreateDto dto)
    {
        // Roleの存在確認
        var roleExists = await context.Roles.AnyAsync(r => r.Id == dto.RoleId);
        if (!roleExists)
        {
            return BadRequest("指定されたRoleは存在しません。");
        }

        var user = new User
        {
            UserName = dto.Email, // Identityの仕様でUserNameは必須
            Email = dto.Email,
            Name = dto.Name,
            RoleId = dto.RoleId,
            DiscordId = dto.DiscordId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var result = await userManager.CreateAsync(user);

        if (!result.Succeeded)
        {
            return BadRequest(result.Errors);
        }

        var role = await context.Roles.FindAsync(dto.RoleId);

        var responseDto = new UserResponseDto
        {
            Id = user.Id,
            Email = user.Email,
            Name = user.Name,
            RoleId = user.RoleId,
            RoleName = role?.Name,
            DiscordId = user.DiscordId,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt
        };

        return CreatedAtAction(nameof(GetUserById), new { id = user.Id }, responseDto);
    }

    /// <summary>
    /// ユーザー情報を更新します。
    /// </summary>
    [HttpPut("{id}")]
    [RequirePermission(PermissionType.ManageUsers)]
    public async Task<IActionResult> UpdateUser(Guid id, [FromBody] UserUpdateDto dto)
    {
        var user = await userManager.FindByIdAsync(id.ToString());

        if (user == null)
        {
            return NotFound("指定されたユーザーは見つかりません。");
        }

        if (dto.Name != null) user.Name = dto.Name;
        if (dto.DiscordId != null) user.DiscordId = dto.DiscordId;
        if (dto.IsActive.HasValue) user.IsActive = dto.IsActive.Value;

        if (dto.RoleId.HasValue)
        {
            var roleExists = await context.Roles.AnyAsync(r => r.Id == dto.RoleId.Value);
            if (!roleExists) return BadRequest("指定されたRoleは存在しません。");
            user.RoleId = dto.RoleId.Value;
        }

        var result = await userManager.UpdateAsync(user);

        if (!result.Succeeded)
        {
            return BadRequest(result.Errors);
        }

        // 更新が成功した場合のみ UpdatedAt を記録
        user.UpdatedAt = DateTime.UtcNow;
        await userManager.UpdateAsync(user);

        return NoContent();
    }

    /// <summary>
    /// ユーザーを削除（無効化）します。
    /// 安全のため物理削除ではなく論理削除（IsActive = false）を推奨します。
    /// </summary>
    [HttpDelete("{id}")]
    [RequirePermission(PermissionType.ManageUsers)]
    public async Task<IActionResult> DeactivateUser(Guid id)
    {
        var user = await userManager.FindByIdAsync(id.ToString());

        if (user == null)
        {
            return NotFound("指定されたユーザーは見つかりません。");
        }

        user.IsActive = false;

        var result = await userManager.UpdateAsync(user);

        if (!result.Succeeded)
        {
            return BadRequest(result.Errors);
        }

        // 更新が成功した場合のみ UpdatedAt を記録
        user.UpdatedAt = DateTime.UtcNow;
        await userManager.UpdateAsync(user);

        return NoContent();
    }
}
