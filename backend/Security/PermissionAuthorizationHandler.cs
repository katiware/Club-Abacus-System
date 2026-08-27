using System.Security.Claims;
using Club_Abacus_System.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

namespace Club_Abacus_System.Security;

/// <summary>
/// ユーザーが要求された権限（PermissionType）を持っているかDBをチェックするハンドラー。
/// </summary>
public class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
{
    private readonly IServiceProvider _serviceProvider;

    public PermissionAuthorizationHandler(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, PermissionRequirement requirement)
    {
        // 1. トークン等からユーザーIDを取得 (NameIdentifierにGuidが入っている前提)
        var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            // 未ログイン、もしくは不正なID
            return;
        }

        // 2. DbContextはScopedなので、Singleton/TransientなHandlerから安全に呼び出すためにScopeを作成
        using var scope = _serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // ユーザー情報を取得
        var user = await dbContext.Users
            .Include(u => u.UserPermissions)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null || !user.IsActive)
        {
            return; // ユーザーが存在しない、または無効化されている
        }

        // 3. ロールの権限をチェック
        var roleHasPermission = await dbContext.RolePermissions
            .AnyAsync(rp => rp.RoleId == user.RoleId && rp.Permission == requirement.Permission);

        if (roleHasPermission)
        {
            context.Succeed(requirement); // アクセス許可
            return;
        }

        // 4. 個人に特例で付与された権限をチェック
        var userHasSpecialPermission = user.UserPermissions
            .Any(up => up.Permission == requirement.Permission);

        if (userHasSpecialPermission)
        {
            context.Succeed(requirement); // アクセス許可
            return;
        }

        // 権限を持っていなければ何もせず終了（結果として403 Forbiddenになる）
    }
}
