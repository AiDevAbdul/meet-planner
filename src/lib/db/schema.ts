import {
  pgTable, uuid, text, boolean, integer, jsonb,
  timestamp, date, pgEnum, primaryKey,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ─── Enums ────────────────────────────────────────────────────────────────────
export const roleEnum     = pgEnum('role',     ['admin', 'manager', 'member', 'viewer'])
export const sourceEnum   = pgEnum('source',   ['gmail', 'manual', 'google_meet'])
export const priorityEnum = pgEnum('priority', ['critical', 'high', 'normal', 'low'])
export const statusEnum   = pgEnum('status',   ['triage', 'todo', 'in_progress', 'review', 'done'])
export const chanTypeEnum = pgEnum('chan_type', ['public', 'private', 'direct'])
export const chanRoleEnum = pgEnum('chan_role', ['owner', 'member'])

export const projectStatusEnum = pgEnum('project_status', [
  'planning', 'active', 'on_hold', 'completed', 'archived',
])
export const projectMemberRoleEnum = pgEnum('project_member_role', [
  'owner', 'manager', 'member', 'viewer',
])

export const notifTypeEnum = pgEnum('notif_type', [
  'task_assigned', 'task_due', 'task_overdue', 'mention',
  'idea_flagged', 'idea_approved', 'meeting_processed',
  'meeting_request_submitted', 'meeting_request_approved',
  'meeting_request_rejected', 'meeting_reminder',
  'minutes_ready_for_review', 'milestone_due',
])

export const milestoneStatusEnum = pgEnum('milestone_status', ['pending', 'in_progress', 'completed'])

export const meetingRequestStatusEnum = pgEnum('meeting_request_status', [
  'draft', 'pending_review', 'approved', 'rejected', 'sent',
])

export const minutesStatusEnum = pgEnum('minutes_status', [
  'draft', 'pending_review', 'approved', 'distributed',
])

// ─── Tables ───────────────────────────────────────────────────────────────────
export const projects = pgTable('projects', {
  id:          uuid('id').primaryKey().defaultRandom(),
  name:        text('name').notNull(),
  description: text('description'),
  status:      projectStatusEnum('status').default('planning').notNull(),
  ownerId:     uuid('owner_id'),
  color:       text('color').default('#007AFF').notNull(),
  icon:        text('icon').default('Folder').notNull(),
  startDate:   date('start_date'),
  endDate:     date('end_date'),
  budget:      integer('budget'),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
  updatedAt:   timestamp('updated_at').defaultNow().notNull(),
})

export const projectMembers = pgTable('project_members', {
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId:    uuid('user_id').notNull(),
  role:      projectMemberRoleEnum('role').default('member').notNull(),
  joinedAt:  timestamp('joined_at').defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.projectId, t.userId] })])

export const departments = pgTable('departments', {
  id:        uuid('id').primaryKey().defaultRandom(),
  name:      text('name').notNull(),
  slug:      text('slug').notNull().unique(),
  color:     text('color'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const users = pgTable('users', {
  id:               uuid('id').primaryKey().defaultRandom(),
  name:             text('name').notNull(),
  email:            text('email').notNull().unique(),
  emailVerified:    timestamp('email_verified', { mode: 'date' }),
  image:            text('image'),
  role:             roleEnum('role').default('member').notNull(),
  departmentId:     uuid('department_id').references(() => departments.id),
  avatarUrl:        text('avatar_url'),
  googleId:         text('google_id').unique(),
  passwordHash:     text('password_hash'),
  dailyReportEmail: boolean('daily_report_email').default(true).notNull(),
  createdAt:        timestamp('created_at').defaultNow().notNull(),
})

export const meetings = pgTable('meetings', {
  id:          uuid('id').primaryKey().defaultRandom(),
  title:       text('title').notNull(),
  source:      sourceEnum('source').notNull(),
  rawContent:  text('raw_content'),
  summary:     text('summary'),
  decisions:   jsonb('decisions').$type<string[]>(),
  attendees:   jsonb('attendees').$type<{ name: string; email: string }[]>(),
  date:        date('date'),
  projectId:   uuid('project_id').references(() => projects.id),
  createdBy:   uuid('created_by').references(() => users.id),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
})

export const customFieldTypeEnum = pgEnum('custom_field_type', ['text', 'number', 'date', 'select', 'checkbox'])

export const tasks = pgTable('tasks', {
  id:             uuid('id').primaryKey().defaultRandom(),
  title:          text('title').notNull(),
  description:    text('description'),
  priority:       priorityEnum('priority').default('normal').notNull(),
  status:         statusEnum('status').default('triage').notNull(),
  assigneeId:     uuid('assignee_id').references(() => users.id),
  createdBy:      uuid('created_by').references(() => users.id),
  meetingId:      uuid('meeting_id').references(() => meetings.id),
  departmentId:   uuid('department_id').references(() => departments.id),
  projectId:      uuid('project_id').references(() => projects.id),
  parentTaskId:   uuid('parent_task_id').references((): any => tasks.id),
  recurrenceRule: text('recurrence_rule'),
  dueDate:        date('due_date'),
  position:       integer('position').default(0),
  createdAt:      timestamp('created_at').defaultNow().notNull(),
  updatedAt:      timestamp('updated_at').defaultNow().notNull(),
})

export const channels = pgTable('channels', {
  id:           uuid('id').primaryKey().defaultRandom(),
  name:         text('name').notNull(),
  slug:         text('slug').notNull().unique(),
  departmentId: uuid('department_id').references(() => departments.id),
  type:         chanTypeEnum('type').default('public').notNull(),
  createdBy:    uuid('created_by').references(() => users.id),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
})

export const channelMembers = pgTable('channel_members', {
  channelId: uuid('channel_id').notNull().references(() => channels.id),
  userId:    uuid('user_id').notNull().references(() => users.id),
  role:      chanRoleEnum('role').default('member').notNull(),
  joinedAt:  timestamp('joined_at').defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.channelId, t.userId] })])

export const messages = pgTable('messages', {
  id:        uuid('id').primaryKey().defaultRandom(),
  channelId: uuid('channel_id').notNull().references(() => channels.id),
  userId:    uuid('user_id').notNull().references(() => users.id),
  content:   text('content').notNull(),
  replyTo:   uuid('reply_to').references((): any => messages.id),
  flagged:   boolean('flagged').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  editedAt:  timestamp('edited_at'),
})

export const notifications = pgTable('notifications', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    uuid('user_id').notNull().references(() => users.id),
  type:      notifTypeEnum('type').notNull(),
  payload:   jsonb('payload').$type<Record<string, string>>(),
  read:      boolean('read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── NextAuth tables ──────────────────────────────────────────────────────────
export const accounts = pgTable('accounts', {
  userId:            uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type:              text('type').notNull(),
  provider:          text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refresh_token:     text('refresh_token'),
  access_token:      text('access_token'),
  expires_at:        integer('expires_at'),
  token_type:        text('token_type'),
  scope:             text('scope'),
  id_token:          text('id_token'),
  session_state:     text('session_state'),
}, (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })])

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId:       uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires:      timestamp('expires', { mode: 'date' }).notNull(),
})

export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token:      text('token').notNull(),
  expires:    timestamp('expires', { mode: 'date' }).notNull(),
}, (t) => [primaryKey({ columns: [t.identifier, t.token] })])

// ─── Relations ────────────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ one, many }) => ({
  department:     one(departments, { fields: [users.departmentId], references: [departments.id] }),
  assignedTasks:  many(tasks, { relationName: 'assignee' }),
  createdTasks:   many(tasks, { relationName: 'creator' }),
  channelMembers: many(channelMembers),
  messages:       many(messages),
  notifications:  many(notifications),
}))

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  assignee:   one(users,       { fields: [tasks.assigneeId],   references: [users.id],       relationName: 'assignee' }),
  creator:    one(users,       { fields: [tasks.createdBy],    references: [users.id],       relationName: 'creator' }),
  meeting:    one(meetings,    { fields: [tasks.meetingId],    references: [meetings.id] }),
  department: one(departments, { fields: [tasks.departmentId], references: [departments.id] }),
  project:    one(projects,    { fields: [tasks.projectId],    references: [projects.id] }),
  parent:     one(tasks,       { fields: [tasks.parentTaskId], references: [tasks.id],       relationName: 'parent_child' }),
  subtasks:   many(tasks,      { relationName: 'parent_child' }),
  milestones: many(milestones),
}))

export const channelsRelations = relations(channels, ({ one, many }) => ({
  department: one(departments, { fields: [channels.departmentId], references: [departments.id] }),
  members:    many(channelMembers),
  messages:   many(messages),
}))

// ─── Meeting Requests ──────────────────────────────────────────────────────────
export const meetingRequests = pgTable('meeting_requests', {
  id:                    uuid('id').primaryKey().defaultRandom(),
  title:                 text('title').notNull(),
  agenda:                text('agenda'),
  proposedTime:          timestamp('proposed_time', { withTimezone: true }).notNull(),
  durationMinutes:       integer('duration_minutes').default(60).notNull(),
  location:              text('location'),
  attendeeIds:           jsonb('attendee_ids').$type<string[]>(),
  status:                meetingRequestStatusEnum('status').default('pending_review').notNull(),
  createdBy:             uuid('created_by').notNull().references(() => users.id),
  reviewedBy:            uuid('reviewed_by').references(() => users.id),
  reviewNote:            text('review_note'),
  googleCalendarEventId: text('google_calendar_event_id'),
  reminderSentAt:        timestamp('reminder_sent_at', { withTimezone: true }),
  createdAt:             timestamp('created_at').defaultNow().notNull(),
  updatedAt:             timestamp('updated_at').defaultNow().notNull(),
})

export const meetingRequestsRelations = relations(meetingRequests, ({ one }) => ({
  creator:  one(users, { fields: [meetingRequests.createdBy],   references: [users.id], relationName: 'mr_creator' }),
  reviewer: one(users, { fields: [meetingRequests.reviewedBy],  references: [users.id], relationName: 'mr_reviewer' }),
}))

// ─── Task Comments ─────────────────────────────────────────────────────────────
export const taskComments = pgTable('task_comments', {
  id:        uuid('id').primaryKey().defaultRandom(),
  taskId:    uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  userId:    uuid('user_id').notNull().references(() => users.id),
  content:   text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  editedAt:  timestamp('edited_at'),
})

export const taskCommentsRelations = relations(taskComments, ({ one }) => ({
  task: one(tasks, { fields: [taskComments.taskId], references: [tasks.id] }),
  user: one(users, { fields: [taskComments.userId], references: [users.id] }),
}))

// ─── Meeting Minutes ───────────────────────────────────────────────────────────
export const meetingMinutes = pgTable('meeting_minutes', {
  id:            uuid('id').primaryKey().defaultRandom(),
  meetingId:     uuid('meeting_id').notNull().references(() => meetings.id, { onDelete: 'cascade' }),
  content:       text('content').notNull(),
  status:        minutesStatusEnum('status').default('draft').notNull(),
  generatedByAi: boolean('generated_by_ai').default(false).notNull(),
  reviewedBy:    uuid('reviewed_by').references(() => users.id),
  approvedBy:    uuid('approved_by').references(() => users.id),
  distributedAt: timestamp('distributed_at', { withTimezone: true }),
  createdAt:     timestamp('created_at').defaultNow().notNull(),
  updatedAt:     timestamp('updated_at').defaultNow().notNull(),
})

export const meetingMinutesRelations = relations(meetingMinutes, ({ one }) => ({
  meeting:  one(meetings, { fields: [meetingMinutes.meetingId],  references: [meetings.id] }),
  reviewer: one(users,    { fields: [meetingMinutes.reviewedBy], references: [users.id], relationName: 'mm_reviewer' }),
  approver: one(users,    { fields: [meetingMinutes.approvedBy], references: [users.id], relationName: 'mm_approver' }),
}))

// ─── Daily Reports ────────────────────────────────────────────────────────────
export const dailyReports = pgTable('daily_reports', {
  id:              uuid('id').primaryKey().defaultRandom(),
  date:            date('date').notNull(),
  contentHtml:     text('content_html').notNull(),
  contentMarkdown: text('content_markdown').notNull(),
  sentAt:          timestamp('sent_at', { withTimezone: true }),
  recipientIds:    jsonb('recipient_ids').$type<string[]>(),
  createdAt:       timestamp('created_at').defaultNow().notNull(),
})

// ─── Milestones ────────────────────────────────────────────────────────────────
export const milestones = pgTable('milestones', {
  id:          uuid('id').primaryKey().defaultRandom(),
  taskId:      uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  title:       text('title').notNull(),
  dueDate:     date('due_date'),
  status:      milestoneStatusEnum('status').default('pending').notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdBy:   uuid('created_by').references(() => users.id),
  aiSuggested: boolean('ai_suggested').default(false).notNull(),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
  updatedAt:   timestamp('updated_at').defaultNow().notNull(),
})

export const milestonesRelations = relations(milestones, ({ one }) => ({
  task:    one(tasks, { fields: [milestones.taskId],    references: [tasks.id] }),
  creator: one(users, { fields: [milestones.createdBy], references: [users.id] }),
}))

// ─── Projects ─────────────────────────────────────────────────────────────────
export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner:   one(users, { fields: [projects.ownerId], references: [users.id] }),
  members: many(projectMembers),
  tasks:   many(tasks),
  meetings: many(meetings),
}))

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, { fields: [projectMembers.projectId], references: [projects.id] }),
  user:    one(users,    { fields: [projectMembers.userId],    references: [users.id] }),
}))

// ─── Subtasks / Dependencies ───────────────────────────────────────────────────
export const taskDependencies = pgTable('task_dependencies', {
  taskId:          uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  dependsOnTaskId: uuid('depends_on_task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  createdAt:       timestamp('created_at').defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.taskId, t.dependsOnTaskId] })])

// ─── Custom Fields ─────────────────────────────────────────────────────────────
export const customFieldDefinitions = pgTable('custom_field_definitions', {
  id:        uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name:      text('name').notNull(),
  type:      customFieldTypeEnum('type').notNull(),
  options:   jsonb('options').$type<string[]>(),
  position:  integer('position').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const customFieldValues = pgTable('custom_field_values', {
  taskId:            uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  fieldDefinitionId: uuid('field_definition_id').notNull().references(() => customFieldDefinitions.id, { onDelete: 'cascade' }),
  value:             text('value'),
  updatedAt:         timestamp('updated_at').defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.taskId, t.fieldDefinitionId] })])

export const customFieldDefinitionsRelations = relations(customFieldDefinitions, ({ one }) => ({
  project: one(projects, { fields: [customFieldDefinitions.projectId], references: [projects.id] }),
}))

// ─── Task Templates ────────────────────────────────────────────────────────────
export const taskTemplates = pgTable('task_templates', {
  id:          uuid('id').primaryKey().defaultRandom(),
  projectId:   uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  name:        text('name').notNull(),
  description: text('description'),
  priority:    priorityEnum('priority').default('normal').notNull(),
  fields:      jsonb('fields').$type<Record<string, unknown>>(),
  createdBy:   uuid('created_by').references(() => users.id),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
})
