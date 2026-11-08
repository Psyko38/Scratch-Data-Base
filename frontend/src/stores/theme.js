import { writable } from 'svelte/store';

export const currentTheme = writable('light');

export function initTheme() {
  if (typeof window === 'undefined') return;
  const saved = localStorage.getItem('cao_web_theme');
  let theme = 'light';
  if (saved === 'dark' || saved === 'light') {
    theme = saved;
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    theme = 'dark';
  }
  applyTheme(theme);
}

export function toggleTheme() {
  currentTheme.update(t => {
    const next = t === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    return next;
  });
}

function applyTheme(theme) {
  currentTheme.set(theme);
  if (typeof document !== 'undefined') {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('cao_web_theme', theme);
  }
}
