import React from 'react';
import './Header.css';

function Header({ searchQuery, onSearchChange, onAddClick }) {
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
          <button className="btn-add" onClick={onAddClick}>
            <span>+</span> Add Media
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
