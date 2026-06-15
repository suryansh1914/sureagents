import { useEffect } from 'react';

/**
 * Manages print mode by toggling 'sureagents-print' class on <html>.
 * Includes visibilitychange fallback for Firefox, which may not fire
 * afterprint when print preview is closed without printing.
 */
export function usePrintMode() {
  useEffect(() => {
    const onBeforePrint = () => document.documentElement.classList.add('sureagents-print');
    const onAfterPrint = () => document.documentElement.classList.remove('sureagents-print');
    const onVisibilityChange = () => {
      if (!document.hidden && document.documentElement.classList.contains('sureagents-print')) {
        document.documentElement.classList.remove('sureagents-print');
      }
    };
    window.addEventListener('beforeprint', onBeforePrint);
    window.addEventListener('afterprint', onAfterPrint);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('beforeprint', onBeforePrint);
      window.removeEventListener('afterprint', onAfterPrint);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.documentElement.classList.remove('sureagents-print');
    };
  }, []);
}
