using Club_Abacus_System.Models;

namespace Club_Abacus_System.Services;

public interface IJwtTokenService
{
    string GenerateJwtToken(User user);
}
