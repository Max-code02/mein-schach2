import re
import os

with open('script.js', 'r') as f:
    content = f.read()

# Fix saveAccountBtn logic
content = re.sub(r"        if \(window\.supabase\) \{[\s\S]*?\} catch \(dbError\) \{[\s\S]*?return; \n            \}\n        \}", "", content)

# Change type 'join' to 'login_attempt' if needed, or leave it and let the server handle it?
# Wait, the server has:
# if (data.type === 'login_attempt')
# Let's change type: 'join' to 'login_attempt' in saveBtn.onclick
content = re.sub(
r"socket\.send\(JSON\.stringify\(\{\n\s*type: 'join',\n\s*playerName: safeName,",
r"socket.send(JSON.stringify({\n                type: 'login_attempt',\n                playerName: safeName,",
content
)

# Fix loadChatHistory
content = re.sub(
r"async function loadChatHistory\(\) \{[\s\S]*?\}",
r"""function loadChatHistory() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'get_chat_history' }));
    }
}""",
content
)

# Fix sendChatMessage
content = re.sub(
r"async function sendChatMessage\(text\) \{[\s\S]*?    if \(error\) console\.error\(\"Chat-Fehler:\", error\.message\);\n\}",
r"""function sendChatMessage(text) {
    if (!text.trim()) return;
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'chat_message', username: getMyName(), content: text }));
    }
}""",
content
)

# Fix saveWinToSupabase
content = re.sub(
r"async function saveWinToSupabase\(winnerName\) \{[\s\S]*?\}",
r"""function saveWinToSupabase(winnerName) {
    // handled by backend now on 'win' message
}""",
content
)

# Fix connectToSupabase
content = re.sub(
r"let supabase;\n\nfunction connectToSupabase\(\) \{[\s\S]*?\}\n\nconnectToSupabase\(\);\n",
r"",
content
)

content = content.replace("if (typeof supabase !== 'undefined')", "if (true)")
content = content.replace("if (window.supabase) { saveWinToSupabase(getMyName()); }", "socket.send(JSON.stringify({ type: 'win', name: getMyName() }));")
content = content.replace("if (window.supabase) {\n                        saveWinToSupabase(getMyName());\n                    }", "socket.send(JSON.stringify({ type: 'win', name: getMyName() }));")


with open('script.js', 'w') as f:
    f.write(content)

