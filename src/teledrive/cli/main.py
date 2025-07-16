"""
Main CLI entry point for TeleDrive

Provides the main command-line interface with rich formatting and
comprehensive error handling.
"""

import asyncio
import sys
from pathlib import Path
from typing import Optional

import click
from rich.console import Console
from rich.panel import Panel
from rich.text import Text

from ..config.manager import get_config_manager
from ..utils.logger import get_logger, setup_logging
from ..core.scanner import TelegramFileScanner


console = Console()
logger = get_logger('teledrive.cli')


@click.group()
@click.option('--config', '-c', type=click.Path(exists=True), help='Configuration file path')
@click.option('--verbose', '-v', is_flag=True, help='Enable verbose logging')
@click.option('--quiet', '-q', is_flag=True, help='Suppress output')
@click.pass_context
def cli(ctx, config: Optional[str], verbose: bool, quiet: bool):
    """
    TeleDrive - Advanced Telegram Channel File Scanner
    
    A powerful tool for scanning Telegram channels and extracting file information,
    with special support for private channels and groups.
    """
    # Ensure context object exists
    ctx.ensure_object(dict)
    
    # Store options in context
    ctx.obj['config_path'] = config
    ctx.obj['verbose'] = verbose
    ctx.obj['quiet'] = quiet
    
    # Setup logging
    try:
        setup_logging(config)
        if verbose:
            logger.setLevel('DEBUG')
        elif quiet:
            logger.setLevel('ERROR')
    except Exception as e:
        console.print(f"[red]Failed to setup logging: {e}[/red]")


@cli.command()
@click.option('--channel', '-ch', help='Channel username or invite link')
@click.option('--output', '-o', help='Output directory')
@click.option('--format', '-f', 
              type=click.Choice(['json', 'csv', 'excel', 'all']), 
              default='all', 
              help='Output format')
@click.option('--max-messages', '-m', type=int, help='Maximum messages to scan')
@click.option('--private', '-p', is_flag=True, help='Scan private channel')
@click.pass_context
def scan(ctx, channel: Optional[str], output: Optional[str], format: str, 
         max_messages: Optional[int], private: bool):
    """
    Scan a Telegram channel for files
    
    Examples:
        teledrive scan --channel @mychannel
        teledrive scan --private --channel https://t.me/joinchat/xxx
        teledrive scan --channel @mychannel --format json --max-messages 1000
    """
    try:
        # Load configuration
        config_manager = get_config_manager(ctx.obj.get('config_path'))
        config = config_manager.get_config()
        
        # Override config with CLI options
        if output:
            config.output.directory = output
        if max_messages:
            config.scanning.max_messages = max_messages
            
        # Set output formats
        if format == 'json':
            config.output.csv.enabled = False
            config.output.excel.enabled = False
        elif format == 'csv':
            config.output.json.enabled = False
            config.output.excel.enabled = False
        elif format == 'excel':
            config.output.json.enabled = False
            config.output.csv.enabled = False
            
        # Display banner
        if not ctx.obj.get('quiet'):
            display_banner()
            
        # Run scanner
        asyncio.run(run_scanner(config, channel, private))
        
    except KeyboardInterrupt:
        console.print("\n[yellow]Scan interrupted by user[/yellow]")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Scan failed: {e}")
        console.print(f"[red]Error: {e}[/red]")
        sys.exit(1)


@cli.command()
@click.option('--validate', '-v', is_flag=True, help='Validate configuration')
@click.option('--show', '-s', is_flag=True, help='Show current configuration')
@click.option('--set', '-S', nargs=2, multiple=True, help='Set configuration value (key value)')
@click.pass_context
def config(ctx, validate: bool, show: bool, set: tuple):
    """
    Manage TeleDrive configuration
    
    Examples:
        teledrive config --show
        teledrive config --validate
        teledrive config --set telegram.api_id 12345
    """
    try:
        config_manager = get_config_manager(ctx.obj.get('config_path'))
        
        if validate:
            is_valid = config_manager.validate_telegram_config()
            if is_valid:
                console.print("[green]✓ Configuration is valid[/green]")
            else:
                console.print("[red]✗ Configuration has errors[/red]")
                sys.exit(1)
                
        elif show:
            config_obj = config_manager.get_config()
            display_config_summary(config_obj)
            
        elif set:
            for key, value in set:
                # Try to convert value to appropriate type
                if value.lower() in ('true', 'false'):
                    value = value.lower() == 'true'
                elif value.isdigit():
                    value = int(value)
                elif value.replace('.', '').isdigit():
                    value = float(value)
                    
                config_manager.update_config({key: value})
                console.print(f"[green]Set {key} = {value}[/green]")
                
            config_manager.save_config()
            console.print("[green]Configuration saved[/green]")
            
        else:
            console.print("Use --help for available options")
            
    except Exception as e:
        logger.error(f"Config command failed: {e}")
        console.print(f"[red]Error: {e}[/red]")
        sys.exit(1)


@cli.command()
def version():
    """Show TeleDrive version information"""
    from .. import __version__, __author__
    
    console.print(Panel.fit(
        f"[bold blue]TeleDrive[/bold blue] v{__version__}\n"
        f"Author: {__author__}\n"
        f"Advanced Telegram Channel File Scanner",
        title="Version Info"
    ))


async def run_scanner(config, channel: Optional[str], private: bool):
    """Run the scanner with given configuration"""
    scanner = TelegramFileScanner(config)
    
    try:
        # Initialize scanner
        console.print("[blue]Initializing Telegram client...[/blue]")
        await scanner.initialize()
        
        if channel:
            # Scan specific channel
            console.print(f"[blue]Scanning channel: {channel}[/blue]")
            if private:
                await scanner.scan_private_channel(channel)
            else:
                await scanner.scan_channel(channel)
        else:
            # Interactive mode
            console.print("[blue]Starting interactive mode...[/blue]")
            await scanner.scan_interactive()
            
        # Save results
        if scanner.files_data:
            console.print(f"[green]Found {len(scanner.files_data)} files[/green]")
            await scanner.save_results()
            console.print("[green]Results saved successfully![/green]")
        else:
            console.print("[yellow]No files found[/yellow]")
            
    finally:
        await scanner.close()


def display_banner():
    """Display application banner"""
    banner = Text()
    banner.append("🔐 ", style="blue")
    banner.append("TeleDrive", style="bold blue")
    banner.append(" - Advanced Telegram Channel File Scanner", style="blue")
    
    console.print(Panel.fit(banner, title="Welcome"))


def display_config_summary(config):
    """Display configuration summary"""
    telegram_config = config.telegram
    
    summary = f"""
[bold]Telegram Configuration:[/bold]
  API ID: {telegram_config.api_id}
  Phone: {telegram_config.phone_number}
  Session: {telegram_config.session_name}

[bold]Output Configuration:[/bold]
  Directory: {config.output.directory}
  Formats: JSON={config.output.json.enabled}, CSV={config.output.csv.enabled}, Excel={config.output.excel.enabled}

[bold]Scanning Configuration:[/bold]
  Max Messages: {config.scanning.max_messages or 'Unlimited'}
  Batch Size: {config.scanning.batch_size}
  File Types: {sum(config.scanning.file_types.dict().values())} enabled
"""
    
    console.print(Panel(summary, title="Configuration Summary"))


def main():
    """Main entry point for CLI"""
    # Setup Windows event loop policy
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    
    cli()


if __name__ == '__main__':
    main()
