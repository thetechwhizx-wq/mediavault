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

        {/* Global Search Bar with ⌘K */}
        <div className="header-search-container">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search titles, directors, venues, notes..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
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
            <span>Add Media</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
