#!/usr/bin/env python3
"""
TeleDrive Command Line Interface

Provides command-line functionality for TeleDrive operations.
"""

import argparse
import asyncio
import logging
import os
import sys
from pathlib import Path
import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

# Add src to path for imports if needed
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

# Import from modules
from src.teledrive.config import config, validate_environment


def create_parser() -> argparse.ArgumentParser:
    """Create command line argument parser."""
    parser = argparse.ArgumentParser(
        description="TeleDrive - Telegram File Manager",
        epilog="Run without arguments to start the web interface."
    )
    
    # Main command groups
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # Web interface command
    web_parser = subparsers.add_parser("web", help="Start the web interface")
    web_parser.add_argument("--host", default="0.0.0.0", help="Host to bind to")
    web_parser.add_argument("--port", type=int, default=3000, help="Port to bind to")
    web_parser.add_argument("--debug", action="store_true", help="Enable debug mode")
    web_parser.add_argument("--detached", action="store_true", help="Run in detached mode")
    
    # Scan command
    scan_parser = subparsers.add_parser("scan", help="Scan Telegram for files")
    scan_parser.add_argument("--channel", help="Channel to scan (default: from config)")
    scan_parser.add_argument("--limit", type=int, default=1000, help="Maximum number of messages to scan")
    scan_parser.add_argument("--output", help="Output file path")
    scan_parser.add_argument("--format", choices=["json", "csv", "excel"], default="json", 
                           help="Output format")
    
    # Config command
    config_parser = subparsers.add_parser("config", help="Configure TeleDrive")
    config_parser.add_argument("--show", action="store_true", help="Show current configuration")
    config_parser.add_argument("--set", nargs=2, metavar=("KEY", "VALUE"), 
                             action="append", help="Set configuration value")
    
    return parser


def handle_scan_command(args):
    """Handle the scan command."""
    try:
        # Import scanner here to avoid circular imports
        from src.teledrive.core.scanning.scanner import TelegramScanner
        
        print("🔍 Starting Telegram Scanner...")
        print("-" * 50)
        
        # Create event loop and run scanner
        loop = asyncio.get_event_loop()
        
        async def run_scanner():
            scanner = TelegramScanner()
            if await scanner.connect():
                channel_id = args.channel or config.channels.default_channel
                print(f"Scanning channel: {channel_id}")
                print(f"Limit: {args.limit} messages")
                
                files = await scanner.scan_channel(channel_id, limit=args.limit)
                await scanner.close()
                
                print(f"Found {len(files)} files in {channel_id}")
                
                # Save results
                if files:
                    if args.output:
                        output_path = args.output
                    else:
                        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
                        output_path = f"output/scan_{timestamp}.{args.format}"
                    
                    # Ensure output directory exists
                    os.makedirs(os.path.dirname(output_path), exist_ok=True)
                    
                    # Save based on format
                    if args.format == "json":
                        import json
                        with open(output_path, "w", encoding="utf-8") as f:
                            json.dump({"files": files}, f, indent=2, ensure_ascii=False)
                    elif args.format == "csv":
                        import csv
                        with open(output_path, "w", newline="", encoding="utf-8") as f:
                            writer = csv.DictWriter(f, fieldnames=files[0].keys())
                            writer.writeheader()
                            writer.writerows(files)
                    elif args.format == "excel":
                        import pandas as pd
                        df = pd.DataFrame(files)
                        df.to_excel(output_path, index=False)
                    
                    print(f"Results saved to {output_path}")
        
        loop.run_until_complete(run_scanner())
        
    except KeyboardInterrupt:
        print("\n✅ Scanner stopped.")
    except Exception as e:
        print(f"❌ Error running scanner: {e}")
        sys.exit(1)


def handle_web_command(args):
    """Handle the web command."""
    os.environ["DEV_MODE"] = "true" if args.debug else "false"
    
    if args.detached:
        # Run in detached mode
        import subprocess
        
        command = [sys.executable, __file__, "web", "--host", args.host, "--port", str(args.port)]
        if args.debug:
            command.append("--debug")
        
        if os.name == "nt":  # Windows
            CREATE_NEW_CONSOLE = 0x00000010
            process = subprocess.Popen(
                command,
                creationflags=CREATE_NEW_CONSOLE,
                cwd=os.path.dirname(os.path.abspath(__file__))
            )
            print(f"✅ Web interface started in detached mode (PID: {process.pid})")
        else:  # Linux/Mac
            command_str = " ".join(command)
            os.system(f"nohup {command_str} > logs/web_interface.log 2>&1 &")
            print("✅ Web interface started in detached mode")
    else:
        # Run in current process
        from src.teledrive.app import app
        app.run(host=args.host, port=args.port, debug=args.debug, threaded=True, use_reloader=False)


def handle_config_command(args):
    """Handle the config command."""
    if args.show:
        print("Current configuration:")
        print("-" * 50)
        # Print configuration
        print(f"Telegram API ID: {config.telegram.api_id}")
        print(f"Default channel: {config.channels.default_channel}")
        print(f"Max messages: {config.scanning.max_messages}")
        print(f"Output directory: {config.output.directory}")
    
    if args.set:
        print("Setting configuration values:")
        for key, value in args.set:
            print(f"  {key} = {value}")
        print("\nThis feature is not yet implemented.")


def main():
    """Main entry point for the CLI."""
    try:
        # Create parser and parse arguments
        parser = create_parser()
        args = parser.parse_args()
        
        # Validate environment configuration
        validate_environment()
        
        # Handle commands
        if args.command == "scan":
            handle_scan_command(args)
        elif args.command == "web":
            handle_web_command(args)
        elif args.command == "config":
            handle_config_command(args)
        else:
            # Default to web interface
            handle_web_command(argparse.Namespace(
                host="0.0.0.0",
                port=3000,
                debug=False,
                detached=False
            ))
    
    except KeyboardInterrupt:
        print("\n✅ Application stopped.")
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
