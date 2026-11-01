CREATE TABLE `orgatex_consumption_lines` (
	`line_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`consumption_id` text NOT NULL,
	`component_id` text NOT NULL,
	`dyestuff_code` text NOT NULL,
	`lot_id` text NOT NULL,
	`target_mg` integer NOT NULL,
	`actual_mg` integer NOT NULL,
	`uom` text NOT NULL,
	`scale_id` text NOT NULL,
	`result` text NOT NULL,
	FOREIGN KEY (`consumption_id`) REFERENCES `orgatex_consumptions`(`consumption_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `orgatex_consumptions` (
	`consumption_id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`payload_hash` text NOT NULL,
	`station_id` text NOT NULL,
	`operator_id` text NOT NULL,
	`completed_at` text NOT NULL,
	`confirmed_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orgatex_consumptions_batch_id_unique` ON `orgatex_consumptions` (`batch_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `orgatex_consumptions_idempotency_key_unique` ON `orgatex_consumptions` (`idempotency_key`);--> statement-breakpoint
CREATE TABLE `write_backs` (
	`session_id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`status` text NOT NULL,
	`request_json` text NOT NULL,
	`consumption_id` text,
	`confirmed_at` text,
	`attempts` integer NOT NULL,
	`last_error` text,
	`updated_at` text NOT NULL
);
