using System.Security.Claims;
using Club_Abacus_System.Data;
using Club_Abacus_System.Models;
using Club_Abacus_System.Services;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace Club_Abacus_System.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(AppDbContext context, IJwtTokenService jwtTokenService) : ControllerBase
{
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrEmpty(request.Credential))
        {
            return BadRequest(new { Message = "Credential is required." });
        }

        try
        {
            // Validate the Google token
            var settings = new GoogleJsonWebSignature.ValidationSettings
            {
                // In production, we should validate the Audience (ClientId)
                // Audience = new[] { configuration["Authentication:Google:ClientId"] }
            };

            var payload = await GoogleJsonWebSignature.ValidateAsync(request.Credential, settings);

            // Find user in DB by email
            var user = await context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Email == payload.Email);

            if (user == null)
            {
                return Unauthorized(new { Message = "このメールアドレスはシステムに登録されていません。" });
            }

            if (!user.IsActive)
            {
                return Forbid("アカウントが無効化されています。");
            }

            // Generate JWT Token
            var token = jwtTokenService.GenerateJwtToken(user);

            return Ok(new
            {
                Token = token,
                User = new
                {
                    user.Id,
                    user.Name,
                    user.Email,
                    Role = user.Role.Name
                }
            });
        }
        catch (InvalidJwtException)
        {
            return Unauthorized(new { Message = "無効な認証トークンです。" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Message = "ログイン処理中にエラーが発生しました。", Details = ex.Message });
        }
    }
}

public class LoginRequest
{
    public string Credential { get; set; } = string.Empty;
}
