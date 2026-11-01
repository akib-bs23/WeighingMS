CREATE TABLE `scales` (
	`scale_id` text PRIMARY KEY NOT NULL,
	`class` text NOT NULL,
	`name` text NOT NULL,
	`uom` text NOT NULL,
	`capacity_mg` integer NOT NULL,
	`resolution_mg` integer NOT NULL
);
