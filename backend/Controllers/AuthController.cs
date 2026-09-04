using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Club_Abacus_System.Data;
using Club_Abacus_System.Models;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace Club_Abacus_System.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(AppDbContext context, IConfiguration configuration) : ControllerBase
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
            var token = GenerateJwtToken(user);

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

    private string GenerateJwtToken(User user)
    {
        var jwtKey = configuration["Jwt:Key"] ?? "super-secret-key-for-development-only-change-in-production";
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Name),
            new Claim(ClaimTypes.Email, user.Email ?? ""),
            new Claim(ClaimTypes.Role, user.Role.Name)
        };

        // Add permissions from the role (if stored in DB or logic)
        // For now, let's grant all permissions if Role is Admin, otherwise basic permissions.
        var permissions = Enum.GetValues<PermissionType>();
        foreach (var permission in permissions)
        {
            // Just assigning all permissions to everyone for testing, 
            // In a real app, this should be filtered by user.Role.
            claims.Add(new Claim("Permission", permission.ToString()));
        }

        var token = new JwtSecurityToken(
            issuer: configuration["Jwt:Issuer"] ?? "ClubAbacusSystem",
            audience: configuration["Jwt:Audience"] ?? "ClubAbacusSystemUsers",
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

public class LoginRequest
{
    public string Credential { get; set; } = string.Empty;
}
