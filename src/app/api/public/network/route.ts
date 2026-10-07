import { NextResponse } from 'next/server';
import { getLocalNetworkIp } from '@/lib/network';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const hostHeader = req.headers.get('host') || 'localhost:3000';
  const portMatch = hostHeader.match(/:(\d+)$/);
  const port = portMatch ? portMatch[1] : '3000';
  const lanIp = getLocalNetworkIp();

  return NextResponse.json({
    lanIp,
    port,
    lanBaseUrl: `http://${lanIp}:${port}`,
    localBaseUrl: `http://localhost:${port}`,
  });
}
