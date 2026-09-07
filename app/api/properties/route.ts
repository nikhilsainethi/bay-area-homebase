import { getChatGPTUser } from '@/app/chatgpt-auth';
import { listProperties, saveProperty, deleteProperty } from '@/db/store';
import { validateProperty } from '@/lib/domain';
export const dynamic = 'force-dynamic';
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return json({ error: 'Sign in to access your shortlist.' }, 401);
  try {
    return json({ properties: await listProperties(user.userId) });
  } catch {
    return json(
      { error: 'Your shortlist could not be loaded. Please try again.' },
      503,
    );
  }
}
export async function POST(req: Request) {
  const user = await getChatGPTUser();
  if (!user) return json({ error: 'Sign in to save properties.' }, 401);
  if (
    req.headers.get('origin') &&
    req.headers.get('origin') !== new URL(req.url).origin
  )
    return json({ error: 'Invalid request origin.' }, 403);
  let p;
  try {
    const body = await req.text();
    if (body.length > 100000)
      return json({ error: 'Property is too large.' }, 413);
    p = validateProperty(JSON.parse(body));
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : 'Invalid property.' },
      400,
    );
  }
  try {
    return json({ property: await saveProperty(user.userId, p) });
  } catch (e) {
    if (String(e).includes('UNIQUE'))
      return json(
        {
          error:
            'This mapped property is already saved. Edit it from your shortlist.',
        },
        409,
      );
    return json(
      { error: 'Could not save. Your changes are still in the editor.' },
      503,
    );
  }
}
export async function DELETE(req: Request) {
  const user = await getChatGPTUser();
  if (!user) return json({ error: 'Sign in to remove properties.' }, 401);
  if (
    req.headers.get('origin') &&
    req.headers.get('origin') !== new URL(req.url).origin
  )
    return json({ error: 'Invalid request origin.' }, 403);
  const id = new URL(req.url).searchParams.get('id');
  if (!id || id.length > 100) return json({ error: 'Invalid property.' }, 400);
  try {
    const deleted = await deleteProperty(user.userId, id);
    return deleted
      ? json({ deleted: true })
      : json({ error: 'Property not found.' }, 404);
  } catch {
    return json(
      { error: 'Could not remove this property. Please try again.' },
      503,
    );
  }
}
