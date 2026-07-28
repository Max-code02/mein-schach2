const { pgTable, text, timestamp, integer, boolean, serial } = require('drizzle-orm/pg-core');

const ipBan = pgTable('ip_ban', {
  id: serial('id').primaryKey(),
  ip_address: text('ip_address').notNull(),
  reason: text('reason'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

const players = pgTable('players', {
  username: text('username').primaryKey(),
  password: text('password'),
  ip_address: text('ip_address'),
  last_login: timestamp('last_login'),
  elo: integer('elo').default(1200).notNull(),
  wins: integer('wins').default(0).notNull(),
  games_played: integer('games_played').default(0).notNull(),
  is_banned: boolean('is_banned').default(false).notNull(),
  ip_ban: boolean('ip_ban').default(false).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  username: text('username').notNull(),
  content: text('content').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

module.exports = { ipBan, players, messages };
