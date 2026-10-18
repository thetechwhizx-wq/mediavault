# MediaVault 🎬📺🎮

A modern, responsive personal media tracking application to keep track of your movies, TV shows, and games.

---

## Architecture Overview

- **Backend**: Express.js REST API with file-based persistence (`data.json`).
  - `GET /api/media` - Get all media items
  - `POST /api/media` - Create a media item (`title`, `type`, `status`, `progress`)
  - `PATCH /api/media/:id` - Update status, progress, star rating, or reviews
  - `DELETE /api/media/:id` - Remove an item
- **Frontend**: React application featuring a dark-themed UI.
  - Header with title and live title search
  - Filter bar for media types (All, Movies, Shows, Games) with counts + status selector
  - Responsive card grid displaying type accents, status tags, progress, star ratings, and review snippets
  - Modals for adding items and editing items (including rating input and delete confirmation)
  - Full keyboard accessibility (e.g., ESC to dismiss modals) and responsive layout

---

## Getting Started

### 1. Start the Backend API

```bash
cd backend
npm install
npm run dev
```

The API will start at [http://localhost:5000](http://localhost:5000).

### 2. Start the Frontend App

```bash
cd frontend
npm install
npm start
```

The frontend will run at [http://localhost:3000](http://localhost:3000).
"# Mediavault" 
