import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
export const dynamic = 'force-dynamic';
export async function GET() {
  if (!(await getChatGPTUser()))
    return Response.json(
      { googleMapsApiKey: '', googleMapsMapId: '' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  return Response.json(
    {
      googleMapsApiKey: env.GOOGLE_MAPS_API_KEY ?? '',
      googleMapsMapId: env.GOOGLE_MAPS_MAP_ID ?? '',
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
