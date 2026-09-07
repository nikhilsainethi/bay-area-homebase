CREATE TABLE `properties` (
	`id` text NOT NULL,
	`user_id` text NOT NULL,
	`osm_id` text,
	`data` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_properties_user_id` ON `properties` (`user_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_properties_user_osm` ON `properties` (`user_id`,`osm_id`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `search_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`expires_at` integer NOT NULL
);
