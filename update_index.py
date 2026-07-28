import re

with open('src/db/index.js', 'r') as f:
    content = f.read()

content = content.replace("import { drizzle } from 'drizzle-orm/node-postgres';", "const { drizzle } = require('drizzle-orm/node-postgres');")
content = content.replace("import { Pool } from 'pg';", "const { Pool } = require('pg');")
content = content.replace("import * as schema from './schema.ts';", "const schema = require('./schema.js');")

content = content.replace("declare global {\n  var _postgresPool: Pool | undefined;\n}", "")
content = content.replace("export const createPool", "const createPool")
content = content.replace("export const db", "const db")

content += "\nmodule.exports = { createPool, db };\n"

with open('src/db/index.js', 'w') as f:
    f.write(content)

