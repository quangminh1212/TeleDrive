#!/usr/bin/env python3
"""Command-line interface for TeleDrive."""

import argparse
import sys
from typing import List, Optional

from . import __version__


def parse_args(args: Optional[List[str]] = None) -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        prog="teledrive",
        description="Google Drive-like Telegram File Manager",
    )
    parser.add_argument(
        "--version", action="version", version=f"TeleDrive {__version__}"
    )

    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    # Web command
    web_parser = subparsers.add_parser("web", help="Web interface commands")
    web_subparsers = web_parser.add_subparsers(dest="web_command", help="Web command to run")
    
    web_start = web_subparsers.add_parser("start", help="Start web server")
    web_start.add_argument("--port", type=int, default=3000, help="Port to listen on")
    web_start.add_argument("--host", default="127.0.0.1", help="Host to bind to")
    web_start.add_argument("--debug", action="store_true", help="Enable debug mode")

    # Scan command
    scan_parser = subparsers.add_parser("scan", help="Scan Telegram channels")
    scan_parser.add_argument("channel", help="Channel to scan")
    scan_parser.add_argument("--limit", type=int, help="Maximum number of messages to scan")
    
    # Config command
    config_parser = subparsers.add_parser("config", help="Configuration commands")
    config_subparsers = config_parser.add_subparsers(dest="config_command", help="Config command to run")
    
    config_setup = config_subparsers.add_parser("setup", help="Setup configuration")
    config_view = config_subparsers.add_parser("view", help="View configuration")
    config_edit = config_subparsers.add_parser("edit", help="Edit configuration")
    config_edit.add_argument("key", help="Configuration key to edit")
    config_edit.add_argument("value", help="New value for configuration key")

    # Files command
    files_parser = subparsers.add_parser("files", help="File commands")
    files_subparsers = files_parser.add_subparsers(dest="files_command", help="Files command to run")
    
    files_list = files_subparsers.add_parser("list", help="List files")
    files_list.add_argument("--path", default="", help="Path to list")
    
    files_search = files_subparsers.add_parser("search", help="Search files")
    files_search.add_argument("query", help="Search query")
    
    return parser.parse_args(args)


def main(args: Optional[List[str]] = None) -> int:
    """Run the command-line interface."""
    parsed_args = parse_args(args)
    
    if parsed_args.command is None:
        print("Error: No command specified. Use --help for usage information.")
        return 1
    
    if parsed_args.command == "web":
        if parsed_args.web_command == "start":
            from .web import app
            print(f"Starting web server on {parsed_args.host}:{parsed_args.port}")
            app.run(host=parsed_args.host, port=parsed_args.port, debug=parsed_args.debug)
        else:
            print(f"Error: Unknown web command '{parsed_args.web_command}'")
            return 1
    
    elif parsed_args.command == "scan":
        from .core import scanner
        print(f"Scanning channel {parsed_args.channel}")
        scanner.scan_channel(parsed_args.channel, limit=parsed_args.limit)
    
    elif parsed_args.command == "config":
        from .utils import config_utils
        
        if parsed_args.config_command == "setup":
            config_utils.setup_config()
        elif parsed_args.config_command == "view":
            config_utils.view_config()
        elif parsed_args.config_command == "edit":
            config_utils.edit_config(parsed_args.key, parsed_args.value)
        else:
            print(f"Error: Unknown config command '{parsed_args.config_command}'")
            return 1
    
    elif parsed_args.command == "files":
        from .core import file_manager
        
        if parsed_args.files_command == "list":
            file_manager.list_files(parsed_args.path)
        elif parsed_args.files_command == "search":
            file_manager.search_files(parsed_args.query)
        else:
            print(f"Error: Unknown files command '{parsed_args.files_command}'")
            return 1
    
    return 0


if __name__ == "__main__":
    sys.exit(main())