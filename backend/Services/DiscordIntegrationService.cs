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
        var botToken = configuration["Discord:BotToken"];
        var channelId = configuration["Discord:ChannelId"];

        if (string.IsNullOrEmpty(botToken) || string.IsNullOrEmpty(channelId))
        {
            logger.LogWarning("Discord BotToken or ChannelId is not configured. Skipping notification.");
            return;
        }

        try
        {
            var messagePayload = new
            {
                content = $"【新規商品議論】\n申請「{request.Title}」内で商品未定の項目があります。\n部員の皆様、このスレッドで何を購入すべきかご意見をお寄せください！"
            };

            var messageUrl = $"https://discord.com/api/v10/channels/{channelId}/messages";
            
            var requestMsg = new HttpRequestMessage(HttpMethod.Post, messageUrl);
            requestMsg.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bot", botToken);
            requestMsg.Headers.UserAgent.TryParseAdd("ClubAbacusSystem/1.0");
            requestMsg.Content = JsonContent.Create(messagePayload);

            var response = await httpClient.SendAsync(requestMsg);
            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("Failed to send Discord message. Status Code: {StatusCode}", response.StatusCode);
                return;
            }

            var responseContent = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
            if (responseContent.TryGetProperty("id", out var messageIdProperty))
            {
                var messageId = messageIdProperty.GetString();
                var threadUrl = $"https://discord.com/api/v10/channels/{channelId}/messages/{messageId}/threads";
                var threadPayload = new
                {
                    name = $"購入議論: {request.Title}",
                    auto_archive_duration = 1440
                };

                var threadReq = new HttpRequestMessage(HttpMethod.Post, threadUrl);
                threadReq.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bot", botToken);
                threadReq.Headers.UserAgent.TryParseAdd("ClubAbacusSystem/1.0");
                threadReq.Content = JsonContent.Create(threadPayload);

                var threadRes = await httpClient.SendAsync(threadReq);
                if (threadRes.IsSuccessStatusCode)
                {
                    logger.LogInformation("Successfully created discussion thread for Request ID {RequestId}", request.Id);
                }
                else
                {
                    logger.LogWarning("Failed to create Discord thread. Status Code: {StatusCode}", threadRes.StatusCode);
                }
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
