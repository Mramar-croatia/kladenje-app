// Authentication state. Two roles: 'viewer' and 'admin', gated by password.

import { VIEWER_PWD, ADMIN_PWD, AUTH_KEY, TOKEN_KEY } from './config.js';

export function getRole() {
  return sessionStorage.getItem(AUTH_KEY);
}

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function isAdmin() {
  return getRole() === 'admin';
}

// Returns the role granted by a password, or null if it doesn't match.
export function roleForPassword(pwd) {
  if (pwd === ADMIN_PWD) return 'admin';
  if (pwd === VIEWER_PWD) return 'viewer';
  return null;
}

export function login(role, token) {
  sessionStorage.setItem(AUTH_KEY, role);
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function logout() {
  sessionStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}
