CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chunks` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`section_id` text,
	`order` integer NOT NULL,
	`content` text NOT NULL,
	`token_estimate` integer NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `chunks_document_order_idx` ON `chunks` (`document_id`,`order`);--> statement-breakpoint
CREATE TABLE `concepts` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`section_id` text NOT NULL,
	`name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`definition` text NOT NULL,
	`kind` text NOT NULL,
	`confidence` integer NOT NULL,
	`generation_version` integer NOT NULL,
	`is_current` integer DEFAULT true NOT NULL,
	`model` text NOT NULL,
	`prompt_version` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `concept_document_section_name_version_idx` ON `concepts` (`document_id`,`section_id`,`normalized_name`,`generation_version`);--> statement-breakpoint
CREATE INDEX `concepts_current_idx` ON `concepts` (`document_id`,`is_current`);--> statement-breakpoint
CREATE TABLE `diagrams` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`section_id` text,
	`type` text NOT NULL,
	`source` text NOT NULL,
	`graph_json` text NOT NULL,
	`extraction_confidence` integer NOT NULL,
	`start_line` integer NOT NULL,
	`end_line` integer NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`original_filename` text NOT NULL,
	`stored_path` text NOT NULL,
	`sha256` text NOT NULL,
	`title` text NOT NULL,
	`status` text DEFAULT 'imported' NOT NULL,
	`extraction_version` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `documents_sha256_unique` ON `documents` (`sha256`);--> statement-breakpoint
CREATE INDEX `documents_source_idx` ON `documents` (`source_id`);--> statement-breakpoint
CREATE TABLE `exercise_concepts` (
	`exercise_id` text NOT NULL,
	`concept_id` text NOT NULL,
	`section_id` text NOT NULL,
	PRIMARY KEY(`exercise_id`, `concept_id`, `section_id`),
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`concept_id`) REFERENCES `concepts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`prompt` text NOT NULL,
	`expected_answer` text NOT NULL,
	`type` text NOT NULL,
	`difficulty` integer NOT NULL,
	`generation_version` integer NOT NULL,
	`model` text NOT NULL,
	`prompt_version` text NOT NULL,
	`is_current` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `exercises_type_current_idx` ON `exercises` (`type`,`is_current`);--> statement-breakpoint
CREATE TABLE `mastery_states` (
	`concept_id` text NOT NULL,
	`exercise_type` text NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`concept_id`, `exercise_type`),
	FOREIGN KEY (`concept_id`) REFERENCES `concepts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `relationships` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`source_concept_id` text NOT NULL,
	`target_concept_id` text NOT NULL,
	`section_id` text NOT NULL,
	`relationship` text NOT NULL,
	`confidence` integer NOT NULL,
	`generation_version` integer NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_concept_id`) REFERENCES `concepts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_concept_id`) REFERENCES `concepts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `responses` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`answer` text NOT NULL,
	`correctness` integer NOT NULL,
	`completeness` integer NOT NULL,
	`confidence` integer NOT NULL,
	`latency_ms` integer NOT NULL,
	`hints_used` integer DEFAULT 0 NOT NULL,
	`evaluation_json` text NOT NULL,
	`evaluator_model` text NOT NULL,
	`evaluation_prompt_version` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `responses_session_exercise_unique` ON `responses` (`session_id`,`exercise_id`);--> statement-breakpoint
CREATE INDEX `responses_session_idx` ON `responses` (`session_id`);--> statement-breakpoint
CREATE INDEX `responses_exercise_idx` ON `responses` (`exercise_id`);--> statement-breakpoint
CREATE INDEX `responses_created_idx` ON `responses` (`created_at`);--> statement-breakpoint
CREATE TABLE `review_states` (
	`exercise_id` text PRIMARY KEY NOT NULL,
	`due_at` integer NOT NULL,
	`interval_days` real DEFAULT 0 NOT NULL,
	`repetitions` integer DEFAULT 0 NOT NULL,
	`last_quality` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `review_due_idx` ON `review_states` (`due_at`);--> statement-breakpoint
CREATE TABLE `sections` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`parent_id` text,
	`heading` text NOT NULL,
	`heading_level` integer NOT NULL,
	`order` integer NOT NULL,
	`start_line` integer NOT NULL,
	`end_line` integer NOT NULL,
	`content` text NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `sections`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sections_document_order_idx` ON `sections` (`document_id`,`order`);--> statement-breakpoint
CREATE TABLE `session_items` (
	`session_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`order` integer NOT NULL,
	`completed_at` integer,
	PRIMARY KEY(`session_id`, `exercise_id`),
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`started_at` integer NOT NULL,
	`completed_at` integer
);
--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
