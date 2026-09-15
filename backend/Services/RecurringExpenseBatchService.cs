using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Club_Abacus_System.Data;
using Club_Abacus_System.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;

namespace Club_Abacus_System.Services;

public class RecurringExpenseBatchService : BackgroundService
{
    private readonly ILogger<RecurringExpenseBatchService> _logger;
    private readonly IServiceProvider _serviceProvider;

    public RecurringExpenseBatchService(
        ILogger<RecurringExpenseBatchService> logger,
        IServiceProvider serviceProvider)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("RecurringExpenseBatchService is starting.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessRecurringExpensesAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred executing RecurringExpenseBatchService.");
            }

            // 次の実行まで待機（例: 24時間後）
            // 実際は深夜0時などの特定時刻を狙うか、Quartz等のスケジューラーを使うのが望ましいです
            await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
        }

        _logger.LogInformation("RecurringExpenseBatchService is stopping.");
    }

    private async Task ProcessRecurringExpensesAsync(CancellationToken stoppingToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        // NextGenerationDate が今日以前で、かつ有効なテンプレートを取得
        var templatesToProcess = await dbContext.RecurringExpenseTemplates
            .Where(t => t.TemplateStatus == TemplateStatus.Active
                     && t.DeletedAt == null
                     && t.NextGenerationDate <= today)
            .ToListAsync(stoppingToken);

        if (!templatesToProcess.Any())
        {
            _logger.LogInformation("No recurring expenses to process today.");
            return;
        }

        foreach (var template in templatesToProcess)
        {
            // --- ExpenseRequestの生成 ---
            var expenseRequest = new ExpenseRequest
            {
                UserId = template.UserId,
                Type = template.ExpenseType,
                ReceiptType = template.ReceiptType,
                Status = ExpenseStatus.Approved, // 事前承認済からスタート
                RecurringTemplateId = template.Id,
                TotalAmount = template.Amount,
                IsAmountVariable = template.IsAmountVariable,
                // 事前承認済とするため、便宜的に日時をセット
                ApprovedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                ExpenseItems = new List<ExpenseItem>
                {
                    new ExpenseItem
                    {
                        ItemName = template.ItemName,
                        UnitPrice = template.Amount,
                        Quantity = 1,
                        Payee = template.Payee,
                        Category = template.Category,
                        Description = "【定期払いによる自動生成】"
                    }
                }
            };

            dbContext.ExpenseRequests.Add(expenseRequest);

            // AuditLogの記録
            dbContext.AuditLogs.Add(new AuditLog
            {
                TargetType = "ExpenseRequests",
                TargetId = expenseRequest.Id,
                UserId = template.UserId, // 便宜上作成者のIDとするかSystemのID
                Action = "CREATE_FROM_RECURRING_BATCH",
                NewValue = "定期払いバッチによって自動生成され、自動承認されました。"
            });

            // --- 次回生成日の計算 ---
            if (template.RecurringFrequency == RecurringFrequency.Monthly)
            {
                template.NextGenerationDate = template.NextGenerationDate.AddMonths(1);
            }
            else if (template.RecurringFrequency == RecurringFrequency.Yearly)
            {
                template.NextGenerationDate = template.NextGenerationDate.AddYears(1);
            }

            template.UpdatedAt = DateTime.UtcNow;
        }

        await dbContext.SaveChangesAsync(stoppingToken);
        _logger.LogInformation($"Successfully processed {templatesToProcess.Count} recurring expenses.");
    }
}
