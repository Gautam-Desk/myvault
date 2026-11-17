import React, { useEffect, useRef } from 'react';
import {
  PanelLeft,
  Search,
  X,
  LayoutGrid,
  BookOpen,
  Sun,
  Moon,
} from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';
import { SortOrder } from '../types';

export const TopBar: React.FC = () => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const {
    activeView,
    libraryScope,
    selectedCategory,
    activeBook,
    sortOrder,
    searchQuery,
    searchResults,
    isSearching,
    appTheme,
    toggleAppTheme,
    toggleMainSidebar,
    setSortOrder,
    setSearchQuery,
    switchView,
    setActiveDoc,
    goToPage,
  } = useLibraryStore();

  // Keyboard shortcut Ctrl+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getBreadcrumb = () => {
    if (activeView === 'reader') {
      return (
        <div className="flex items-center gap-1.5 text-xs truncate">
          <span className="font-semibold text-[#8A6F5C] dark:text-[#A88E79]">My Vault Studio</span>
          <span className="text-[#C8B5A2] dark:text-[#5E4637]">/</span>
          <span className="font-bold text-[#26170F] dark:text-[#F7EFE6] truncate">
            {activeBook ? activeBook.title : 'Active Volume'}
          </span>
        </div>
      );
    }
    const sub =
      libraryScope === 'continue'
        ? 'Continue Reading'
        : libraryScope === 'starred'
        ? 'Starred Books'
        : selectedCategory === 'All Categories'
        ? 'All Volumes'
        : selectedCategory;
    return (
      <div className="flex items-center gap-1.5 text-xs truncate">
        <span className="font-semibold text-[#8A6F5C] dark:text-[#A88E79]">My Vault</span>
        <span className="text-[#C8B5A2] dark:text-[#5E4637]">/</span>
        <span className="font-bold text-[#26170F] dark:text-[#F7EFE6] truncate">{sub}</span>
      </div>
    );
  };

  const handleSelectSearchResult = (docId: string, pageNum: number) => {
    setActiveDoc(docId);
    goToPage(pageNum);
    setSearchQuery('');
  };

  return (
    <header className="h-[48px] bg-[#FCF8F2] dark:bg-[#160E09] border-b border-[#DFD0BE] dark:border-[#382417] px-3 sm:px-4 flex items-center justify-between gap-2.5 shrink-0 z-30 relative transition-colors duration-200">
      {/* Left: Sidebar Toggle + Breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={() => toggleMainSidebar()}
          title="Toggle Navigation Sidebar"
          className="p-1.5 rounded-lg text-[#5E4637] dark:text-[#D8C7B8] hover:text-[#26170F] dark:hover:text-[#F7EFE6] hover:bg-[#EDE1D2] dark:hover:bg-[#26170F] border border-[#DFD0BE] dark:border-[#382417] transition-colors shrink-0"
        >
          <PanelLeft className="w-3.5 h-3.5" />
        </button>
        {getBreadcrumb()}
      </div>

      {/* Center: Search Input with Sub-15ms FTS5 Dropdown */}
      <div className="flex-1 max-w-xs sm:max-w-md mx-1 relative">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#8A6F5C] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search books, theorems, notes... (Ctrl+K)"
            className="w-full h-[30px] bg-[#F5EDE3] dark:bg-[#20140D] focus:bg-[#FCF8F2] dark:focus:bg-[#281A12] text-xs text-[#26170F] dark:text-[#F7EFE6] placeholder-[#8A6F5C] pl-8 pr-7 rounded-lg border border-[#DFD0BE] dark:border-[#382417] focus:border-[#C87A3B] dark:focus:border-[#E09453] focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8A6F5C] hover:text-[#26170F] dark:hover:text-[#F7EFE6]"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Global Search Results Dropdown Overlay */}
        {searchQuery.trim().length >= 2 && (
          <div className="absolute top-[36px] left-0 right-0 bg-[#FCF8F2] dark:bg-[#1C120B] border border-[#DFD0BE] dark:border-[#382417] rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto p-2 space-y-1 text-xs">
            <div className="flex items-center justify-between px-2 py-1 border-b border-[#EDE1D2] dark:border-[#2D1A10] text-[10px] font-mono text-[#8A6F5C] dark:text-[#A88E79]">
              <span>GLOBAL SEARCH (FTS5)</span>
              <span>{isSearching ? 'Searching...' : `${searchResults.length} matches`}</span>
            </div>
            {searchResults.length === 0 && !isSearching ? (
              <div className="py-4 text-center text-xs text-[#8A6F5C] dark:text-[#A88E79]">
                No matching excerpts or theorems found.
              </div>
            ) : (
              searchResults.map((res, i) => (
                <button
                  key={`${res.doc_id}_${res.page_num}_${i}`}
                  onClick={() => handleSelectSearchResult(res.doc_id, res.page_num)}
                  className="w-full text-left p-2 rounded-lg hover:bg-[#F5EDE3] dark:hover:bg-[#26170F] transition-colors flex flex-col gap-0.5"
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-semibold text-[#7C3222] dark:text-[#E09453] truncate max-w-[200px]">
                      {res.doc_title}
                    </span>
                    <span className="font-mono text-[#A85D2A] dark:text-[#F2AF72] font-bold">Page {res.page_num}</span>
                  </div>
                  <p
                    className="text-[11px] text-[#26170F] dark:text-[#D8C7B8] line-clamp-2 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: res.snippet }}
                  />
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Right: Theme Toggle + Sort Dropdown + Quick View Switcher */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Dark / Light Mode Toggle */}
        <button
          onClick={toggleAppTheme}
          title={appTheme === 'dark' ? 'Switch to Warm Parchment Mode' : 'Switch to Dark Obsidian Mode'}
          className="p-1.5 rounded-lg bg-[#EDE1D2] dark:bg-[#20140D] text-[#5E4637] dark:text-[#E09453] hover:text-[#26170F] dark:hover:text-[#F7EFE6] border border-[#DFD0BE] dark:border-[#382417] transition-all flex items-center justify-center cursor-pointer shadow-2xs"
        >
          {appTheme === 'dark' ? (
            <Sun className="w-3.5 h-3.5 text-[#E09453]" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-[#5E4637]" />
          )}
        </button>

        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as SortOrder)}
          aria-label="Sort Volumes"
          className="hidden sm:block h-[30px] bg-[#F5EDE3] dark:bg-[#20140D] text-[11px] font-semibold text-[#5E4637] dark:text-[#D8C7B8] border border-[#DFD0BE] dark:border-[#382417] rounded-lg px-2 focus:outline-none focus:border-[#C87A3B] dark:focus:border-[#E09453] cursor-pointer"
        >
          <option value="recent">Sort: Recent</option>
          <option value="title">Sort: Title</option>
          <option value="progress">Sort: Progress</option>
        </select>

        {/* Quick View Switcher Pill */}
        <div className="flex items-center bg-[#EDE1D2] dark:bg-[#20140D] p-0.5 rounded-lg border border-[#DFD0BE] dark:border-[#382417]">
          <button
            onClick={() => switchView('library')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition-all ${
              activeView === 'library'
                ? 'font-bold bg-[#26170F] dark:bg-[#A85D2A] text-[#FCF8F2] shadow-xs'
                : 'font-semibold text-[#5E4637] dark:text-[#A88E79] hover:text-[#26170F] dark:hover:text-[#F7EFE6]'
            }`}
          >
            <LayoutGrid className="w-3 h-3" />
            <span className="hidden md:inline">Shelf Grid</span>
          </button>
          <button
            onClick={() => switchView('reader')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition-all ${
              activeView === 'reader'
                ? 'font-bold bg-[#26170F] dark:bg-[#A85D2A] text-[#FCF8F2] shadow-xs'
                : 'font-semibold text-[#5E4637] dark:text-[#A88E79] hover:text-[#26170F] dark:hover:text-[#F7EFE6]'
            }`}
          >
            <BookOpen className="w-3 h-3" />
            <span className="hidden md:inline">Active Reader</span>
          </button>
        </div>
      </div>
    </header>
  );
};
