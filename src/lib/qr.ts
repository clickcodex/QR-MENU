import QRCode from 'qrcode';

export async function generateQRCodeDataURL(url: string, size = 600): Promise<string> {
  return QRCode.toDataURL(url, {
    width: size,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#1C1917',
      light: '#FFFFFF',
    },
  });
}

export async function generateQRCodeSVG(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: 'svg',
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#1C1917',
      light: '#FFFFFF',
    },
  });
}

export function getPublicBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

export function buildTableMenuUrl(restaurantSlug: string, tableNumber: string, customBaseUrl?: string): string {
  const base = customBaseUrl || process.env.NEXT_PUBLIC_PROD_URL || 'https://menu.clickcodex.in';
  const cleanBase = base.replace(/\/$/, '');
  return `${cleanBase}/r/${encodeURIComponent(restaurantSlug)}/t/${encodeURIComponent(tableNumber)}`;
}

export function buildLocalTableMenuUrl(restaurantSlug: string, tableNumber: string, host = 'http://localhost:3000'): string {
  const cleanBase = host.replace(/\/$/, '');
  return `${cleanBase}/r/${encodeURIComponent(restaurantSlug)}/t/${encodeURIComponent(tableNumber)}`;
}
