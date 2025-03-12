import logging
import os
from dotenv import load_dotenv
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Updater, CommandHandler, MessageHandler, Filters, 
    CallbackContext, CallbackQueryHandler, ConversationHandler
)
import datetime
import shutil
from pathlib import Path
import json

# Chargement des variables d'environnement
load_dotenv()

# Configuration du logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# États de conversation
MAIN_MENU, FILE_UPLOAD, FILE_BROWSE, FOLDER_CREATE = range(4)

# Chemin de stockage
STORAGE_PATH = os.getenv('STORAGE_PATH', './storage')
Path(STORAGE_PATH).mkdir(parents=True, exist_ok=True)

# Chemin pour les métadonnées
METADATA_PATH = Path(STORAGE_PATH) / 'metadata'
METADATA_PATH.mkdir(exist_ok=True)

def get_user_path(user_id):
    """Renvoie le chemin de stockage spécifique à l'utilisateur"""
    user_path = Path(STORAGE_PATH) / str(user_id)
    user_path.mkdir(exist_ok=True)
    return user_path

def get_user_metadata_path(user_id):
    """Renvoie le chemin des métadonnées de l'utilisateur"""
    user_metadata_path = METADATA_PATH / f"{user_id}.json"
    if not user_metadata_path.exists():
        with open(user_metadata_path, 'w') as f:
            json.dump({"files": {}, "usage": 0}, f)
    return user_metadata_path

def update_user_metadata(user_id, file_path, size, file_type):
    """Met à jour les métadonnées de l'utilisateur"""
    metadata_path = get_user_metadata_path(user_id)
    with open(metadata_path, 'r') as f:
        metadata = json.load(f)
    
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

def remove_file_from_metadata(user_id, file_path):
    """Supprime un fichier des métadonnées"""
    metadata_path = get_user_metadata_path(user_id)
    with open(metadata_path, 'r') as f:
        metadata = json.load(f)
    
    # Supprimer le fichier s'il existe
    if str(file_path) in metadata["files"]:
        del metadata["files"][str(file_path)]
    
    # Mettre à jour l'utilisation totale
    metadata["usage"] = sum(item["size"] for item in metadata["files"].values())
    
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f)

def start(update: Update, context: CallbackContext) -> int:
    """Démarre la conversation et affiche le menu principal"""
    user = update.effective_user
    
    # Créer le dossier de l'utilisateur s'il n'existe pas
    get_user_path(user.id)
    
    keyboard = [
        [InlineKeyboardButton("📁 Xem tệp của tôi", callback_data='browse')],
        [InlineKeyboardButton("⬆️ Tải lên tệp", callback_data='upload')],
        [InlineKeyboardButton("📂 Tạo thư mục", callback_data='create_folder')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    update.message.reply_text(
        f"Xin chào {user.first_name}! Tôi là TeleDrive, quản lý tệp của bạn trên Telegram. "
        f"Bạn muốn làm gì?",
        reply_markup=reply_markup
    )
    
    return MAIN_MENU

def button_handler(update: Update, context: CallbackContext) -> int:
    """Gère les boutons du clavier inline"""
    query = update.callback_query
    query.answer()
    
    if query.data == 'browse':
        return browse_files(update, context)
    elif query.data == 'upload':
        query.edit_message_text("Gửi cho tôi một tệp và tôi sẽ lưu trữ nó cho bạn.")
        return FILE_UPLOAD
    elif query.data == 'create_folder':
        query.edit_message_text("Hãy gửi cho tôi tên của thư mục mới.")
        return FOLDER_CREATE
    elif query.data.startswith('open_folder:'):
        folder_path = query.data.split(':', 1)[1]
        context.user_data['current_path'] = folder_path
        return browse_files(update, context)
    elif query.data == 'back':
        # Retour au dossier parent
        current_path = context.user_data.get('current_path', '')
        if current_path:
            parent_path = str(Path(current_path).parent)
            if parent_path == '.':
                parent_path = ''
            context.user_data['current_path'] = parent_path
        return browse_files(update, context)
    elif query.data.startswith('download:'):
        file_path = query.data.split(':', 1)[1]
        return send_file(update, context, file_path)
    elif query.data.startswith('delete:'):
        file_path = query.data.split(':', 1)[1]
        return delete_file(update, context, file_path)
    elif query.data == 'main_menu':
        # Retour au menu principal
        query.edit_message_text("Đang quay lại menu chính...")
        return start(update, context)
    
    return MAIN_MENU

def browse_files(update: Update, context: CallbackContext) -> int:
    """Affiche les fichiers et dossiers dans le répertoire courant"""
    user_id = update.effective_user.id
    
    # Obtenir le chemin courant ou utiliser la racine
    current_path = context.user_data.get('current_path', '')
    
    # Construire le chemin complet
    base_path = get_user_path(user_id)
    full_path = base_path
    
    if current_path:
        full_path = base_path / current_path
    
    # Vérifier que le dossier existe
    if not full_path.exists():
        full_path.mkdir(parents=True, exist_ok=True)
    
    # Lister les fichiers et dossiers
    files = []
    folders = []
    
    for item in full_path.iterdir():
        if item.is_dir():
            rel_path = str(item.relative_to(base_path))
            folders.append((item.name, rel_path))
        else:
            rel_path = str(item.relative_to(base_path))
            size = item.stat().st_size
            size_str = format_size(size)
            files.append((item.name, rel_path, size_str))
    
    # Trier par nom
    folders.sort()
    files.sort()
    
    # Créer le clavier
    keyboard = []
    
    # Bouton de retour si on n'est pas à la racine
    if current_path:
        keyboard.append([InlineKeyboardButton("⬆️ Quay lại", callback_data='back')])
    
    # Ajouter les dossiers
    for folder_name, rel_path in folders:
        keyboard.append([
            InlineKeyboardButton(f"📁 {folder_name}", callback_data=f'open_folder:{rel_path}')
        ])
    
    # Ajouter les fichiers
    for file_name, rel_path, size_str in files:
        keyboard.append([
            InlineKeyboardButton(f"📄 {file_name} ({size_str})", callback_data=f'download:{rel_path}'),
            InlineKeyboardButton("❌", callback_data=f'delete:{rel_path}')
        ])
    
    # Bouton pour revenir au menu principal
    keyboard.append([InlineKeyboardButton("🏠 Menu chính", callback_data='main_menu')])
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    # Afficher le titre du dossier courant
    title = "📁 Thư mục gốc" if not current_path else f"📁 {Path(current_path).name}"
    
    query = update.callback_query
    if query:
        query.edit_message_text(f"{title}\n\nChọn một mục:", reply_markup=reply_markup)
    else:
        context.bot.send_message(
            chat_id=update.effective_chat.id,
            text=f"{title}\n\nChọn một mục:",
            reply_markup=reply_markup
        )
    
    return FILE_BROWSE

def receive_file(update: Update, context: CallbackContext) -> int:
    """Traite un fichier envoyé par l'utilisateur"""
    user_id = update.effective_user.id
    
    # Obtenir le document
    file = None
    file_name = None
    file_type = "unknown"
    
    if update.message.document:
        file = update.message.document.get_file()
        file_name = update.message.document.file_name
        file_type = "document"
    elif update.message.photo:
        file = update.message.photo[-1].get_file()
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        file_name = f"photo_{timestamp}.jpg"
        file_type = "photo"
    elif update.message.video:
        file = update.message.video.get_file()
        file_name = update.message.video.file_name or f"video_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.mp4"
        file_type = "video"
    elif update.message.audio:
        file = update.message.audio.get_file()
        file_name = update.message.audio.file_name or f"audio_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.mp3"
        file_type = "audio"
    
    if not file:
        update.message.reply_text("Loại tệp không được hỗ trợ. Vui lòng gửi tài liệu, hình ảnh, video hoặc âm thanh.")
        return FILE_UPLOAD
    
    # Obtenir le chemin courant
    current_path = context.user_data.get('current_path', '')
    
    # Construire le chemin complet
    base_path = get_user_path(user_id)
    save_path = base_path
    
    if current_path:
        save_path = base_path / current_path
    
    # Créer le dossier s'il n'existe pas
    save_path.mkdir(parents=True, exist_ok=True)
    
    # Télécharger et sauvegarder le fichier
    file_path = save_path / file_name
    file.download(custom_path=str(file_path))
    
    file_size = file_path.stat().st_size
    size_str = format_size(file_size)
    
    # Mettre à jour les métadonnées
    rel_path = str(file_path.relative_to(base_path))
    update_user_metadata(user_id, rel_path, file_size, file_type)
    
    update.message.reply_text(
        f"✅ Tệp '{file_name}' ({size_str}) đã được tải lên thành công!"
    )
    
    # Retour au menu principal
    return start(update, context)

def create_folder(update: Update, context: CallbackContext) -> int:
    """Crée un nouveau dossier"""
    user_id = update.effective_user.id
    folder_name = update.message.text.strip()
    
    # Validation du nom du dossier
    if not folder_name or '/' in folder_name or '\\' in folder_name or folder_name in ['.', '..']:
        update.message.reply_text("Tên thư mục không hợp lệ. Vui lòng thử lại với tên hợp lệ.")
        return FOLDER_CREATE
    
    # Obtenir le chemin courant
    current_path = context.user_data.get('current_path', '')
    
    # Construire le chemin complet
    base_path = get_user_path(user_id)
    folder_path = base_path
    
    if current_path:
        folder_path = base_path / current_path
    
    # Créer le nouveau dossier
    new_folder_path = folder_path / folder_name
    
    if new_folder_path.exists():
        update.message.reply_text(f"Thư mục có tên '{folder_name}' đã tồn tại.")
    else:
        new_folder_path.mkdir(parents=True, exist_ok=True)
        update.message.reply_text(f"✅ Thư mục '{folder_name}' đã được tạo thành công!")
    
    # Retour au menu principal
    return start(update, context)

def send_file(update: Update, context: CallbackContext, file_path: str) -> int:
    """Envoie un fichier à l'utilisateur"""
    user_id = update.effective_user.id
    base_path = get_user_path(user_id)
    full_path = base_path / file_path
    
    if not full_path.exists():
        query = update.callback_query
        query.edit_message_text("Tệp này không còn tồn tại.")
        return browse_files(update, context)
    
    # Obtenir le nom et la taille du fichier
    file_name = full_path.name
    file_size = full_path.stat().st_size
    size_str = format_size(file_size)
    
    try:
        # Envoyer un message de chargement
        query = update.callback_query
        query.edit_message_text(f"Đang gửi '{file_name}' ({size_str})...")
        
        # Envoyer le fichier
        with open(full_path, 'rb') as file:
            context.bot.send_document(
                chat_id=update.effective_chat.id,
                document=file,
                filename=file_name
            )
        
        # Retourner à la navigation des fichiers
        return browse_files(update, context)
    
    except Exception as e:
        logger.error(f"Erreur lors de l'envoi du fichier: {e}")
        context.bot.send_message(
            chat_id=update.effective_chat.id,
            text=f"Xin lỗi, đã xảy ra lỗi khi gửi tệp: {e}"
        )
        return browse_files(update, context)

def delete_file(update: Update, context: CallbackContext, file_path: str) -> int:
    """Supprime un fichier ou un dossier"""
    user_id = update.effective_user.id
    base_path = get_user_path(user_id)
    full_path = base_path / file_path
    
    if not full_path.exists():
        query = update.callback_query
        query.edit_message_text("Tệp hoặc thư mục này không còn tồn tại.")
        return browse_files(update, context)
    
    try:
        if full_path.is_dir():
            shutil.rmtree(full_path)
        else:
            full_path.unlink()
            # Mettre à jour les métadonnées
            remove_file_from_metadata(user_id, file_path)
        
        query = update.callback_query
        query.edit_message_text(f"✅ '{full_path.name}' đã được xóa thành công!")
        
        # Revenir à la navigation des fichiers après un court délai
        context.job_queue.run_once(
            lambda _: browse_files(update, context),
            1,
            context=update
        )
        
        return FILE_BROWSE
    
    except Exception as e:
        logger.error(f"Erreur lors de la suppression: {e}")
        query = update.callback_query
        query.edit_message_text(f"Xin lỗi, đã xảy ra lỗi khi xóa: {e}")
        return browse_files(update, context)

def format_size(size_bytes):
    """Formate la taille en bytes en une chaîne lisible"""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.1f} GB"

def error_handler(update: Update, context: CallbackContext):
    """Gère les erreurs"""
    logger.error(f"Update {update} a causé l'erreur {context.error}")
    try:
        if update and update.effective_chat:
            context.bot.send_message(
                chat_id=update.effective_chat.id,
                text="Xin lỗi, đã xảy ra lỗi. Thao tác thất bại."
            )
    except Exception as e:
        logger.error(f"Erreur lors de l'envoi du message d'erreur: {e}")

def main():
    """Fonction principale pour démarrer le bot"""
    # Récupérer le token du bot depuis les variables d'environnement
    token = os.getenv('TELEGRAM_BOT_TOKEN')
    if not token:
        logger.error("Token Telegram không tìm thấy. Vui lòng đặt TELEGRAM_BOT_TOKEN trong tệp .env")
        return
    
    # Créer l'updater et le dispatcher
    updater = Updater(token)
    dispatcher = updater.dispatcher
    
    # Définir un gestionnaire de conversation
    conv_handler = ConversationHandler(
        entry_points=[CommandHandler('start', start)],
        states={
            MAIN_MENU: [
                CallbackQueryHandler(button_handler),
            ],
            FILE_UPLOAD: [
                MessageHandler(
                    Filters.document | Filters.photo | Filters.video | Filters.audio,
                    receive_file
                ),
                CommandHandler('start', start),
            ],
            FILE_BROWSE: [
                CallbackQueryHandler(button_handler),
                CommandHandler('start', start),
            ],
            FOLDER_CREATE: [
                MessageHandler(Filters.text & ~Filters.command, create_folder),
                CommandHandler('start', start),
            ],
        },
        fallbacks=[CommandHandler('start', start)],
    )
    
    dispatcher.add_handler(conv_handler)
    
    # Gestionnaire d'erreurs
    dispatcher.add_error_handler(error_handler)
    
    # Démarrer le bot
    updater.start_polling()
    print("Bot TeleDrive đã khởi động! Nhấn Ctrl+C để dừng.")
    updater.idle()

if __name__ == '__main__':
    main() 