using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Club_Abacus_System.Models;
using Microsoft.IdentityModel.Tokens;

namespace Club_Abacus_System.Services;

public class JwtTokenService : IJwtTokenService
{
    private readonly IConfiguration _configuration;

    public JwtTokenService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GenerateJwtToken(User user)
    {
        var jwtKey = _configuration["Jwt:Key"] ?? "super-secret-key-for-development-only-change-in-production";
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
            claims.Add(new Claim("Permission", permission.ToString()));
        }

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"] ?? "ClubAbacusSystem",
            audience: _configuration["Jwt:Audience"] ?? "ClubAbacusSystemUsers",
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
