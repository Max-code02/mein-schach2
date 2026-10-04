const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let initialized = false;

function formatPrivateKey(key) {
    if (!key || typeof key !== 'string') return key;
    let formatted = key.replace(/\\n/g, '\n');
    formatted = formatted.trim();
    if (!formatted.endsWith('\n')) {
        formatted += '\n';
    }
    return formatted;
}

/**
 * Initialisiert das Firebase Admin SDK sicher.
 */
function initializeFirebaseAdmin() {
    if (initialized && admin.apps && admin.apps.length > 0) {
        return;
    }

    let defaultProjectId = 'schachlive';
    try {
        const configPath = path.join(__dirname, 'firebase-applet-config.json');
        if (fs.existsSync(configPath)) {
            const fbConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (fbConfig.projectId) defaultProjectId = fbConfig.projectId;
        }
    } catch (e) {}

    // --------------------------------------------------------
    // Variante 1: Service Account aus Environment Variable
    // --------------------------------------------------------
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        try {
            let raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
            let serviceAccount;
            try {
                serviceAccount = JSON.parse(raw);
            } catch (pErr) {
                try {
                    serviceAccount = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
                } catch (b64Err) {}
            }

            if (serviceAccount && typeof serviceAccount === 'object') {
                if (serviceAccount.private_key && !serviceAccount.private_key.includes('...')) {
                    serviceAccount.private_key = formatPrivateKey(serviceAccount.private_key);
                    admin.initializeApp({
                        credential: admin.credential.cert(serviceAccount),
                        projectId: serviceAccount.project_id || defaultProjectId
                    });
                    initialized = true;
                    console.log('🔥 Firebase Admin SDK: Service Account via FIREBASE_SERVICE_ACCOUNT_JSON erfolgreich geladen.');
                    return;
                } else if (serviceAccount.private_key && serviceAccount.private_key.includes('...')) {
                    console.warn('ℹ️ FIREBASE_SERVICE_ACCOUNT_JSON enthält unvollständigen Platzhalter (...). Nutze Datei-Fallback.');
                }
            }
        } catch (envErr) {
            console.warn('⚠️ Fehler beim Laden von FIREBASE_SERVICE_ACCOUNT_JSON:', envErr.message);
        }
    }

    // --------------------------------------------------------
    // Variante 2: Lokale Service-Account-Datei (serviceAccountKey.json)
    // --------------------------------------------------------
    const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
    if (fs.existsSync(serviceAccountPath)) {
        try {
            const saContent = fs.readFileSync(serviceAccountPath, 'utf8');
            const serviceAccount = JSON.parse(saContent);
            if (serviceAccount.private_key) {
                serviceAccount.private_key = formatPrivateKey(serviceAccount.private_key);
            }
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: serviceAccount.project_id || defaultProjectId
            });
            initialized = true;
            console.log('🔥 Firebase Admin SDK: Lokale Datei serviceAccountKey.json erfolgreich geladen.');
            return;
        } catch (fileErr) {
            console.warn('⚠️ Fehler beim Laden von serviceAccountKey.json:', fileErr.message);
        }
    }

    // --------------------------------------------------------
    // Variante 3: Application Default Credentials (GCP / Cloud Run)
    // --------------------------------------------------------
    try {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: defaultProjectId
        });
        initialized = true;
        console.log('🔥 Firebase Admin SDK: Application Default Credentials aktiviert.');
        return;
    } catch (adcErr) {
        // Fallback: Initialisiere mit Projekt-ID, falls noch keine App existiert
        if (!admin.apps || admin.apps.length === 0) {
            admin.initializeApp({
                projectId: defaultProjectId
            });
            initialized = true;
            console.log('ℹ️ Firebase Admin SDK mit Default-Projekt initialisiert:', defaultProjectId);
        }
    }
}

// Ensure initialization happens immediately
try {
    initializeFirebaseAdmin();
} catch (initErr) {
    console.warn("Firebase Init Notice:", initErr.message);
    if (!admin.apps || admin.apps.length === 0) {
        admin.initializeApp({ projectId: 'schachlive' });
    }
}

let firestoreClient;
try {
    firestoreClient = admin.firestore();
    firestoreClient.settings({
        ignoreUndefinedProperties: true
    });
} catch (fsErr) {
    console.error("❌ Firestore Client Setup Error:", fsErr.message);
}

module.exports = {
    firestoreClient,
    admin
};
