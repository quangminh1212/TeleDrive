"""TeleDrive web application."""

import os
from flask import Flask, render_template, send_from_directory, jsonify

from ..utils import config_utils
from ..utils.logger import setup_detailed_logging

# Load configuration
config = config_utils.load_config()

# Setup logging
logger = setup_detailed_logging(config.get('logging', {}))

# Initialize Flask app
app = Flask(__name__, 
            static_folder=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'static'),
            template_folder=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'templates'))


@app.route('/')
def index():
    """Render the index page."""
    return render_template('index.html')


@app.route('/settings')
def settings():
    """Render the settings page."""
    return render_template('settings.html')


@app.route('/scan')
def scan():
    """Render the scan page."""
    return render_template('search.html')  # We're using search.html since scan.html was removed


@app.route('/api/config', methods=['GET'])
def get_config():
    """Return the current configuration."""
    # Return a safe version of the config (without sensitive information)
    safe_config = config_utils.load_config()
    
    # Mask sensitive information
    if 'telegram' in safe_config:
        if 'api_hash' in safe_config['telegram']:
            safe_config['telegram']['api_hash'] = '****' + safe_config['telegram']['api_hash'][-4:] if safe_config['telegram']['api_hash'] else ''
    
    return jsonify(safe_config)


def run(host="127.0.0.1", port=3000, debug=False):
    """Run the web application."""
    app.run(host=host, port=port, debug=debug)


if __name__ == "__main__":
    run(host="0.0.0.0", port=3000, debug=True)