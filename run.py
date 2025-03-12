import os
import sys
import threading
import time
import subprocess
import signal
import importlib.util

def check_module(module_name):
    """Vérifie si un module est installé."""
    spec = importlib.util.find_spec(module_name)
    return spec is not None

def install_requirements():
    """Installe les dépendances si elles ne sont pas déjà installées."""
    required_modules = ['python-telegram-bot', 'python-dotenv', 'flask', 'flask-login']
    missing_modules = [module for module in required_modules if not check_module(module.replace('-', '_'))]
    
    if missing_modules:
        print(f"Installation des modules manquants: {', '.join(missing_modules)}")
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'])
        print("Dépendances installées avec succès.")

def run_bot():
    """Lance le bot Telegram."""
    try:
        print("Démarrage du bot Telegram...")
        import bot
        bot.main()
    except Exception as e:
        print(f"Erreur lors du démarrage du bot: {e}")

def run_web():
    """Lance l'interface web."""
    try:
        print("Démarrage de l'interface web...")
        import app
        app.app.run(host='0.0.0.0', port=5000)
    except Exception as e:
        print(f"Erreur lors du démarrage de l'interface web: {e}")

def main():
    """Fonction principale qui lance les deux composants."""
    # Vérifier et installer les dépendances
    install_requirements()
    
    # Créer le dossier de stockage s'il n'existe pas
    storage_path = os.getenv('STORAGE_PATH', './storage')
    os.makedirs(storage_path, exist_ok=True)
    os.makedirs(os.path.join(storage_path, 'metadata'), exist_ok=True)
    
    # Démarrer le bot Telegram dans un thread séparé
    bot_thread = threading.Thread(target=run_bot)
    bot_thread.daemon = True
    bot_thread.start()
    
    # Démarrer l'interface web dans le thread principal
    run_web()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nArrêt du service...")
        sys.exit(0) 