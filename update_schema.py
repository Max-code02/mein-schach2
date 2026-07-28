import re

with open('src/db/schema.js', 'r') as f:
    content = f.read()

content = content.replace("import { pgTable, text, timestamp, integer, boolean, serial } from 'drizzle-orm/pg-core';", "const { pgTable, text, timestamp, integer, boolean, serial } = require('drizzle-orm/pg-core');")
content = content.replace("export const ipBan", "const ipBan")
content = content.replace("export const players", "const players")
content = content.replace("export const messages", "const messages")

content += "\nmodule.exports = { ipBan, players, messages };\n"

with open('src/db/schema.js', 'w') as f:
    f.write(content)

