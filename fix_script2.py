import re

with open('script.js', 'r') as f:
    content = f.read()

content = re.sub(r"let supabase;\n\nfunction connectToSupabase\(\) \{[\s\S]*?\}\nconnectToSupabase\(\);\n", "", content)

# I will also remove chat.html supabase imports if needed
import os
if os.path.exists('chat.html'):
    with open('chat.html', 'r') as f:
        chat_html = f.read()
    chat_html = re.sub(r"<script type=\"module\">\n\s*import \{ createClient \} from 'https://cdn\.jsdelivr\.net/npm/@supabase/supabase-js/\+esm'\n\s*const supabaseUrl = 'https://sfbubqwnuthicpenmwye\.supabase\.co'\n\s*const supabaseKey = 'sb_publishable_H-ZV5me7vxZN_fNPdQ0ifA_--7AdGnZ'\n\s*const supabase = createClient\(supabaseUrl, supabaseKey\)\n\s*window\.supabase = supabase;\n", "<script type=\"module\">\n", chat_html)
    with open('chat.html', 'w') as f:
        f.write(chat_html)

if os.path.exists('script2.js'):
    with open('script2.js', 'r') as f:
        script2 = f.read()
    script2 = re.sub(r"// 1\. Supabase Verbindung\nconst supabaseUrl = 'https://sfbubqwnuthicpenmwye\.supabase\.co'\nconst supabaseKey = 'sb_publishable_H-ZV5me7vxZN_fNPdQ0ifA_--7AdGnZ'\nconst supabase = createClient\(supabaseUrl, supabaseKey\)\n\nwindow\.supabase = supabase;\n", "", script2)
    with open('script2.js', 'w') as f:
        f.write(script2)

with open('script.js', 'w') as f:
    f.write(content)
