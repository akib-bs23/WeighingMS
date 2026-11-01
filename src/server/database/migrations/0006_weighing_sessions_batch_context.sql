ALTER TABLE `weighing_sessions` ADD `order_ref` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `weighing_sessions` ADD `machine_ref` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `weighing_sessions` ADD `shade_code` text DEFAULT '' NOT NULL;