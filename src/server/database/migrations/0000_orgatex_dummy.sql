CREATE TABLE `orgatex_batches` (
	`batch_id` text PRIMARY KEY NOT NULL,
	`order_ref` text NOT NULL,
	`machine_ref` text NOT NULL,
	`fabric_desc` text NOT NULL,
	`fabric_weight_kg` integer NOT NULL,
	`shade_code` text NOT NULL,
	`component_count` integer NOT NULL,
	`status` text NOT NULL,
	`recipe_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `orgatex_dyestuffs` (
	`code` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`colour_hex` text NOT NULL,
	`barcode` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `orgatex_recipe_components` (
	`component_id` text PRIMARY KEY NOT NULL,
	`recipe_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`dyestuff_code` text NOT NULL,
	`uom` text NOT NULL,
	`target_mg` integer NOT NULL,
	`tolerance_mg` integer NOT NULL,
	`display_max_mg` integer NOT NULL,
	`lot_id` text NOT NULL,
	`container_id` text NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `orgatex_recipes`(`recipe_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`dyestuff_code`) REFERENCES `orgatex_dyestuffs`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `orgatex_recipes` (
	`recipe_id` text PRIMARY KEY NOT NULL,
	`shade_code` text NOT NULL
);
