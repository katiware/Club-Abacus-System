import discord
from discord.ext import commands
from discord import app_commands

class Voting(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @app_commands.command(name="vote", description="経費申請に関する部内投票を開始します。")
    @app_commands.describe(title="投票のタイトル", description="投票の詳細説明")
    async def vote(self, interaction: discord.Interaction, title: str, description: str):
        embed = discord.Embed(title=f"🗳️ 投票: {title}", description=description, color=discord.Color.gold())
        embed.add_field(name="賛成", value="✅ をリアクション", inline=True)
        embed.add_field(name="反対", value="❌ をリアクション", inline=True)
        embed.set_footer(text="リアクションで投票してください。")
        
        await interaction.response.send_message(embed=embed)
        message = await interaction.original_response()
        
        await message.add_reaction("✅")
        await message.add_reaction("❌")

async def setup(bot):
    await bot.add_cog(Voting(bot))
