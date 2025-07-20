# TeleDrive - Local Windows File Manager

A sophisticated Google Drive-like file management interface for local Windows files, built with Flask and modern web technologies.

## ✨ Features

### 🎨 **Google Drive-Inspired Design**
- Clean, modern white theme with subtle shadows and rounded corners
- Responsive design that works on desktop, tablet, and mobile
- Smooth animations and hover effects
- Grid and list view options

### 📁 **Comprehensive File Management**
- Browse Windows file system directories
- Create, rename, delete, copy, and move files and folders
- Drag and drop file operations
- Multi-file selection with Ctrl+Click
- Breadcrumb navigation for easy directory traversal

### 🔍 **Advanced Search & Filtering**
- Real-time file search by name
- Filter by file type (documents, images, videos, etc.)
- Sort by name, size, date modified, or file type
- Ascending/descending sort options

### 👁️ **File Preview System**
- Image preview with dimensions and format info
- Video and audio playback
- Text file content preview
- File properties and metadata display

### ⌨️ **Keyboard Shortcuts**
- `Ctrl+C` - Copy selected files
- `Ctrl+X` - Cut selected files  
- `Ctrl+V` - Paste files
- `Ctrl+A` - Select all files
- `Delete` - Delete selected files
- `F2` - Rename selected file
- `F5` or `Ctrl+R` - Refresh directory
- `Backspace` - Go to parent directory
- `Enter` - Open selected file/folder
- `Escape` - Clear selection

### 🖱️ **Context Menus**
- Right-click on files for quick actions
- Open, rename, copy, cut, delete operations
- File properties and details

### 🚀 **Performance Optimizations**
- Directory caching for faster navigation
- Efficient handling of large directories
- Pagination for better performance
- Lazy loading of file previews

## 🛠️ Installation

### Prerequisites
- Python 3.8 or higher
- Windows operating system
- Modern web browser

### Setup Steps

1. **Clone or download the project**
   ```bash
   git clone <repository-url>
   cd TeleDrive
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Optional: Install additional dependencies for enhanced features**
   ```bash
   # For image preview and thumbnails
   pip install Pillow>=10.0.0
   
   # For file type detection
   pip install python-magic>=0.4.27
   
   # For Windows-specific features
   pip install pywin32>=306
   ```

4. **Test the file system manager**
   ```bash
   python test_filesystem.py
   ```

5. **Start the application**
   ```bash
   python src/web/app.py
   ```

6. **Open your browser**
   Navigate to `http://localhost:5000`

## 🎯 Usage Guide

### **Getting Started**
1. **Login**: Use the authentication system to access the file manager
2. **Drive Selection**: Choose from available drives in the left sidebar
3. **Navigation**: Use breadcrumbs or double-click folders to navigate
4. **File Operations**: Right-click files for context menu or use toolbar buttons

### **File Operations**

#### **Creating Files and Folders**
- Click "New Folder" button in the toolbar
- Enter folder name in the prompt
- Files can be uploaded via drag-and-drop or "Upload" button

#### **File Management**
- **Rename**: Right-click → Rename or press F2
- **Delete**: Right-click → Delete or press Delete key
- **Copy/Move**: Use Ctrl+C/Ctrl+X and Ctrl+V or drag-and-drop

#### **File Preview**
- Click "Preview" button on any file
- Supported formats: Images, videos, audio, text files
- View file properties and metadata in the info panel

### **Search and Filtering**
- Use the search bar in the header for real-time search
- Apply filters by file type using the dropdown
- Sort files using the sort options in the toolbar

### **Keyboard Navigation**
- Use arrow keys to navigate between files
- Space bar to select/deselect files
- Enter to open files or folders
- Backspace to go up one directory level

## 🏗️ Architecture

### **Backend Components**
- **FileSystemManager** (`src/services/filesystem.py`): Core file operations
- **Flask Web App** (`src/web/app.py`): REST API endpoints
- **Authentication System**: Secure access control
- **Caching Layer**: Performance optimization

### **Frontend Components**
- **LocalFileManager** (`static/js/app.js`): Main JavaScript class
- **Google Drive Theme** (`static/css/style.css`): Modern styling
- **Responsive Design**: Mobile-friendly interface
- **Context Menus**: Right-click functionality

### **API Endpoints**
- `GET /api/drives` - List available drives
- `GET /api/browse` - Browse directory contents
- `POST /api/folder/create` - Create new folder
- `POST /api/item/rename` - Rename file/folder
- `POST /api/item/delete` - Delete file/folder
- `POST /api/item/copy` - Copy file/folder
- `POST /api/item/move` - Move file/folder
- `GET /api/search` - Search files
- `GET /api/file/preview` - Get file preview info
- `GET /api/file/serve` - Serve file content

## 🔧 Configuration

### **Environment Variables**
Create a `.env` file in the project root:
```env
FLASK_ENV=development
FLASK_DEBUG=True
SECRET_KEY=your-secret-key-here
```

### **File System Settings**
Modify `src/services/filesystem.py` to customize:
- Base path restrictions
- Cache timeout duration
- Allowed file extensions
- Maximum file sizes

## 🚨 Security Considerations

- **Path Validation**: Prevents directory traversal attacks
- **Authentication Required**: All endpoints require valid authentication
- **File Access Control**: Respects Windows file permissions
- **Input Sanitization**: All user inputs are validated and sanitized

## 🐛 Troubleshooting

### **Common Issues**

1. **"Module not found" errors**
   - Ensure all dependencies are installed: `pip install -r requirements.txt`
   - Check Python path configuration

2. **Permission denied errors**
   - Run as administrator if accessing system directories
   - Check Windows file permissions

3. **File preview not working**
   - Install optional dependencies: `pip install Pillow python-magic`
   - Check file format support

4. **Slow performance**
   - Increase cache timeout in FileSystemManager
   - Reduce per_page limit for large directories

### **Debug Mode**
Enable debug logging by setting `FLASK_DEBUG=True` in your environment.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Inspired by Google Drive's clean and intuitive interface
- Built with Flask, a lightweight Python web framework
- Uses Font Awesome for icons
- Responsive design principles from modern web standards
