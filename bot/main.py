import os
import discord
from discord.ext import commands
from dotenv import load_dotenv

load_dotenv()

TOKEN = os.getenv("DISCORD_BOT_TOKEN")

class AbacusBot(commands.Bot):
    def __init__(self):
        intents = discord.Intents.default()
        intents.message_content = True
        super().__init__(command_prefix="!", intents=intents)

    async def setup_hook(self):
        # Load cogs
        await self.load_extension("cogs.budget")
        await self.load_extension("cogs.history")
        await self.load_extension("cogs.voting")
        await self.load_extension("cogs.notifications")
        
        # Sync slash commands
        await self.tree.sync()
        print("Slash commands synced.")

bot = AbacusBot()

@bot.event
async def on_ready():
    print(f"Logged in as {bot.user.name} (ID: {bot.user.id})")
    print("------")

if __name__ == "__main__":
    if TOKEN:
        bot.run(TOKEN)
    else:
        print("Error: DISCORD_BOT_TOKEN is not set in the environment variables.")
