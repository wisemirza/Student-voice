(function () {
  const darkQuery =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null;

  function resolveSystemTheme() {
    return darkQuery && darkQuery.matches ? 'dark' : 'light';
  }

  function applySystemTheme() {
    const resolved = resolveSystemTheme();
    const root = document.documentElement;
    root.setAttribute('data-theme', resolved);
    root.style.colorScheme = resolved;

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', resolved === 'dark' ? '#111111' : '#F7F7F7');
    }

    return resolved;
  }

  // Clear any legacy manual theme overrides so user's system preference always governs
  try {
    localStorage.removeItem('sv_theme');
  } catch {
    // ignore
  }

  // Apply immediately in <head> before first paint to prevent theme flash
  applySystemTheme();

  // Dynamically respond to operating-system theme changes
  if (darkQuery && typeof darkQuery.addEventListener === 'function') {
    darkQuery.addEventListener('change', () => {
      applySystemTheme();
    });
  }

  window.SV_THEME = {
    resolveSystemTheme,
    applySystemTheme
  };
})();
