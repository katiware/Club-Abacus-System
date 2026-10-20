using Club_Abacus_System.Data;
using Club_Abacus_System.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Club_Abacus_System.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RolePromotionController(
    UserManager<User> userManager,
    AppDbContext context,
    ILogger<RolePromotionController> logger) : ControllerBase
{
    [HttpPost("request-manager")]
    [Authorize]
    public async Task<IActionResult> RequestManagerPromotion()
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userIdString == null) return Unauthorized();

        var user = await userManager.FindByIdAsync(userIdString);
        if (user == null) return NotFound("ユーザーが見つかりません。");

        var managerRole = context.Roles.FirstOrDefault(r => r.Name == "MANAGER" || r.Name == "ADMIN");
        if (managerRole == null) return StatusCode(500, "システムにMANAGERまたはADMINロールが存在しません。");

        if (user.RoleId == managerRole.Id) return BadRequest("すでに該当する権限を持っています。");

        // ドメインチェック: 近畿大学工学部ドメイン (@hiro.kindai.ac.jp) のみ許可
        if (string.IsNullOrEmpty(user.Email) || !user.Email.EndsWith("@hiro.kindai.ac.jp", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest("マネージャー（主将会計）への昇格は @hiro.kindai.ac.jp ドメインの近畿大学アカウントのみ許可されています。");
        }

        var targetManagerRole = context.Roles.FirstOrDefault(r => r.Name == "MANAGER");
        if (targetManagerRole == null) return StatusCode(500, "システムにMANAGERロールが存在しません。");

        user.RoleId = targetManagerRole.Id;
        user.UpdatedAt = DateTime.UtcNow;

        var result = await userManager.UpdateAsync(user);
        if (!result.Succeeded) return StatusCode(500, "権限の更新に失敗しました。");

        logger.LogInformation("ユーザー {Email} (ID: {UserId}) がマネージャー（主将会計）に昇格しました。", user.Email, user.Id);

        return Ok(new { Message = "マネージャー（主将会計）権限に昇格しました。画面を再読み込みするか、再度ログインしてください。" });
    }

    [HttpGet("confirm-manager")]
    [AllowAnonymous]
    public async Task<IActionResult> ConfirmManagerPromotion(Guid userId, string token)
    {
        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user == null) return BadRequest("無効なユーザーです。");

        // トークンの検証
        var isValid = await userManager.VerifyUserTokenAsync(user, "Default", "ManagerPromotion", token);
        if (!isValid) return BadRequest("無効または期限切れのリンクです。");

        var managerRole = context.Roles.FirstOrDefault(r => r.Name == "MANAGER");
        if (managerRole == null) return StatusCode(500, "システムにMANAGERロールが存在しません。");

        user.RoleId = managerRole.Id;
        user.UpdatedAt = DateTime.UtcNow;

        var result = await userManager.UpdateAsync(user);
        if (!result.Succeeded) return StatusCode(500, "権限の更新に失敗しました。");

        // フロントエンドの完了画面等へリダイレクト
        var frontendUrl = "http://localhost:5173/?message=manager_promoted";
        return Redirect(frontendUrl);
    }
}
