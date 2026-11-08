import { writable } from 'svelte/store';
import { checkAdminSession, adminLogout as apiAdminLogout } from '../api.js';

export const adminUser = writable(null); // null if logged out, or { username }
export const isAdminLoggedIn = writable(false);

export async function initAuth() {
  const admin = await checkAdminSession();
  if (admin) {
    adminUser.set(admin);
    isAdminLoggedIn.set(true);
  } else {
    adminUser.set(null);
    isAdminLoggedIn.set(false);
  }
}

export function setLoggedIn(username) {
  adminUser.set({ username });
  isAdminLoggedIn.set(true);
}

export async function logout() {
  await apiAdminLogout();
  adminUser.set(null);
  isAdminLoggedIn.set(false);
}
