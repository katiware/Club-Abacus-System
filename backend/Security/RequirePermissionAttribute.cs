using Club_Abacus_System.Models;
using Microsoft.AspNetCore.Authorization;

namespace Club_Abacus_System.Security;

/// <summary>
/// コントローラーやアクションに付与して権限チェックを行うカスタム属性。
/// 例: [RequirePermission(PermissionType.ExpenseApprove)]
/// </summary>
public class RequirePermissionAttribute : AuthorizeAttribute
{
    public RequirePermissionAttribute(PermissionType permission) : base(permission.ToString())
    {
    }
}
