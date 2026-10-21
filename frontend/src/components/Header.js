import React, { useEffect, useRef } from 'react';
import './Header.css';

function Header({
  searchQuery,
  onSearchChange,
  onAddClick,
  onImportClick,
  onFixCovers,
  onInsightsClick,
  duplicateCount = 0,
  onDuplicatesClick,
  activeTab = 'cinema',
  onTabChange,
  gamesCount = 0,
  cinemaCount = 0,
}) {
  const searchInputRef = useRef(null);

  // Keyboard shortcut: ⌘K or Ctrl+K to focus search bar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="header">
      <div className="header-inner">
        {/* Brand */}
        <div className="header-brand">
          <span className="header-logo-icon">🎬</span>
          <div className="header-title-wrap">
            <h1 className="header-brand-title">MediaVault</h1>
            <span className="header-badge-version">v2.4</span>
          </div>
        </div>

        {/* Primary Vault Navigation Switcher: Cinema & TV vs Games Vault */}
        {onTabChange && (
          <div className="header-vault-tabs">
            <button
              className={`vault-tab-btn ${activeTab === 'cinema' ? 'active' : ''}`}
              onClick={() => onTabChange('cinema')}
              title="Movies & TV Series"
            >
              <span className="material-symbols-outlined tab-icon">movie</span>
              <span className="tab-label">Cinema & TV</span>
              {cinemaCount > 0 && <span className="tab-count-pill">{cinemaCount}</span>}
            </button>
            <button
              className={`vault-tab-btn ${activeTab === 'games' ? 'active' : ''}`}
              onClick={() => onTabChange('games')}
              title="Dedicated Games Vault"
            >
              <span className="material-symbols-outlined tab-icon">sports_esports</span>
              <span className="tab-label">Games Vault</span>
              {gamesCount > 0 && <span className="tab-count-pill">{gamesCount}</span>}
            </button>
          </div>
        )}

        {/* Global Search Bar with High-Contrast Obsidian Kinetic styling & ⌘K */}
        <div className="header-search-container">
          <div className="search-box">
            <span className="material-symbols-outlined search-icon">search</span>
            <input
              ref={searchInputRef}
              type="text"
              placeholder={
                activeTab === 'games'
                  ? 'Search games, platforms, notes, replays...'
                  : 'Search titles, genres, directors, notes...'
              }
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => {
                  onSearchChange('');
                  if (searchInputRef.current) searchInputRef.current.focus();
                }}
                title="Clear search"
              >
                ✕
              </button>
            )}
            <kbd className="search-kbd">⌘K</kbd>
          </div>
        </div>

        {/* Actions */}
        <div className="header-actions">
          {duplicateCount > 0 && (
            <button
              className="btn-header btn-duplicates"
              onClick={onDuplicatesClick}
              title={`${duplicateCount} duplicate entries detected`}
            >
              <span className="btn-icon">🧹</span>
              <span className="btn-label">Duplicates</span>
              <span className="dup-badge-count">{duplicateCount}</span>
            </button>
          )}

          <button
            className="btn-header btn-insights"
            onClick={onInsightsClick}
            title="Vault Analytics, Charts & Insights"
          >
            <span className="btn-icon">📊</span>
            <span className="btn-label">Insights</span>
          </button>

          <button
            className="btn-header btn-fix-covers"
            onClick={onFixCovers}
            title="Auto-find covers for items missing pictures"
          >
            <span className="btn-icon">🖼️</span>
            <span className="btn-label">Fix Covers</span>
          </button>

          <button
            className="btn-header btn-import"
            onClick={onImportClick}
            title="Import from copied mobile notes"
          >
            <span className="btn-icon">📋</span>
            <span className="btn-label">Import</span>
          </button>

          <button className="btn-header btn-add" onClick={onAddClick}>
            <span className="btn-icon add-plus">+</span>
            <span>{activeTab === 'games' ? 'Add Game' : 'Add Media'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
