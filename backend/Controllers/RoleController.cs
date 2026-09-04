using System.Security.Claims;
using Club_Abacus_System.DTOs;
using Club_Abacus_System.Models;
using Club_Abacus_System.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Club_Abacus_System.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RoleController(RoleManager<Role> roleManager) : ControllerBase
{
    /// <summary>
    /// ロール一覧を取得します。
    /// </summary>
    [HttpGet]
    [RequirePermission(PermissionType.ManageRoles)]
    public async Task<ActionResult<List<Role>>> GetRoles()
    {
        var roles = await roleManager.Roles
            .OrderBy(r => r.Name)
            .ToListAsync();

        return Ok(roles);
    }

    /// <summary>
    /// 特定のロールをIDで取得します。
    /// </summary>
    [HttpGet("{id}")]
    [RequirePermission(PermissionType.ManageRoles)]
    public async Task<ActionResult<Role>> GetRoleById(Guid id)
    {
        var role = await roleManager.FindByIdAsync(id.ToString());

        if (role == null)
        {
            return NotFound("指定されたロールは見つかりません。");
        }

        return Ok(role);
    }

    /// <summary>
    /// 新規ロールを作成します。
    /// </summary>
    [HttpPost]
    [RequirePermission(PermissionType.ManageRoles)]
    public async Task<ActionResult<Role>> CreateRole([FromBody] RoleCreateDto dto)
    {
        // 同名のロールが既に存在しないか確認
        var exists = await roleManager.RoleExistsAsync(dto.Name);
        if (exists)
        {
            return BadRequest($"「{dto.Name}」というロールはすでに存在します。");
        }

        var role = new Role
        {
            Name = dto.Name,
            Description = dto.Description
        };

        var result = await roleManager.CreateAsync(role);

        if (!result.Succeeded)
        {
            return BadRequest(result.Errors);
        }

        // 権限（クレーム）を一括付与（重複を除外して登録）
        foreach (var permission in dto.Permissions.Distinct())
        {
            await roleManager.AddClaimAsync(role, new Claim("Permission", permission.ToString()));
        }

        return CreatedAtAction(nameof(GetRoleById), new { id = role.Id }, role);
    }

    /// <summary>
    /// ロール情報を更新します。
    /// </summary>
    [HttpPut("{id}")]
    [RequirePermission(PermissionType.ManageRoles)]
    public async Task<IActionResult> UpdateRole(Guid id, [FromBody] RoleUpdateDto dto)
    {
        var role = await roleManager.FindByIdAsync(id.ToString());

        if (role == null)
        {
            return NotFound("指定されたロールは見つかりません。");
        }

        // 名前を変更する場合、重複チェック
        if (dto.Name != null && dto.Name != role.Name)
        {
            var exists = await roleManager.RoleExistsAsync(dto.Name);
            if (exists)
            {
                return BadRequest($"「{dto.Name}」というロールはすでに存在します。");
            }
            role.Name = dto.Name;
        }

        if (dto.Description != null) role.Description = dto.Description;

        var result = await roleManager.UpdateAsync(role);

        if (!result.Succeeded)
        {
            return BadRequest(result.Errors);
        }

        return NoContent();
    }

    /// <summary>
    /// ロールを削除します。
    /// ユーザーが紐づいているロールは削除できません。
    /// </summary>
    [HttpDelete("{id}")]
    [RequirePermission(PermissionType.ManageRoles)]
    public async Task<IActionResult> DeleteRole(Guid id)
    {
        var role = await roleManager.Roles
            .Include(r => r.Users)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (role == null)
        {
            return NotFound("指定されたロールは見つかりません。");
        }

        // ユーザーが紐づいている場合は削除不可
        if (role.Users.Count > 0)
        {
            return BadRequest($"このロールには {role.Users.Count} 人のユーザーが紐づいているため削除できません。先にユーザーのロールを変更してください。");
        }

        var result = await roleManager.DeleteAsync(role);

        if (!result.Succeeded)
        {
            return BadRequest(result.Errors);
        }

        return NoContent();
    }

    /// <summary>
    /// ロールに付与されている権限（クレーム）一覧を取得します。
    /// </summary>
    [HttpGet("{id}/permissions")]
    [RequirePermission(PermissionType.ManageRoles)]
    public async Task<ActionResult<List<string>>> GetRolePermissions(Guid id)
    {
        var role = await roleManager.FindByIdAsync(id.ToString());

        if (role == null)
        {
            return NotFound("指定されたロールは見つかりません。");
        }

        var claims = await roleManager.GetClaimsAsync(role);

        // "Permission" クレームのみ取り出して値（権限名）のリストとして返す
        var permissions = claims
            .Where(c => c.Type == "Permission")
            .Select(c => c.Value)
            .ToList();

        return Ok(permissions);
    }

    /// <summary>
    /// ロールに権限を付与します。
    /// </summary>
    [HttpPost("{id}/permissions")]
    [RequirePermission(PermissionType.ManageRoles)]
    public async Task<IActionResult> AddPermissionToRole(Guid id, [FromBody] RolePermissionDto dto)
    {
        var role = await roleManager.FindByIdAsync(id.ToString());

        if (role == null)
        {
            return NotFound("指定されたロールは見つかりません。");
        }

        var permissionValue = dto.Permission.ToString();

        // すでに同じ権限が付与されていないか確認
        var existingClaims = await roleManager.GetClaimsAsync(role);
        var alreadyGranted = existingClaims.Any(c => c.Type == "Permission" && c.Value == permissionValue);

        if (alreadyGranted)
        {
            return BadRequest($"このロールにはすでに「{permissionValue}」権限が付与されています。");
        }

        var result = await roleManager.AddClaimAsync(role, new Claim("Permission", permissionValue));

        if (!result.Succeeded)
        {
            return BadRequest(result.Errors);
        }

        return NoContent();
    }

    /// <summary>
    /// ロールから権限を取り消します。
    /// </summary>
    [HttpDelete("{id}/permissions/{permissionType}")]
    [RequirePermission(PermissionType.ManageRoles)]
    public async Task<IActionResult> RemovePermissionFromRole(Guid id, string permissionType)
    {
        var role = await roleManager.FindByIdAsync(id.ToString());

        if (role == null)
        {
            return NotFound("指定されたロールは見つかりません。");
        }

        // 文字列を PermissionType Enum に変換して検証
        if (!Enum.TryParse<PermissionType>(permissionType, out _))
        {
            return BadRequest($"「{permissionType}」は有効な権限名ではありません。");
        }

        var existingClaims = await roleManager.GetClaimsAsync(role);
        var claimToRemove = existingClaims.FirstOrDefault(c => c.Type == "Permission" && c.Value == permissionType);

        if (claimToRemove == null)
        {
            return BadRequest($"このロールには「{permissionType}」権限が付与されていません。");
        }

        var result = await roleManager.RemoveClaimAsync(role, claimToRemove);

        if (!result.Succeeded)
        {
            return BadRequest(result.Errors);
        }

        return NoContent();
    }
}
