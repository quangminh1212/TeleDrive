# TeleDrive - Bot Telegram de Gestion de Fichiers

TeleDrive est un bot Telegram qui vous permet de gérer vos fichiers directement depuis Telegram, similaire à Google Drive ou OneDrive. Vous pouvez téléverser, télécharger, organiser et gérer vos fichiers à travers une interface simple et intuitive.

## Fonctionnalités

- 📁 **Gestion de fichiers** : Parcourez, téléversez et téléchargez des fichiers
- 📂 **Gestion de dossiers** : Créez des dossiers pour organiser vos fichiers
- 🗑️ **Suppression** : Supprimez les fichiers et dossiers dont vous n'avez plus besoin
- 🔒 **Stockage privé** : Chaque utilisateur a son propre espace de stockage privé
- 📱 **Multi-plateformes** : Accessible depuis n'importe quel appareil grâce à Telegram

## Prérequis

- Python 3.7 ou supérieur
- Un token de bot Telegram (obtenu via [@BotFather](https://t.me/BotFather))
- MongoDB (optionnel, pour une future implémentation)

## Installation

1. Clonez ce dépôt :
```bash
git clone https://github.com/votre-username/teledrive.git
cd teledrive
```

2. Installez les dépendances :
```bash
pip install -r requirements.txt
```

3. Créez un fichier `.env` à la racine du projet avec le contenu suivant :
```
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
MONGODB_URI=mongodb://localhost:27017
DATABASE_NAME=teledrivedb
STORAGE_PATH=./storage
```

4. Remplacez `your_telegram_bot_token_here` par le token que vous avez obtenu de [@BotFather](https://t.me/BotFather).

## Utilisation

1. Démarrez le bot :
```bash
python bot.py
```

2. Ouvrez Telegram et recherchez votre bot par son nom d'utilisateur.

3. Commencez la conversation en envoyant `/start`.

4. Utilisez les boutons interactifs pour naviguer et gérer vos fichiers.

## Structure du projet

```
teledrive/
├── bot.py            # Fichier principal du bot
├── requirements.txt  # Dépendances du projet
├── .env              # Variables d'environnement (à créer)
├── .gitignore        # Fichiers ignorés par Git
├── README.md         # Ce fichier
└── storage/          # Dossier de stockage des fichiers (créé automatiquement)
```

## Fonctionnalités à venir

- 🔄 Synchronisation avec Google Drive et OneDrive
- 🔍 Recherche de fichiers
- 🏷️ Organisation par tags
- 📊 Statistiques d'utilisation
- 🔐 Partage de fichiers avec d'autres utilisateurs
- 📱 Interface Web (optionnel)

## Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou à soumettre une pull request.

## Licence

Ce projet est sous licence MIT. 