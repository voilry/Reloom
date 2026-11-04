ALTER TABLE `reminders` ADD `nudge_type` text DEFAULT 'on_time';--> statement-breakpoint
ALTER TABLE `reminders` ADD `custom_nudges_count` integer DEFAULT 0;