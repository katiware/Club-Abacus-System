using Club_Abacus_System.Models;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;

namespace Club_Abacus_System.Services;

public interface IDiscordIntegrationService
{
    Task CreatePurchaseDiscussionThreadAsync(ExpenseRequest request);
}

public class DiscordIntegrationService(ILogger<DiscordIntegrationService> logger) : IDiscordIntegrationService
{
    public async Task CreatePurchaseDiscussionThreadAsync(ExpenseRequest request)
    {
        // TODO: 実際のDiscord API/Webhookを呼び出す処理は別担当者が実装します。
        // ここではダミーの実装としてログを出力するだけに留めます。
        
        logger.LogInformation("【Discord連携ダミー】申請ID {RequestId} ({Title}) に対して商品議論用のスレッド作成通知を送信しました。", request.Id, request.Title);
        
        // （仮）もし実際にスレッドを作成した場合は、リクエストにその情報を保存するイメージ
        // request.DiscordThreadId = "dummy-thread-12345";
        // request.DiscordThreadUrl = "https://discord.com/channels/123/456";

        await Task.CompletedTask;
    }
}
