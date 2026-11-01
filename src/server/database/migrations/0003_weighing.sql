CREATE TABLE `session_components` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text NOT NULL,
	`component_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`state` text NOT NULL,
	`dyestuff_code` text NOT NULL,
	`dyestuff_name` text NOT NULL,
	`dyestuff_type` text NOT NULL,
	`colour_hex` text NOT NULL,
	`barcode` text NOT NULL,
	`lot_id` text NOT NULL,
	`container_id` text NOT NULL,
	`target_mg` integer NOT NULL,
	`uom` text NOT NULL,
	`tolerance_mg` integer NOT NULL,
	`display_max_mg` integer NOT NULL,
	`scale_id` text,
	`tare_mg` integer,
	FOREIGN KEY (`session_id`) REFERENCES `weighing_sessions`(`session_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_components_session_component_idx` ON `session_components` (`session_id`,`component_id`);--> statement-breakpoint
CREATE TABLE `weighing_records` (
	`record_id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`component_id` text NOT NULL,
	`lot_id` text NOT NULL,
	`container_id` text NOT NULL,
	`tare_mg` integer NOT NULL,
	`scale_id` text NOT NULL,
	`target_mg` integer NOT NULL,
	`tolerance_min_mg` integer NOT NULL,
	`tolerance_max_mg` integer NOT NULL,
	`actual_mg` integer NOT NULL,
	`uom` text NOT NULL,
	`result` text NOT NULL,
	`operator_id` text NOT NULL,
	`confirmed_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `weighing_sessions`(`session_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `weighing_sessions` (
	`session_id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`station_id` text NOT NULL,
	`operator_id` text NOT NULL,
	`status` text NOT NULL,
	`active_component_id` text,
	`started_at` text NOT NULL,
	`completed_at` text
);
