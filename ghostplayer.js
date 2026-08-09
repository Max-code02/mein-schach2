// ghostplayer.js - ULTIMATIVE GHOST-KI ENGINE & BOT-PERSONALITIES
const engine = require('./engineWorker.js');

// Bot-Persönlichkeiten mit individueller Spielweise und Chat-Profilen
const BOT_PERSONALITIES = {
    "luca_99": {
        "title": "luca_99",
        "difficulty": "Grandmaster",
        "aggressiveness": 0.3861319058739688,
        "chatFrequency": 0.42704306942068443,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung"
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer"
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
                "ggs"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt"
            ]
        }
    },
    "SchachMatt123": {
        "title": "SchachMatt123",
        "difficulty": "Grandmaster",
        "aggressiveness": 0.8990825139277678,
        "chatFrequency": 0.42150495089433826,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung"
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer"
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
                "ggs"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt"
            ]
        }
    },
    "JulianB": {
        "title": "JulianB",
        "difficulty": "Medium",
        "aggressiveness": 0.5741209990130366,
        "chatFrequency": 0.3473538167966159,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung"
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer"
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
                "ggs"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt"
            ]
        }
    },
    "Felix_M": {
        "title": "Felix_M",
        "difficulty": "Medium",
        "aggressiveness": 0.3191520305948842,
        "chatFrequency": 0.4303452981008038,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung"
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer"
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
                "ggs"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt"
            ]
        }
    },
    "Anna_Chess": {
        "title": "Anna_Chess",
        "difficulty": "Medium",
        "aggressiveness": 0.5798732617089949,
        "chatFrequency": 0.3247696908259731,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung"
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer"
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
                "ggs"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt"
            ]
        }
    },
    "alex88": {
        "title": "alex88",
        "difficulty": "Grandmaster",
        "aggressiveness": 0.6585826742012499,
        "chatFrequency": 0.36542325022805644,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung"
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer"
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
                "ggs"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt"
            ]
        }
    },
    "MariusK": {
        "title": "MariusK",
        "difficulty": "Medium",
        "aggressiveness": 0.7068078095109321,
        "chatFrequency": 0.24533434443957491,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung"
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer"
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
                "ggs"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt"
            ]
        }
    },
    "PawnStar": {
        "title": "PawnStar",
        "difficulty": "Medium",
        "aggressiveness": 0.3376755522270214,
        "chatFrequency": 0.5510264203524748,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung"
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer"
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
                "ggs"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt"
            ]
        }
    },
    "max_gamer": {
        "title": "max_gamer",
        "difficulty": "Medium",
        "aggressiveness": 0.7322586366846926,
        "chatFrequency": 0.28074784582305673,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung"
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer"
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
                "ggs"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt"
            ]
        }
    },
    "Lena_22": {
        "title": "Lena_22",
        "difficulty": "Grandmaster",
        "aggressiveness": 0.702165147127128,
        "chatFrequency": 0.5597085292183592,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung"
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer"
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
                "ggs"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt"
            ]
        }
    },
    "simon_p": {
        "title": "simon_p",
        "difficulty": "Medium",
        "aggressiveness": 0.41757013785694747,
        "chatFrequency": 0.46736106408552286,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung"
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer"
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
                "ggs"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt"
            ]
        }
    },
    "david_91": {
        "title": "david_91",
        "difficulty": "Medium",
        "aggressiveness": 0.5054644135534113,
        "chatFrequency": 0.39199349385019056,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung"
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer"
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
                "ggs"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt"
            ]
        }
    },
    "kevin_pro": {
        "title": "kevin_pro",
        "difficulty": "Medium",
        "aggressiveness": 0.5629336869522468,
        "chatFrequency": 0.42309697088226417,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung"
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer"
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
                "ggs"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt"
            ]
        }
    },
    "sarah_k": {
        "title": "sarah_k",
        "difficulty": "Medium",
        "aggressiveness": 0.7472542445864777,
        "chatFrequency": 0.3974252458709412,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung"
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer"
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
                "ggs"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt"
            ]
        }
    },
    "tim_123": {
        "title": "tim_123",
        "difficulty": "Medium",
        "aggressiveness": 0.4305647062479937,
        "chatFrequency": 0.5273821014467606,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung"
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer"
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
                "ggs"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt"
            ]
        }
    },
    "jan_schach": {
        "title": "jan_schach",
        "difficulty": "Medium",
        "aggressiveness": 0.8997056313964213,
        "chatFrequency": 0.3209081622519543,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung"
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer"
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
                "ggs"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt"
            ]
        }
    },
    "peter_pan": {
        "title": "peter_pan",
        "difficulty": "Medium",
        "aggressiveness": 0.43925099671722556,
        "chatFrequency": 0.5012461913981139,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung"
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer"
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
                "ggs"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt"
            ]
        }
    },
    "lara_croft": {
        "title": "lara_croft",
        "difficulty": "Medium",
        "aggressiveness": 0.8523246083287661,
        "chatFrequency": 0.3454970440460411,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung"
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer"
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
                "ggs"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt"
            ]
        }
    },
    "michael_m": {
        "title": "michael_m",
        "difficulty": "Medium",
        "aggressiveness": 0.8946863204797517,
        "chatFrequency": 0.3603630236441353,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung"
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer"
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
                "ggs"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt"
            ]
        }
    },
    "tobias_k": {
        "title": "tobias_k",
        "difficulty": "Medium",
        "aggressiveness": 0.7073411859814298,
        "chatFrequency": 0.538148651202417,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung"
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer"
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
                "ggs"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt"
            ]
        }
    },
    "stephan_b": {
        "title": "stephan_b",
        "difficulty": "Medium",
        "aggressiveness": 0.623381155195678,
        "chatFrequency": 0.3641825943128944,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung"
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer"
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
                "ggs"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt"
            ]
        }
    },
    "chris_99": {
        "title": "chris_99",
        "difficulty": "Medium",
        "aggressiveness": 0.42762468733085524,
        "chatFrequency": 0.23279196651336342,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung"
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer"
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
                "ggs"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt"
            ]
        }
    },
    "julia_s": {
        "title": "julia_s",
        "difficulty": "Medium",
        "aggressiveness": 0.49092417096233076,
        "chatFrequency": 0.44029430971314093,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung"
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer"
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
                "ggs"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt"
            ]
        }
    },
    "lisa_m": {
        "title": "lisa_m",
        "difficulty": "Grandmaster",
        "aggressiveness": 0.47105535312711744,
        "chatFrequency": 0.22460034979309756,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung"
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer"
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
                "ggs"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt"
            ]
        }
    },
    "marcel_x": {
        "title": "marcel_x",
        "difficulty": "Grandmaster",
        "aggressiveness": 0.8562528175102322,
        "chatFrequency": 0.43865645414788024,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung"
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer"
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
                "ggs"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt"
            ]
        }
    },
    "dennis_d": {
        "title": "dennis_d",
        "difficulty": "Medium",
        "aggressiveness": 0.8129097664957772,
        "chatFrequency": 0.4384200708156663,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung"
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer"
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
                "ggs"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt"
            ]
        }
    },
    "philipp_r": {
        "title": "philipp_r",
        "difficulty": "Medium",
        "aggressiveness": 0.790127554839114,
        "chatFrequency": 0.41107363674458697,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung"
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer"
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
                "ggs"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt"
            ]
        }
    },
    "johannes_h": {
        "title": "johannes_h",
        "difficulty": "Medium",
        "aggressiveness": 0.3292001740343638,
        "chatFrequency": 0.4185457723300566,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung"
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer"
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
                "ggs"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt"
            ]
        }
    },
    "matthias_w": {
        "title": "matthias_w",
        "difficulty": "Medium",
        "aggressiveness": 0.4499104895678811,
        "chatFrequency": 0.5446940352989285,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung"
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer"
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
                "ggs"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt"
            ]
        }
    },
    "christian_g": {
        "title": "christian_g",
        "difficulty": "Grandmaster",
        "aggressiveness": 0.7866251701590246,
        "chatFrequency": 0.5532100559430805,
        "messages": {
            "greetings": [
                "moin",
                "hallo",
                "hi",
                "hi gl hf",
                "viel glück",
                "auf ein gutes spiel",
                "servus",
                "hey"
            ],
            "thinking": [
                "hmm",
                "uff",
                "schwierig",
                "mal schauen",
                "interessant",
                "muss kurz nachdenken",
                "schwere stellung"
            ],
            "aggressive": [
                "bam!",
                "den nehm ich",
                "ups",
                "angriff!",
                "danke",
                "nice"
            ],
            "defensive": [
                "knapp",
                "gut gespielt",
                "phew",
                "oh man",
                "mist",
                "verteidigen ist schwer"
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
                "ggs"
            ],
            "victory": [
                "gg",
                "danke fürs spiel",
                "schachmatt gg",
                "ggs",
                "gut gespielt"
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
function evaluateMove(move, board, color) {
    let score = 0;
    const pieceValues = { 'p': 10, 'n': 30, 'b': 30, 'r': 50, 'q': 90, 'k': 1000 };

    if (move.capture) {
        const capturedPiece = move.captured || 'p';
        score += (pieceValues[capturedPiece.toLowerCase()] || 10) * 1.5;
    }

    if (move.check || move.isCheck) score += 25;
    if (move.isCastle) score += 35; // Rochade wird belohnt

    // Zentrums-Bonus
    if (move.tr >= 2 && move.tr <= 5 && move.tc >= 2 && move.tc <= 5) {
        score += 15;
    }

    return score;
}

/**
 * Die Hauptfunktion für den Ghost-Player Zug
 */
function handleGhostMove(ws, board, color, botName) {
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
        const scoredMoves = moves.map(m => ({ move: m, score: evaluateMove(m, board, color) }));
        scoredMoves.sort((a, b) => b.score - a.score);

        // Zug-Auswahl mit realistischer menschlicher Streuung
        let chosenMove;
        if (profile.difficulty === "Grandmaster") {
            // GM wählt meistens den besten oder zweitbesten Zug (90% top 2)
            const topCandidates = scoredMoves.slice(0, Math.min(2, scoredMoves.length));
            chosenMove = topCandidates[Math.floor(Math.random() * topCandidates.length)].move;
        } else {
            // Medium Bot wählt unter den besten 4 Zügen
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
            const typingSpeed = 400 + Math.random() * 800;
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

        // Variable Reaktions- & Bedenkzeit
        let complexityBonus = moves.length * 18;
        let thinkingTime = 800 + Math.random() * 1500 + complexityBonus;
        if (chosenMove.capture) thinkingTime += 300;

        setTimeout(() => {
            if (ws && ws.readyState === 1) {
                ws.send(JSON.stringify({
                    type: 'move',
                    move: chosenMove,
                    sender: botName,
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
