CREATE TABLE `reminders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`date` text NOT NULL,
	`time` text,
	`person_id` integer,
	`notification_id` text,
	`completed` integer DEFAULT false,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `journals` ADD `title` text;--> statement-breakpoint
ALTER TABLE `people` ADD `first_met` text;