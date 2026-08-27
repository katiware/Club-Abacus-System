using Club_Abacus_System.Models;
using Microsoft.AspNetCore.Authorization;

namespace Club_Abacus_System.Security;

public class PermissionRequirement : IAuthorizationRequirement
{
    public PermissionType Permission { get; }

    public PermissionRequirement(PermissionType permission)
    {
        Permission = permission;
    }
}
