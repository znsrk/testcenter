export const ADMIN_FLAG_KEY = 'tc_admin';
export const ADMIN_ACCESS_CODE = import.meta.env.VITE_ADMIN_ACCESS_CODE;

export function isAdmin(): boolean {
  try {
    return localStorage.getItem(ADMIN_FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

export function setAdmin(enabled: boolean) {
  try {
    if (enabled) localStorage.setItem(ADMIN_FLAG_KEY, '1');
    else localStorage.removeItem(ADMIN_FLAG_KEY);
  } catch {
    // ignore
  }
}