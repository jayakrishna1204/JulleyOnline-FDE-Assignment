import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Current tenant and token storage references
let currentTenantId = null;

export const setApiTenantId = (tenantId) => {
  currentTenantId = tenantId;
};

// Request interceptor: attach token and x-tenant-id header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // If header not already set explicitly and currentTenantId exists
  if (!config.headers['x-tenant-id'] && currentTenantId) {
    config.headers['x-tenant-id'] = currentTenantId;
  }

  return config;
}, (error) => Promise.reject(error));

// Response interceptor: handle 401 unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
