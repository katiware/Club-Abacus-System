import discord
from discord.ext import commands
from discord import app_commands
from utils.api_client import get_budget
import matplotlib.pyplot as plt
import io

class Budget(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @app_commands.command(name="budget", description="現在の予算残高を確認します。")
    async def budget(self, interaction: discord.Interaction):
        # Fetch data from API
        budget_data = get_budget(user_id=interaction.user.id)
        
        if not budget_data:
            await interaction.response.send_message("予算情報の取得に失敗しました。", ephemeral=True)
            return
            
        embed = discord.Embed(title="📊 予算残高", color=discord.Color.blue())
        embed.add_field(name="総予算", value=f"¥{budget_data['total']:,}", inline=True)
        embed.add_field(name="使用済", value=f"¥{budget_data['spent']:,}", inline=True)
        embed.add_field(name="残高", value=f"¥{budget_data['remaining']:,}", inline=False)
        
        # Generate chart
        fig, ax = plt.subplots(figsize=(6, 4))
        labels = ['Spent', 'Remaining']
        sizes = [budget_data['spent'], budget_data['remaining']]
        colors = ['#ff9999','#66b3ff']
        ax.pie(sizes, labels=labels, colors=colors, autopct='%1.1f%%', startangle=90)
        ax.axis('equal')
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        buf.seek(0)
        plt.close(fig)
        
        file = discord.File(buf, filename="budget_chart.png")
        embed.set_image(url="attachment://budget_chart.png")
        
        await interaction.response.send_message(embed=embed, file=file)

async def setup(bot):
    await bot.add_cog(Budget(bot))
