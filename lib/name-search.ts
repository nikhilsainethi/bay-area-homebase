export function nameSearchQuery(input: string): string {
  const name = input.trim();
  if (name.length < 3 || name.length > 100)
    throw new Error('Enter an apartment name between 3 and 100 characters.');
  const literal = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = `["name"~${JSON.stringify(literal)},i]`;
  const bounds = '(37.15,-122.25,37.6,-121.7)';
  const housing = ['["building"~"^(apartments|residential|house|terrace)$"]', '["landuse"="residential"]', '["residential"]', '["office"~"^(property_management|estate_agent)$"]'];
  return `[out:json][timeout:20];(${housing.map((tag) => `nwr${match}${tag}${bounds};`).join('')});out center tags 60;`;
}
