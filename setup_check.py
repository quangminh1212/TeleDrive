"""
Setup check script for TeleDrive
Validates configuration and tests Telegram connection
"""

import asyncio
import sys
from pathlib import Path
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt
from config import Config
from telegram_client import TelegramClient

console = Console()

async def check_config():
    """Check configuration validity"""
    console.print("[bold blue]🔧 Checking configuration...[/bold blue]")
    
    try:
        Config.validate_config()
        console.print("[green]✅ Configuration is valid[/green]")
        
        console.print(f"[cyan]API ID: {Config.API_ID}[/cyan]")
        console.print(f"[cyan]API Hash: {Config.API_HASH[:10]}...[/cyan]")
        console.print(f"[cyan]Phone: {Config.PHONE_NUMBER}[/cyan]")
        console.print(f"[cyan]Download Dir: {Config.DOWNLOAD_DIR}[/cyan]")
        
        return True
    except Exception as e:
        console.print(f"[red]❌ Configuration error: {e}[/red]")
        return False

async def test_connection():
    """Test Telegram connection"""
    console.print("\n[bold blue]🔗 Testing Telegram connection...[/bold blue]")
    
    try:
        async with TelegramClient() as client:
            me = await client.client.get_me()
            console.print(f"[green]✅ Successfully connected as: {me.first_name} {me.last_name or ''}[/green]")
            if me.username:
                console.print(f"[cyan]Username: @{me.username}[/cyan]")
            return True
    except Exception as e:
        console.print(f"[red]❌ Connection failed: {e}[/red]")
        return False

def update_phone_number():
    """Update phone number in .env file"""
    console.print("\n[yellow]📱 Let's update your phone number[/yellow]")
    
    phone = Prompt.ask(
        "Enter your phone number with country code (e.g., +84123456789)",
        default=Config.PHONE_NUMBER
    )
    
    # Read current .env file
    env_file = Path('.env')
    if env_file.exists():
        content = env_file.read_text(encoding='utf-8')
        
        # Replace phone number line
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if line.startswith('PHONE_NUMBER='):
                lines[i] = f'PHONE_NUMBER={phone}'
                break
        
        # Write back to file
        env_file.write_text('\n'.join(lines), encoding='utf-8')
        console.print(f"[green]✅ Updated phone number to: {phone}[/green]")
    else:
        console.print("[red]❌ .env file not found[/red]")

async def main():
    """Main setup check function"""
    console.print(Panel.fit(
        "[bold cyan]TeleDrive Setup Check[/bold cyan]\n"
        "This script will validate your configuration and test the connection.",
        border_style="blue"
    ))
    
    # Check if .env file exists
    if not Path('.env').exists():
        console.print("[yellow]⚠️  .env file not found. Please copy .env.example to .env and configure it.[/yellow]")
        return
    
    # Check configuration
    config_ok = await check_config()
    if not config_ok:
        console.print("\n[yellow]💡 Tip: Make sure to update your phone number in the .env file[/yellow]")
        if Prompt.ask("Do you want to update your phone number now?", choices=["y", "n"], default="y") == "y":
            update_phone_number()
        return
    
    # Test connection
    connection_ok = await test_connection()
    
    if config_ok and connection_ok:
        console.print("\n[bold green]🎉 Setup completed successfully! You can now run: python main.py[/bold green]")
    else:
        console.print("\n[bold yellow]⚠️  Please fix the issues above before running the main application[/bold yellow]")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        console.print("\n[yellow]Setup check cancelled by user[/yellow]")
    except Exception as e:
        console.print(f"\n[red]Setup check failed: {e}[/red]")
