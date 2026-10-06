using Club_Abacus_System.Data;
using Club_Abacus_System.DTOs;
using Club_Abacus_System.DTOs.Expenses;
using Club_Abacus_System.DTOs.FiscalYears;
using Club_Abacus_System.DTOs.RecurringExpenses;
using Club_Abacus_System.DTOs.Roles;
using Club_Abacus_System.DTOs.Submissions;
using Club_Abacus_System.DTOs.System;
using Club_Abacus_System.DTOs.Users;
using Club_Abacus_System.Models;
using Club_Abacus_System.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

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
                StudentId = u.StudentId,
                EnrollmentYear = u.EnrollmentYear,
                IsActive = u.IsActive,
                CreatedAt = u.CreatedAt
            })
            .ToListAsync();

        return Ok(users);
    }

    /// <summary>
    /// ログイン中の自身の情報を取得します。
    /// </summary>
    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserResponseDto>> GetMyProfile()
    {
        var userIdString = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (userIdString == null || !Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var user = await context.Users
            .AsNoTracking()
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null) return NotFound("ユーザーが見つかりません。");

        return Ok(new UserResponseDto
        {
            Id = user.Id,
            Email = user.Email ?? "",
            Name = user.Name,
            RoleId = user.RoleId,
            RoleName = user.Role?.Name,
            DiscordId = user.DiscordId,
            StudentId = user.StudentId,
            EnrollmentYear = user.EnrollmentYear,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt
        });
    }

    /// <summary>
    /// ログイン中の自身の情報を更新します。
    /// </summary>
    [HttpPut("me")]
    [Authorize]
    public async Task<IActionResult> UpdateMyProfile([FromBody] UserUpdateDto dto)
    {
        var userIdString = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (userIdString == null || !Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user == null) return NotFound("ユーザーが見つかりません。");

        if (dto.Name != null) user.Name = dto.Name;
        
        user.UpdatedAt = DateTime.UtcNow;
        var result = await userManager.UpdateAsync(user);

        if (!result.Succeeded) return BadRequest(result.Errors);

        return NoContent();
    }

    /// <summary>
    /// 特定のユーザーをIDで取得します。
    /// </summary>
    [HttpGet("{id:guid}")]
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
            StudentId = user.StudentId,
            EnrollmentYear = user.EnrollmentYear,
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
        var role = await context.Roles.FirstOrDefaultAsync(r => r.Id == dto.RoleId);
        if (role == null)
        {
            return BadRequest("指定されたRoleは存在しません。");
        }

        // 管理者(ADMIN)以外の場合は、近畿大学のドメインに制限する
        if (role.Name != "ADMIN" && !dto.Email.EndsWith("@hiro.kindai.ac.jp"))
        {
            return BadRequest("一般部員および主将会計のメールアドレスは @hiro.kindai.ac.jp ドメインである必要があります。");
        }

        var user = new User
        {
            UserName = dto.Email, // Identityの仕様でUserNameは必須
            Email = dto.Email,
            Name = dto.Name,
            StudentId = dto.StudentId,
            EnrollmentYear = dto.EnrollmentYear,
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
        // `role` は既に上部で定義・取得済みのためここでは再取得しない
        var responseDto = new UserResponseDto
        {
            Id = user.Id,
            Email = user.Email,
            Name = user.Name,
            RoleId = user.RoleId,
            RoleName = role?.Name,
            DiscordId = user.DiscordId,
            StudentId = user.StudentId,
            EnrollmentYear = user.EnrollmentYear,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt
        };

        return CreatedAtAction(nameof(GetUserById), new { id = user.Id }, responseDto);
    }

    /// <summary>
    /// ユーザー情報を更新します。
    /// </summary>
    [HttpPut("{id:guid}")]
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
        if (dto.StudentId != null) user.StudentId = dto.StudentId;
        if (dto.EnrollmentYear.HasValue) user.EnrollmentYear = dto.EnrollmentYear.Value;
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

    /// <summary>
    /// Excelファイルから部員を一括登録します。
    /// </summary>
    [HttpPost("import")]
    [RequirePermission(PermissionType.ManageUsers)]
    public async Task<IActionResult> ImportUsers(IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest("ファイルが選択されていません。");
        }

        if (!file.FileName.EndsWith(".xlsx"))
        {
            return BadRequest("Excelファイル(.xlsx)をアップロードしてください。");
        }

        var userRole = await context.Roles.FirstOrDefaultAsync(r => r.Name == "USER");
        if (userRole == null) return StatusCode(500, "システムにUSERロールが存在しません。");

        var importedUsers = new List<User>();
        var errors = new List<string>();
        int rowNumber = 1;

        try
        {
            using var stream = new MemoryStream();
            await file.CopyToAsync(stream);
            
            using var workbook = new ClosedXML.Excel.XLWorkbook(stream);
            var worksheet = workbook.Worksheet(1); // 最初のシート
            
            var rows = worksheet.RangeUsed()?.RowsUsed();
            if (rows == null) return BadRequest("データが見つかりません。");

            bool isHeaderFound = false;

            foreach (var row in rows)
            {
                // ヘッダー行を探す（4列目に「学籍番号」が含まれているか）
                if (!isHeaderFound)
                {
                    if (row.Cell(4).GetString().Contains("学籍番号"))
                    {
                        isHeaderFound = true;
                    }
                    rowNumber++;
                    continue;
                }

                var studentId = row.Cell(4).GetString().Trim();
                var name = row.Cell(5).GetString().Trim();

                // 空行はスキップ
                if (string.IsNullOrEmpty(studentId) && string.IsNullOrEmpty(name))
                {
                    rowNumber++;
                    continue;
                }

                if (string.IsNullOrEmpty(studentId) || string.IsNullOrEmpty(name))
                {
                    errors.Add($"{rowNumber}行目: 氏名または学籍番号が空です。");
                    rowNumber++;
                    continue;
                }

                // メールアドレスを自動生成（学籍番号@hiro.kindai.ac.jp）
                var email = $"{studentId}@hiro.kindai.ac.jp".ToLower();

                // 入学年度を自動算出（学籍番号の先頭2桁を西暦の下2桁とみなす）
                int? enrollmentYear = null;
                if (studentId.Length >= 2 && int.TryParse(studentId.Substring(0, 2), out int yearPrefix))
                {
                    enrollmentYear = 2000 + yearPrefix;
                }

                var existingUser = await userManager.FindByEmailAsync(email);
                if (existingUser != null)
                {
                    errors.Add($"{rowNumber}行目: 学籍番号 {studentId} (メールアドレス: {email}) は既に登録されています。");
                }
                else
                {
                    var newUser = new User
                    {
                        UserName = email,
                        Email = email,
                        Name = name,
                        StudentId = studentId,
                        EnrollmentYear = enrollmentYear,
                        RoleId = userRole.Id,
                        IsActive = true
                    };

                    var result = await userManager.CreateAsync(newUser);
                    if (result.Succeeded)
                    {
                        await userManager.AddToRoleAsync(newUser, "USER");
                        importedUsers.Add(newUser);
                    }
                    else
                    {
                        errors.Add($"{rowNumber}行目: 登録に失敗しました。{string.Join(", ", result.Errors.Select(e => e.Description))}");
                    }
                }
                rowNumber++;
            }
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"ファイルの読み込み中にエラーが発生しました: {ex.Message}");
        }

        return Ok(new
        {
            Message = $"{importedUsers.Count} 人のユーザーをインポートしました。",
            Errors = errors
        });
    }
}
