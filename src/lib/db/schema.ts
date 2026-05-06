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
  'minutes_ready_for_review', 'milestone_due', 'goal_checkin_due',
  'budget_alert_80', 'budget_alert_100',
  'automation_triggered', 'intake_form_submitted',
  'risk_detected', 'standup_summary',
])

export const riskLevelEnum = pgEnum('risk_level', ['low', 'medium', 'high', 'critical'])

export const intakeSubmissionStatusEnum = pgEnum('intake_submission_status', [
  'new', 'reviewed', 'triaged',
])

export const milestoneStatusEnum = pgEnum('milestone_status', ['pending', 'in_progress', 'completed'])

export const automationTriggerEnum = pgEnum('automation_trigger', [
  'task_status_changed',
  'task_created',
  'task_overdue',
  'task_assigned',
  'task_priority_changed',
  'due_date_approaching',
  'milestone_completed',
  'comment_added',
  'project_status_changed',
  'time_entry_logged',
])

export const automationActionEnum = pgEnum('automation_action', [
  'change_task_status',
  'assign_task',
  'change_task_priority',
  'send_notification',
  'create_task',
  'post_to_channel',
  'set_due_date_offset',
  'move_to_project',
  'add_tag',
  'mark_milestone_done',
])

export const meetingRequestStatusEnum = pgEnum('meeting_request_status', [
  'draft', 'pending_review', 'approved', 'rejected', 'sent',
])

export const minutesStatusEnum = pgEnum('minutes_status', [
  'draft', 'pending_review', 'approved', 'distributed',
])

// ─── Tables ───────────────────────────────────────────────────────────────────
export const projects = pgTable('projects', {
  id:             uuid('id').primaryKey().defaultRandom(),
  name:           text('name').notNull(),
  description:    text('description'),
  status:         projectStatusEnum('status').default('planning').notNull(),
  ownerId:        uuid('owner_id'),
  color:          text('color').default('#007AFF').notNull(),
  icon:           text('icon').default('Folder').notNull(),
  startDate:      date('start_date'),
  endDate:        date('end_date'),
  budget:         integer('budget'),
  standupEnabled: boolean('standup_enabled').default(false).notNull(),
  createdAt:      timestamp('created_at').defaultNow().notNull(),
  updatedAt:      timestamp('updated_at').defaultNow().notNull(),
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
  hourlyRateCents:  integer('hourly_rate_cents'),
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
  timeEntries:    many(timeEntries),
}))

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  assignee:    one(users,       { fields: [tasks.assigneeId],   references: [users.id],       relationName: 'assignee' }),
  creator:     one(users,       { fields: [tasks.createdBy],    references: [users.id],       relationName: 'creator' }),
  meeting:     one(meetings,    { fields: [tasks.meetingId],    references: [meetings.id] }),
  department:  one(departments, { fields: [tasks.departmentId], references: [departments.id] }),
  project:     one(projects,    { fields: [tasks.projectId],    references: [projects.id] }),
  parent:      one(tasks,       { fields: [tasks.parentTaskId], references: [tasks.id],       relationName: 'parent_child' }),
  subtasks:    many(tasks,      { relationName: 'parent_child' }),
  milestones:  many(milestones),
  timeEntries: many(timeEntries),
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
  owner:           one(users, { fields: [projects.ownerId], references: [users.id] }),
  members:         many(projectMembers),
  tasks:           many(tasks),
  meetings:        many(meetings),
  documents:       many(documents),
  timeEntries:     many(timeEntries),
  projectExpenses: many(projectExpenses),
  riskSnapshots:   many(projectRiskSnapshots),
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

// ─── Documents & Wiki ─────────────────────────────────────────────────────────
export const documentStatusEnum = pgEnum('document_status', ['draft', 'review', 'approved'])

export const documents = pgTable('documents', {
  id:          uuid('id').primaryKey().defaultRandom(),
  projectId:   uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  title:       text('title').notNull(),
  contentJson: jsonb('content_json').$type<Record<string, unknown>>(),
  status:      documentStatusEnum('status').default('draft').notNull(),
  createdBy:   uuid('created_by').references(() => users.id),
  updatedBy:   uuid('updated_by').references(() => users.id),
  updatedAt:   timestamp('updated_at').defaultNow().notNull(),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
})

export const documentVersions = pgTable('document_versions', {
  id:            uuid('id').primaryKey().defaultRandom(),
  documentId:    uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull(),
  contentJson:   jsonb('content_json').$type<Record<string, unknown>>(),
  savedBy:       uuid('saved_by').references(() => users.id),
  savedAt:       timestamp('saved_at').defaultNow().notNull(),
})

export const documentsRelations = relations(documents, ({ one, many }) => ({
  project:  one(projects,          { fields: [documents.projectId],  references: [projects.id] }),
  creator:  one(users,             { fields: [documents.createdBy],  references: [users.id], relationName: 'doc_creator' }),
  editor:   one(users,             { fields: [documents.updatedBy],  references: [users.id], relationName: 'doc_editor' }),
  versions: many(documentVersions),
}))

export const documentVersionsRelations = relations(documentVersions, ({ one }) => ({
  document: one(documents, { fields: [documentVersions.documentId], references: [documents.id] }),
  saver:    one(users,     { fields: [documentVersions.savedBy],    references: [users.id] }),
}))

// ─── Workload / Capacity Planning ─────────────────────────────────────────────
export const availabilityTypeEnum = pgEnum('availability_type', ['holiday', 'leave', 'partial'])

export const userAvailability = pgTable('user_availability', {
  id:             uuid('id').primaryKey().defaultRandom(),
  userId:         uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date:           date('date').notNull(),
  type:           availabilityTypeEnum('type').notNull(),
  hoursAvailable: integer('hours_available').default(0).notNull(),
  note:           text('note'),
  createdAt:      timestamp('created_at').defaultNow().notNull(),
})

export const userSkills = pgTable('user_skills', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  skill:  text('skill').notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.skill] })])

export const userAvailabilityRelations = relations(userAvailability, ({ one }) => ({
  user: one(users, { fields: [userAvailability.userId], references: [users.id] }),
}))

export const userSkillsRelations = relations(userSkills, ({ one }) => ({
  user: one(users, { fields: [userSkills.userId], references: [users.id] }),
}))

// ─── Goals & OKRs ─────────────────────────────────────────────────────────────
export const goalLevelEnum  = pgEnum('goal_level',  ['company', 'team', 'individual'])
export const goalStatusEnum = pgEnum('goal_status', ['draft', 'active', 'paused', 'completed', 'cancelled'])
export const krMetricEnum   = pgEnum('kr_metric',   ['number', 'percentage', 'currency', 'boolean'])

export const goals = pgTable('goals', {
  id:          uuid('id').primaryKey().defaultRandom(),
  title:       text('title').notNull(),
  description: text('description'),
  level:       goalLevelEnum('level').default('company').notNull(),
  ownerId:     uuid('owner_id').references(() => users.id),
  teamId:      uuid('team_id').references(() => departments.id),
  status:      goalStatusEnum('status').default('active').notNull(),
  startDate:   date('start_date'),
  endDate:     date('end_date'),
  parentGoalId: uuid('parent_goal_id').references((): any => goals.id),
  createdBy:   uuid('created_by').references(() => users.id),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
  updatedAt:   timestamp('updated_at').defaultNow().notNull(),
})

export const keyResults = pgTable('key_results', {
  id:           uuid('id').primaryKey().defaultRandom(),
  goalId:       uuid('goal_id').notNull().references(() => goals.id, { onDelete: 'cascade' }),
  title:        text('title').notNull(),
  metricType:   krMetricEnum('metric_type').default('percentage').notNull(),
  targetValue:  integer('target_value').default(100).notNull(),
  currentValue: integer('current_value').default(0).notNull(),
  unit:         text('unit'),
  startDate:    date('start_date'),
  dueDate:      date('due_date'),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
  updatedAt:    timestamp('updated_at').defaultNow().notNull(),
})

export const goalTaskLinks = pgTable('goal_task_links', {
  goalId:       uuid('goal_id').notNull().references(() => goals.id, { onDelete: 'cascade' }),
  keyResultId:  uuid('key_result_id').notNull().references(() => keyResults.id, { onDelete: 'cascade' }),
  taskId:       uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.keyResultId, t.taskId] })])

export const goalsRelations = relations(goals, ({ one, many }) => ({
  owner:      one(users,       { fields: [goals.ownerId],      references: [users.id],       relationName: 'goal_owner' }),
  team:       one(departments, { fields: [goals.teamId],       references: [departments.id] }),
  creator:    one(users,       { fields: [goals.createdBy],    references: [users.id],       relationName: 'goal_creator' }),
  parent:     one(goals,       { fields: [goals.parentGoalId], references: [goals.id],       relationName: 'goal_parent_child' }),
  children:   many(goals,      { relationName: 'goal_parent_child' }),
  keyResults: many(keyResults),
}))

export const keyResultsRelations = relations(keyResults, ({ one, many }) => ({
  goal:      one(goals, { fields: [keyResults.goalId], references: [goals.id] }),
  taskLinks: many(goalTaskLinks),
}))

export const goalTaskLinksRelations = relations(goalTaskLinks, ({ one }) => ({
  goal:      one(goals,      { fields: [goalTaskLinks.goalId],      references: [goals.id] }),
  keyResult: one(keyResults, { fields: [goalTaskLinks.keyResultId], references: [keyResults.id] }),
  task:      one(tasks,      { fields: [goalTaskLinks.taskId],      references: [tasks.id] }),
}))

// ─── Time Tracking ────────────────────────────────────────────────────────────

export const timeEntries = pgTable('time_entries', {
  id:        uuid('id').primaryKey().defaultRandom(),
  taskId:    uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  userId:    uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date:      date('date').notNull(),
  minutes:   integer('minutes').notNull(),
  note:      text('note'),
  billable:  boolean('billable').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const projectExpenses = pgTable('project_expenses', {
  id:          uuid('id').primaryKey().defaultRandom(),
  projectId:   uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  amountCents: integer('amount_cents').notNull(),
  date:        date('date'),
  createdBy:   uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
})

// ─── Time Tracking Relations ──────────────────────────────────────────────────

export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  user:    one(users,    { fields: [timeEntries.userId],    references: [users.id] }),
  task:    one(tasks,    { fields: [timeEntries.taskId],    references: [tasks.id] }),
  project: one(projects, { fields: [timeEntries.projectId], references: [projects.id] }),
}))

export const projectExpensesRelations = relations(projectExpenses, ({ one }) => ({
  project: one(projects, { fields: [projectExpenses.projectId], references: [projects.id] }),
  creator: one(users,    { fields: [projectExpenses.createdBy],  references: [users.id] }),
}))

// ─── Automations ──────────────────────────────────────────────────────────────

export const automations = pgTable('automations', {
  id:            uuid('id').primaryKey().defaultRandom(),
  projectId:     uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name:          text('name').notNull(),
  triggerType:   automationTriggerEnum('trigger_type').notNull(),
  triggerConfig: jsonb('trigger_config').default({}).notNull(),
  actionType:    automationActionEnum('action_type').notNull(),
  actionConfig:  jsonb('action_config').default({}).notNull(),
  enabled:       boolean('enabled').default(true).notNull(),
  lastRunAt:     timestamp('last_run_at'),
  runCount:      integer('run_count').default(0).notNull(),
  createdBy:     uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt:     timestamp('created_at').defaultNow().notNull(),
  updatedAt:     timestamp('updated_at').defaultNow().notNull(),
})

export const automationsRelations = relations(automations, ({ one }) => ({
  project: one(projects, { fields: [automations.projectId], references: [projects.id] }),
  creator: one(users,    { fields: [automations.createdBy], references: [users.id] }),
}))

// ─── Intake Forms ─────────────────────────────────────────────────────────────

export const intakeForms = pgTable('intake_forms', {
  id:              uuid('id').primaryKey().defaultRandom(),
  projectId:       uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name:            text('name').notNull(),
  slug:            text('slug').notNull().unique(),
  description:     text('description'),
  fields:          jsonb('fields').default([]).notNull(),
  active:          boolean('active').default(true).notNull(),
  submissionCount: integer('submission_count').default(0).notNull(),
  createdBy:       uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt:       timestamp('created_at').defaultNow().notNull(),
  updatedAt:       timestamp('updated_at').defaultNow().notNull(),
})

export const intakeFormsRelations = relations(intakeForms, ({ one, many }) => ({
  project:     one(projects, { fields: [intakeForms.projectId], references: [projects.id] }),
  creator:     one(users,    { fields: [intakeForms.createdBy], references: [users.id] }),
  submissions: many(intakeSubmissions),
}))

export const intakeSubmissions = pgTable('intake_submissions', {
  id:             uuid('id').primaryKey().defaultRandom(),
  formId:         uuid('form_id').notNull().references(() => intakeForms.id, { onDelete: 'cascade' }),
  projectId:      uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  data:           jsonb('data').default({}).notNull(),
  status:         intakeSubmissionStatusEnum('status').default('new').notNull(),
  taskId:         uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),
  submitterEmail: text('submitter_email'),
  submitterName:  text('submitter_name'),
  createdAt:      timestamp('created_at').defaultNow().notNull(),
  updatedAt:      timestamp('updated_at').defaultNow().notNull(),
})

export const intakeSubmissionsRelations = relations(intakeSubmissions, ({ one }) => ({
  form:    one(intakeForms, { fields: [intakeSubmissions.formId],    references: [intakeForms.id] }),
  project: one(projects,    { fields: [intakeSubmissions.projectId], references: [projects.id] }),
  task:    one(tasks,       { fields: [intakeSubmissions.taskId],    references: [tasks.id] }),
}))

// ─── Project Risk Snapshots ───────────────────────────────────────────────────

export const projectRiskSnapshots = pgTable('project_risk_snapshots', {
  id:          uuid('id').primaryKey().defaultRandom(),
  projectId:   uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  riskLevel:   riskLevelEnum('risk_level').notNull(),
  explanation: text('explanation').notNull(),
  factors:     jsonb('factors').$type<string[]>().default([]).notNull(),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
})

export const projectRiskSnapshotsRelations = relations(projectRiskSnapshots, ({ one }) => ({
  project: one(projects, { fields: [projectRiskSnapshots.projectId], references: [projects.id] }),
}))

// ─── Client / Stakeholder Portal ─────────────────────────────────────────────

export const portalDocApprovalStatusEnum = pgEnum('portal_doc_approval_status', [
  'pending', 'approved', 'changes_requested',
])

export const clientPortals = pgTable('client_portals', {
  id:           uuid('id').primaryKey().defaultRandom(),
  projectId:    uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name:         text('name').notNull(),
  slug:         text('slug').notNull().unique(),
  passwordHash: text('password_hash'),
  logoUrl:      text('logo_url'),
  primaryColor: text('primary_color').default('#007AFF').notNull(),
  active:       boolean('active').default(true).notNull(),
  viewCount:    integer('view_count').default(0).notNull(),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
  updatedAt:    timestamp('updated_at').defaultNow().notNull(),
})

export const portalUpdates = pgTable('portal_updates', {
  id:        uuid('id').primaryKey().defaultRandom(),
  portalId:  uuid('portal_id').notNull().references(() => clientPortals.id, { onDelete: 'cascade' }),
  content:   text('content').notNull(),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const portalDocApprovals = pgTable('portal_doc_approvals', {
  id:          uuid('id').primaryKey().defaultRandom(),
  portalId:    uuid('portal_id').notNull().references(() => clientPortals.id, { onDelete: 'cascade' }),
  documentId:  uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  status:      portalDocApprovalStatusEnum('status').default('pending').notNull(),
  note:        text('note'),
  respondedAt: timestamp('responded_at'),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
})

// ─── GitHub Integration ───────────────────────────────────────────────────────

export const githubConnections = pgTable('github_connections', {
  id:          uuid('id').primaryKey().defaultRandom(),
  userId:      uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  login:       text('login').notNull(),
  avatarUrl:   text('avatar_url'),
  accessToken: text('access_token').notNull(),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
  updatedAt:   timestamp('updated_at').defaultNow().notNull(),
})

export const projectRepos = pgTable('project_repos', {
  id:           uuid('id').primaryKey().defaultRandom(),
  projectId:    uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  connectionId: uuid('connection_id').notNull().references(() => githubConnections.id, { onDelete: 'cascade' }),
  repoFullName: text('repo_full_name').notNull(),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
})

export const githubConnectionsRelations = relations(githubConnections, ({ one, many }) => ({
  user:  one(users, { fields: [githubConnections.userId], references: [users.id] }),
  repos: many(projectRepos),
}))

export const projectReposRelations = relations(projectRepos, ({ one }) => ({
  project:    one(projects,           { fields: [projectRepos.projectId],    references: [projects.id] }),
  connection: one(githubConnections,  { fields: [projectRepos.connectionId], references: [githubConnections.id] }),
}))

// ─── Outbound Webhooks ────────────────────────────────────────────────────────

export const outboundWebhooks = pgTable('outbound_webhooks', {
  id:        uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  url:       text('url').notNull(),
  events:    jsonb('events').$type<string[]>().default([]).notNull(),
  secret:    text('secret'),
  active:    boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const webhookDeliveries = pgTable('webhook_deliveries', {
  id:           uuid('id').primaryKey().defaultRandom(),
  webhookId:    uuid('webhook_id').notNull().references(() => outboundWebhooks.id, { onDelete: 'cascade' }),
  event:        text('event').notNull(),
  payload:      jsonb('payload').$type<Record<string, unknown>>().notNull(),
  statusCode:   integer('status_code'),
  responseBody: text('response_body'),
  success:      boolean('success').default(false).notNull(),
  deliveredAt:  timestamp('delivered_at').defaultNow().notNull(),
})

export const outboundWebhooksRelations = relations(outboundWebhooks, ({ one, many }) => ({
  project:    one(projects,          { fields: [outboundWebhooks.projectId], references: [projects.id] }),
  deliveries: many(webhookDeliveries),
}))

export const webhookDeliveriesRelations = relations(webhookDeliveries, ({ one }) => ({
  webhook: one(outboundWebhooks, { fields: [webhookDeliveries.webhookId], references: [outboundWebhooks.id] }),
}))

export const clientPortalsRelations = relations(clientPortals, ({ one, many }) => ({
  project: one(projects, { fields: [clientPortals.projectId], references: [projects.id] }),
  updates: many(portalUpdates),
  docApprovals: many(portalDocApprovals),
}))

export const portalUpdatesRelations = relations(portalUpdates, ({ one }) => ({
  portal:    one(clientPortals, { fields: [portalUpdates.portalId], references: [clientPortals.id] }),
  createdBy: one(users, { fields: [portalUpdates.createdBy], references: [users.id] }),
}))

export const portalDocApprovalsRelations = relations(portalDocApprovals, ({ one }) => ({
  portal:   one(clientPortals, { fields: [portalDocApprovals.portalId], references: [clientPortals.id] }),
  document: one(documents, { fields: [portalDocApprovals.documentId], references: [documents.id] }),
}))
