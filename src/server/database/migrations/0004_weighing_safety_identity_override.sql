CREATE TABLE `audit_events` (
	`event_id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`type` text NOT NULL,
	`actor_id` text NOT NULL,
	`detail` text NOT NULL,
	`occurred_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `weighing_sessions`(`session_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `overrides` (
	`override_id` text PRIMARY KEY NOT NULL,
	`record_id` text NOT NULL,
	`supervisor_id` text NOT NULL,
	`reason` text NOT NULL,
	`authorised_at` text NOT NULL,
	FOREIGN KEY (`record_id`) REFERENCES `weighing_records`(`record_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `session_components` ADD `identity` text DEFAULT 'UNVERIFIED' NOT NULL;--> statement-breakpoint
ALTER TABLE `session_components` ADD `identity_mismatch_detail` text;