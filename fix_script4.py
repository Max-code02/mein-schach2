import re

with open('script.js', 'r') as f:
    content = f.read()

content = re.sub(
r"function sendMsg\(\) \{[\s\S]*?\}\n\}",
r"""function sendMsg() {
    if (!chatInput) return;
    const t = chatInput.value.trim();
    if (t && socket.readyState === 1) {
        socket.send(JSON.stringify({ 
            type: 'chat_message', 
            username: getMyName(),
            content: t
        }));
        let cleanText = t;
        const pws = ['Admina111', 'admina111', 'Admin111', 'admin111', 'Admina1', 'admina1', 'Maxi'];
        pws.forEach(pw => { cleanText = cleanText.replaceAll(pw, '').trim(); });
        addChat("Ich", cleanText, "me"); 
        chatInput.value = "";
    }
}""",
content
)

content = re.sub(r"async function saveMessage\(username, text\) \{[\s\S]*?\}\n", "", content)

with open('script.js', 'w') as f:
    f.write(content)

