import discord
from discord.ext import commands
from discord import app_commands
from utils.api_client import get_history

class History(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @app_commands.command(name="history", description="最近の経費申請履歴を確認します。")
    async def history(self, interaction: discord.Interaction):
        history_data = get_history(user_id=interaction.user.id)
        
        if not history_data:
            await interaction.response.send_message("履歴の取得に失敗しました。", ephemeral=True)
            return
            
        embed = discord.Embed(title="📜 最近の申請履歴", color=discord.Color.green())
        for item in history_data:
            embed.add_field(
                name=f"申請 #{item['id']} - {item['item']}", 
                value=f"金額: ¥{item['amount']:,}\nステータス: {item['status']}", 
                inline=False
            )
            
        await interaction.response.send_message(embed=embed)

async def setup(bot):
    await bot.add_cog(History(bot))
