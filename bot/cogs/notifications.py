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
        # ここではダミー処理としてログのみ出力
        print("[バッチ処理] 未報告・未提出者への督促通知を実行しました。")
        
        # 特定のチャンネルに全体アナウンスする場合の例
        # channel = self.bot.get_channel(CHANNEL_ID)
        # if channel:
        #     await channel.send("⚠️ 【リマインド】未報告の経費申請がある方は速やかに提出をお願いします。")

    @reminder_loop.before_loop
    async def before_reminder_loop(self):
        await self.bot.wait_until_ready()

async def setup(bot):
    await bot.add_cog(Notifications(bot))
