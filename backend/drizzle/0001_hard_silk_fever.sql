CREATE TABLE `weather_readings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`location_id` integer NOT NULL,
	`recorded_at` text NOT NULL,
	`observed_at` text,
	`temperature_c` real,
	`rainfall_mm` real,
	`humidity_percent` real,
	FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `weather_readings_location_recorded_id_index` ON `weather_readings` (`location_id`,`recorded_at`,`id`);