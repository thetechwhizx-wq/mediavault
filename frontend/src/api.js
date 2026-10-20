// Dynamic backend host so accessing from mobile phone (e.g. http://10.39.173.202:3000) works seamlessly!
const BACKEND_HOST = window.location.hostname || 'localhost';
const API_URL = `http://${BACKEND_HOST}:5000/api/media`;

export async function fetchMedia() {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error('Failed to fetch media');
  return res.json();
}

export async function addMedia(item) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  if (!res.ok) throw new Error('Failed to add media');
  return res.json();
}

export async function bulkAddMedia(items) {
  const res = await fetch(`${API_URL}/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error('Failed to bulk import media');
  return res.json();
}

export async function updateMedia(id, updates) {
  const res = await fetch(`${API_URL}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update media');
  return res.json();
}

export async function deleteMedia(id) {
  const res = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete media');
  return res.json();
}

export async function searchMetadata(title, type, year = '', hint = '') {
  let url = `${API_URL}/metadata?title=${encodeURIComponent(title)}&type=${encodeURIComponent(type)}`;
  if (year) url += `&year=${encodeURIComponent(year)}`;
  if (hint) url += `&hint=${encodeURIComponent(hint)}&cast=${encodeURIComponent(hint)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchCoverCandidates(title, type, year = '', hint = '') {
  let url = `${API_URL}/candidates?title=${encodeURIComponent(title)}&type=${encodeURIComponent(type)}`;
  if (year) url += `&year=${encodeURIComponent(year)}`;
  if (hint) url += `&hint=${encodeURIComponent(hint)}&cast=${encodeURIComponent(hint)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  return res.json();
}

export async function refreshMissingCovers() {
  const res = await fetch(`${API_URL}/refresh-missing`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to refresh covers');
  return res.json();
}

export async function fetchStats(year = 'all') {
  const res = await fetch(`${API_URL}/stats?year=${encodeURIComponent(year)}`);
  if (!res.ok) throw new Error('Failed to fetch statistics');
  return res.json();
}
