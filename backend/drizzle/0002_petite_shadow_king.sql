ALTER TABLE `locations` ADD `sort_order` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `locations` ADD `is_primary` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `locations` SET `sort_order` = `id`;--> statement-breakpoint
UPDATE `locations` SET `is_primary` = 1 WHERE `id` = (SELECT MIN(`id`) FROM `locations`);