import os from 'os';

export function getLocalNetworkIp(): string {
  try {
    const interfaces = os.networkInterfaces();
    // Prioritize Wi-Fi or Ethernet
    for (const name of Object.keys(interfaces)) {
      if (/wi-?fi|wlan|eth|ethernet/i.test(name)) {
        const ifaceList = interfaces[name] || [];
        for (const net of ifaceList) {
          if (net.family === 'IPv4' && !net.internal) {
            return net.address;
          }
        }
      }
    }

    // Fallback: search all interfaces for any non-internal IPv4
    for (const name of Object.keys(interfaces)) {
      const ifaceList = interfaces[name] || [];
      for (const net of ifaceList) {
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
  } catch (err) {
    console.error('Error discovering local network IP:', err);
  }

  return 'localhost';
}
