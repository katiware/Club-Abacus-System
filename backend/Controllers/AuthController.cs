using System.Security.Claims;
using Club_Abacus_System.Data;
using Club_Abacus_System.Models;
using Club_Abacus_System.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;

namespace Club_Abacus_System.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(
    AppDbContext context, 
    IJwtTokenService jwtTokenService, 
    IConfiguration configuration, 
    Microsoft.AspNetCore.Identity.UserManager<User> userManager, 
    ILogger<AuthController> logger,
    IConfigurationManager<OpenIdConnectConfiguration> configurationManager) : ControllerBase
{
    private async Task<JwtSecurityToken?> ValidateGoogleTokenAsync(string credential)
    {
        try
        {
            var discoveryDocument = await configurationManager.GetConfigurationAsync(CancellationToken.None);
            var signingKeys = discoveryDocument.SigningKeys;

            var validationParameters = new TokenValidationParameters
            {
                ValidateAudience = true,
                ValidAudience = configuration["Authentication:Google:ClientId"],
                ValidateIssuer = true,
                ValidIssuers = new[] { "accounts.google.com", "https://accounts.google.com" },
                ValidateIssuerSigningKey = true,
                IssuerSigningKeys = signingKeys,
                ValidateLifetime = true
            };

            var handler = new JwtSecurityTokenHandler();
            handler.ValidateToken(credential, validationParameters, out var validatedToken);
            return (JwtSecurityToken)validatedToken;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Token validation failed. Type: {ExceptionType}, Message: {Message}, Inner: {InnerMessage}", ex.GetType().Name, ex.Message, ex.InnerException?.Message ?? "None");
            return null;
        }
    }

    private bool IsValidDomainAndMember(string email)
    {
        return email.EndsWith("@hiro.kindai.ac.jp");
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrEmpty(request.Credential)) return BadRequest(new { Message = "Credential is required." });

        try
        {
            var token = await ValidateGoogleTokenAsync(request.Credential);
            if (token == null) return Unauthorized(new { Message = "無効な認証トークンです。" });

            var email = token.Claims.First(c => c.Type == "email").Value;

            var user = await context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Email == email);

            if (user == null) return Unauthorized(new { Message = "このメールアドレスはシステムに登録されていません。" });
            if (!user.IsActive) return Forbid("アカウントが無効化されています。");

            var jwtToken = jwtTokenService.GenerateJwtToken(user);

            return Ok(new
            {
                Token = jwtToken,
                User = new { user.Id, user.Name, user.Email, Role = user.Role.Name }
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Message = "ログイン処理中にエラーが発生しました。", Details = ex.Message });
        }
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] LoginRequest request)
    {
        if (string.IsNullOrEmpty(request.Credential)) return BadRequest(new { Message = "Credential is required." });

        try
        {
            var token = await ValidateGoogleTokenAsync(request.Credential);
            if (token == null) return Unauthorized(new { Message = "無効な認証トークンです。" });

            var email = token.Claims.First(c => c.Type == "email").Value;
            var name = token.Claims.FirstOrDefault(c => c.Type == "name")?.Value ?? "No Name";

            if (!IsValidDomainAndMember(email))
            {
                return BadRequest(new { Message = "指定されたドメインのメールアドレスではありません（@hiro.kindai.ac.jpのみ許可されています）。" });
            }

            var existingUser = await context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (existingUser != null) return BadRequest(new { Message = "このメールアドレスは既に登録されています。" });

            var userRole = await context.Roles.FirstOrDefaultAsync(r => r.Name == "USER");
            if (userRole == null) return StatusCode(500, new { Message = "ユーザー権限が設定されていません。管理者に連絡してください。" });

            var newUser = new User
            {
                UserName = email,
                Email = email,
                Name = name,
                RoleId = userRole.Id,
                IsActive = true
            };

            var result = await userManager.CreateAsync(newUser);
            if (!result.Succeeded) return StatusCode(500, new { Message = "ユーザー作成に失敗しました。", Details = result.Errors });
            
            await userManager.AddToRoleAsync(newUser, "USER");

            var createdUser = await context.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == newUser.Id);
            var jwtToken = jwtTokenService.GenerateJwtToken(createdUser!);

            return Ok(new
            {
                Token = jwtToken,
                User = new { createdUser!.Id, createdUser.Name, createdUser.Email, Role = createdUser.Role.Name }
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Message = "登録処理中にエラーが発生しました。", Details = ex.Message });
        }
    }

    [HttpPost("google-callback")]
    [AllowAnonymous]
    public async Task<IActionResult> GoogleCallback([FromForm] string credential)
    {
        logger.LogInformation("GoogleCallback endpoint hit.");
        
        if (string.IsNullOrEmpty(credential))
        {
            logger.LogWarning("Credential was null or empty.");
            return BadRequest("Credential is required.");
        }

        try
        {
            logger.LogInformation("Validating Google signature... Credential starts with: {Start}", credential.Length > 10 ? credential.Substring(0, 10) : credential);
            
            var token = await ValidateGoogleTokenAsync(credential);
            var frontendUrl = "http://localhost:5173/login"; // TODO: get from config

            if (token == null)
            {
                logger.LogError("Google signature validation failed or timed out.");
                return Redirect($"{frontendUrl}?error=validation_failed");
            }

            var email = token.Claims.First(c => c.Type == "email").Value;
            var name = token.Claims.FirstOrDefault(c => c.Type == "name")?.Value ?? "No Name";
            logger.LogInformation("Signature validated. Email: {Email}", email);

            var user = await context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Email == email);

            if (user == null)
            {
                // 新規登録の場合の制限チェック (リダイレクトモードでもエラーを返す)
                if (!IsValidDomainAndMember(email))
                {
                    logger.LogWarning("Registration blocked. Domain mismatch for {Email}", email);
                    return Redirect($"{frontendUrl}?error=invalid_domain");
                }
                return Redirect($"{frontendUrl}?error=not_registered&credential={credential}");
            }

            if (!user.IsActive)
            {
                return Redirect($"{frontendUrl}?error=account_disabled");
            }

            var jwtToken = jwtTokenService.GenerateJwtToken(user);
            var role = user.Role.Name;

            return Redirect($"{frontendUrl}?token={jwtToken}&role={role}");
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Internal server error: {ex.Message}\n{ex.StackTrace}");
        }
    }
}

public class LoginRequest
{
    public string Credential { get; set; } = string.Empty;
}
