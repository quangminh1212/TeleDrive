#!/usr/bin/env python3
"""
Database migration utilities for TeleDrive.

Provides utilities for creating and managing database migrations.
"""

import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Union

from sqlalchemy import MetaData, create_engine, inspect, text
from sqlalchemy.ext.declarative import declarative_base

# Import logger from core utils
from src.teledrive.core.utils.logger import get_logger

# Create logger instance
logger = get_logger("migrate")


class Migration:
    """
    Database migration manager.
    
    Handles creating and applying migrations for SQLAlchemy models.
    """
    
    def __init__(self, db_uri: str, models_module: str, output_dir: str = "migrations"):
        """
        Initialize migration manager.
        
        Args:
            db_uri: Database URI
            models_module: Module containing SQLAlchemy models
            output_dir: Directory to store migration files
        """
        self.db_uri = db_uri
        self.models_module = models_module
        self.output_dir = output_dir
        self.engine = create_engine(db_uri)
        self.metadata = MetaData()
        self.Base = declarative_base(metadata=self.metadata)
        
        # Create migrations directory if it doesn't exist
        os.makedirs(self.output_dir, exist_ok=True)
    
    def _get_current_tables(self) -> Dict[str, Dict]:
        """
        Get current database tables and their structure.
        
        Returns:
            Dictionary of table names and their columns
        """
        inspector = inspect(self.engine)
        tables = {}
        
        for table_name in inspector.get_table_names():
            columns = {}
            for column in inspector.get_columns(table_name):
                columns[column["name"]] = {
                    "type": str(column["type"]),
                    "nullable": column["nullable"],
                    "default": column.get("default"),
                    "primary_key": column.get("primary_key", False)
                }
            
            tables[table_name] = {
                "columns": columns,
                "indexes": inspector.get_indexes(table_name),
                "pk_constraint": inspector.get_pk_constraint(table_name),
                "foreign_keys": inspector.get_foreign_keys(table_name)
            }
        
        return tables
    
    def _get_model_tables(self) -> Dict[str, Dict]:
        """
        Get tables defined in models.
        
        Returns:
            Dictionary of model table names and their columns
        """
        # Import models dynamically
        __import__(self.models_module)
        module = sys.modules[self.models_module]
        
        # Get all models
        tables = {}
        for attr_name in dir(module):
            attr = getattr(module, attr_name)
            if isinstance(attr, type) and hasattr(attr, "__tablename__"):
                table_name = attr.__tablename__
                columns = {}
                
                for column_name, column in attr.__table__.columns.items():
                    columns[column_name] = {
                        "type": str(column.type),
                        "nullable": column.nullable,
                        "default": column.default.arg if column.default else None,
                        "primary_key": column.primary_key
                    }
                
                tables[table_name] = {
                    "columns": columns,
                    "indexes": [],  # Add indexes if needed
                    "pk_constraint": {"constrained_columns": [c.name for c in attr.__table__.primary_key]},
                    "foreign_keys": []  # Add foreign keys if needed
                }
        
        return tables
    
    def generate_migration(self) -> str:
        """
        Generate migration file based on differences between models and database.
        
        Returns:
            Path to the generated migration file
        """
        current_tables = self._get_current_tables()
        model_tables = self._get_model_tables()
        
        # Determine changes needed
        new_tables = []
        modified_tables = []
        dropped_tables = []
        
        # Check for new and modified tables
        for table_name, table_info in model_tables.items():
            if table_name not in current_tables:
                new_tables.append(table_name)
            else:
                # Check for column differences
                current_columns = current_tables[table_name]["columns"]
                model_columns = table_info["columns"]
                
                # Check for new/modified columns
                for column_name, column_info in model_columns.items():
                    if column_name not in current_columns:
                        # New column
                        if table_name not in modified_tables:
                            modified_tables.append(table_name)
                        break
                    else:
                        # Check for column modifications
                        current_column = current_columns[column_name]
                        if (
                            column_info["type"] != current_column["type"] or
                            column_info["nullable"] != current_column["nullable"]
                        ):
                            if table_name not in modified_tables:
                                modified_tables.append(table_name)
                            break
                
                # Check for dropped columns
                for column_name in current_columns:
                    if column_name not in model_columns:
                        if table_name not in modified_tables:
                            modified_tables.append(table_name)
                        break
        
        # Check for dropped tables
        for table_name in current_tables:
            if table_name not in model_tables:
                dropped_tables.append(table_name)
        
        # Generate migration file
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        migration_file = f"{self.output_dir}/migration_{timestamp}.py"
        
        with open(migration_file, "w", encoding="utf-8") as f:
            f.write('"""\n')
            f.write(f"Migration generated at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write('"""\n\n')
            f.write("from sqlalchemy import create_engine, text\n\n\n")
            f.write("def upgrade(db_uri):\n")
            f.write("    \"\"\"Apply the migration.\"\"\"\n")
            f.write("    engine = create_engine(db_uri)\n")
            f.write("    with engine.connect() as conn:\n")
            f.write("        # Begin transaction\n")
            f.write("        with conn.begin():\n")
            
            # Add new tables
            if new_tables:
                f.write("            # Create new tables\n")
                for table in new_tables:
                    table_def = self._generate_create_table(table, model_tables[table])
                    f.write(f"            conn.execute(text(\"\"\"{table_def}\"\"\"))\n")
            
            # Modify existing tables
            if modified_tables:
                f.write("            # Modify tables\n")
                for table in modified_tables:
                    mods = self._generate_table_modifications(
                        table,
                        current_tables.get(table, {"columns": {}}),
                        model_tables[table]
                    )
                    for mod in mods:
                        f.write(f"            conn.execute(text(\"\"\"{mod}\"\"\"))\n")
            
            # Drop tables
            if dropped_tables:
                f.write("            # Drop tables\n")
                for table in dropped_tables:
                    f.write(f"            conn.execute(text(\"\"\"DROP TABLE IF EXISTS {table}\"\"\"))\n")
            
            # If no changes, add a comment
            if not new_tables and not modified_tables and not dropped_tables:
                f.write("            # No changes needed\n")
                f.write("            pass\n")
            
            f.write("\n\n")
            f.write("def downgrade(db_uri):\n")
            f.write("    \"\"\"Revert the migration.\"\"\"\n")
            f.write("    engine = create_engine(db_uri)\n")
            f.write("    with engine.connect() as conn:\n")
            f.write("        # Begin transaction\n")
            f.write("        with conn.begin():\n")
            f.write("            # Add your downgrade steps here\n")
            f.write("            pass\n")
        
        logger.info(f"Migration file generated: {migration_file}")
        logger.info(f"New tables: {len(new_tables)}, Modified tables: {len(modified_tables)}, Dropped tables: {len(dropped_tables)}")
        
        return migration_file
    
    def _generate_create_table(self, table_name: str, table_info: Dict) -> str:
        """
        Generate CREATE TABLE SQL statement.
        
        Args:
            table_name: Table name
            table_info: Table structure information
            
        Returns:
            CREATE TABLE SQL statement
        """
        columns = []
        primary_keys = []
        
        for column_name, column_info in table_info["columns"].items():
            column_def = f"{column_name} {column_info['type']}"
            
            if column_info.get("primary_key"):
                primary_keys.append(column_name)
            
            if not column_info.get("nullable", True):
                column_def += " NOT NULL"
            
            if column_info.get("default") is not None:
                column_def += f" DEFAULT {column_info['default']}"
            
            columns.append(column_def)
        
        if primary_keys:
            columns.append(f"PRIMARY KEY ({', '.join(primary_keys)})")
        
        return f"CREATE TABLE IF NOT EXISTS {table_name} (\n    {',\n    '.join(columns)}\n);"
    
    def _generate_table_modifications(
        self,
        table_name: str,
        current_table: Dict,
        model_table: Dict
    ) -> List[str]:
        """
        Generate SQL statements for table modifications.
        
        Args:
            table_name: Table name
            current_table: Current table structure
            model_table: Model table structure
            
        Returns:
            List of SQL statements for table modifications
        """
        modifications = []
        current_columns = current_table["columns"]
        model_columns = model_table["columns"]
        
        # Add new columns
        for column_name, column_info in model_columns.items():
            if column_name not in current_columns:
                column_def = f"{column_name} {column_info['type']}"
                
                if not column_info.get("nullable", True):
                    column_def += " NOT NULL"
                
                if column_info.get("default") is not None:
                    column_def += f" DEFAULT {column_info['default']}"
                
                modifications.append(f"ALTER TABLE {table_name} ADD COLUMN {column_def};")
        
        # Modify columns
        for column_name, column_info in model_columns.items():
            if column_name in current_columns:
                current_column = current_columns[column_name]
                
                if (
                    column_info["type"] != current_column["type"] or
                    column_info["nullable"] != current_column["nullable"]
                ):
                    column_def = f"{column_name} {column_info['type']}"
                    
                    if not column_info.get("nullable", True):
                        column_def += " NOT NULL"
                    
                    if column_info.get("default") is not None:
                        column_def += f" DEFAULT {column_info['default']}"
                    
                    # SQLite doesn't support ALTER COLUMN directly, so we need to create a new table
                    # This is just a placeholder for the concept
                    modifications.append(f"-- Modify column {column_name} in table {table_name} to {column_def};")
                    modifications.append(f"-- Note: Actual modification might require creating a new table and copying data")
        
        # Drop columns
        for column_name in current_columns:
            if column_name not in model_columns:
                # SQLite doesn't support DROP COLUMN directly in older versions, so we need to create a new table
                # This is just a placeholder for the concept
                modifications.append(f"-- Drop column {column_name} from table {table_name};")
                modifications.append(f"-- Note: Actual modification might require creating a new table and copying data")
        
        return modifications
    
    def apply_migration(self, migration_file: str) -> bool:
        """
        Apply a migration file.
        
        Args:
            migration_file: Path to migration file
            
        Returns:
            True if migration was applied successfully
        """
        try:
            # Get migration directory
            migration_dir = os.path.dirname(migration_file)
            migration_name = os.path.basename(migration_file).replace(".py", "")
            
            # Import migration module
            sys.path.insert(0, migration_dir)
            migration = __import__(migration_name)
            
            # Apply migration
            migration.upgrade(self.db_uri)
            
            logger.info(f"Applied migration: {migration_file}")
            return True
        except Exception as e:
            logger.error(f"Failed to apply migration {migration_file}: {e}")
            return False
    
    def apply_all_migrations(self) -> int:
        """
        Apply all pending migrations.
        
        Returns:
            Number of migrations applied
        """
        applied_migrations = 0
        
        # Get all migration files
        migration_files = sorted([
            f for f in os.listdir(self.output_dir)
            if f.startswith("migration_") and f.endswith(".py")
        ])
        
        # Apply each migration
        for migration_file in migration_files:
            if self.apply_migration(os.path.join(self.output_dir, migration_file)):
                applied_migrations += 1
        
        logger.info(f"Applied {applied_migrations} migrations")
        return applied_migrations


def create_migration_manager(
    db_uri: str,
    models_module: str,
    output_dir: str = "migrations"
) -> Migration:
    """
    Create a migration manager instance.
    
    Args:
        db_uri: Database URI
        models_module: Module containing SQLAlchemy models
        output_dir: Directory to store migration files
        
    Returns:
        Migration manager instance
    """
    return Migration(db_uri, models_module, output_dir) 