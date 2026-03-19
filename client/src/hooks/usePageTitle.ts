import { useEffect, useRef } from 'react';

export function usePageTitle(unreadCount: number, baseTitle = 'V Label') {
  const originalFaviconHref = useRef<string>('');
  const intervalRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const setFavicon = (href: string, type = 'image/png') => {
    document.querySelectorAll("link[rel~='icon']").forEach(el => el.remove());
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = type;
    link.href = href;
    document.head.appendChild(link);
  };

  const drawBadge = (count: number): string => {
    if (!canvasRef.current) canvasRef.current = document.createElement('canvas');
    const canvas = canvasRef.current;
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 32, 32);

    ctx.beginPath();
    ctx.arc(16, 16, 16, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();

    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(count > 9 ? '9+' : String(count), 16, 17);

    return canvas.toDataURL('image/png');
  };

  useEffect(() => {
    const el = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    originalFaviconHref.current = el?.href ?? '/favicon.ico';
  }, []);

  useEffect(() => {
    const clear = () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const restore = () => {
      clear();
      document.title = baseTitle;
      setFavicon(originalFaviconHref.current + '?t=' + Date.now(), 'image/x-icon');
    };

    if (unreadCount <= 0) {
      restore();
      return restore;
    }

    let showBadge = true;

    const tick = () => {
      // Đọc trực tiếp từ localStorage để đồng bộ khi một component khác markAsRead
      const currentUnread = parseInt(localStorage.getItem('vlabel_unreadCount') || unreadCount.toString(), 10);

      if (currentUnread <= 0) {
        restore();
        return;
      }

      const badgeUrl = drawBadge(currentUnread);

      if (showBadge) {
        setFavicon(badgeUrl);
        document.title = `Thông báo mới`;
      } else {
        setFavicon(originalFaviconHref.current + '?t=' + Date.now(), 'image/x-icon');
        document.title = `${baseTitle}`;
      }
      showBadge = !showBadge;
    };

    tick();
    intervalRef.current = window.setInterval(tick, 800);

    return restore;
  }, [unreadCount, baseTitle]);
}