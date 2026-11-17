import React, { useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { LibraryGrid } from './components/LibraryGrid';
import { PdfStudio } from './components/PdfStudio';
import { UnifiedModal } from './components/UnifiedModal';
import { useLibraryStore } from './store/useLibraryStore';

export const App: React.FC = () => {
  const { activeView, loadBooks, loadStats, appTheme } = useLibraryStore();

  useEffect(() => {
    loadBooks();
    loadStats();
  }, [loadBooks, loadStats]);

  return (
    <div
      className={`h-screen w-screen flex overflow-hidden antialiased transition-colors duration-200 ${
        appTheme === 'dark' ? 'dark bg-[#120B07] text-[#F7EFE6]' : 'bg-[#F5EDE3] text-[#26170F]'
      }`}
    >
      {/* 236px Left Espresso Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* 48px Top Utility Bar */}
        <TopBar />

        {/* Dynamic Views: Library Shelves Grid vs 3-Pane Active Reader */}
        {activeView === 'library' ? <LibraryGrid /> : <PdfStudio />}
      </div>

      {/* Unified Library Modal */}
      <UnifiedModal />
    </div>
  );
};

export default App;
