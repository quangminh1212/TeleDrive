import os
import json
import time
import hashlib
import hmac
from urllib.parse import urlencode
import requests
from flask import Flask, render_template, request, redirect, url_for, flash, send_file, session
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from pathlib import Path
import datetime
import secrets
from dotenv import load_dotenv
import shutil

# Chargement des variables d'environnement
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', secrets.token_hex(16))
app.config['UPLOAD_FOLDER'] = os.getenv('STORAGE_PATH', './storage')
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB max

# Configuration Telegram
TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
BOT_USERNAME = os.getenv('BOT_USERNAME', 'your_bot_username')  # Thay bằng username của bot của bạn

# Configuration de Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# Classe d'utilisateur pour Flask-Login
class User(UserMixin):
    def __init__(self, id, username, telegram_id=None):
        self.id = id
        self.username = username
        self.telegram_id = telegram_id

# Dictionnaires des utilisateurs et des mots de passe (à remplacer par une base de données dans une application de production)
users = {}
user_passwords = {}  # Dictionnaire pour stocker les mots de passe
telegram_users = {}  # Dictionnaire pour stocker les utilisateurs Telegram

@login_manager.user_loader
def load_user(user_id):
    return users.get(user_id)

# Fonction pour obtenir le chemin de stockage d'un utilisateur
def get_user_path(user_id):
    user_path = Path(app.config['UPLOAD_FOLDER']) / str(user_id)
    user_path.mkdir(exist_ok=True)
    return user_path

# Fonction pour obtenir les métadonnées d'un utilisateur
def get_user_metadata(user_id):
    metadata_path = Path(app.config['UPLOAD_FOLDER']) / 'metadata' / f"{user_id}.json"
    if not metadata_path.exists():
        Path(app.config['UPLOAD_FOLDER']).joinpath('metadata').mkdir(exist_ok=True)
        with open(metadata_path, 'w') as f:
            json.dump({"files": {}, "usage": 0}, f)
    
    with open(metadata_path, 'r') as f:
        return json.load(f)

# Fonction pour mettre à jour les métadonnées
def update_user_metadata(user_id, file_path, size, file_type):
    metadata_path = Path(app.config['UPLOAD_FOLDER']) / 'metadata' / f"{user_id}.json"
    
    if metadata_path.exists():
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
    else:
        metadata = {"files": {}, "usage": 0}
    
    # Ajouter ou mettre à jour le fichier
    metadata["files"][str(file_path)] = {
        "size": size,
        "type": file_type,
        "created": datetime.datetime.now().isoformat()
    }
    
    # Mettre à jour l'utilisation totale
    metadata["usage"] = sum(item["size"] for item in metadata["files"].values())
    
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f)

# Fonction pour supprimer un fichier des métadonnées
def remove_file_from_metadata(user_id, file_path):
    metadata_path = Path(app.config['UPLOAD_FOLDER']) / 'metadata' / f"{user_id}.json"
    
    if not metadata_path.exists():
        return
    
    with open(metadata_path, 'r') as f:
        metadata = json.load(f)
    
    # Supprimer le fichier s'il existe
    if str(file_path) in metadata["files"]:
        del metadata["files"][str(file_path)]
    
    # Mettre à jour l'utilisation totale
    metadata["usage"] = sum(item["size"] for item in metadata["files"].values())
    
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f)

# Fonction pour formater la taille
def format_size(size_bytes):
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.1f} GB"

# Vérification des données Telegram
def verify_telegram_data(data):
    if 'hash' not in data:
        return False
    
    auth_data = data.copy()
    auth_hash = auth_data.pop('hash')
    
    data_check_string = '\n'.join(f'{k}={v}' for k, v in sorted(auth_data.items()))
    secret_key = hashlib.sha256(TELEGRAM_BOT_TOKEN.encode()).digest()
    hash_string = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    
    return hash_string == auth_hash

# Route pour la page d'accueil
@app.route('/')
def index():
    # Si l'utilisateur est connecté, rediriger vers le tableau de bord
    if current_user.is_authenticated:
        return redirect(url_for('browse_files'))
    # Sinon, rediriger vers la page de connexion
    return redirect(url_for('login'))

# Route pour Telegram Login
@app.route('/telegram_login')
def telegram_login():
    auth_url = f"https://telegram.org/auth/authorize?bot_id={BOT_USERNAME}&origin={request.host_url}&return_to={url_for('telegram_callback', _external=True)}"
    return redirect(auth_url)

# Route pour callback après l'authentification Telegram
@app.route('/telegram_callback')
def telegram_callback():
    auth_data = request.args.to_dict()
    
    if not verify_telegram_data(auth_data):
        flash('Xác thực Telegram thất bại. Vui lòng thử lại.', 'danger')
        return redirect(url_for('login'))
    
    telegram_id = auth_data.get('id')
    first_name = auth_data.get('first_name', '')
    last_name = auth_data.get('last_name', '')
    username = auth_data.get('username', f"user_{telegram_id}")
    
    # Vérifier si l'utilisateur existe déjà
    if telegram_id in telegram_users:
        user_id = telegram_users[telegram_id]
        login_user(users[user_id])
        flash(f'Xin chào {first_name}! Đăng nhập thành công.', 'success')
        return redirect(url_for('browse_files'))
    
    # Créer un nouvel utilisateur
    user_id = str(len(users) + 1)
    display_name = f"{first_name} {last_name}".strip() if last_name else first_name
    users[user_id] = User(user_id, display_name, telegram_id)
    telegram_users[telegram_id] = user_id
    
    # Créer le dossier de l'utilisateur
    get_user_path(user_id)
    
    login_user(users[user_id])
    flash(f'Xin chào {display_name}! Tài khoản của bạn đã được tạo thành công.', 'success')
    return redirect(url_for('browse_files'))

# Route pour l'inscription
@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        # Vérifiez si l'utilisateur existe déjà
        for user in users.values():
            if user.username == username:
                flash('Tên người dùng đã tồn tại', 'danger')
                return redirect(url_for('register'))
        
        # Créer un nouvel utilisateur
        user_id = str(len(users) + 1)
        users[user_id] = User(user_id, username)
        
        # Enregistrez le mot de passe (à faire correctement dans une application de production)
        # Dans un environnement de production, vous devriez hacher le mot de passe
        user_passwords[user_id] = password
        
        # Créer le dossier de l'utilisateur
        get_user_path(user_id)
        
        flash('Đăng ký thành công! Bạn có thể đăng nhập bây giờ.', 'success')
        return redirect(url_for('login'))
    
    return render_template('register.html')

# Route pour la connexion
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        # Rechercher l'utilisateur
        user_id = None
        for id, user in users.items():
            if user.username == username:
                user_id = id
                break
        
        if user_id and user_passwords.get(user_id) == password:
            login_user(users[user_id])
            next_page = request.args.get('next')
            return redirect(next_page or url_for('browse_files'))
        else:
            flash('Đăng nhập thất bại. Kiểm tra tên người dùng và mật khẩu của bạn.', 'danger')
    
    return render_template('login.html', bot_username=BOT_USERNAME)

# Route pour la déconnexion
@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

# Route pour le tableau de bord
@app.route('/dashboard')
@login_required
def dashboard():
    # Obtenir les statistiques de l'utilisateur
    metadata = get_user_metadata(current_user.id)
    usage = metadata.get('usage', 0)
    usage_str = format_size(usage)
    
    return render_template('dashboard.html', 
                          username=current_user.username, 
                          usage=usage_str,
                          current_path='')

# Route pour afficher les fichiers dans un dossier
@app.route('/files/', defaults={'path': ''})
@app.route('/files/<path:path>')
@login_required
def browse_files(path):
    base_path = get_user_path(current_user.id)
    current_path = path
    
    # Construire le chemin complet
    full_path = base_path
    if current_path:
        full_path = base_path / current_path
    
    # Vérifier que le dossier existe
    if not full_path.exists():
        full_path.mkdir(parents=True, exist_ok=True)
    
    # Lister les fichiers et dossiers
    items = []
    
    for item in full_path.iterdir():
        rel_path = str(item.relative_to(base_path))
        name = item.name
        
        if item.is_dir():
            items.append({
                'name': name,
                'path': rel_path,
                'type': 'folder',
                'size': '',
                'date': datetime.datetime.fromtimestamp(item.stat().st_mtime).strftime('%Y-%m-%d %H:%M:%S')
            })
        else:
            size = item.stat().st_size
            size_str = format_size(size)
            items.append({
                'name': name,
                'path': rel_path,
                'type': 'file',
                'size': size_str,
                'date': datetime.datetime.fromtimestamp(item.stat().st_mtime).strftime('%Y-%m-%d %H:%M:%S')
            })
    
    # Trier: dossiers d'abord, puis fichiers, et par nom
    items.sort(key=lambda x: (0 if x['type'] == 'folder' else 1, x['name']))
    
    # Obtenir le chemin parent
    parent_path = str(Path(current_path).parent) if current_path else None
    if parent_path == '.':
        parent_path = ''
    
    # Obtenir les statistiques de l'utilisateur
    metadata = get_user_metadata(current_user.id)
    usage = metadata.get('usage', 0)
    usage_str = format_size(usage)
    
    return render_template('files.html', 
                          items=items, 
                          current_path=current_path,
                          parent_path=parent_path,
                          username=current_user.username,
                          usage=usage_str)

# Route pour télécharger un fichier
@app.route('/download/<path:file_path>')
@login_required
def download_file(file_path):
    base_path = get_user_path(current_user.id)
    full_path = base_path / file_path
    
    if not full_path.exists() or full_path.is_dir():
        flash('Tệp không tồn tại', 'danger')
        return redirect(url_for('browse_files'))
    
    return send_file(full_path, as_attachment=True)

# Route pour créer un nouveau dossier
@app.route('/create_folder', methods=['POST'])
@login_required
def create_folder():
    folder_name = request.form.get('folder_name', '').strip()
    current_path = request.form.get('current_path', '')
    
    # Validation du nom du dossier
    if not folder_name or '/' in folder_name or '\\' in folder_name or folder_name in ['.', '..']:
        flash('Tên thư mục không hợp lệ', 'danger')
        return redirect(url_for('browse_files', path=current_path))
    
    # Construire le chemin complet
    base_path = get_user_path(current_user.id)
    folder_path = base_path
    
    if current_path:
        folder_path = base_path / current_path
    
    new_folder_path = folder_path / folder_name
    
    if new_folder_path.exists():
        flash(f'Thư mục có tên \'{folder_name}\' đã tồn tại', 'warning')
    else:
        new_folder_path.mkdir(parents=True, exist_ok=True)
        flash(f'Đã tạo thư mục \'{folder_name}\' thành công', 'success')
    
    return redirect(url_for('browse_files', path=current_path))

# Route pour téléverser un fichier
@app.route('/upload', methods=['POST'])
@login_required
def upload_file():
    if 'file' not in request.files:
        flash('Không có tệp nào được chọn', 'danger')
        return redirect(request.referrer)
    
    file = request.files['file']
    current_path = request.form.get('current_path', '')
    
    if file.filename == '':
        flash('Không có tệp nào được chọn', 'danger')
        return redirect(request.referrer)
    
    # Construire le chemin complet
    base_path = get_user_path(current_user.id)
    save_path = base_path
    
    if current_path:
        save_path = base_path / current_path
    
    # Créer le dossier s'il n'existe pas
    save_path.mkdir(parents=True, exist_ok=True)
    
    # Sauvegarder le fichier
    file_path = save_path / file.filename
    file.save(file_path)
    
    # Mettre à jour les métadonnées
    file_size = file_path.stat().st_size
    file_type = file.filename.split('.')[-1] if '.' in file.filename else 'unknown'
    rel_path = str(file_path.relative_to(base_path))
    update_user_metadata(current_user.id, rel_path, file_size, file_type)
    
    flash(f'Tệp \'{file.filename}\' đã được tải lên thành công', 'success')
    return redirect(url_for('browse_files', path=current_path))

# Route pour supprimer un fichier ou un dossier
@app.route('/delete/<path:file_path>')
@login_required
def delete_item(file_path):
    base_path = get_user_path(current_user.id)
    full_path = base_path / file_path
    
    if not full_path.exists():
        flash('Tệp hoặc thư mục không tồn tại', 'danger')
        return redirect(request.referrer)
    
    # Obtenir le chemin du dossier parent pour la redirection
    parent_path = str(Path(file_path).parent)
    if parent_path == '.':
        parent_path = ''
    
    try:
        if full_path.is_dir():
            shutil.rmtree(full_path)
            flash(f'Đã xóa thư mục \'{full_path.name}\' thành công', 'success')
        else:
            full_path.unlink()
            # Mettre à jour les métadonnées
            remove_file_from_metadata(current_user.id, file_path)
            flash(f'Đã xóa tệp \'{full_path.name}\' thành công', 'success')
    except Exception as e:
        flash(f'Lỗi khi xóa: {e}', 'danger')
    
    return redirect(url_for('browse_files', path=parent_path))

# Route pour traiter l'authentification Telegram via widget
@app.route('/telegram_auth', methods=['POST'])
def telegram_auth():
    auth_data = request.form.to_dict()
    
    if not verify_telegram_data(auth_data):
        flash('Xác thực Telegram thất bại. Vui lòng thử lại.', 'danger')
        return redirect(url_for('login'))
    
    telegram_id = auth_data.get('id')
    first_name = auth_data.get('first_name', '')
    last_name = auth_data.get('last_name', '')
    username = auth_data.get('username', f"user_{telegram_id}")
    
    # Vérifier si l'utilisateur existe déjà
    if telegram_id in telegram_users:
        user_id = telegram_users[telegram_id]
        login_user(users[user_id])
        flash(f'Xin chào {first_name}! Đăng nhập thành công.', 'success')
        return redirect(url_for('browse_files'))
    
    # Créer un nouvel utilisateur
    user_id = str(len(users) + 1)
    display_name = f"{first_name} {last_name}".strip() if last_name else first_name
    users[user_id] = User(user_id, display_name, telegram_id)
    telegram_users[telegram_id] = user_id
    
    # Créer le dossier de l'utilisateur
    get_user_path(user_id)
    
    login_user(users[user_id])
    flash(f'Xin chào {display_name}! Tài khoản của bạn đã được tạo thành công.', 'success')
    return redirect(url_for('browse_files'))

# Créer un utilisateur par défaut
users['1'] = User('1', 'admin')
user_passwords['1'] = 'admin'  # À ne pas faire en production !

if __name__ == '__main__':
    # Créer les dossiers nécessaires
    os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'metadata'), exist_ok=True)
    
    # Créer le chemin pour l'utilisateur par défaut
    get_user_path('1')
    
    app.run(host='0.0.0.0', port=5000, debug=True) 