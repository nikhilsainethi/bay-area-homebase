import { requireSupabase } from "./supabase";
import { validateProperty, type Property } from "./domain";
import { planImport } from "./cloud-records";
async function identity() {
  const client = requireSupabase();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user)
    throw new Error("Your session expired. Please sign in again.");
  return { client, userId: data.user.id };
}
function failure(code: string, message: string): Error {
  if (code === "23505")
    return new Error(
      "This property is already saved. Refresh your shortlist and edit its existing record.",
    );
  if (code === "PGRST205" || code === "42P01")
    return new Error(
      "The cloud database is not set up yet. Please contact the app owner.",
    );
  return new Error(
    message || "Cloud storage is unavailable. Please try again.",
  );
}
export async function listCloud(): Promise<Property[]> {
  const { client, userId } = await identity();
  const all: Property[] = [];
  for (let start = 0; ; start += 500) {
    const { data, error } = await client
      .from("homebase_properties")
      .select("data,updated_at")
      .eq("user_id", userId)
      .order("id")
      .range(start, start + 499);
    if (error) throw failure(error.code, error.message);
    for (const row of data)
      all.push({ ...validateProperty(row.data), updatedAt: row.updated_at });
    if (data.length < 500) break;
  }
  return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export async function saveCloud(input: unknown): Promise<Property> {
  const p = validateProperty(input);
  const { client, userId } = await identity();
  const { data, error } = await client
    .from("homebase_properties")
    .upsert(
      { user_id: userId, id: p.id, osm_id: p.osmId || null, data: p },
      { onConflict: "user_id,id" },
    )
    .select("data,updated_at")
    .single();
  if (error) throw failure(error.code, error.message);
  return { ...validateProperty(data.data), updatedAt: data.updated_at };
}
export async function removeCloud(id: string) {
  const { client, userId } = await identity();
  const { error } = await client
    .from("homebase_properties")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw failure(error.code, error.message);
}
export async function importCloud(incoming: Property[]) {
  const validated = incoming.map((p) => validateProperty(p));
  const { client, userId } = await identity();
  const plan = planImport(validated, await listCloud());
  if (plan.records.length) {
    const { error } = await client.from("homebase_properties").insert(
      plan.records.map((p) => ({
        user_id: userId,
        id: p.id,
        osm_id: p.osmId || null,
        data: p,
      })),
    );
    if (error) throw failure(error.code, error.message);
  }
  return { added: plan.records.length, skipped: plan.skipped };
}
