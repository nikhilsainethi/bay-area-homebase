import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
export const properties = sqliteTable(
  'properties',
  {
    id: text('id').notNull(),
    userId: text('user_id').notNull(),
    osmId: text('osm_id'),
    data: text('data').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [
    uniqueIndex('idx_properties_user_id').on(t.userId, t.id),
    uniqueIndex('idx_properties_user_osm').on(t.userId, t.osmId),
  ],
);
export const searchCache = sqliteTable('search_cache', {
  key: text('key').primaryKey(),
  data: text('data').notNull(),
  expiresAt: integer('expires_at').notNull(),
});
export const rateLimits = sqliteTable('rate_limits', {
  key: text('key').primaryKey(),
  expiresAt: integer('expires_at').notNull(),
});
