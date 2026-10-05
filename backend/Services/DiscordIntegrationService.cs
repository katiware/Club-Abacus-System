using Club_Abacus_System.Models;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;

namespace Club_Abacus_System.Services;

public interface IDiscordIntegrationService
{
    Task CreatePurchaseDiscussionThreadAsync(ExpenseRequest request);
    Task NotifyExpenseReApprovalRequiredAsync(ExpenseRequest request);
}

public class DiscordIntegrationService(ILogger<DiscordIntegrationService> logger, IConfiguration configuration, HttpClient httpClient) : IDiscordIntegrationService
{
    public async Task CreatePurchaseDiscussionThreadAsync(ExpenseRequest request)
    {
        var webhookUrl = configuration["Discord:WebhookUrl"];
        if (string.IsNullOrEmpty(webhookUrl))
        {
            logger.LogWarning("Discord Webhook URL is not configured. Skipping notification.");
            return;
        }

        try
        {
            var payload = new
            {
                content = $"【新規商品議論】\n申請「{request.Title}」内で商品未定の項目があります。\n部員の皆様、このスレッドで何を購入すべきかご意見をお寄せください！"
            };

            var response = await httpClient.PostAsJsonAsync(webhookUrl, payload);
            if (response.IsSuccessStatusCode)
            {
                logger.LogInformation("Successfully sent discussion notification to Discord for Request ID {RequestId}", request.Id);
            }
            else
            {
                logger.LogWarning("Failed to send Discord notification. Status Code: {StatusCode}", response.StatusCode);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error occurred while sending Discord notification for Request ID {RequestId}", request.Id);
        }
    }

    public async Task NotifyExpenseReApprovalRequiredAsync(ExpenseRequest request)
    {
        // TODO: 実際のDiscord API/Webhookを呼び出す処理は別担当者が実装します。
        logger.LogInformation("【Discord連携ダミー】申請ID {RequestId} ({Title}) が編集されたため、主将会計へ再承認の通知を送信しました。", request.Id, request.Title);
        await Task.CompletedTask;
    }
}
