import { getStoredToken } from '../utils/auth';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

function buildHeaders(extra = {}) {
  const token = getStoredToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function parseError(response) {
  try {
    const data = await response.json();
    return data.message || data.error || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: buildHeaders(options.headers),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  if (response.status === 204) return null;
  return response.json();
}

export const foodApi = {
  getAll() {
    return request('/api/food-items', { method: 'GET' });
  },

  create(item) {
    return request('/api/food-items', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  },

  update(id, item) {
    return request(`/api/food-items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(item),
    });
  },

  browse() {
    return request('/api/food-items/browse', { method: 'GET' });
  },

  donate(id, details) {
    return request(`/api/food-items/${id}/donate`, {
      method: 'POST',
      body: details ? JSON.stringify(details) : undefined,
    });
  },

  claim(id) {
    return request(`/api/food-items/${id}/claim`, { method: 'POST' });
  },

  delete(id) {
    return request(`/api/food-items/${id}`, { method: 'DELETE' });
  },
};