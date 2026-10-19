import React from 'react';
import './Header.css';

function Header({ searchQuery, onSearchChange, onAddClick, onImportClick, onFixCovers }) {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-brand">
          <span className="header-logo">🎬</span>
          <h1>MediaVault</h1>
        </div>
        <div className="header-actions">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search media..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          <button className="btn-fix-covers" onClick={onFixCovers} title="Auto-find covers for items missing pictures">
            <span>🖼️</span> Fix Covers
          </button>
          <button className="btn-import" onClick={onImportClick} title="Import from copied notes">
            <span>📋</span> Import Notes
          </button>
          <button className="btn-add" onClick={onAddClick}>
            <span>+</span> Add Media
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
