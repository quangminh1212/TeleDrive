import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import FileGrid from './components/FileGrid';
import './index.css';

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <Sidebar
        currentFolder={currentFolder}
        onFolderSelect={setCurrentFolder}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gdrive-sidebar">
        {/* Header */}
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {/* File Grid */}
        <main className="flex-1 overflow-hidden bg-white m-2 rounded-2xl">
          <FileGrid
            searchQuery={searchQuery}
            currentFolder={currentFolder}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        </main>
      </div>
    </div>
  );
}

export default App;
