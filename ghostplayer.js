// ghostplayer.js - ULTIMATIVE GHOST-KI ENGINE & BOT-PERSONALITIES
const engine = require('./engineWorker.js');

// Bot-Persönlichkeiten mit individueller Spielweise und Chat-Profilen
const BOT_PERSONALITIES = {
    "SofortBot": {
        "title": "SofortBot",
        "difficulty": "Instant",
        "speedPreference": "instant",
        "playstyle": "aggressive",
        "aggressiveness": 0.85,
        "chatFrequency": 0.15,
        "messages": {
            "greetings": ["⚡ Hi! Ich antworte sofort!", "Blitzschnell am Start!", "Hi, let's go!"],
            "thinking": ["Zack!", "Direkt der nächste Zug!"],
            "aggressive": ["Boom!", "Schlag!", "Angriff!"],
            "defensive": ["Puh!", "Weiter geht's!"],
            "check": ["Schach!", "Achtung Schach!"],
            "endgame": ["Schnelles Endspiel!"],
            "defeat": ["Gutes Spiel! GG!", "Respekt, gg!"],
            "victory": ["GG!", "Danke für die schnelle Runde!"]
        }
    },
    "FlashBot": {
        "title": "FlashBot",
        "difficulty": "Instant",
        "speedPreference": "instant",
        "playstyle": "aggressive",
        "aggressiveness": 0.9,
        "chatFrequency": 0.15,
        "messages": {
            "greetings": ["⚡ Speed-Schach!", "Hi, bin ultra schnell!", "gl hf!"],
            "thinking": ["Sofortzug!", "Gleich weiter!"],
            "aggressive": ["Take!", "Attacke!"],
            "defensive": ["Knapp!"],
            "check": ["Schach!"],
            "endgame": ["Endphase!"],
            "defeat": ["GG WP!", "Stark gespielt!"],
            "victory": ["GG!", "Schachmatt, gut gespielt!"]
        }
    },
    "luca_99": {
        "title": "luca_99",
        "difficulty": "Medium",
        "speedPreference": "rapid",
        "playstyle": "aggressive",
        "aggressiveness": 0.9,
        "chatFrequency": 0.26833573078482587,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey",
                "let's go"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung",
                "was spiel ich da..."
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice",
                "schach und matt bald",
                "taktik!"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer",
                "starker angriff"
            ],
            "check": [
                "schach",
                "schach!",
                "schach :p",
                "achtung schach"
            ],
            "endgame": [
                "spannend",
                "gg coming up",
                "endspiel zeit",
                "jetzt wirds ernst"
            ],
            "defeat": [
                "gg wp!",
                "respekt, gut gespielt",
                "ah mist, gg",
                "gg",
                "gut gespielt, danke",
                "ggs",
                "wow, stark"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt",
                "war knapp"
            ]
        }
    },
    "SchachMatt123": {
        "title": "SchachMatt123",
        "difficulty": "Grandmaster",
        "speedPreference": "rapid",
        "playstyle": "defensive",
        "aggressiveness": 0.3,
        "chatFrequency": 0.18756667562494572,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey",
                "let's go"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung",
                "was spiel ich da..."
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice",
                "schach und matt bald",
                "taktik!"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer",
                "starker angriff"
            ],
            "check": [
                "schach",
                "schach!",
                "schach :p",
                "achtung schach"
            ],
            "endgame": [
                "spannend",
                "gg coming up",
                "endspiel zeit",
                "jetzt wirds ernst"
            ],
            "defeat": [
                "gg wp!",
                "respekt, gut gespielt",
                "ah mist, gg",
                "gg",
                "gut gespielt, danke",
                "ggs",
                "wow, stark"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt",
                "war knapp"
            ]
        }
    },
    "JulianB": {
        "title": "JulianB",
        "difficulty": "Grandmaster",
        "speedPreference": "bullet",
        "playstyle": "aggressive",
        "aggressiveness": 0.9,
        "chatFrequency": 0.3850006916838923,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey",
                "let's go"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung",
                "was spiel ich da..."
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice",
                "schach und matt bald",
                "taktik!"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer",
                "starker angriff"
            ],
            "check": [
                "schach",
                "schach!",
                "schach :p",
                "achtung schach"
            ],
            "endgame": [
                "spannend",
                "gg coming up",
                "endspiel zeit",
                "jetzt wirds ernst"
            ],
            "defeat": [
                "gg wp!",
                "respekt, gut gespielt",
                "ah mist, gg",
                "gg",
                "gut gespielt, danke",
                "ggs",
                "wow, stark"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt",
                "war knapp"
            ]
        }
    },
    "Felix_M": {
        "title": "Felix_M",
        "difficulty": "Grandmaster",
        "speedPreference": "bullet",
        "playstyle": "aggressive",
        "aggressiveness": 0.9,
        "chatFrequency": 0.31902903125232507,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey",
                "let's go"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung",
                "was spiel ich da..."
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice",
                "schach und matt bald",
                "taktik!"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer",
                "starker angriff"
            ],
            "check": [
                "schach",
                "schach!",
                "schach :p",
                "achtung schach"
            ],
            "endgame": [
                "spannend",
                "gg coming up",
                "endspiel zeit",
                "jetzt wirds ernst"
            ],
            "defeat": [
                "gg wp!",
                "respekt, gut gespielt",
                "ah mist, gg",
                "gg",
                "gut gespielt, danke",
                "ggs",
                "wow, stark"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt",
                "war knapp"
            ]
        }
    },
    "Anna_Chess": {
        "title": "Anna_Chess",
        "difficulty": "Grandmaster",
        "speedPreference": "balanced",
        "playstyle": "balanced",
        "aggressiveness": 0.5327331684677318,
        "chatFrequency": 0.3084458500099959,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey",
                "let's go"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung",
                "was spiel ich da..."
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice",
                "schach und matt bald",
                "taktik!"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer",
                "starker angriff"
            ],
            "check": [
                "schach",
                "schach!",
                "schach :p",
                "achtung schach"
            ],
            "endgame": [
                "spannend",
                "gg coming up",
                "endspiel zeit",
                "jetzt wirds ernst"
            ],
            "defeat": [
                "gg wp!",
                "respekt, gut gespielt",
                "ah mist, gg",
                "gg",
                "gut gespielt, danke",
                "ggs",
                "wow, stark"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt",
                "war knapp"
            ]
        }
    },
    "alex88": {
        "title": "alex88",
        "difficulty": "Medium",
        "speedPreference": "blitz",
        "playstyle": "balanced",
        "aggressiveness": 0.540935871007649,
        "chatFrequency": 0.1947063335545677,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey",
                "let's go"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung",
                "was spiel ich da..."
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice",
                "schach und matt bald",
                "taktik!"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer",
                "starker angriff"
            ],
            "check": [
                "schach",
                "schach!",
                "schach :p",
                "achtung schach"
            ],
            "endgame": [
                "spannend",
                "gg coming up",
                "endspiel zeit",
                "jetzt wirds ernst"
            ],
            "defeat": [
                "gg wp!",
                "respekt, gut gespielt",
                "ah mist, gg",
                "gg",
                "gut gespielt, danke",
                "ggs",
                "wow, stark"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt",
                "war knapp"
            ]
        }
    },
    "MariusK": {
        "title": "MariusK",
        "difficulty": "Medium",
        "speedPreference": "bullet",
        "playstyle": "aggressive",
        "aggressiveness": 0.9,
        "chatFrequency": 0.22760614050039557,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey",
                "let's go"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung",
                "was spiel ich da..."
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice",
                "schach und matt bald",
                "taktik!"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer",
                "starker angriff"
            ],
            "check": [
                "schach",
                "schach!",
                "schach :p",
                "achtung schach"
            ],
            "endgame": [
                "spannend",
                "gg coming up",
                "endspiel zeit",
                "jetzt wirds ernst"
            ],
            "defeat": [
                "gg wp!",
                "respekt, gut gespielt",
                "ah mist, gg",
                "gg",
                "gut gespielt, danke",
                "ggs",
                "wow, stark"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt",
                "war knapp"
            ]
        }
    },
    "PawnStar": {
        "title": "PawnStar",
        "difficulty": "Medium",
        "speedPreference": "bullet",
        "playstyle": "balanced",
        "aggressiveness": 0.6146750795359006,
        "chatFrequency": 0.17719786754505829,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey",
                "let's go"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung",
                "was spiel ich da..."
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice",
                "schach und matt bald",
                "taktik!"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer",
                "starker angriff"
            ],
            "check": [
                "schach",
                "schach!",
                "schach :p",
                "achtung schach"
            ],
            "endgame": [
                "spannend",
                "gg coming up",
                "endspiel zeit",
                "jetzt wirds ernst"
            ],
            "defeat": [
                "gg wp!",
                "respekt, gut gespielt",
                "ah mist, gg",
                "gg",
                "gut gespielt, danke",
                "ggs",
                "wow, stark"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt",
                "war knapp"
            ]
        }
    },
    "max_gamer": {
        "title": "max_gamer",
        "difficulty": "Medium",
        "speedPreference": "blitz",
        "playstyle": "balanced",
        "aggressiveness": 0.7776823183278554,
        "chatFrequency": 0.15211773369069403,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey",
                "let's go"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung",
                "was spiel ich da..."
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice",
                "schach und matt bald",
                "taktik!"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer",
                "starker angriff"
            ],
            "check": [
                "schach",
                "schach!",
                "schach :p",
                "achtung schach"
            ],
            "endgame": [
                "spannend",
                "gg coming up",
                "endspiel zeit",
                "jetzt wirds ernst"
            ],
            "defeat": [
                "gg wp!",
                "respekt, gut gespielt",
                "ah mist, gg",
                "gg",
                "gut gespielt, danke",
                "ggs",
                "wow, stark"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt",
                "war knapp"
            ]
        }
    },
    "Lena_22": {
        "title": "Lena_22",
        "difficulty": "Medium",
        "speedPreference": "blitz",
        "playstyle": "aggressive",
        "aggressiveness": 0.9,
        "chatFrequency": 0.10969219595711195,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey",
                "let's go"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung",
                "was spiel ich da..."
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice",
                "schach und matt bald",
                "taktik!"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer",
                "starker angriff"
            ],
            "check": [
                "schach",
                "schach!",
                "schach :p",
                "achtung schach"
            ],
            "endgame": [
                "spannend",
                "gg coming up",
                "endspiel zeit",
                "jetzt wirds ernst"
            ],
            "defeat": [
                "gg wp!",
                "respekt, gut gespielt",
                "ah mist, gg",
                "gg",
                "gut gespielt, danke",
                "ggs",
                "wow, stark"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt",
                "war knapp"
            ]
        }
    },
    "simon_p": {
        "title": "simon_p",
        "difficulty": "Grandmaster",
        "speedPreference": "balanced",
        "playstyle": "balanced",
        "aggressiveness": 0.7087551487100109,
        "chatFrequency": 0.21708954630585717,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey",
                "let's go"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung",
                "was spiel ich da..."
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice",
                "schach und matt bald",
                "taktik!"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer",
                "starker angriff"
            ],
            "check": [
                "schach",
                "schach!",
                "schach :p",
                "achtung schach"
            ],
            "endgame": [
                "spannend",
                "gg coming up",
                "endspiel zeit",
                "jetzt wirds ernst"
            ],
            "defeat": [
                "gg wp!",
                "respekt, gut gespielt",
                "ah mist, gg",
                "gg",
                "gut gespielt, danke",
                "ggs",
                "wow, stark"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt",
                "war knapp"
            ]
        }
    },
    "david_91": {
        "title": "david_91",
        "difficulty": "Medium",
        "speedPreference": "blitz",
        "playstyle": "balanced",
        "aggressiveness": 0.6572350470482733,
        "chatFrequency": 0.12526337809504992,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey",
                "let's go"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung",
                "was spiel ich da..."
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice",
                "schach und matt bald",
                "taktik!"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer",
                "starker angriff"
            ],
            "check": [
                "schach",
                "schach!",
                "schach :p",
                "achtung schach"
            ],
            "endgame": [
                "spannend",
                "gg coming up",
                "endspiel zeit",
                "jetzt wirds ernst"
            ],
            "defeat": [
                "gg wp!",
                "respekt, gut gespielt",
                "ah mist, gg",
                "gg",
                "gut gespielt, danke",
                "ggs",
                "wow, stark"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt",
                "war knapp"
            ]
        }
    },
    "kevin_pro": {
        "title": "kevin_pro",
        "difficulty": "Medium",
        "speedPreference": "rapid",
        "playstyle": "aggressive",
        "aggressiveness": 0.9,
        "chatFrequency": 0.18573546847875458,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey",
                "let's go"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung",
                "was spiel ich da..."
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice",
                "schach und matt bald",
                "taktik!"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer",
                "starker angriff"
            ],
            "check": [
                "schach",
                "schach!",
                "schach :p",
                "achtung schach"
            ],
            "endgame": [
                "spannend",
                "gg coming up",
                "endspiel zeit",
                "jetzt wirds ernst"
            ],
            "defeat": [
                "gg wp!",
                "respekt, gut gespielt",
                "ah mist, gg",
                "gg",
                "gut gespielt, danke",
                "ggs",
                "wow, stark"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt",
                "war knapp"
            ]
        }
    },
    "sarah_k": {
        "title": "sarah_k",
        "difficulty": "Medium",
        "speedPreference": "rapid",
        "playstyle": "balanced",
        "aggressiveness": 0.5327157253911572,
        "chatFrequency": 0.3719189401005769,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey",
                "let's go"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung",
                "was spiel ich da..."
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice",
                "schach und matt bald",
                "taktik!"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer",
                "starker angriff"
            ],
            "check": [
                "schach",
                "schach!",
                "schach :p",
                "achtung schach"
            ],
            "endgame": [
                "spannend",
                "gg coming up",
                "endspiel zeit",
                "jetzt wirds ernst"
            ],
            "defeat": [
                "gg wp!",
                "respekt, gut gespielt",
                "ah mist, gg",
                "gg",
                "gut gespielt, danke",
                "ggs",
                "wow, stark"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt",
                "war knapp"
            ]
        }
    },
    "tim_123": {
        "title": "tim_123",
        "difficulty": "Grandmaster",
        "speedPreference": "rapid",
        "playstyle": "balanced",
        "aggressiveness": 0.6805200351960466,
        "chatFrequency": 0.3306473455749541,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey",
                "let's go"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung",
                "was spiel ich da..."
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice",
                "schach und matt bald",
                "taktik!"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer",
                "starker angriff"
            ],
            "check": [
                "schach",
                "schach!",
                "schach :p",
                "achtung schach"
            ],
            "endgame": [
                "spannend",
                "gg coming up",
                "endspiel zeit",
                "jetzt wirds ernst"
            ],
            "defeat": [
                "gg wp!",
                "respekt, gut gespielt",
                "ah mist, gg",
                "gg",
                "gut gespielt, danke",
                "ggs",
                "wow, stark"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt",
                "war knapp"
            ]
        }
    },
    "jan_schach": {
        "title": "jan_schach",
        "difficulty": "Grandmaster",
        "speedPreference": "balanced",
        "playstyle": "balanced",
        "aggressiveness": 0.7212418002476224,
        "chatFrequency": 0.2843653338988328,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey",
                "let's go"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung",
                "was spiel ich da..."
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice",
                "schach und matt bald",
                "taktik!"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer",
                "starker angriff"
            ],
            "check": [
                "schach",
                "schach!",
                "schach :p",
                "achtung schach"
            ],
            "endgame": [
                "spannend",
                "gg coming up",
                "endspiel zeit",
                "jetzt wirds ernst"
            ],
            "defeat": [
                "gg wp!",
                "respekt, gut gespielt",
                "ah mist, gg",
                "gg",
                "gut gespielt, danke",
                "ggs",
                "wow, stark"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt",
                "war knapp"
            ]
        }
    },
    "peter_pan": {
        "title": "peter_pan",
        "difficulty": "Medium",
        "speedPreference": "balanced",
        "playstyle": "balanced",
        "aggressiveness": 0.6211814137940295,
        "chatFrequency": 0.38564488810978115,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey",
                "let's go"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung",
                "was spiel ich da..."
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice",
                "schach und matt bald",
                "taktik!"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer",
                "starker angriff"
            ],
            "check": [
                "schach",
                "schach!",
                "schach :p",
                "achtung schach"
            ],
            "endgame": [
                "spannend",
                "gg coming up",
                "endspiel zeit",
                "jetzt wirds ernst"
            ],
            "defeat": [
                "gg wp!",
                "respekt, gut gespielt",
                "ah mist, gg",
                "gg",
                "gut gespielt, danke",
                "ggs",
                "wow, stark"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt",
                "war knapp"
            ]
        }
    },
    "lara_croft": {
        "title": "lara_croft",
        "difficulty": "Medium",
        "speedPreference": "blitz",
        "playstyle": "balanced",
        "aggressiveness": 0.6190361868987916,
        "chatFrequency": 0.15340913494223982,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey",
                "let's go"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung",
                "was spiel ich da..."
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice",
                "schach und matt bald",
                "taktik!"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer",
                "starker angriff"
            ],
            "check": [
                "schach",
                "schach!",
                "schach :p",
                "achtung schach"
            ],
            "endgame": [
                "spannend",
                "gg coming up",
                "endspiel zeit",
                "jetzt wirds ernst"
            ],
            "defeat": [
                "gg wp!",
                "respekt, gut gespielt",
                "ah mist, gg",
                "gg",
                "gut gespielt, danke",
                "ggs",
                "wow, stark"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt",
                "war knapp"
            ]
        }
    },
    "michael_m": {
        "title": "michael_m",
        "difficulty": "Grandmaster",
        "speedPreference": "balanced",
        "playstyle": "balanced",
        "aggressiveness": 0.6055872796565123,
        "chatFrequency": 0.37077607351963815,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey",
                "let's go"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung",
                "was spiel ich da..."
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice",
                "schach und matt bald",
                "taktik!"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer",
                "starker angriff"
            ],
            "check": [
                "schach",
                "schach!",
                "schach :p",
                "achtung schach"
            ],
            "endgame": [
                "spannend",
                "gg coming up",
                "endspiel zeit",
                "jetzt wirds ernst"
            ],
            "defeat": [
                "gg wp!",
                "respekt, gut gespielt",
                "ah mist, gg",
                "gg",
                "gut gespielt, danke",
                "ggs",
                "wow, stark"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt",
                "war knapp"
            ]
        }
    },
    "tobias_k": {
        "title": "tobias_k",
        "difficulty": "Medium",
        "speedPreference": "balanced",
        "playstyle": "defensive",
        "aggressiveness": 0.3,
        "chatFrequency": 0.26067324087672394,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey",
                "let's go"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung",
                "was spiel ich da..."
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice",
                "schach und matt bald",
                "taktik!"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer",
                "starker angriff"
            ],
            "check": [
                "schach",
                "schach!",
                "schach :p",
                "achtung schach"
            ],
            "endgame": [
                "spannend",
                "gg coming up",
                "endspiel zeit",
                "jetzt wirds ernst"
            ],
            "defeat": [
                "gg wp!",
                "respekt, gut gespielt",
                "ah mist, gg",
                "gg",
                "gut gespielt, danke",
                "ggs",
                "wow, stark"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt",
                "war knapp"
            ]
        }
    },
    "stephan_b": {
        "title": "stephan_b",
        "difficulty": "Grandmaster",
        "speedPreference": "blitz",
        "playstyle": "defensive",
        "aggressiveness": 0.3,
        "chatFrequency": 0.3065477909597104,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey",
                "let's go"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung",
                "was spiel ich da..."
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice",
                "schach und matt bald",
                "taktik!"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer",
                "starker angriff"
            ],
            "check": [
                "schach",
                "schach!",
                "schach :p",
                "achtung schach"
            ],
            "endgame": [
                "spannend",
                "gg coming up",
                "endspiel zeit",
                "jetzt wirds ernst"
            ],
            "defeat": [
                "gg wp!",
                "respekt, gut gespielt",
                "ah mist, gg",
                "gg",
                "gut gespielt, danke",
                "ggs",
                "wow, stark"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt",
                "war knapp"
            ]
        }
    },
    "chris_99": {
        "title": "chris_99",
        "difficulty": "Medium",
        "speedPreference": "rapid",
        "playstyle": "balanced",
        "aggressiveness": 0.6050681673930248,
        "chatFrequency": 0.2935514098910838,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey",
                "let's go"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung",
                "was spiel ich da..."
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice",
                "schach und matt bald",
                "taktik!"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer",
                "starker angriff"
            ],
            "check": [
                "schach",
                "schach!",
                "schach :p",
                "achtung schach"
            ],
            "endgame": [
                "spannend",
                "gg coming up",
                "endspiel zeit",
                "jetzt wirds ernst"
            ],
            "defeat": [
                "gg wp!",
                "respekt, gut gespielt",
                "ah mist, gg",
                "gg",
                "gut gespielt, danke",
                "ggs",
                "wow, stark"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt",
                "war knapp"
            ]
        }
    },
    "julia_s": {
        "title": "julia_s",
        "difficulty": "Grandmaster",
        "speedPreference": "rapid",
        "playstyle": "balanced",
        "aggressiveness": 0.7472194897295678,
        "chatFrequency": 0.3572898495374158,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey",
                "let's go"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung",
                "was spiel ich da..."
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice",
                "schach und matt bald",
                "taktik!"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer",
                "starker angriff"
            ],
            "check": [
                "schach",
                "schach!",
                "schach :p",
                "achtung schach"
            ],
            "endgame": [
                "spannend",
                "gg coming up",
                "endspiel zeit",
                "jetzt wirds ernst"
            ],
            "defeat": [
                "gg wp!",
                "respekt, gut gespielt",
                "ah mist, gg",
                "gg",
                "gut gespielt, danke",
                "ggs",
                "wow, stark"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt",
                "war knapp"
            ]
        }
    },
    "lisa_m": {
        "title": "lisa_m",
        "difficulty": "Medium",
        "speedPreference": "bullet",
        "playstyle": "aggressive",
        "aggressiveness": 0.9,
        "chatFrequency": 0.21185335019461493,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey",
                "let's go"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung",
                "was spiel ich da..."
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice",
                "schach und matt bald",
                "taktik!"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer",
                "starker angriff"
            ],
            "check": [
                "schach",
                "schach!",
                "schach :p",
                "achtung schach"
            ],
            "endgame": [
                "spannend",
                "gg coming up",
                "endspiel zeit",
                "jetzt wirds ernst"
            ],
            "defeat": [
                "gg wp!",
                "respekt, gut gespielt",
                "ah mist, gg",
                "gg",
                "gut gespielt, danke",
                "ggs",
                "wow, stark"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt",
                "war knapp"
            ]
        }
    },
    "marcel_x": {
        "title": "marcel_x",
        "difficulty": "Medium",
        "speedPreference": "rapid",
        "playstyle": "balanced",
        "aggressiveness": 0.5284479743633309,
        "chatFrequency": 0.21790362176227968,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey",
                "let's go"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung",
                "was spiel ich da..."
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice",
                "schach und matt bald",
                "taktik!"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer",
                "starker angriff"
            ],
            "check": [
                "schach",
                "schach!",
                "schach :p",
                "achtung schach"
            ],
            "endgame": [
                "spannend",
                "gg coming up",
                "endspiel zeit",
                "jetzt wirds ernst"
            ],
            "defeat": [
                "gg wp!",
                "respekt, gut gespielt",
                "ah mist, gg",
                "gg",
                "gut gespielt, danke",
                "ggs",
                "wow, stark"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt",
                "war knapp"
            ]
        }
    },
    "dennis_d": {
        "title": "dennis_d",
        "difficulty": "Grandmaster",
        "speedPreference": "bullet",
        "playstyle": "balanced",
        "aggressiveness": 0.7348767239832685,
        "chatFrequency": 0.11582936261163357,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey",
                "let's go"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung",
                "was spiel ich da..."
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice",
                "schach und matt bald",
                "taktik!"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer",
                "starker angriff"
            ],
            "check": [
                "schach",
                "schach!",
                "schach :p",
                "achtung schach"
            ],
            "endgame": [
                "spannend",
                "gg coming up",
                "endspiel zeit",
                "jetzt wirds ernst"
            ],
            "defeat": [
                "gg wp!",
                "respekt, gut gespielt",
                "ah mist, gg",
                "gg",
                "gut gespielt, danke",
                "ggs",
                "wow, stark"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt",
                "war knapp"
            ]
        }
    },
    "philipp_r": {
        "title": "philipp_r",
        "difficulty": "Medium",
        "speedPreference": "balanced",
        "playstyle": "defensive",
        "aggressiveness": 0.3,
        "chatFrequency": 0.18513475193757845,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey",
                "let's go"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung",
                "was spiel ich da..."
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice",
                "schach und matt bald",
                "taktik!"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer",
                "starker angriff"
            ],
            "check": [
                "schach",
                "schach!",
                "schach :p",
                "achtung schach"
            ],
            "endgame": [
                "spannend",
                "gg coming up",
                "endspiel zeit",
                "jetzt wirds ernst"
            ],
            "defeat": [
                "gg wp!",
                "respekt, gut gespielt",
                "ah mist, gg",
                "gg",
                "gut gespielt, danke",
                "ggs",
                "wow, stark"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt",
                "war knapp"
            ]
        }
    },
    "johannes_h": {
        "title": "johannes_h",
        "difficulty": "Grandmaster",
        "speedPreference": "blitz",
        "playstyle": "balanced",
        "aggressiveness": 0.653929038891942,
        "chatFrequency": 0.23348269891274598,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey",
                "let's go"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung",
                "was spiel ich da..."
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice",
                "schach und matt bald",
                "taktik!"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer",
                "starker angriff"
            ],
            "check": [
                "schach",
                "schach!",
                "schach :p",
                "achtung schach"
            ],
            "endgame": [
                "spannend",
                "gg coming up",
                "endspiel zeit",
                "jetzt wirds ernst"
            ],
            "defeat": [
                "gg wp!",
                "respekt, gut gespielt",
                "ah mist, gg",
                "gg",
                "gut gespielt, danke",
                "ggs",
                "wow, stark"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt",
                "war knapp"
            ]
        }
    },
    "matthias_w": {
        "title": "matthias_w",
        "difficulty": "Medium",
        "speedPreference": "balanced",
        "playstyle": "aggressive",
        "aggressiveness": 0.9,
        "chatFrequency": 0.3353218646979712,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey",
                "let's go"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung",
                "was spiel ich da..."
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice",
                "schach und matt bald",
                "taktik!"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer",
                "starker angriff"
            ],
            "check": [
                "schach",
                "schach!",
                "schach :p",
                "achtung schach"
            ],
            "endgame": [
                "spannend",
                "gg coming up",
                "endspiel zeit",
                "jetzt wirds ernst"
            ],
            "defeat": [
                "gg wp!",
                "respekt, gut gespielt",
                "ah mist, gg",
                "gg",
                "gut gespielt, danke",
                "ggs",
                "wow, stark"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt",
                "war knapp"
            ]
        }
    },
    "christian_g": {
        "title": "christian_g",
        "difficulty": "Medium",
        "speedPreference": "blitz",
        "playstyle": "balanced",
        "aggressiveness": 0.5831400986915365,
        "chatFrequency": 0.19171986245953793,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey",
                "let's go"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung",
                "was spiel ich da..."
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice",
                "schach und matt bald",
                "taktik!"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer",
                "starker angriff"
            ],
            "check": [
                "schach",
                "schach!",
                "schach :p",
                "achtung schach"
            ],
            "endgame": [
                "spannend",
                "gg coming up",
                "endspiel zeit",
                "jetzt wirds ernst"
            ],
            "defeat": [
                "gg wp!",
                "respekt, gut gespielt",
                "ah mist, gg",
                "gg",
                "gut gespielt, danke",
                "ggs",
                "wow, stark"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt",
                "war knapp"
            ]
        }
    },
    "BulletKing": {
        "title": "BulletKing",
        "difficulty": "Medium",
        "speedPreference": "bullet",
        "playstyle": "balanced",
        "aggressiveness": 0.6760674165529192,
        "chatFrequency": 0.28077169044970596,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey",
                "let's go"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung",
                "was spiel ich da..."
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice",
                "schach und matt bald",
                "taktik!"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer",
                "starker angriff"
            ],
            "check": [
                "schach",
                "schach!",
                "schach :p",
                "achtung schach"
            ],
            "endgame": [
                "spannend",
                "gg coming up",
                "endspiel zeit",
                "jetzt wirds ernst"
            ],
            "defeat": [
                "gg wp!",
                "respekt, gut gespielt",
                "ah mist, gg",
                "gg",
                "gut gespielt, danke",
                "ggs",
                "wow, stark"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt",
                "war knapp"
            ]
        }
    },
    "blitz_god": {
        "title": "blitz_god",
        "difficulty": "Medium",
        "speedPreference": "blitz",
        "playstyle": "defensive",
        "aggressiveness": 0.3,
        "chatFrequency": 0.12603673253408124,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey",
                "let's go"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung",
                "was spiel ich da..."
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice",
                "schach und matt bald",
                "taktik!"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer",
                "starker angriff"
            ],
            "check": [
                "schach",
                "schach!",
                "schach :p",
                "achtung schach"
            ],
            "endgame": [
                "spannend",
                "gg coming up",
                "endspiel zeit",
                "jetzt wirds ernst"
            ],
            "defeat": [
                "gg wp!",
                "respekt, gut gespielt",
                "ah mist, gg",
                "gg",
                "gut gespielt, danke",
                "ggs",
                "wow, stark"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt",
                "war knapp"
            ]
        }
    },
    "rapid_master": {
        "title": "rapid_master",
        "difficulty": "Medium",
        "speedPreference": "blitz",
        "playstyle": "balanced",
        "aggressiveness": 0.742632907320925,
        "chatFrequency": 0.15671760851874966,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey",
                "let's go"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung",
                "was spiel ich da..."
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice",
                "schach und matt bald",
                "taktik!"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer",
                "starker angriff"
            ],
            "check": [
                "schach",
                "schach!",
                "schach :p",
                "achtung schach"
            ],
            "endgame": [
                "spannend",
                "gg coming up",
                "endspiel zeit",
                "jetzt wirds ernst"
            ],
            "defeat": [
                "gg wp!",
                "respekt, gut gespielt",
                "ah mist, gg",
                "gg",
                "gut gespielt, danke",
                "ggs",
                "wow, stark"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt",
                "war knapp"
            ]
        }
    },
    "slow_thinker": {
        "title": "slow_thinker",
        "difficulty": "Medium",
        "speedPreference": "rapid",
        "playstyle": "balanced",
        "aggressiveness": 0.7011395349427019,
        "chatFrequency": 0.2604636701753864,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey",
                "let's go"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung",
                "was spiel ich da..."
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice",
                "schach und matt bald",
                "taktik!"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer",
                "starker angriff"
            ],
            "check": [
                "schach",
                "schach!",
                "schach :p",
                "achtung schach"
            ],
            "endgame": [
                "spannend",
                "gg coming up",
                "endspiel zeit",
                "jetzt wirds ernst"
            ],
            "defeat": [
                "gg wp!",
                "respekt, gut gespielt",
                "ah mist, gg",
                "gg",
                "gut gespielt, danke",
                "ggs",
                "wow, stark"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt",
                "war knapp"
            ]
        }
    },
    "aggressor_99": {
        "title": "aggressor_99",
        "difficulty": "Medium",
        "speedPreference": "blitz",
        "playstyle": "aggressive",
        "aggressiveness": 0.9,
        "chatFrequency": 0.14297857128451455,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey",
                "let's go"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung",
                "was spiel ich da..."
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice",
                "schach und matt bald",
                "taktik!"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer",
                "starker angriff"
            ],
            "check": [
                "schach",
                "schach!",
                "schach :p",
                "achtung schach"
            ],
            "endgame": [
                "spannend",
                "gg coming up",
                "endspiel zeit",
                "jetzt wirds ernst"
            ],
            "defeat": [
                "gg wp!",
                "respekt, gut gespielt",
                "ah mist, gg",
                "gg",
                "gut gespielt, danke",
                "ggs",
                "wow, stark"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt",
                "war knapp"
            ]
        }
    },
    "defend_pro": {
        "title": "defend_pro",
        "difficulty": "Grandmaster",
        "speedPreference": "bullet",
        "playstyle": "defensive",
        "aggressiveness": 0.3,
        "chatFrequency": 0.23320493605551804,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey",
                "let's go"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung",
                "was spiel ich da..."
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice",
                "schach und matt bald",
                "taktik!"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer",
                "starker angriff"
            ],
            "check": [
                "schach",
                "schach!",
                "schach :p",
                "achtung schach"
            ],
            "endgame": [
                "spannend",
                "gg coming up",
                "endspiel zeit",
                "jetzt wirds ernst"
            ],
            "defeat": [
                "gg wp!",
                "respekt, gut gespielt",
                "ah mist, gg",
                "gg",
                "gut gespielt, danke",
                "ggs",
                "wow, stark"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt",
                "war knapp"
            ]
        }
    },
    "tactics_fan": {
        "title": "tactics_fan",
        "difficulty": "Medium",
        "speedPreference": "balanced",
        "playstyle": "balanced",
        "aggressiveness": 0.6044352665649835,
        "chatFrequency": 0.1503360175350011,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey",
                "let's go"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung",
                "was spiel ich da..."
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice",
                "schach und matt bald",
                "taktik!"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer",
                "starker angriff"
            ],
            "check": [
                "schach",
                "schach!",
                "schach :p",
                "achtung schach"
            ],
            "endgame": [
                "spannend",
                "gg coming up",
                "endspiel zeit",
                "jetzt wirds ernst"
            ],
            "defeat": [
                "gg wp!",
                "respekt, gut gespielt",
                "ah mist, gg",
                "gg",
                "gut gespielt, danke",
                "ggs",
                "wow, stark"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt",
                "war knapp"
            ]
        }
    },
    "endgame_boss": {
        "title": "endgame_boss",
        "difficulty": "Medium",
        "speedPreference": "blitz",
        "playstyle": "balanced",
        "aggressiveness": 0.7479757150876961,
        "chatFrequency": 0.1982295659155286,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey",
                "let's go"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung",
                "was spiel ich da..."
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice",
                "schach und matt bald",
                "taktik!"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer",
                "starker angriff"
            ],
            "check": [
                "schach",
                "schach!",
                "schach :p",
                "achtung schach"
            ],
            "endgame": [
                "spannend",
                "gg coming up",
                "endspiel zeit",
                "jetzt wirds ernst"
            ],
            "defeat": [
                "gg wp!",
                "respekt, gut gespielt",
                "ah mist, gg",
                "gg",
                "gut gespielt, danke",
                "ggs",
                "wow, stark"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt",
                "war knapp"
            ]
        }
    }
};

/**
 * Begrüßung beim Spielstart
 */
function handleGhostGreeting(ws, botName) {
    const profile = BOT_PERSONALITIES[botName] || BOT_PERSONALITIES["luca_99"];
    const list = profile.messages.greetings;
    const spruch = list[Math.floor(Math.random() * list.length)];

    setTimeout(() => {
        if (ws && ws.readyState === 1) {
            ws.send(JSON.stringify({ 
                 type: 'chat', 
                 text: spruch, 
                 sender: botName, 
                 system: false 
             }));
        }
    }, 1200 + Math.random() * 800);
}

/**
 * Einfache Stellungsbewertung für kluge Zugauswahl
 */
function evaluateMove(move, board, color, profile) {
    let score = 0;
    const pieceValues = { 'p': 10, 'n': 30, 'b': 30, 'r': 50, 'q': 90, 'k': 1000 };

    if (move.capture) {
        const capturedPiece = move.captured || 'p';
        score += (pieceValues[capturedPiece.toLowerCase()] || 10) * 1.5;
        if (profile.playstyle === 'aggressive') score += 10;
    }
    
    if (move.check || move.isCheck) {
        score += 25;
        if (profile.playstyle === 'aggressive') score += 15;
    }
    
    if (move.isCastle) {
        score += 35; 
        if (profile.playstyle === 'defensive') score += 20;
    }

    // Zentrums-Bonus
    if (move.tr >= 2 && move.tr <= 5 && move.tc >= 2 && move.tc <= 5) {
        score += 15;
    }

    return score;
}

/**
 * Die Hauptfunktion für den Ghost-Player Zug
 */
function handleGhostMove(ws, board, color, botName, timeControl = "10+0") {
    try {
        const profile = BOT_PERSONALITIES[botName] || BOT_PERSONALITIES["luca_99"];
        
        // Nutzt vorhandenen engineWorker
        const moves = engine.generateMoves(board, color);

        if (!moves || moves.length === 0) {
            const defeatMsg = profile.messages.defeat[Math.floor(Math.random() * profile.messages.defeat.length)];
            if (ws && ws.readyState === 1) {
                ws.send(JSON.stringify({ 
                     type: 'chat', 
                     text: defeatMsg, 
                     sender: botName, 
                     system: false 
                 }));
            }
            return;
        }

        // Bewerten & Sortieren der Züge
        const scoredMoves = moves.map(m => ({ move: m, score: evaluateMove(m, board, color, profile) }));
        scoredMoves.sort((a, b) => b.score - a.score);

        // Zug-Auswahl mit realistischer menschlicher Streuung
        let chosenMove;
        if (profile.difficulty === "Grandmaster") {
            const topCandidates = scoredMoves.slice(0, Math.min(2, scoredMoves.length));
            chosenMove = topCandidates[Math.floor(Math.random() * topCandidates.length)].move;
        } else {
            const topCandidates = scoredMoves.slice(0, Math.min(4, scoredMoves.length));
            chosenMove = topCandidates[Math.floor(Math.random() * topCandidates.length)].move;
        }

        // Contextual Chat Generation
        const chance = Math.random();
        let spruch = "";
        
        if (chance < profile.chatFrequency) {
            if (chosenMove.check || chosenMove.isCheck) {
                spruch = profile.messages.check[Math.floor(Math.random() * profile.messages.check.length)];
            } else if (chosenMove.capture) {
                spruch = profile.messages.aggressive[Math.floor(Math.random() * profile.messages.aggressive.length)];
            } else if (moves.length < 12) {
                spruch = profile.messages.endgame[Math.floor(Math.random() * profile.messages.endgame.length)];
            } else {
                spruch = profile.messages.thinking[Math.floor(Math.random() * profile.messages.thinking.length)];
            }
        }

        // Sende Chat mit Tipp-Verzögerung
        if (spruch && ws && ws.readyState === 1) {
            const typingSpeed = 200 + Math.random() * 500;
            setTimeout(() => {
                if (ws && ws.readyState === 1) {
                    ws.send(JSON.stringify({ 
                         type: 'chat', 
                         text: spruch, 
                         sender: botName, 
                         system: false 
                     }));
                }
            }, typingSpeed);
        }

        // Parse Time Control
        let minutes = 10;
        if (timeControl) {
            if (typeof timeControl === 'number') {
                minutes = timeControl;
            } else if (typeof timeControl === 'string') {
                if (timeControl.includes('+')) {
                    minutes = parseInt(timeControl.split('+')[0]) || 10;
                } else if (timeControl === 'unlimited') {
                    minutes = 10;
                } else {
                    minutes = parseInt(timeControl) || 10;
                }
            }
        }
        
        // Variable Reaktions- & Bedenkzeit based on Time Control and Speed Preference
        let thinkingTime = 100;
        
        const isInstantBot = profile.speedPreference === 'instant' || (botName && (botName.includes('Sofort') || botName.includes('Flash') || botName.includes('Instant')));
        
        if (isInstantBot) {
            // Instant bot responds immediately (< 80ms)
            thinkingTime = Math.floor(40 + Math.random() * 60);
        } else if (minutes <= 1) { // Bullet (1 min) -> Extremely fast
            thinkingTime = Math.floor(80 + Math.random() * 120);
        } else if (minutes <= 3) { // Blitz (3 min) -> Snappy
            thinkingTime = Math.floor(150 + Math.random() * 200);
        } else if (minutes <= 5) { // Blitz (5 min) -> Quick
            thinkingTime = Math.floor(250 + Math.random() * 250);
        } else { // Rapid / Classic (10 min) -> Fast & steady, never takes forever!
            thinkingTime = Math.floor(350 + Math.random() * 350);
        }
        
        if (profile.speedPreference === 'bullet') {
            thinkingTime = Math.max(50, Math.floor(thinkingTime * 0.7));
        }

        setTimeout(() => {
            if (ws && ws.readyState === 1) {
                const p = (board && board[chosenMove.fr]) ? board[chosenMove.fr][chosenMove.fc] : 'p';
                ws.send(JSON.stringify({
                    type: 'move',
                    fr: chosenMove.fr,
                    fc: chosenMove.fc,
                    tr: chosenMove.tr,
                    tc: chosenMove.tc,
                    move: chosenMove,
                    piece: p,
                    sender: botName,
                    turn: color === 'white' ? 'black' : 'white',
                    nextTurn: color === 'white' ? 'black' : 'white',
                    board: board 
                 }));
            }
        }, thinkingTime);

    } catch (err) {
        console.error("❌ Fehler in GhostEngine handleGhostMove:", err);
    }
}

module.exports = { handleGhostMove, handleGhostGreeting, BOT_PERSONALITIES };
