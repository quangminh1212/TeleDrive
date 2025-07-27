"""
Example Configuration for TeleDrive.

This module provides example configuration settings for development.
"""

from src.teledrive.core.config.production import (
    ProductionConfig,
    DatabaseConfig,
    SecurityConfig,
    TelegramConfig
)

class DevelopmentConfig(ProductionConfig):
    """Development configuration class."""
    
    def __init__(self):
        """Initialize development configuration."""
        super().__init__()
        
        # Override environment
        self.environment = "development"
        self.debug = True
        self.bypass_auth = True
        
        # Override database config for development
        self.database = DatabaseConfig(
            uri="sqlite:///instance/dev.db",
            echo=True
        )
        
        # Override security config for development
        self.security = SecurityConfig(
            secret_key="dev-secret-key",
            csrf_enabled=False
        )
        
        # Example Telegram config (replace with actual values)
        self.telegram = TelegramConfig(
            api_id="YOUR_API_ID",
            api_hash="YOUR_API_HASH",
            phone_number="YOUR_PHONE_NUMBER"
        )
    
    def _validate_config(self):
        """Override validation for development."""
        # Skip strict validation for development
        pass


# Example usage
if __name__ == "__main__":
    # Create development config
    dev_config = DevelopmentConfig()
    
    # Print configuration
    print("Development Configuration:")
    print(f"Environment: {dev_config.environment}")
    print(f"Debug Mode: {dev_config.debug}")
    print(f"Database URI: {dev_config.database.uri}")
    print(f"Secret Key: {dev_config.security.secret_key}")
    
    # Get Flask config
    flask_config = dev_config.get_flask_config()
    print("\nFlask Configuration:")
    for key, value in flask_config.items():
        # Hide sensitive values
        if key == "SECRET_KEY":
            print(f"{key}: [HIDDEN]")
        else:
            print(f"{key}: {value}") 