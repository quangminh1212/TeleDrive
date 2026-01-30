import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import FileGrid from './components/FileGrid';
import './index.css';

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <Sidebar
        currentFolder={currentFolder}
        onFolderSelect={setCurrentFolder}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {/* File Grid */}
        <main className="flex-1 overflow-auto p-4">
          <FileGrid
            searchQuery={searchQuery}
            currentFolder={currentFolder}
            viewMode={viewMode}
          />
        </main>
      </div>
    </div>
  );
}

export default App;
