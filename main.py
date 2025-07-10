"""
TeleDrive - Telegram Channel File Manager
Main application interface
"""

import asyncio
import logging
from pathlib import Path
from typing import List, Optional
from rich.console import Console
from rich.table import Table
from rich.prompt import Prompt, Confirm
from rich.progress import Progress, TaskID
from rich.panel import Panel
from rich import print as rprint

from telegram_client import TelegramClient
from file_manager import FileManager, FileInfo
from config import Config

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

console = Console()

class TeleDriveApp:
    """Main TeleDrive application"""
    
    def __init__(self):
        self.telegram_client = None
        self.file_manager = None
        
    async def initialize(self):
        """Initialize the application"""
        try:
            console.print("[bold blue]🚀 Initializing TeleDrive...[/bold blue]")
            
            self.telegram_client = TelegramClient()
            await self.telegram_client.connect()
            
            self.file_manager = FileManager(self.telegram_client)
            
            console.print("[bold green]✅ TeleDrive initialized successfully![/bold green]")
            
        except Exception as e:
            console.print(f"[bold red]❌ Failed to initialize TeleDrive: {e}[/bold red]")
            raise
    
    async def cleanup(self):
        """Cleanup resources"""
        if self.telegram_client:
            await self.telegram_client.disconnect()
    
    def display_main_menu(self):
        """Display main menu"""
        console.clear()
        console.print(Panel.fit(
            "[bold cyan]TeleDrive - Telegram Channel File Manager[/bold cyan]\n"
            "Manage files in your Telegram channels with ease!",
            border_style="blue"
        ))
        
        console.print("\n[bold]Available Commands:[/bold]")
        console.print("1. 📋 List files in channel")
        console.print("2. 🔍 Search files in channel")
        console.print("3. ⬇️  Download files")
        console.print("4. ⬆️  Upload files")
        console.print("5. ⚙️  Settings")
        console.print("6. ❌ Exit")
    
    def display_files_table(self, files: List[FileInfo], title: str = "Files"):
        """Display files in a formatted table"""
        if not files:
            console.print("[yellow]No files found.[/yellow]")
            return
        
        table = Table(title=title, show_header=True, header_style="bold magenta")
        table.add_column("#", style="dim", width=4)
        table.add_column("File Name", style="cyan")
        table.add_column("Size", justify="right", style="green")
        table.add_column("Type", style="yellow")
        table.add_column("Date", style="blue")
        
        for i, file_info in enumerate(files, 1):
            table.add_row(
                str(i),
                file_info.file_name,
                file_info.get_formatted_size(),
                file_info.file_type.title(),
                file_info.date.strftime("%Y-%m-%d %H:%M")
            )
        
        console.print(table)
    
    async def list_files_command(self):
        """Handle list files command"""
        try:
            channel = Prompt.ask("Enter channel username or ID (e.g., @channel_name)")
            limit = int(Prompt.ask("Number of files to fetch", default="50"))
            
            with console.status("[bold green]Fetching files..."):
                files = await self.file_manager.list_files(channel, limit)
            
            self.display_files_table(files, f"Files from {channel}")
            
            if files and Confirm.ask("Do you want to download any files?"):
                await self.download_files_interactive(files, channel)
                
        except Exception as e:
            console.print(f"[bold red]Error: {e}[/bold red]")
    
    async def search_files_command(self):
        """Handle search files command"""
        try:
            channel = Prompt.ask("Enter channel username or ID (e.g., @channel_name)")
            query = Prompt.ask("Enter search query")
            limit = int(Prompt.ask("Number of results", default="20"))
            
            with console.status(f"[bold green]Searching for '{query}'..."):
                files = await self.file_manager.search_files(channel, query, limit)
            
            self.display_files_table(files, f"Search results for '{query}' in {channel}")
            
            if files and Confirm.ask("Do you want to download any files?"):
                await self.download_files_interactive(files, channel)
                
        except Exception as e:
            console.print(f"[bold red]Error: {e}[/bold red]")
    
    async def download_files_interactive(self, files: List[FileInfo], channel: str):
        """Interactive file download"""
        try:
            selection = Prompt.ask(
                "Enter file numbers to download (comma-separated) or 'all' for all files",
                default="all"
            )
            
            if selection.lower() == 'all':
                selected_files = files
            else:
                indices = [int(x.strip()) - 1 for x in selection.split(',')]
                selected_files = [files[i] for i in indices if 0 <= i < len(files)]
            
            if not selected_files:
                console.print("[yellow]No files selected.[/yellow]")
                return
            
            download_dir = Prompt.ask(
                "Download directory",
                default=str(Config.DOWNLOAD_DIR)
            )
            
            with Progress() as progress:
                task = progress.add_task("Downloading files...", total=len(selected_files))
                
                for file_info in selected_files:
                    try:
                        await self.file_manager.download_file(
                            file_info,
                            Path(download_dir) / file_info.file_name
                        )
                        progress.advance(task)
                    except Exception as e:
                        console.print(f"[red]Failed to download {file_info.file_name}: {e}[/red]")
            
            console.print(f"[bold green]✅ Download completed! Files saved to: {download_dir}[/bold green]")
            
        except Exception as e:
            console.print(f"[bold red]Error during download: {e}[/bold red]")

    async def upload_files_command(self):
        """Handle upload files command"""
        try:
            channel = Prompt.ask("Enter channel username or ID (e.g., @channel_name)")

            # Get files to upload
            file_paths_input = Prompt.ask(
                "Enter file paths (comma-separated) or directory path"
            )

            file_paths = []
            for path_str in file_paths_input.split(','):
                path = Path(path_str.strip())
                if path.is_file():
                    file_paths.append(path)
                elif path.is_dir():
                    # Add all files in directory
                    file_paths.extend([f for f in path.iterdir() if f.is_file()])

            if not file_paths:
                console.print("[yellow]No valid files found.[/yellow]")
                return

            console.print(f"[cyan]Found {len(file_paths)} files to upload:[/cyan]")
            for i, path in enumerate(file_paths, 1):
                console.print(f"  {i}. {path.name}")

            if not Confirm.ask("Proceed with upload?"):
                return

            caption_template = Prompt.ask(
                "Caption template (use {filename} for filename)",
                default=""
            )

            with Progress() as progress:
                task = progress.add_task("Uploading files...", total=len(file_paths))

                for file_path in file_paths:
                    try:
                        caption = caption_template.format(filename=file_path.name) if caption_template else ""
                        await self.file_manager.upload_file(channel, file_path, caption)
                        progress.advance(task)
                    except Exception as e:
                        console.print(f"[red]Failed to upload {file_path.name}: {e}[/red]")

            console.print("[bold green]✅ Upload completed![/bold green]")

        except Exception as e:
            console.print(f"[bold red]Error during upload: {e}[/bold red]")

    def show_settings(self):
        """Show current settings"""
        console.print(Panel.fit(
            f"[bold]Current Settings:[/bold]\n"
            f"API ID: {Config.API_ID}\n"
            f"Phone: {Config.PHONE_NUMBER}\n"
            f"Session: {Config.SESSION_NAME}\n"
            f"Download Dir: {Config.DOWNLOAD_DIR}\n"
            f"Default Channel: {Config.DEFAULT_CHANNEL or 'Not set'}",
            title="Settings",
            border_style="green"
        ))

    async def run(self):
        """Main application loop"""
        try:
            await self.initialize()

            while True:
                self.display_main_menu()

                choice = Prompt.ask(
                    "\n[bold]Enter your choice",
                    choices=["1", "2", "3", "4", "5", "6"],
                    default="1"
                )

                if choice == "1":
                    await self.list_files_command()
                elif choice == "2":
                    await self.search_files_command()
                elif choice == "3":
                    console.print("[yellow]Use option 1 or 2 to list files first, then download.[/yellow]")
                elif choice == "4":
                    await self.upload_files_command()
                elif choice == "5":
                    self.show_settings()
                elif choice == "6":
                    console.print("[bold blue]👋 Goodbye![/bold blue]")
                    break

                if choice != "6":
                    Prompt.ask("\nPress Enter to continue...")

        except KeyboardInterrupt:
            console.print("\n[bold yellow]⚠️  Application interrupted by user[/bold yellow]")
        except Exception as e:
            console.print(f"[bold red]❌ Application error: {e}[/bold red]")
        finally:
            await self.cleanup()

async def main():
    """Main entry point"""
    app = TeleDriveApp()
    await app.run()

if __name__ == "__main__":
    asyncio.run(main())
