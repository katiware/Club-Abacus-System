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

        // Identityの仕組みでプロモーション用トークンを生成する
        var token = await userManager.GenerateUserTokenAsync(user, "Default", "ManagerPromotion");

        // 本来はここでメール送信する。今回はログ出力のみ(ダミー送信)
        var callbackUrl = Url.Action("ConfirmManagerPromotion", "RolePromotion", new { userId = user.Id, token = token }, protocol: HttpContext.Request.Scheme);
        
        logger.LogInformation("===========================================");
        logger.LogInformation("【ダミーメール送信】");
        logger.LogInformation("宛先: {Email}", user.Email);
        logger.LogInformation("件名: マネージャー昇格リクエストの確認");
        logger.LogInformation("本文: 以下のURLをクリックしてマネージャー昇格を完了してください。\n{CallbackUrl}", callbackUrl);
        logger.LogInformation("===========================================");

        return Ok(new { Message = "昇格確認メールを送信しました。メール内のリンクをクリックして完了してください。" });
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
