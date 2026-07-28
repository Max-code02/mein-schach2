import re

with open('script.js', 'r') as f:
    content = f.read()

content = re.sub(r"const SUPABASE_URL = '.*?';\nconst SUPABASE_KEY = '.*?';\n", "", content)
content = re.sub(r"async function saveWinToSupabase\(name\) \{[\s\S]*?\}\n", "", content)

# Remove `loadChatHistory` if it's still doing supabase things
content = re.sub(r"async function loadChatHistory\(\) \{[\s\S]*?\}\n\n", "", content)

with open('script.js', 'w') as f:
    f.write(content)

# And for script2.js
with open('script2.js', 'r') as f:
    content = f.read()

content = re.sub(r"import \{ createClient \} from 'https://cdn\.jsdelivr\.net/npm/@supabase/supabase-js/\+esm'\n", "", content)
content = re.sub(r"async function saveWinToSupabase\(name\) \{[\s\S]*?\}", "", content)
content = re.sub(r"if \(window\.supabase\) \{[\s\S]*?\}", "", content)

with open('script2.js', 'w') as f:
    f.write(content)

