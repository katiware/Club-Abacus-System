import discord
from discord.ext import commands, tasks

class Notifications(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.reminder_loop.start()

    def cog_unload(self):
        self.reminder_loop.cancel()

    @tasks.loop(hours=24)
    async def reminder_loop(self):
        """
        未報告・未提出の経費申請者に対して定期的に督促メッセージを送信するバッチ処理
        """
        # 実環境ではデータベースから未提出者の一覧を取得して通知する
        # ここではダミー処理としてログ出力でロジックの骨組みを実装
        print("[バッチ処理] 未報告・未提出者への督促通知処理を開始します。")
        
        # モック設定データ
        # 実際にはバックエンドAPIから各申請者の設定(reminderFrequency)と、管理者設定(accountantNotificationDays)を取得する
        dummy_requests = [
            {"id": 101, "user": "UserA", "days_pending": 4, "reminder_frequency": 3},
            {"id": 102, "user": "UserB", "days_pending": 8, "reminder_frequency": 7},
            {"id": 103, "user": "UserC", "days_pending": 2, "reminder_frequency": 0}
        ]
        accountant_notification_days = 7 # 管理者設定のデフォルト値
        
        for req in dummy_requests:
            # 1. 申請者への証憑提出リマインド
            freq = req["reminder_frequency"]
            if freq > 0 and req["days_pending"] % freq == 0:
                print(f"[リマインド] {req['user']} さんへ: 申請 #{req['id']} の証憑提出期限が過ぎています（設定頻度: {freq}日）")
                
            # 2. 会計担当への通知（承認待ち・確認待ちが規定日数を超えた場合）
            if req["days_pending"] >= accountant_notification_days:
                print(f"[管理者通知] 会計担当へ: 申請 #{req['id']} ({req['user']}) が {accountant_notification_days} 日以上滞留しています。")

    @reminder_loop.before_loop
    async def before_reminder_loop(self):
        await self.bot.wait_until_ready()

async def setup(bot):
    await bot.add_cog(Notifications(bot))
