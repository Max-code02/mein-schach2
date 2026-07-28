import re

with open('script.js', 'r') as f:
    content = f.read()

content = re.sub(
r"function loadChatHistory\(\) \{[\s\S]*?\} = await supabase[\s\S]*?\}\n\s*\}\n\}",
r"""function loadChatHistory() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'get_chat_history' }));
    }
}""",
content
)

# Wait, `loadChatHistory()` is called on load:
content = re.sub(
r"window\.addEventListener\('load', \(\) => \{\n\s*setTimeout\(\(\) => \{\n\s*if \(true\) \{\n\s*loadChatHistory\(\);\n\s*\}\n\s*\}, 500\);\n\}\);",
r"""window.addEventListener('load', () => {
    setTimeout(() => {
        loadChatHistory();
    }, 500);
});""",
content
)

with open('script.js', 'w') as f:
    f.write(content)

