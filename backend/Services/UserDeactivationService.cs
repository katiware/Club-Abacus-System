using Club_Abacus_System.Data;
using Club_Abacus_System.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics;

namespace Club_Abacus_System.Services;

public class UserDeactivationService(
    IServiceProvider serviceProvider,
    ILogger<UserDeactivationService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("UserDeactivationService is starting.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await DeactivateGraduatedUsersAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error occurred executing user deactivation.");
            }

            // 1日に1回実行する（例: 24時間間隔）
            await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
        }
    }

    private async Task DeactivateGraduatedUsersAsync(CancellationToken stoppingToken)
    {
        using var scope = serviceProvider.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();

        var today = DateTime.Today;
        
        // 日本の学校の年度を計算する (4月始まり)
        // 例: 2026年3月なら年度は2025年度。2026年4月なら2026年度。
        int currentFiscalYear = today.Month >= 4 ? today.Year : today.Year - 1;

        // 入学年度から数えて4年目の3月末(つまり5年目の4月1日)で無効化する
        // 例: 2022年入学の場合、4年目は2025年度(2026年3月まで)。2026年度(2026年4月)になったら無効化。
        // すなわち、 EnrollmentYear <= currentFiscalYear - 4 なら無効化対象。
        int targetMaxEnrollmentYear = currentFiscalYear - 4;

        logger.LogInformation("Checking for users to deactivate. Target EnrollmentYear <= {Year}", targetMaxEnrollmentYear);

        var usersToDeactivate = await userManager.Users
            .Where(u => u.IsActive && u.EnrollmentYear.HasValue && u.EnrollmentYear.Value <= targetMaxEnrollmentYear)
            .ToListAsync(stoppingToken);

        if (usersToDeactivate.Count == 0)
        {
            logger.LogInformation("No users found to deactivate.");
            return;
        }

        int count = 0;
        foreach (var user in usersToDeactivate)
        {
            user.IsActive = false;
            user.UpdatedAt = DateTime.UtcNow;
            
            var result = await userManager.UpdateAsync(user);
            if (result.Succeeded)
            {
                count++;
                logger.LogInformation("Deactivated user: {UserId} ({Name}, Enrolled: {Year})", user.Id, user.Name, user.EnrollmentYear);
            }
            else
            {
                logger.LogWarning("Failed to deactivate user: {UserId}. Errors: {Errors}", 
                    user.Id, string.Join(", ", result.Errors.Select(e => e.Description)));
            }
        }

        logger.LogInformation("Successfully deactivated {Count} users.", count);
    }
}
