import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import FileGrid from './components/FileGrid';
import TelegramLogin from './components/TelegramLogin';
import UploadProgress from './components/UploadProgress';
import TitleBar from './components/TitleBar';
import { ToastProvider } from './components/Toast';
import { UploadProvider, useUpload } from './contexts/UploadContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { I18nProvider } from './i18n';
import { logger } from './utils/logger';
import './index.css';

interface UserInfo {
  name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  telegram_id?: string;
  avatar?: string;
}

// Inner component that uses upload context (must be inside UploadProvider)
interface MainAppUIProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  currentFolder: string | null;
  setCurrentFolder: (folder: string | null) => void;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  refreshKey: number;
  showUploadProgress: boolean;
  setShowUploadProgress: (show: boolean) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  userInfo?: UserInfo;
  handleFilesUploaded: () => void;
}

function MainAppUI({
  searchQuery,
  setSearchQuery,
  currentFolder,
  setCurrentFolder,
  viewMode,
  setViewMode,
  refreshKey,
  showUploadProgress,
  setShowUploadProgress,
  isSidebarOpen,
  setIsSidebarOpen,
  userInfo,
  handleFilesUploaded,
}: MainAppUIProps) {
  const { uploadItems, clearAll } = useUpload();

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-dark-bg">
      {/* Custom Title Bar */}
      <TitleBar />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <Sidebar
          currentFolder={currentFolder}
          onFolderSelect={(folder) => {
            setCurrentFolder(folder);
            setIsSidebarOpen(false);
          }}
          onFilesUploaded={handleFilesUploaded}
          isMobileOpen={isSidebarOpen}
          onMobileClose={() => setIsSidebarOpen(false)}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-dark-bg">
          {/* Header */}
          <Header
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            userInfo={userInfo}
            onMenuClick={() => setIsSidebarOpen(true)}
          />

          {/* File Grid */}
          <main className="flex-1 overflow-hidden bg-white dark:bg-dark-surface m-2 rounded-2xl">
            <FileGrid
              key={refreshKey}
              searchQuery={searchQuery}
              currentFolder={currentFolder}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onFolderSelect={(folderId) => setCurrentFolder(folderId ? String(folderId) : null)}
            />
          </main>
        </div>
      </div>

      {/* Upload Progress Panel - Google Drive style */}
      {showUploadProgress && uploadItems.length > 0 && (
        <UploadProgress
          items={uploadItems}
          onClose={() => setShowUploadProgress(false)}
          onClear={clearAll}
        />
      )}
    </div>
  );
}

// Component that handles auth check
function AppContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [refreshKey, setRefreshKey] = useState(0);
  const [showUploadProgress, setShowUploadProgress] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
      logger.error('App', 'Auth check failed', { error });
      // If server is not available, assume not authenticated
      setIsAuthenticated(false);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  // Callback khi upload file xong - trigger refresh FileGrid
  const handleFilesUploaded = useCallback(() => {
    logger.info('App', 'handleFilesUploaded called, incrementing refreshKey');
    setRefreshKey(prev => {
      logger.info('App', 'refreshKey changing', { from: prev, to: prev + 1 });
      return prev + 1;
    });
  }, []);

  // Handle login success
  const handleLoginSuccess = () => {
    // Re-check auth status to get user info
    checkAuthStatus();
  };

  // Loading state while checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-white dark:bg-dark-bg flex flex-col">
        <TitleBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 dark:border-dark-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-dark-text-secondary">Đang kiểm tra đăng nhập...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white dark:bg-dark-bg flex flex-col">
        <TitleBar />
        <div className="flex-1">
          <TelegramLogin onLoginSuccess={handleLoginSuccess} />
        </div>
      </div>
    );
  }

  // Main app - wrap with UploadProvider here so handleFilesUploaded only remounts FileGrid
  return (
    <UploadProvider onUploadComplete={handleFilesUploaded}>
      <MainAppUI
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        currentFolder={currentFolder}
        setCurrentFolder={setCurrentFolder}
        viewMode={viewMode}
        setViewMode={setViewMode}
        refreshKey={refreshKey}
        showUploadProgress={showUploadProgress}
        setShowUploadProgress={setShowUploadProgress}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        userInfo={userInfo}
        handleFilesUploaded={handleFilesUploaded}
      />
    </UploadProvider>
  );
}

// Main App component with providers
function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <NotificationProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </NotificationProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

export default App;
