const words = ['nazi', 'hitler', 'heil', 'ss-marsch', 'hakenkreuz', 'neger', 'nigger', 'kanacke', 'jude', 'moslem', 'christ', 'zigeuner', 'faschist', 'vergasen', 'holocaust', 'hure', 'nutte', 'schlampe', 'miststück', 'wichser', 'wixxer', 'wixx', 'ficker', 'ficken', 'fotze', 'fotz', 'pimmel', 'schwanz', 'vagina', 'penis', 'hurensohn', 'huso', 'hurre', 'arsch', 'ass', 'bastard', 'missgeburt', 'missi', 'spaßt', 'spast', 'spasti', 'behindert', 'mongo', 'opfer', 'lutscher', 'pisser', 'kack', 'scheiß', 'verpiss', 'haltssmaul', 'fresse', 'maul', 'depp', 'trottel', 'dulli', 'vollidiot', 'schwul', 'lesbe', 'transe', 'schwuchtel', 'free-elo', 'hack', 'cheat', 'generator', 'discord.gg', 'http', 'https', '.com', '.de', '.net', '.gg/', 'paypal', 'kauf', 'shop', 'free-elo', 'hack', 'cheat', 'generator', 'fuck', 'bitch', 'shits', 'asshole', 'dick', 'cunt', 'retard', 'gay', 'stfu', 'faggot', 'pussy', 'slut'];

function check(msg) {
    const isCmd = msg.startsWith('/') || msg.startsWith('!') || msg.startsWith('?');
    const hasAdminPass = ['Admina111', 'admina111', 'Admin111', 'admin111', 'Admina1', 'Maxi'].some(pw => msg.includes(pw));
    console.log(`Msg: "${msg}", isCmd: ${isCmd}, hasAdminPass: ${hasAdminPass}`);
    if (!isCmd && !hasAdminPass) {
        const found = words.find(w => msg.toLowerCase().includes(w));
        console.log(`Banned word found: ${found}`);
    } else {
        console.log(`Skipped banned word check.`);
    }
}

check("/help Admina111");
check("!befhel Admina111");
check(" /help Admina111");
