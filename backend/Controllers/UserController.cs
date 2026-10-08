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
    /// 学校名簿とフォーム回答から部員情報を同期します。
    /// </summary>
    [HttpPost("sync")]
    [RequirePermission(PermissionType.ManageUsers)]
    public async Task<IActionResult> SyncUsers(IFormFile? schoolListFile, IFormFile? formListFile)
    {
        if ((schoolListFile == null || schoolListFile.Length == 0) &&
            (formListFile == null || formListFile.Length == 0))
        {
            return BadRequest("ファイルが選択されていません。");
        }

        var userRole = await context.Roles.FirstOrDefaultAsync(r => r.Name == "USER");
        if (userRole == null) return StatusCode(500, "システムにUSERロールが存在しません。");

        var errors = new List<string>();
        int addedCount = 0;
        int updatedCount = 0;
        int deactivatedCount = 0;
        int discordUpdatedCount = 0;

        // 入力値の安全性・文字数チェック用ローカル関数
        bool IsValidInput(string input, int maxLength, out string errorMessage)
        {
            errorMessage = "";
            if (string.IsNullOrEmpty(input)) return true;
            if (input.Length > maxLength)
            {
                errorMessage = $"{maxLength}文字を超えています。";
                return false;
            }
            // 簡易的なXSS対策（HTMLタグの拒否）
            if (input.Contains("<") || input.Contains(">"))
            {
                errorMessage = "不正な文字（< または >）が含まれています。";
                return false;
            }
            return true;
        }

        // --- 1. 学校名簿の処理 (新規追加・名前更新・退部者無効化) ---
        if (schoolListFile != null && schoolListFile.Length > 0)
        {
            if (!schoolListFile.FileName.EndsWith(".xlsx"))
            {
                return BadRequest("学校名簿はExcelファイル(.xlsx)をアップロードしてください。");
            }

            try
            {
                using var stream = new MemoryStream();
                await schoolListFile.CopyToAsync(stream);
                using var workbook = new ClosedXML.Excel.XLWorkbook(stream);
                var worksheet = workbook.Worksheet(1);
                var rows = worksheet.RangeUsed()?.RowsUsed();

                if (rows != null)
                {
                    bool isHeaderFound = false;
                    int studentIdCol = -1;
                    int nameCol = -1;
                    int rowNumber = 1;

                    var schoolListMembers = new Dictionary<string, string>(); // StudentId -> Name

                    foreach (var row in rows)
                    {
                        if (!isHeaderFound)
                        {
                            // ヘッダー行を探す（列名を柔軟に判定）
                            for (int col = 1; col <= row.LastCellUsed()?.Address.ColumnNumber; col++)
                            {
                                var cellValue = row.Cell(col).GetString().Trim();
                                if (cellValue.Contains("学籍番号")) studentIdCol = col;
                                if (cellValue.Contains("氏名") || cellValue.Contains("名前")) nameCol = col;
                            }

                            if (studentIdCol != -1 && nameCol != -1)
                            {
                                isHeaderFound = true;
                            }
                            rowNumber++;
                            continue;
                        }

                        var studentId = row.Cell(studentIdCol).GetString().Trim();
                        var name = row.Cell(nameCol).GetString().Trim();

                        if (string.IsNullOrEmpty(studentId) && string.IsNullOrEmpty(name))
                        {
                            rowNumber++;
                            continue;
                        }

                        if (string.IsNullOrEmpty(studentId) || string.IsNullOrEmpty(name))
                        {
                            errors.Add($"学校名簿 {rowNumber}行目: 氏名または学籍番号が空です。");
                            rowNumber++;
                            continue;
                        }

                        // バリデーション（文字数とHTMLタグ）
                        if (!IsValidInput(studentId, 20, out string sidErr))
                        {
                            errors.Add($"学校名簿 {rowNumber}行目: 学籍番号が不正です ({sidErr})");
                            rowNumber++;
                            continue;
                        }
                        if (!IsValidInput(name, 100, out string nameErr))
                        {
                            errors.Add($"学校名簿 {rowNumber}行目: 氏名が不正です ({nameErr})");
                            rowNumber++;
                            continue;
                        }

                        schoolListMembers[studentId] = name;
                        rowNumber++;
                    }

                    // DB上の現在のユーザー(ロールがUSER、または全員)を取得
                    var allUsers = await userManager.Users
                        .Include(u => u.Role)
                        .Where(u => u.Role.Name == "USER") // 一般部員のみ対象
                        .ToListAsync();

                    // DBに存在するが名簿にいない人を無効化
                    foreach (var user in allUsers)
                    {
                        if (user.IsActive && !schoolListMembers.ContainsKey(user.StudentId))
                        {
                            try
                            {
                                user.IsActive = false;
                                user.UpdatedAt = DateTime.UtcNow;
                                await userManager.UpdateAsync(user);
                                deactivatedCount++;
                            }
                            catch (Exception ex)
                            {
                                errors.Add($"ユーザーの無効化に失敗しました (学籍番号: {user.StudentId}): {ex.Message}");
                            }
                        }
                    }

                    // 名簿にいる人の追加・更新
                    foreach (var kvp in schoolListMembers)
                    {
                        var studentId = kvp.Key;
                        var name = kvp.Value;
                        
                        try
                        {
                            var email = $"{studentId}@hiro.kindai.ac.jp".ToLower();
                            var existingUser = allUsers.FirstOrDefault(u => u.StudentId == studentId);
                            
                            if (existingUser == null)
                            {
                                // 新規追加
                                int? enrollmentYear = null;
                                if (studentId.Length >= 2 && int.TryParse(studentId.Substring(0, 2), out int yearPrefix))
                                {
                                    enrollmentYear = 2000 + yearPrefix;
                                }

                                var newUser = new User
                                {
                                    UserName = email,
                                    Email = email,
                                    Name = name,
                                    StudentId = studentId,
                                    EnrollmentYear = enrollmentYear,
                                    RoleId = userRole.Id,
                                    IsActive = true,
                                    CreatedAt = DateTime.UtcNow,
                                    UpdatedAt = DateTime.UtcNow
                                };

                                var result = await userManager.CreateAsync(newUser);
                                if (result.Succeeded)
                                {
                                    await userManager.AddToRoleAsync(newUser, "USER");
                                    addedCount++;
                                    allUsers.Add(newUser); 
                                }
                                else
                                {
                                    errors.Add($"学校名簿 学籍番号 {studentId} の登録に失敗: {string.Join(", ", result.Errors.Select(e => e.Description))}");
                                }
                            }
                            else
                            {
                                // 既存ユーザーの更新
                                bool isUpdated = false;
                                if (existingUser.Name != name)
                                {
                                    existingUser.Name = name;
                                    isUpdated = true;
                                }
                                if (!existingUser.IsActive)
                                {
                                    existingUser.IsActive = true;
                                    isUpdated = true;
                                }

                                if (isUpdated)
                                {
                                    existingUser.UpdatedAt = DateTime.UtcNow;
                                    await userManager.UpdateAsync(existingUser);
                                    updatedCount++;
                                }
                            }
                        }
                        catch (Exception ex)
                        {
                            errors.Add($"学校名簿のユーザー処理中にエラーが発生しました (学籍番号: {studentId}): {ex.Message}");
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                errors.Add($"学校名簿のファイル読み込み中にエラーが発生しました: {ex.Message}");
            }
        }

        // --- 2. フォーム回答の処理 (Discord IDの更新) ---
        if (formListFile != null && formListFile.Length > 0)
        {
            if (!formListFile.FileName.EndsWith(".xlsx") && !formListFile.FileName.EndsWith(".csv"))
            {
                return BadRequest("フォーム回答はExcelファイル(.xlsx)またはCSVファイル(.csv)をアップロードしてください。");
            }

            try
            {
                using var stream = new MemoryStream();
                await formListFile.CopyToAsync(stream);
                stream.Position = 0;

                var formMembers = new Dictionary<string, string>(); // StudentId -> DiscordId

                if (formListFile.FileName.EndsWith(".xlsx"))
                {
                    using var workbook = new ClosedXML.Excel.XLWorkbook(stream);
                    var worksheet = workbook.Worksheet(1);
                    var rows = worksheet.RangeUsed()?.RowsUsed();

                    if (rows != null)
                    {
                        bool isHeaderFound = false;
                        int studentIdCol = -1;
                        int discordCol = -1;

                        foreach (var row in rows)
                        {
                            if (!isHeaderFound)
                            {
                                for (int col = 1; col <= row.LastCellUsed()?.Address.ColumnNumber; col++)
                                {
                                    var cellValue = row.Cell(col).GetString().Trim();
                                    if (cellValue.Contains("学籍番号")) studentIdCol = col;
                                    if (cellValue.Contains("Discord", StringComparison.OrdinalIgnoreCase)) discordCol = col;
                                }

                                if (studentIdCol != -1 && discordCol != -1)
                                {
                                    isHeaderFound = true;
                                }
                                continue;
                            }

                            var studentId = row.Cell(studentIdCol).GetString().Trim();
                            var discordId = row.Cell(discordCol).GetString().Trim();

                            if (!string.IsNullOrEmpty(studentId) && !string.IsNullOrEmpty(discordId))
                            {
                                if (!IsValidInput(studentId, 20, out _) || !IsValidInput(discordId, 100, out string discordErr))
                                {
                                    errors.Add($"フォーム回答 (Excel) 学籍番号 {studentId} のデータをスキップしました: {discordErr}");
                                }
                                else
                                {
                                    formMembers[studentId] = discordId;
                                }
                            }
                        }
                    }
                }
                else if (formListFile.FileName.EndsWith(".csv"))
                {
                    // CSVパース
                    using var reader = new StreamReader(stream);
                    bool isHeaderFound = false;
                    int studentIdCol = -1;
                    int discordCol = -1;
                    int rowNum = 1;

                    while (!reader.EndOfStream)
                    {
                        var line = await reader.ReadLineAsync();
                        rowNum++;
                        if (string.IsNullOrWhiteSpace(line)) continue;

                        var values = line.Split(',');

                        if (!isHeaderFound)
                        {
                            for (int col = 0; col < values.Length; col++)
                            {
                                var cellValue = values[col].Trim('\"', ' ');
                                if (cellValue.Contains("学籍番号")) studentIdCol = col;
                                if (cellValue.Contains("Discord", StringComparison.OrdinalIgnoreCase)) discordCol = col;
                            }
                            if (studentIdCol != -1 && discordCol != -1)
                            {
                                isHeaderFound = true;
                            }
                            continue;
                        }

                        if (studentIdCol != -1 && discordCol != -1 && studentIdCol < values.Length && discordCol < values.Length)
                        {
                            var studentId = values[studentIdCol].Trim('\"', ' ');
                            var discordId = values[discordCol].Trim('\"', ' ');
                            if (!string.IsNullOrEmpty(studentId) && !string.IsNullOrEmpty(discordId))
                            {
                                if (!IsValidInput(studentId, 20, out _) || !IsValidInput(discordId, 100, out string discordErr))
                                {
                                    errors.Add($"フォーム回答 (CSV) 学籍番号 {studentId} のデータをスキップしました: {discordErr}");
                                }
                                else
                                {
                                    formMembers[studentId] = discordId;
                                }
                            }
                        }
                    }
                }

                // Discord IDの更新
                var allUsers = await userManager.Users.ToListAsync();
                foreach (var kvp in formMembers)
                {
                    var studentId = kvp.Key;
                    var discordId = kvp.Value;

                    try
                    {
                        var user = allUsers.FirstOrDefault(u => u.StudentId == studentId);
                        if (user != null && user.DiscordId != discordId)
                        {
                            user.DiscordId = discordId;
                            user.UpdatedAt = DateTime.UtcNow;
                            await userManager.UpdateAsync(user);
                            discordUpdatedCount++;
                        }
                    }
                    catch (Exception ex)
                    {
                        errors.Add($"Discord IDの更新中にエラーが発生しました (学籍番号: {studentId}): {ex.Message}");
                    }
                }
            }
            catch (Exception ex)
            {
                errors.Add($"フォーム回答のファイル読み込み中にエラーが発生しました: {ex.Message}");
            }
        }

        return Ok(new
        {
            Message = "同期処理が終了しました。",
            Added = addedCount,
            Updated = updatedCount,
            Deactivated = deactivatedCount,
            DiscordUpdated = discordUpdatedCount,
            Errors = errors
        });
    }
}
