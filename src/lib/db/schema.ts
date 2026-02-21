import { pgTable, uuid, text, timestamp, integer, jsonb, boolean } from 'drizzle-orm/pg-core';

// Users table (extends Clerk)
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  username: text('username').unique().notNull(),
  displayName: text('display_name'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Posts: manual + AI generated
export const posts = pgTable('posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  content: text('content').notNull(),
  source: text('source').notNull(), // 'manual', 'ai_generated', 'repurposed', 'imported'
  status: text('status').notNull().default('draft'), // 'draft', 'scheduled', 'ready', 'posted', 'archived'
  
  // Manual analytics entry
  postedAt: timestamp('posted_at'),
  impressions: integer('impressions').default(0),
  likes: integer('likes').default(0),
  replies: integer('replies').default(0),
  retweets: integer('retweets').default(0),
  
  // AI analysis
  algorithmScore: jsonb('algorithm_score'), // { hook, clarity, novelty, cta, readability, overall }
  topics: text('topics').array(),
  hooks: text('hooks').array(),
  sentiment: text('sentiment'),
  wordCount: integer('word_count'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Post variants (repurposed)
export const postVariants = pgTable('post_variants', {
  id: uuid('id').defaultRandom().primaryKey(),
  originalPostId: uuid('original_post_id').references(() => posts.id),
  variantContent: text('variant_content').notNull(),
  variantType: text('variant_type').notNull(), // 'short', 'thread', 'quote', 'reply'
  algorithmScore: jsonb('algorithm_score'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Schedule queue
export const scheduleQueue = pgTable('schedule_queue', {
  id: uuid('id').defaultRandom().primaryKey(),
  postId: uuid('post_id').references(() => posts.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  scheduledFor: timestamp('scheduled_for').notNull(),
  status: text('status').default('pending'), // 'pending', 'completed', 'failed'
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Ideas / Brain dumps
export const ideas = pgTable('ideas', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  content: text('content').notNull(),
  expandedContent: text('expanded_content'),
  status: text('status').default('raw'), // 'raw', 'expanded', 'posted'
  topics: text('topics').array(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Topics library
export const topics = pgTable('topics', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  topic: text('topic').notNull(),
  frequency: integer('frequency').default(1),
  lastUsedAt: timestamp('last_used_at'),
});

// Hooks library
export const hooks = pgTable('hooks', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  hookText: text('hook_text').notNull(),
  hookType: text('hook_type'), // 'question', 'statement', 'controversy', 'stat', 'curiosity', 'pain'
  performanceScore: integer('performance_score'),
  usedCount: integer('used_count').default(1),
  createdAt: timestamp('created_at').defaultNow(),
});

// Target accounts
export const targetAccounts = pgTable('target_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  xHandle: text('x_handle').notNull(),
  niche: text('niche'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Voice profile (style extraction)
export const voiceProfiles = pgTable('voice_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).unique().notNull(),
  
  // Extracted style features
  commonWords: text('common_words').array(),
  sentenceStarts: text('sentence_starts').array(),
  toneKeywords: text('tone_keywords').array(),
  ctaPatterns: text('cta_patterns').array(),
  formalityScore: integer('formality_score'), // 1-10
  avgPostLength: integer('avg_post_length'),
  
  // Sample posts for context
  samplePosts: text('sample_posts').array(),
  
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Daily metrics
export const dailyMetrics = pgTable('daily_metrics', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  date: timestamp('date').notNull(),
  postsCount: integer('posts_count').default(0),
  followers: integer('followers'),
  impressions: integer('impressions'),
  engagements: integer('engagements'),
  notes: text('notes'),
});

// User API keys (for settings page)
export const userApiKeys = pgTable('user_api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  provider: text('provider').notNull(), // 'openai', 'google', 'x', etc
  encryptedKey: text('encrypted_key').notNull(), // encrypted storage
  label: text('label'), // user-friendly label
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Type exports
export type User = typeof users.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type PostVariant = typeof postVariants.$inferSelect;
export type ScheduleItem = typeof scheduleQueue.$inferSelect;
export type Idea = typeof ideas.$inferSelect;
export type Topic = typeof topics.$inferSelect;
export type Hook = typeof hooks.$inferSelect;
export type TargetAccount = typeof targetAccounts.$inferSelect;
export type VoiceProfile = typeof voiceProfiles.$inferSelect;
export type DailyMetric = typeof dailyMetrics.$inferSelect;
export type UserApiKey = typeof userApiKeys.$inferSelect;
