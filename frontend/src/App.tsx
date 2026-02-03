import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import FileGrid from './components/FileGrid';
import TelegramLogin from './components/TelegramLogin';
import { ToastProvider } from './components/Toast';
import './index.css';

interface UserInfo {
  name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  telegram_id?: string;
  avatar?: string;
}

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [refreshKey, setRefreshKey] = useState(0);

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [userInfo, setUserInfo] = useState<UserInfo | undefined>(undefined);

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    setIsCheckingAuth(true);
    try {
      const response = await fetch('http://127.0.0.1:5000/api/v2/auth/status');
      const result = await response.json();
      setIsAuthenticated(result.authenticated === true);

      // Save user info if available
      if (result.authenticated && result.user) {
        const user = result.user;
        setUserInfo({
          name: user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : undefined,
          first_name: user.first_name,
          last_name: user.last_name,
          phone: user.phone,
          telegram_id: user.telegram_id,
          avatar: user.avatar
        });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // If server is not available, assume not authenticated
      setIsAuthenticated(false);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  // Callback khi upload file xong - trigger refresh FileGrid
  const handleFilesUploaded = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Handle login success
  const handleLoginSuccess = () => {
    // Re-check auth status to get user info
    checkAuthStatus();
  };

  // Loading state while checking auth
  if (isCheckingAuth) {
    return (
      <ToastProvider>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Đang kiểm tra đăng nhập...</p>
          </div>
        </div>
      </ToastProvider>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return (
      <ToastProvider>
        <TelegramLogin onLoginSuccess={handleLoginSuccess} />
      </ToastProvider>
    );
  }

  // Main app
  return (
    <ToastProvider>
      <div className="flex h-screen bg-white">
        {/* Sidebar */}
        <Sidebar
          currentFolder={currentFolder}
          onFolderSelect={setCurrentFolder}
          onFilesUploaded={handleFilesUploaded}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gdrive-sidebar">
          {/* Header */}
          <Header
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            userInfo={userInfo}
          />

          {/* File Grid */}
          <main className="flex-1 overflow-hidden bg-white m-2 rounded-2xl">
            <FileGrid
              key={refreshKey}
              searchQuery={searchQuery}
              currentFolder={currentFolder}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}

export default App;

