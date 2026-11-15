// script2.js - Account & Leaderboard Management

// Global cycle-safe JSON.stringify protection
(function() {
    if (typeof JSON !== 'undefined' && !JSON.__safe_patched) {
        const originalStringify = JSON.stringify;
        JSON.stringify = function(value, replacer, space) {
            try {
                return originalStringify(value, replacer, space);
            } catch (err) {
                if (err instanceof TypeError && (String(err.message).includes('circular') || String(err.message).includes('Converting circular structure to JSON'))) {
                    const seen = new WeakSet();
                    return originalStringify(value, function(k, v) {
                        if (typeof v === 'object' && v !== null) {
                            if (typeof Node !== 'undefined' && v instanceof Node) return undefined;
                            if (typeof Window !== 'undefined' && v instanceof Window) return undefined;
                            if (seen.has(v)) return undefined;
                            seen.add(v);
                        }
                        if (typeof replacer === 'function') {
                            return replacer.call(this, k, v);
                        }
                        return v;
                    }, space);
                }
                throw err;
            }
        };
        JSON.__safe_patched = true;
    }
})();

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
window.escapeHtml = window.escapeHtml || escapeHtml;

// 1. Demo-Modus (Das automatische Schachspiel im Hintergrund)
const demoMoves = [
    { from: 'e2', to: 'e4' }, { from: 'e7', to: 'e5' },
    { from: 'g1', to: 'f3' }, { from: 'b8', to: 'c6' },
    { from: 'f1', to: 'b5' }, { from: 'a7', to: 'a6' },
    { from: 'b5', to: 'a4' }, { from: 'g8', to: 'f6' }
];
let demoInterval;
let moveIndex = 0;

function startDemo() {
    if (!window.makeMove) {
        setTimeout(startDemo, 500);
        return;
    }
    demoInterval = setInterval(() => {
        if (moveIndex < demoMoves.length) {
            const move = demoMoves[moveIndex];
            window.makeMove(move.from, move.to);
            moveIndex++;
        } else {
            moveIndex = 0;
            if (window.resetGame) window.resetGame();
        }
    }, 1800);
}

// 2. AGB & Start-Logik
window.addEventListener('load', () => {
    if (!localStorage.getItem('agbAkzeptiert')) {
        const popup = document.getElementById('agb-popup');
        if (popup) popup.style.display = 'flex';
        setTimeout(startDemo, 1000);
    }
});

window.acceptAGB = function() {
    if (demoInterval) clearInterval(demoInterval);
    localStorage.setItem('agbAkzeptiert', 'true');
    const popup = document.getElementById('agb-popup');
    if (popup) popup.style.display = 'none';
    if (window.resetGame) window.resetGame();
};

// 3. Auth Modal Logic
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, updateProfile, signOut, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot, collection } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-analytics.js";

let firebaseConfig = null;
let fbApp = null;
let fbAuth = null;
let fbDb = null;
let fbAnalytics = null;

const defaultFirebaseConfig = {
    apiKey: "AIzaSyA3KVyicVW1wqLjhNmJf3g9hJUAaovhDv0",
    authDomain: "schachlive.firebaseapp.com",
    projectId: "schachlive",
    storageBucket: "schachlive.firebasestorage.app",
    messagingSenderId: "729285821168",
    appId: "1:729285821168:web:6d3fc2d942c8b8d101b835",
    measurementId: "G-184X8Q73WV"
};

async function initFirebase() {
    try {
        let firebaseConfig = defaultFirebaseConfig;
        try {
            const res = await fetch('/firebase-applet-config.json');
            if (res.ok) {
                const loaded = await res.json();
                if (loaded && loaded.apiKey) firebaseConfig = { ...defaultFirebaseConfig, ...loaded };
            }
        } catch(e) {
            console.warn("Could not load /firebase-applet-config.json, using default config", e);
        }
        
        fbApp = initializeApp(firebaseConfig);
        fbAuth = getAuth(fbApp);
        
        const dbId = firebaseConfig.databaseId || firebaseConfig.firestoreDatabaseId;
        if (dbId && dbId !== '(default)') {
            fbDb = getFirestore(fbApp, dbId);
        } else {
            fbDb = getFirestore(fbApp);
        }

        try {
            if (await isSupported()) {
                fbAnalytics = getAnalytics(fbApp);
                window.fbAnalytics = fbAnalytics;
            }
        } catch(e) {}

        window.fbApp = fbApp;
        window.fbAuth = fbAuth;
        window.fbDb = fbDb;


        // --- LEADERBOARD SYNC ---
        function sanitizeLeaderboardUser(data, docId) {
            if (!data && !docId) return null;
            const u = data || {};
            let rawName = (u.username || u.name || u.displayName || docId || '').trim();
            if (!rawName) return null;

            // Clean email addresses
            if (rawName.includes('@')) {
                const lowEmail = rawName.toLowerCase();
                if (lowEmail === 'max.schule13@gmail.com') {
                    rawName = 'Max';
                } else if (lowEmail.includes('slmail.me') || lowEmail.includes('support') || lowEmail.includes('noreply') || lowEmail.includes('admin@')) {
                    return null;
                } else {
                    if (u.username && !u.username.includes('@') && u.username.length >= 2) {
                        rawName = u.username.trim();
                    } else {
                        rawName = rawName.split('@')[0].trim();
                    }
                }
            }

            const low = rawName.toLowerCase();
            if (low === 'global' || low === 'null' || low === 'undefined' || low === 'anonymous' || low === 'anonym' || low === '[object object]' || low === 'connection_health' || low === 'system_ban_security') return null;
            if (/^[0-9a-zA-Z_-]{24,36}$/.test(rawName) && !/[aeiou]/i.test(rawName)) return null;
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawName)) return null;

            let cleanName = rawName;
            if (low === 'maxadmin' || low === 'max.schule13@gmail.com') cleanName = 'Max';
            cleanName = cleanName.replace(/[<>"'&]/g, '').trim();
            if (!cleanName || cleanName.length < 2) return null;

            return {
                name: cleanName,
                elo: Number(u.elo) || 1200,
                wins: Math.max(0, Number(u.wins) || 0),
                level: Math.max(1, Number(u.level) || 1),
                xp: Math.max(0, Number(u.xp) || 0)
            };
        }

        function renderLeaderboardSnapshot(snap) {
            const userMap = new Map();
            if (snap && !snap.empty) {
                snap.forEach(uDoc => {
                    const clean = sanitizeLeaderboardUser(uDoc.data(), uDoc.id);
                    if (!clean) return;

                    const key = clean.name.toLowerCase();
                    const existing = userMap.get(key);
                    if (!existing || clean.elo > existing.elo || (clean.elo === existing.elo && clean.wins > existing.wins)) {
                        userMap.set(key, clean);
                    }
                });
            }

            const firestoreUsers = Array.from(userMap.values());
            firestoreUsers.sort((a, b) => (b.elo !== a.elo ? b.elo - a.elo : b.wins - a.wins));
            const topUsers = firestoreUsers.slice(0, 100);
            window.currentLeaderboardUsers = topUsers;

            if (typeof window.renderModalLeaderboard === 'function') {
                window.renderModalLeaderboard(topUsers);
            }

            const listEl = document.getElementById('leaderboard-list');
            if (listEl) {
                if (topUsers.length === 0) {
                    listEl.innerHTML = '<div style="color: #888; text-align: center; padding: 25px 15px; font-style: italic;">Noch keine Ranglisten-Einträge vorhanden.</div>';
                } else {
                    listEl.innerHTML = topUsers.map((p, i) => {
                        let badge = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
                        let color = i === 0 ? '#f1c40f' : i === 1 ? '#bdc3c7' : i === 2 ? '#cd7f32' : 'rgba(255,255,255,0.7)';
                        let bg = i === 0 ? 'linear-gradient(135deg, rgba(241,196,15,0.2) 0%, rgba(0,0,0,0) 100%)' : 'rgba(255,255,255,0.03)';
                        const safeName = escapeHtml(p.name);
                        const encName = encodeURIComponent(p.name || '');
                        return `
                        <div data-view-profile="${encName}" class="leaderboard-player-row" style="cursor: pointer; background: ${bg}; padding: 12px; border-radius: 10px; margin-bottom: 8px; border: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: space-between; transition: 0.2s;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div style="width: 24px; text-align: center; font-weight: bold; color: ${color}; font-size: 1.1em;">
                                    ${badge || `#${i + 1}`}
                                </div>
                                <div style="display: flex; flex-direction: column;">
                                    <strong style="color: white; font-size: 1.05em; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">${safeName}</strong>
                                    <span style="color: #95a5a6; font-size: 0.8em;">Lvl ${Number(p.level) || 1} • Elo: ${Number(p.elo) || 1200}</span>
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="color: #f1c40f; font-weight: bold; font-size: 1.1em;">${Number(p.wins) || 0} 🏆</div>
                                <div style="color: #ccc; font-size: 0.7em;">Siege</div>
                            </div>
                        </div>
                    `;
                    }).join('');
                }
            }
        }

        // Live Realtime Firestore Listener ONLY for sanitized public leaderboard projection
        onSnapshot(collection(fbDb, 'leaderboard'), (lbSnap) => {
            if (lbSnap && !lbSnap.empty) {
                renderLeaderboardSnapshot(lbSnap);
            }
        }, (err) => {
            console.info("Firestore leaderboard listener notice:", err.message);
        });

        // --- FIRESTORE VERBINDUNGS-MONITORING (TOAST-BANNER BEI UNTERBRECHUNG) ---
        let wasFirestoreOffline = false;
        let firestoreConnInitialized = false;

        function showFirestoreStatusToast(isReconnected) {
            if (typeof window.showInAppNotification === 'function') {
                if (!isReconnected) {
                    window.showInAppNotification(
                        "⚠️ Verbindung getrennt",
                        "Verbindung zu Google Firestore kurzzeitig unterbrochen. Daten werden lokal synchronisiert...",
                        "warning"
                    );
                } else {
                    window.showInAppNotification(
                        "✅ Verbindung hergestellt",
                        "Verbindung zu Google Firestore erfolgreich wiederhergestellt!",
                        "info"
                    );
                }
            }
        }

        window.addEventListener('offline', () => {
            if (!wasFirestoreOffline) {
                wasFirestoreOffline = true;
                showFirestoreStatusToast(false);
            }
        });

        window.addEventListener('online', () => {
            if (wasFirestoreOffline) {
                wasFirestoreOffline = false;
                showFirestoreStatusToast(true);
            }
        });

            let userUnsubscribe = null;
            let adminUnsubscribe = null;
            let connHealthUnsubscribe = null;

            function sanitizeStarterUsername(raw, uid) {
                const reserved = new Set(['admin','administrator','superadmin','moderator','mod','helper','staff','team','system','root','server','support','official','owner','eigentümer','max','superuser','ghostplayer','bot','gast','gastspieler','anonym','anonymous','null','undefined','schachlive','prochess']);
                let cleaned = String(raw || '').replace(/[^a-zA-Z0-9_.\- ]/g, '').trim().slice(0, 30);
                if (cleaned.length < 2 || reserved.has(cleaned.toLowerCase())) {
                    cleaned = "Spieler_" + String(uid || '00000').substring(0, 5);
                }
                return cleaned;
            }

            onAuthStateChanged(fbAuth, async (user) => {
                if (userUnsubscribe) userUnsubscribe();
                if (adminUnsubscribe) adminUnsubscribe();
                if (connHealthUnsubscribe) { connHealthUnsubscribe(); connHealthUnsubscribe = null; }
                
                if (user) {
                    const savedCustom = localStorage.getItem('customUsername');
                    const savedPlayer = localStorage.getItem('playerName');
                    const emailPrefix = (user.email && user.email.includes('@')) ? user.email.split('@')[0] : '';
                    let pName = user.displayName || savedCustom || (savedPlayer && savedPlayer !== user.uid ? savedPlayer : (emailPrefix || "Spieler_" + user.uid.substring(0, 5)));
                    const userDoc = doc(fbDb, 'players', user.uid);
                    
                    // Retrieve genuine Firebase ID Token for secure server verification
                    let idToken = '';
                    try {
                        idToken = await user.getIdToken();
                    } catch (tErr) {
                        console.warn("Could not get ID token:", tErr);
                    }

                    // Authenticated Firestore connection-health listener
                    try {
                        const connHealthRef = doc(fbDb, 'system', 'connection_health');
                        connHealthUnsubscribe = onSnapshot(connHealthRef, { includeMetadataChanges: true }, (snapshot) => {
                            const isFromCache = snapshot.metadata ? snapshot.metadata.fromCache : false;
                            if (!firestoreConnInitialized) {
                                firestoreConnInitialized = true;
                                if (isFromCache) {
                                    wasFirestoreOffline = true;
                                    showFirestoreStatusToast(false);
                                }
                                return;
                            }
                            if (isFromCache && !wasFirestoreOffline) {
                                wasFirestoreOffline = true;
                                showFirestoreStatusToast(false);
                            } else if (!isFromCache && wasFirestoreOffline) {
                                wasFirestoreOffline = false;
                                showFirestoreStatusToast(true);
                            }
                        }, (err) => {
                            if (err.code === 'permission-denied') return;
                            if (!wasFirestoreOffline) {
                                wasFirestoreOffline = true;
                                showFirestoreStatusToast(false);
                            }
                        });
                    } catch (connErr) {}

                    // Listen for real-time changes (e.g. role updates, elo changes)
                    userUnsubscribe = onSnapshot(userDoc, (snapshot) => {
                        if (snapshot.exists()) {
                            const data = snapshot.data();
                            const dbName = data.username || data.name || pName;
                            
                            if (data.is_banned || data.ip_ban) {
                                const bReason = data.ban_reason || data.reason || "Verstoß gegen die Community-Richtlinien";
                                window.location.href = '/banned?reason=' + encodeURIComponent(bReason);
                                return;
                            }

                            // Speichere den Namen für Websocket und andere Features
                            localStorage.setItem('playerName', dbName);
                            localStorage.setItem('customUsername', dbName);
                            const ws = window.socket || (typeof socket !== 'undefined' ? socket : null);
                            if (ws && ws.readyState === WebSocket.OPEN && ws.playerName !== dbName) {
                                ws.send(JSON.stringify({
                                    type: 'login_attempt',
                                    playerName: dbName,
                                    uid: user.uid,
                                    firebaseToken: idToken,
                                    isRegister: false
                                }));
                                ws.playerName = dbName;
                            }
                            
                            updateProfileDisplay(dbName, data.elo || 1200, data.wins || 0, data.losses || 0, data.level || 1, data.xp || 0, data.achievements || []);
                            
                            // Admin role is strictly server-authoritative
                            const isAdmin = (data.role === 'admin');
                            const adminPanel = document.getElementById('admin-panel');
                            if (adminPanel) {
                                adminPanel.style.display = isAdmin ? 'block' : 'none';
                            }
                            
                            if (isAdmin) {
                                // Call server WebSocket admin refresh
                                setTimeout(() => {
                                    if (typeof window.requestAdminUsersRefresh === 'function') {
                                        window.requestAdminUsersRefresh();
                                    }
                                }, 300);

                                // Load Firestore users as fallback / secondary
                                adminUnsubscribe = onSnapshot(collection(fbDb, 'players'), (usersSnap) => {
                                    if (!usersSnap.empty) {
                                        const listEl = document.getElementById('admin-user-list');
                                        if (!listEl) return;
                                        const firestoreUsers = [];
                                        usersSnap.forEach(uDoc => {
                                            const u = uDoc.data();
                                            firestoreUsers.push({
                                                id: uDoc.id,
                                                username: u.username || uDoc.id,
                                                role: u.role || 'user',
                                                elo: u.elo || 1200,
                                                wins: u.wins || 0,
                                                losses: u.losses || 0,
                                                is_banned: u.is_banned || false,
                                                is_online: true
                                            });
                                        });
                                        if (window.handleAdminUsersUpdate) {
                                            window.handleAdminUsersUpdate(firestoreUsers);
                                        }
                                    }
                                }, (err) => {
                                    console.log("Firestore admin listener notice:", err);
                                    if (typeof window.requestAdminUsersRefresh === 'function') {
                                        window.requestAdminUsersRefresh();
                                    }
                                });
                            }
                        } else {
                            // Erstelle initiales Profil: Neue Konten haben IMMER die Rolle 'user'
                            const safeStarterName = sanitizeStarterUsername(pName, user.uid);
                            setDoc(userDoc, {
                                username: safeStarterName,
                                uid: user.uid,
                                role: 'user',
                                elo: 1200,
                                wins: 0,
                                losses: 0,
                                level: 1,
                                xp: 0
                            }).catch(() => {});
                        }
                    }, (err) => {
                        console.info("Firestore player profile listener notice:", err.message);
                    });
                    
                    localStorage.setItem('playerName', pName);
                    localStorage.setItem('firebaseUid', user.uid);

                    // Reflect username in URL
                    try {
                        if (window.history && window.history.replaceState) {
                            window.history.replaceState(null, '', '?user=' + encodeURIComponent(pName));
                        }
                    } catch (e) {}
                    
                    const openAuthBtn = document.getElementById('openAuthBtn');
                    const logoutBtn = document.getElementById('logoutBtn');
                    if (openAuthBtn) openAuthBtn.style.display = 'none';
                    if (logoutBtn) logoutBtn.style.display = 'block';
                    
                    const ws = window.socket || (typeof socket !== 'undefined' ? socket : null);
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({
                            type: 'login_attempt',
                            playerName: pName,
                            uid: user.uid,
                            email: user.email || '',
                            firebaseToken: idToken,
                            isRegister: false
                        }));
                    }
                } else {
                    const savedGuest = localStorage.getItem('guestName') || localStorage.getItem('playerName');
                    if (savedGuest && savedGuest !== 'Gastspieler') {
                        localStorage.setItem('playerName', savedGuest);
                        updateProfileDisplay(savedGuest, 1200, 0, 0, 1, 0, []);
                        const openAuthBtn = document.getElementById('openAuthBtn');
                        const logoutBtn = document.getElementById('logoutBtn');
                        if (openAuthBtn) openAuthBtn.style.display = 'none';
                        if (logoutBtn) logoutBtn.style.display = 'block';
                    } else {
                        updateProfileDisplay("Gastspieler", 1200, 0, 0, 1, 0, []);
                        localStorage.removeItem('playerName');
                        localStorage.removeItem('firebaseUid');
                        
                        const openAuthBtn = document.getElementById('openAuthBtn');
                        const logoutBtn = document.getElementById('logoutBtn');
                        if (openAuthBtn) openAuthBtn.style.display = 'block';
                        if (logoutBtn) logoutBtn.style.display = 'none';
                    }
                    
                    const adminPanel = document.getElementById('admin-panel');
                    if (adminPanel) adminPanel.style.display = 'none';
                    window.__serverVerifiedAdmin = false;
                }
            });
            
            window.setRole = async function(uid, role) {
                // Rollen können nur durch einen verifizierten Admin über den Server geändert werden
                const ws = window.socket || (typeof socket !== 'undefined' ? socket : null);
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'set_user_role', target: uid, role: role }));
                } else if (typeof window.setUserRole === 'function') {
                    window.setUserRole(uid, role);
                }
            };

            window.banUserAdmin = function(username) {
                if (window.openBanReasonModal) {
                    window.openBanReasonModal(username);
                } else if (typeof window.showInAppPrompt === 'function') {
                    window.showInAppPrompt(
                        '🔨 Spieler bannen',
                        `Bitte gib einen Grund für den permanenten Bann von '${username}' ein:`,
                        'Admin-Entscheidung',
                        (reason) => {
                            if (reason === null) return;
                            const ws = window.socket || (typeof socket !== 'undefined' ? socket : null);
                            if (ws && ws.readyState === WebSocket.OPEN) {
                                ws.send(JSON.stringify({ type: 'admin_ban_user', target: username, reason: reason || 'Admin-Entscheidung' }));
                                ws.send(JSON.stringify({ type: 'chat', text: `/ban "${username}" ${reason || 'Admin-Entscheidung'}` }));
                            } else {
                                window.showInAppNotification?.('Verbindungsfehler', 'Du bist nicht mit dem Server verbunden!', 'error');
                            }
                        }
                    );
                } else {
                    window.showInAppNotification?.('Fehler', 'Bann-Dialog konnte nicht geöffnet werden.', 'warning');
                }
            };
            
            window.logout = async function() {
                localStorage.removeItem('guestName');
                localStorage.removeItem('playerName');
                localStorage.removeItem('customUsername');
                localStorage.removeItem('firebaseUid');
                try {
                    if (window.history && window.history.replaceState) {
                        window.history.replaceState(null, '', window.location.pathname);
                    }
                } catch(e) {}
                if (fbAuth && fbAuth.currentUser) {
                    try {
                        await signOut(fbAuth);
                    } catch(e) {
                        console.error("Fehler beim Abmelden", e);
                    }
                }
                window.showInAppNotification?.('Abgemeldet', 'Du wurdest erfolgreich abgemeldet.', 'info');
                setTimeout(() => window.location.reload(), 450);
            };
            
            const lBtn = document.getElementById('logoutBtn');
            if (lBtn) lBtn.addEventListener('click', window.logout);
    } catch (e) {
        console.warn("Firebase Init Fehler (Frontend):", e);
    }
}
initFirebase();

window.submitAuthEmailLogin = async function() {
    const emailEl = document.getElementById('auth-email-input');
    const passEl = document.getElementById('auth-password-input');
    const status = document.getElementById('auth-status');
    
    if (!emailEl || !passEl) return;
    const email = emailEl.value.trim();
    const password = passEl.value;

    if (!email || !password) {
        if (status) status.innerHTML = "<span style='color: #e74c3c;'>⚠️ Bitte E-Mail und Passwort eingeben.</span>";
        return;
    }

    if (!fbAuth) {
        if (status) status.innerHTML = "<span style='color: #e74c3c;'>❌ Firebase Auth nicht verfügbar!</span>";
        return;
    }

    if (status) status.innerHTML = "<span style='color: #3498db;'>⏳ Logge ein...</span>";

    try {
        const userCred = await signInWithEmailAndPassword(fbAuth, email, password);
        if (status) status.innerHTML = "<span style='color: #2ecc71;'>✅ Erfolgreich eingeloggt!</span>";
        
        const user = userCred.user;
        const emailPrefix = user.email ? user.email.split('@')[0] : '';
        const userDoc = doc(fbDb, 'players', user.uid);
        const docSnap = await getDoc(userDoc);
        
        let pName = user.displayName || (docSnap.exists() && (docSnap.data().username || docSnap.data().name)) || emailPrefix || "Spieler_" + user.uid.substring(0, 5);

        if (!docSnap.exists()) {
            const safeStarterName = String(pName || '').replace(/[^a-zA-Z0-9_.\- ]/g, '').trim().slice(0, 30) || ("Spieler_" + user.uid.substring(0, 5));
            await setDoc(userDoc, {
                username: safeStarterName,
                uid: user.uid,
                role: 'user',
                elo: 1200,
                wins: 0,
                losses: 0,
                level: 1,
                xp: 0
            }).catch(() => {});
        }

        localStorage.setItem('playerName', pName);
        localStorage.setItem('customUsername', pName);
        localStorage.setItem('firebaseUid', user.uid);

        let idToken = '';
        try {
            idToken = await user.getIdToken();
        } catch (tErr) {}

        const ws = window.socket || (typeof socket !== 'undefined' ? socket : null);
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'login_attempt',
                playerName: pName,
                uid: user.uid,
                email: user.email || '',
                firebaseToken: idToken,
                isRegister: false
            }));
            ws.playerName = pName;
        }

        setTimeout(() => {
            const modal = document.getElementById('auth-modal');
            if (modal) modal.style.display = 'none';
        }, 1000);
    } catch (error) {
        console.error("Email login error:", error);
        if (status) {
            let msg = error.message;
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                msg = "E-Mail oder Passwort ungültig.";
            } else if (error.code === 'auth/invalid-email') {
                msg = "Ungültiges E-Mail Format.";
            }
            status.innerHTML = "<span style='color: #e74c3c;'>❌ " + (typeof escapeHtml === 'function' ? escapeHtml(msg) : String(msg).replace(/[<>&"']/g, '')) + "</span>";
        }
    }
};

window.submitAuthEmailRegister = async function() {
    const emailEl = document.getElementById('auth-email-input');
    const passEl = document.getElementById('auth-password-input');
    const status = document.getElementById('auth-status');

    if (!emailEl || !passEl) return;
    const email = emailEl.value.trim();
    const password = passEl.value;

    if (!email || !password) {
        if (status) status.innerHTML = "<span style='color: #e74c3c;'>⚠️ Bitte E-Mail und Passwort eingeben.</span>";
        return;
    }

    if (password.length < 6) {
        if (status) status.innerHTML = "<span style='color: #e74c3c;'>⚠️ Das Passwort muss mindestens 6 Zeichen lang sein.</span>";
        return;
    }

    if (!fbAuth) {
        if (status) status.innerHTML = "<span style='color: #e74c3c;'>❌ Firebase Auth nicht verfügbar!</span>";
        return;
    }

    if (status) status.innerHTML = "<span style='color: #3498db;'>⏳ Erstelle Konto...</span>";

    try {
        const userCred = await createUserWithEmailAndPassword(fbAuth, email, password);
        if (status) status.innerHTML = "<span style='color: #2ecc71;'>✅ Konto erfolgreich erstellt!</span>";

        const user = userCred.user;
        const pName = user.displayName || (user.email ? user.email.split('@')[0] : "Spieler_" + user.uid.substring(0, 5));

        const userDoc = doc(fbDb, 'players', user.uid);
        const safeStarterName = String(pName || '').replace(/[^a-zA-Z0-9_.\- ]/g, '').trim().slice(0, 30) || ("Spieler_" + user.uid.substring(0, 5));
        await setDoc(userDoc, {
            username: safeStarterName,
            uid: user.uid,
            role: 'user',
            elo: 1200,
            wins: 0,
            losses: 0,
            level: 1,
            xp: 0
        }).catch(() => {});

        localStorage.setItem('playerName', pName);
        localStorage.setItem('customUsername', pName);
        localStorage.setItem('firebaseUid', user.uid);

        let idToken = '';
        try {
            idToken = await user.getIdToken();
        } catch (tErr) {}

        const ws = window.socket || (typeof socket !== 'undefined' ? socket : null);
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'login_attempt',
                playerName: pName,
                uid: user.uid,
                email: user.email || '',
                firebaseToken: idToken,
                isRegister: true
            }));
            ws.playerName = pName;
        }

        setTimeout(() => {
            const modal = document.getElementById('auth-modal');
            if (modal) modal.style.display = 'none';
        }, 1000);
    } catch (error) {
        console.error("Email registration error:", error);
        if (status) {
            let msg = error.message;
            if (error.code === 'auth/email-already-in-use') {
                msg = "Diese E-Mail-Adresse wird bereits verwendet.";
            } else if (error.code === 'auth/invalid-email') {
                msg = "Ungültige E-Mail-Adresse.";
            } else if (error.code === 'auth/weak-password') {
                msg = "Das Passwort ist zu schwach (min. 6 Zeichen).";
            }
            status.innerHTML = "<span style='color: #e74c3c;'>❌ " + (typeof escapeHtml === 'function' ? escapeHtml(msg) : String(msg).replace(/[<>&"']/g, '')) + "</span>";
        }
    }
};

window.submitAuthGoogle = async function() {
    const status = document.getElementById('auth-status');
    if (!fbAuth) {
        if(status) status.innerHTML = "<span style='color: #e74c3c;'>❌ Firebase Auth nicht verfügbar!</span>";
        return;
    }
    
    if(status) status.innerHTML = "<span style='color: #3498db;'>⏳ Verbinde mit Google...</span>";

    try {
        const provider = new GoogleAuthProvider();
        const userCred = await signInWithPopup(fbAuth, provider);
        if(status) status.innerHTML = "<span style='color: #2ecc71;'>✅ Erfolgreich eingeloggt!</span>";
        
        const user = userCred.user;
        const emailPrefix = user.email ? user.email.split('@')[0] : '';
        const userDoc = doc(fbDb, 'players', user.uid);
        const docSnap = await getDoc(userDoc);
        
        let pName = user.displayName || (docSnap.exists() && (docSnap.data().username || docSnap.data().name)) || emailPrefix || "Spieler_" + user.uid.substring(0, 5);

        if (!docSnap.exists()) {
            const safeStarterName = String(pName || '').replace(/[^a-zA-Z0-9_.\- ]/g, '').trim().slice(0, 30) || ("Spieler_" + user.uid.substring(0, 5));
            await setDoc(userDoc, {
                username: safeStarterName,
                uid: user.uid,
                role: 'user',
                elo: 1200,
                wins: 0,
                losses: 0,
                level: 1,
                xp: 0
            }).catch(() => {});
        }
        
        localStorage.setItem('playerName', pName);
        localStorage.setItem('customUsername', pName);
        localStorage.setItem('firebaseUid', user.uid);
        
        let idToken = '';
        try {
            idToken = await user.getIdToken();
        } catch (tErr) {}

        const ws = window.socket || (typeof socket !== 'undefined' ? socket : null);
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'login_attempt',
                playerName: pName,
                uid: user.uid,
                email: user.email || '',
                firebaseToken: idToken,
                isRegister: !docSnap.exists()
            }));
            ws.playerName = pName;
        }
        
        setTimeout(() => { 
            const modal = document.getElementById('auth-modal');
            if (modal) modal.style.display = 'none'; 
        }, 1000);
    } catch (error) {
        console.error("Auth error:", error);
        if (status) {
            if (error.code === 'auth/unauthorized-domain' || (error.message && error.message.includes('auth/unauthorized-domain'))) {
                const currentHost = typeof escapeHtml === 'function' ? escapeHtml(window.location.hostname) : String(window.location.hostname).replace(/[<>&"']/g, '');
                status.innerHTML = `
                    <div style="background: rgba(231, 76, 60, 0.15); border: 1px solid #e74c3c; padding: 12px; border-radius: 8px; margin-top: 10px; color: #ff6b6b; font-size: 0.85em; text-align: left; line-height: 1.4;">
                        <strong>⚠️ Domain nicht autorisiert in Firebase!</strong><br>
                        Die Adresse <code>${currentHost}</code> muss in der Firebase Console zugelassen werden.<br><br>
                        <strong>Lösung in der Console:</strong><br>
                        1. Öffne <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" style="color: #3498db; text-decoration: underline;">Firebase Console</a> &gt; Authentication &gt; Settings &gt; Authorized Domains.<br>
                        2. Füge <code>${currentHost}</code> als Domain hinzu.<br><br>
                        <strong>Alternative:</strong> Spiele direkt ohne Google-Anmeldung als Gast:
                        <button data-action="playAsGuest" style="margin-top: 8px; width: 100%; background: #2ecc71; color: white; border: none; padding: 8px; border-radius: 6px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
                            👤 Jetzt als Gast weiterspielen
                        </button>
                    </div>
                `;
            } else {
                const safeErr = typeof escapeHtml === 'function' ? escapeHtml(error.message || error) : String(error.message || error).replace(/[<>&"']/g, '');
                status.innerHTML = "<span style='color: #e74c3c;'>❌ " + safeErr + "</span>";
            }
        }
    }
};

window.openNameModal = function() {
    if (!fbAuth || !fbAuth.currentUser) {
        window.showInAppNotification?.('Anmeldung erforderlich', 'Bitte logge dich zuerst ein.', 'warning');
        return;
    }
    const modal = document.getElementById('name-modal');
    if (modal) modal.style.display = 'flex';
    document.getElementById('name-status').innerHTML = '';
};

window.submitNameChange = async function() {
    const newName = document.getElementById('new-username').value.trim();
    const status = document.getElementById('name-status');
    
    if (!newName) {
        status.innerHTML = "<span style='color: #e74c3c;'>❌ Bitte gib einen Namen ein!</span>";
        return;
    }
    
    // Normalize the username
    const normalized = newName.replace(/[^a-zA-Z0-9_.-]/g, '');
    if (normalized.length < 3) {
        status.innerHTML = "<span style='color: #e74c3c;'>❌ Name muss mind. 3 Zeichen lang sein!</span>";
        return;
    }

    if (!fbAuth || !fbAuth.currentUser) {
        status.innerHTML = "<span style='color: #e74c3c;'>❌ Nicht eingeloggt!</span>";
        return;
    }
    
    status.innerHTML = "<span style='color: #3498db;'>⏳ Speichere dauerhaft...</span>";

    try {
        const user = fbAuth.currentUser;
        const ws = window.socket || (typeof socket !== 'undefined' ? socket : null);
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            status.innerHTML = "<span style='color: #e74c3c;'>❌ Keine aktive Server-Verbindung. Bitte kurz warten.</span>";
            return;
        }

        // 1. Firebase Auth Profile Update
        try {
            await updateProfile(user, { displayName: normalized });
        } catch(authErr) {
            console.warn("updateProfile displayName warning:", authErr);
        }

        // 2. Local Storage Update
        localStorage.setItem('playerName', normalized);
        localStorage.setItem('customUsername', normalized);

        // 3. WebSocket Server Update (Validierung, Eindeutigkeit & Firestore-Persistierung über Server)
        ws.send(JSON.stringify({
            type: 'change_username',
            newUsername: normalized,
            uid: user.uid,
            oldUsername: ws.playerName
        }));
        ws.playerName = normalized;

        // 5. Update Profile UI
        const profileName = document.getElementById('profile-name');
        if (profileName) profileName.innerText = normalized;
        const navUserName = document.getElementById('navUserName');
        if (navUserName) navUserName.innerText = normalized;
        
        status.innerHTML = "<span style='color: #2ecc71;'>✅ Name erfolgreich dauerhaft gespeichert!</span>";
        
        setTimeout(() => { 
            const modal = document.getElementById('name-modal');
            if (modal) modal.style.display = 'none'; 
        }, 1000);
    } catch (error) {
        console.error("Name change error:", error);
        const safeErr = typeof escapeHtml === 'function' ? escapeHtml(error.message || error) : String(error.message || error).replace(/[<>&"']/g, '');
        status.innerHTML = "<span style='color: #e74c3c;'>❌ " + safeErr + "</span>";
    }
};

window.openAuthModal = function() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.style.display = 'flex';
};

window.switchSidebarTab = function(tabId, btn) {
    document.querySelectorAll('.sidebar-tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.sidebar-tab-btn').forEach(b => b.classList.remove('active'));
    
    const target = document.getElementById(tabId);
    if (target) {
        target.classList.add('active');
    }
    if (btn) btn.classList.add('active');

    if (tabId === 'tab-chat' && typeof window.loadChatHistory === 'function') {
        window.loadChatHistory();
    }
};

function updateProfileDisplay(name, elo, wins, losses = 0, level = 1, xp = 0, achievements = []) {
    const profileName = document.getElementById('profile-name');
    const profileStats = document.getElementById('profile-stats');
    const navAuthBtn = document.getElementById('navAuthBtn');
    const navUserPill = document.getElementById('navUserPill');
    const navUserName = document.getElementById('navUserName');
    const authBtn = document.getElementById('openAuthBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const adminPanel = document.getElementById('admin-panel');

    const isAdmin = window.__serverVerifiedAdmin === true;

    // Define profile modal helpers on window (Fix F7.1)
    if (typeof window.openProfileModal !== 'function') {
        window.openProfileModal = function() {
            const modal = document.getElementById('profile-modal');
            if (modal) modal.style.display = 'flex';
        };
    }
    if (typeof window.closeProfileModal !== 'function') {
        window.closeProfileModal = function() {
            const modal = document.getElementById('profile-modal');
            if (modal) modal.style.display = 'none';
        };
    }

    // Sync Chess.com Collapsible Sidebar User Card
    const sbName = document.getElementById('sidebar-user-name');
    const sbRating = document.getElementById('sidebar-user-rating');
    const sbAvatar = document.getElementById('sidebar-avatar-icon');
    const sbAuthBtn = document.getElementById('sidebar-auth-btn');

    if (sbName) {
        sbName.innerText = isAdmin ? `👑 ${name || 'Admin'}` : (name || 'Gastspieler');
    }
    if (sbRating) {
        sbRating.innerText = `${elo || 1200} Elo`;
    }
    if (sbAvatar) {
        sbAvatar.innerText = isAdmin ? '👑' : (name && name !== 'Gastspieler' ? '👤' : '♟️');
    }
    if (sbAuthBtn) {
        if (name && name !== 'Gastspieler') {
            sbAuthBtn.innerHTML = '🚪 Abmelden';
            sbAuthBtn.className = 'glass-btn danger';
            sbAuthBtn.onclick = () => (typeof window.logout === 'function' ? window.logout() : null);
        } else {
            sbAuthBtn.innerHTML = '🔐 Anmelden';
            sbAuthBtn.className = 'glass-btn primary';
            sbAuthBtn.onclick = () => (typeof window.openAuthModal === 'function' ? window.openAuthModal() : null);
        }
    }

    if (profileName) {
        profileName.innerText = isAdmin ? `${name || 'Admin'} (Admin)` : name;
    }
    if (profileStats) profileStats.innerText = `Elo: ${elo || 1200} | S: ${wins || 0} N: ${losses || 0}`;

    if (isAdmin) {
        if (authBtn) authBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';
        if (navAuthBtn) navAuthBtn.style.display = 'none';
        if (navUserPill) navUserPill.style.display = 'flex';
        const safeNavAdmin = typeof escapeHtml === 'function' ? escapeHtml(name || 'Admin') : String(name || 'Admin').replace(/[<>&"']/g, '');
        if (navUserName) navUserName.innerHTML = `<span style="color: #f1c40f; font-weight: bold; text-shadow: 0 0 8px rgba(241,196,15,0.4);">👑 ${safeNavAdmin} (Admin)</span>`;
        if (adminPanel) adminPanel.style.display = 'block';
    } else if (name && name !== 'Gastspieler') {
        if (authBtn) authBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';
        if (navAuthBtn) navAuthBtn.style.display = 'none';
        if (navUserPill) navUserPill.style.display = 'flex';
        if (navUserName) navUserName.innerText = `${name} (${elo || 1200} Elo)`;
        if (adminPanel) adminPanel.style.display = 'none';
    } else {
        if (authBtn) authBtn.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (navAuthBtn) navAuthBtn.style.display = 'block';
        if (navUserPill) navUserPill.style.display = 'none';
        if (adminPanel) adminPanel.style.display = 'none';
    }

    // Achievements badges freischalten
    if (achievements && Array.isArray(achievements)) {
        // Reset all badges first
        const allBadges = document.querySelectorAll('.achievement-badge');
        allBadges.forEach(b => b.classList.add('locked'));
        
        achievements.forEach(achId => {
            const el = document.getElementById(`badge-${achId}`);
            if (el) {
                el.classList.remove('locked');
            }
        });
    }
}

function showAchievementNotification(title, description) {
    const oldNotif = document.getElementById('achievement-notification');
    if (oldNotif) oldNotif.remove();
    
    const notif = document.createElement('div');
    notif.id = 'achievement-notification';
    const safeTitle = typeof escapeHtml === 'function' ? escapeHtml(title) : String(title || '').replace(/[<>&"']/g, '');
    const safeDesc = typeof escapeHtml === 'function' ? escapeHtml(description) : String(description || '').replace(/[<>&"']/g, '');
    notif.innerHTML = `
        <div style="font-size: 2em; animation: pulse 1s infinite;">🏆</div>
        <div>
            <div style="font-weight: bold; color: #f1c40f; font-size: 1.05em; margin-bottom: 2px;">Erfolg freigeschaltet!</div>
            <div style="font-size: 0.95em; font-weight: 600; color: white;">${safeTitle}</div>
            <div style="font-size: 0.8em; color: #aaa; margin-top: 1px;">${safeDesc}</div>
        </div>
    `;
    
    document.body.appendChild(notif);
    
    // Play a lovely success audio sound!
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        // Beautiful arpeggio chime!
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, osc.frequency.setValueAtTime ? audioCtx.currentTime : 0); // fallback
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2); // G5
        osc.frequency.setValueAtTime(1046.50, audioCtx.currentTime + 0.3); // C6
        
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.8);
    } catch (e) {
        console.warn("Could not play achievement audio chime:", e);
    }
    
    setTimeout(() => {
        notif.style.animation = 'slideInRight 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) reverse forwards';
        setTimeout(() => notif.remove(), 500);
    }, 4500);
}

window.addEventListener('load', () => {
    const openAuthBtn = document.getElementById('openAuthBtn');
    if (openAuthBtn) {
        openAuthBtn.onclick = () => {
            document.getElementById('auth-modal').style.display = 'flex';
        };
    }

    const savedName = localStorage.getItem('playerName');
    if (savedName) {
        updateProfileDisplay(savedName, 1200, 0); // Will be updated by server
    }

    setTimeout(() => {
        const ws = window.socket || (typeof socket !== 'undefined' ? socket : null);
        if (ws) {
            ws.addEventListener('message', (e) => {
                try {
                    const data = JSON.parse(e.data);
                    if (data.type === 'leaderboard') {
                        const listEl = document.getElementById('leaderboard-list');
                        if (listEl && Array.isArray(data.list)) {
                            const userMap = new Map();
                            data.list.forEach(p => {
                                let rawName = (p.name || p.username || '').trim();
                                if (!rawName) return;
                                if (rawName.includes('@')) {
                                    const low = rawName.toLowerCase();
                                    if (low === 'max.schule13@gmail.com') rawName = 'Max';
                                    else if (low.includes('slmail.me') || low.includes('support') || low.includes('noreply') || low.includes('admin@')) return;
                                    else rawName = rawName.split('@')[0];
                                }
                                const low = rawName.toLowerCase();
                                if (low === 'global' || low === 'null' || low === 'undefined' || low === 'anonymous' || low === 'anonym' || low === '[object object]' || low === 'connection_health' || low === 'system_ban_security') return;
                                if (/^[0-9a-zA-Z_-]{24,36}$/.test(rawName) && !/[aeiou]/i.test(rawName)) return;
                                if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawName)) return;

                                let cleanName = rawName;
                                if (low === 'maxadmin' || low === 'max.schule13@gmail.com') cleanName = 'Max';
                                cleanName = cleanName.replace(/[<>"'&]/g, '').trim();
                                if (!cleanName || cleanName.length < 2) return;

                                const key = cleanName.toLowerCase();
                                const elo = Number(p.elo) || 1200;
                                const wins = Number(p.wins) || 0;
                                const level = Number(p.level) || 1;
                                const existing = userMap.get(key);
                                if (!existing || elo > existing.elo || (elo === existing.elo && wins > existing.wins)) {
                                    userMap.set(key, {
                                        name: cleanName,
                                        elo: elo,
                                        wins: wins,
                                        level: level
                                    });
                                }
                            });
                            const cleanList = Array.from(userMap.values())
                                .sort((a, b) => (b.elo !== a.elo ? b.elo - a.elo : b.wins - a.wins))
                                .slice(0, 100);

                            listEl.innerHTML = cleanList.map((p, i) => {
                                let badge = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
                                let color = i === 0 ? '#f1c40f' : i === 1 ? '#bdc3c7' : i === 2 ? '#cd7f32' : 'rgba(255,255,255,0.7)';
                                let bg = i === 0 ? 'linear-gradient(135deg, rgba(241,196,15,0.2) 0%, rgba(0,0,0,0) 100%)' : 'rgba(255,255,255,0.03)';
                                const safeName = escapeHtml(p.name);
                                const encName = encodeURIComponent(p.name || '');
                                return `
                                <div data-view-profile="${encName}" class="leaderboard-player-row" style="cursor: pointer; background: ${bg}; padding: 12px; border-radius: 10px; margin-bottom: 8px; border: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: space-between; transition: 0.2s;">
                                    <div style="display: flex; align-items: center; gap: 10px;">
                                        <div style="width: 24px; text-align: center; font-weight: bold; color: ${color}; font-size: 1.1em;">
                                            ${badge || `#${i + 1}`}
                                        </div>
                                        <div style="display: flex; flex-direction: column;">
                                            <strong style="color: white; font-size: 1.05em; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">${safeName}</strong>
                                            <span style="color: #95a5a6; font-size: 0.8em;">Lvl ${Number(p.level) || 1} • Elo: ${Number(p.elo) || 1200}</span>
                                        </div>
                                    </div>
                                    <div style="text-align: right;">
                                        <div style="color: #f1c40f; font-weight: bold; font-size: 1.1em;">${Number(p.wins) || 0} 🏆</div>
                                        <div style="color: #ccc; font-size: 0.7em;">Siege</div>
                                    </div>
                                </div>
                            `;
                            }).join('');
                        }
                    } else if (data.type === 'login_success') {
                        const status = document.getElementById('auth-status');
                        if (status) status.innerHTML = "<span style='color: #2ecc71;'>✅ Erfolgreich!</span>";
                        localStorage.setItem('playerName', data.name);
                        const tempHash = localStorage.getItem('tempPasswordHash');
                        if (tempHash) {
                            localStorage.setItem('playerPasswordHash', tempHash);
                            localStorage.removeItem('tempPasswordHash');
                        }
                        updateProfileDisplay(data.name, data.elo, data.wins, data.losses || 0, data.level || 1, data.xp || 0, data.achievements || []);
                        
                        // Show admin panel ONLY if verified by server
                        const isServerAdmin = data.role === 'admin' && (data.isAdmin === true || data.type === 'admin_login_success');
                        window.__serverVerifiedAdmin = isServerAdmin;
                        const adminPanel = document.getElementById('admin-panel');
                        if (adminPanel) {
                            adminPanel.style.display = isServerAdmin ? 'block' : 'none';
                        }

                        // Apply themes from database
                        if (data.board_theme) {
                            localStorage.setItem('board_theme', data.board_theme);
                            const bSelect = document.getElementById('boardThemeSelect');
                            if (bSelect) bSelect.value = data.board_theme;
                        }
                        if (data.piece_theme) {
                            localStorage.setItem('piece_theme', data.piece_theme);
                            const pSelect = document.getElementById('pieceThemeSelect');
                            if (pSelect) pSelect.value = data.piece_theme;
                        }
                        if (typeof window.applyThemes === 'function') {
                            window.applyThemes(data.board_theme, data.piece_theme);
                        }

                        setTimeout(() => { 
                            const modal = document.getElementById('auth-modal');
                            if(modal) modal.style.display = 'none'; 
                        }, 1000);
                    } else if (data.type === 'login_error') {
                        const status = document.getElementById('auth-status');
                        const safeErr = typeof escapeHtml === 'function' ? escapeHtml(data.text || "Fehler") : String(data.text || "Fehler").replace(/[<>&"']/g, '');
                        if (status) status.innerHTML = "<span style='color: #e74c3c;'>❌ " + safeErr + "</span>";
                        localStorage.removeItem('tempPasswordHash');
                        localStorage.removeItem('playerPasswordHash');
                    } else if (data.type === 'achievement_unlocked') {
                        const badgeEl = document.getElementById(`badge-${data.id}`);
                        if (badgeEl) badgeEl.classList.remove('locked');
                        showAchievementNotification(data.title, data.description);
                    }
                } catch(err) {}
            });
        }
    }, 500);
});

/* ==========================================================================
   GUEST AUTH FALLBACK
   ========================================================================== */
window.playAsGuest = function() {
    const finalizeGuest = (guestName) => {
        const cleaned = (guestName || '').trim().replace(/[^a-zA-Z0-9_.-]/g, '') || ('Gast_' + Math.floor(1000 + Math.random() * 9000));
        localStorage.setItem('guestName', cleaned);
        localStorage.setItem('playerName', cleaned);
        if (typeof updateProfileDisplay === 'function') {
            updateProfileDisplay(cleaned, 1200, 0, 0, 1, 0, []);
        }

        const ws = window.socket || (typeof socket !== 'undefined' ? socket : null);
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'login_attempt',
                playerName: cleaned,
                password: 'guest-mode'
            }));
        }

        const modal = document.getElementById('auth-modal');
        if (modal) modal.style.display = 'none';

        const openAuthBtn = document.getElementById('openAuthBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        if (openAuthBtn) openAuthBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';
    };

    const savedGuest = localStorage.getItem('guestName');
    if (savedGuest) {
        finalizeGuest(savedGuest);
        return;
    }

    const defaultGuestName = 'Gast_' + Math.floor(1000 + Math.random() * 9000);
    if (typeof window.showInAppPrompt === 'function') {
        window.showInAppPrompt(
            '👤 Als Gast spielen',
            'Wähle einen Gast-Namen für deine Sitzung:',
            defaultGuestName,
            (val) => {
                if (val === null) return;
                finalizeGuest(val || defaultGuestName);
            }
        );
    } else {
        finalizeGuest(defaultGuestName);
    }
};

/* ==========================================================================
   DARK / LIGHT MODE GLOBAL TOGGLE
   ========================================================================== */
window.initAppTheme = function() {
    const savedTheme = localStorage.getItem('app_theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
    } else {
        document.body.classList.remove('light-mode');
    }
    updateThemeBtnText();
};

window.toggleAppTheme = function() {
    const isLight = document.body.classList.toggle('light-mode');
    const newTheme = isLight ? 'light' : 'dark';
    localStorage.setItem('app_theme', newTheme);
    updateThemeBtnText();
};

function updateThemeBtnText() {
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
        const isLight = document.body.classList.contains('light-mode');
        btn.innerHTML = isLight ? '☀️ Light Mode' : '🌙 Dark Mode';
        btn.setAttribute('title', isLight ? 'Zu Dark Mode wechseln' : 'Zu Light Mode wechseln');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initAppTheme();
});

/* ==========================================================================
   WEB SPEECH API - VOICE CHESS MOVE CONTROL
   ========================================================================== */
window.isVoiceListening = false;
let speechRecognitionInstance = null;

window.toggleVoiceMoveControl = function() {
    const statusEl = document.getElementById('voice-move-status');
    const btn = document.getElementById('voiceMoveBtn');
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        if (statusEl) statusEl.innerHTML = "<span style='color: #e74c3c;'>⚠️ Spracherkennung in diesem Browser nicht unterstützt. Verwende Google Chrome oder Microsoft Edge.</span>";
        return;
    }
    
    if (window.isVoiceListening) {
        if (speechRecognitionInstance) {
            try { speechRecognitionInstance.stop(); } catch(e){}
        }
        window.isVoiceListening = false;
        if (btn) {
            btn.style.background = '#27ae60';
            btn.innerHTML = '🎤 Sprachsteuerung';
        }
        if (statusEl) statusEl.innerHTML = "<span style='color: #888;'>Sprachsteuerung aus.</span>";
        return;
    }
    
    try {
        speechRecognitionInstance = new SpeechRecognition();
        speechRecognitionInstance.lang = 'de-DE';
        speechRecognitionInstance.continuous = true;
        speechRecognitionInstance.interimResults = false;
        
        speechRecognitionInstance.onstart = function() {
            window.isVoiceListening = true;
            if (btn) {
                btn.style.background = '#e74c3c';
                btn.innerHTML = '🔴 Höre zu... (Klick zum Stoppen)';
            }
            if (statusEl) statusEl.innerHTML = "<span style='color: #2ecc71;'>🎤 Höre zu... Sag z.B. <i>'e2 nach e4'</i> oder <i>'Springer c3'</i></span>";
        };
        
        speechRecognitionInstance.onresult = function(event) {
            const last = event.results.length - 1;
            const transcript = event.results[last][0].transcript;
            console.log("🎤 Voice command received:", transcript);
            processVoiceMoveCommand(transcript);
        };
        
        speechRecognitionInstance.onerror = function(event) {
            console.warn("Speech recognition error:", event.error);
            if (event.error === 'not-allowed') {
                if (statusEl) statusEl.innerHTML = "<span style='color: #e74c3c;'>⚠️ Mikrofon-Zugriff verweigert! Bitte in den Browser-Einstellungen erlauben.</span>";
                window.isVoiceListening = false;
                if (btn) {
                    btn.style.background = '#27ae60';
                    btn.innerHTML = '🎤 Sprachsteuerung';
                }
            }
        };
        
        speechRecognitionInstance.onend = function() {
            if (window.isVoiceListening) {
                try { speechRecognitionInstance.start(); } catch(e) {}
            }
        };
        
        speechRecognitionInstance.start();
    } catch (e) {
        console.error("Speech recognition error:", e);
        if (statusEl) statusEl.innerHTML = "<span style='color: #e74c3c;'>⚠️ Fehler beim Starten der Spracherkennung.</span>";
    }
};

function processVoiceMoveCommand(rawText) {
    const statusEl = document.getElementById('voice-move-status');
    if (!rawText) return;
    
    let text = rawText.toLowerCase().trim();
    
    // Replace German word numbers and homophones
    text = text.replace(/\beins\b/g, "1").replace(/\bzwei\b/g, "2").replace(/\bdrei\b/g, "3")
               .replace(/\bvier\b/g, "4").replace(/\bfünf\b/g, "5").replace(/\bsechs\b/g, "6")
               .replace(/\bsieben\b/g, "7").replace(/\bach|acht\b/g, "8");
               
    text = text.replace(/\banton\b/g, "a").replace(/\bberta\b/g, "b").replace(/\bcäsar\b/g, "c")
               .replace(/\bcesar\b/g, "c").replace(/\bdora\b/g, "d").replace(/\bemil\b/g, "e")
               .replace(/\bfriedrich\b/g, "f").replace(/\bgustav\b/g, "g").replace(/\bheinrich\b/g, "h");

    // Common words to ignore
    text = text.replace(/\b(nach|auf|zu|bis|to|von|aus|zieht|gehe|stelle|zug|spieler)\b/gi, " ");

    // Handle pieces
    // Springer -> N, Läufer -> B, Turm -> R, Dame -> Q, König -> K, Bauer -> P
    let pieceType = null;
    if (/springer|pferd|knight/i.test(text)) pieceType = 'N';
    else if (/läufer|laufer|bishop/i.test(text)) pieceType = 'B';
    else if (/turm|rook/i.test(text)) pieceType = 'R';
    else if (/dame|königin|queen/i.test(text)) pieceType = 'Q';
    else if (/könig|koenig|king/i.test(text)) pieceType = 'K';
    else if (/bauer|pawn/i.test(text)) pieceType = 'P';

    // Check pattern 1: Two squares (e.g. e2 e4)
    const twoSquareMatch = text.match(/([a-h][1-8])[\s\-_]*([a-h][1-8])/i);
    if (twoSquareMatch) {
        const fromSq = twoSquareMatch[1].toLowerCase();
        const toSq = twoSquareMatch[2].toLowerCase();
        
        const fr = 8 - parseInt(fromSq[1]);
        const fc = fromSq.charCodeAt(0) - 97;
        const tr = 8 - parseInt(toSq[1]);
        const tc = toSq.charCodeAt(0) - 97;
        
        if (typeof window.canMoveLogic === 'function' && typeof window.isSafeMove === 'function' && typeof window.doMove === 'function') {
            const safeRaw = typeof escapeHtml === 'function' ? escapeHtml(rawText) : String(rawText).replace(/[<>&"']/g, '');
            if (window.canMoveLogic(fr, fc, tr, tc) && window.isSafeMove(fr, fc, tr, tc)) {
                window.doMove(fr, fc, tr, tc);
                if (statusEl) statusEl.innerHTML = `<span style='color: #2ecc71;'>✅ Erkannt: "${safeRaw}" &rarr; <b>${fromSq} &rarr; ${toSq}</b> ausgeführt!</span>`;
                return;
            } else {
                if (statusEl) statusEl.innerHTML = `<span style='color: #e74c3c;'>⚠️ Erkannt: "${safeRaw}" &rarr; Zug <b>${fromSq} &rarr; ${toSq}</b> ist unzulässig!</span>`;
                return;
            }
        }
    }

    // Check pattern 2: Single target square (e.g. "c3" or "e4")
    const singleSquareMatch = text.match(/([a-h][1-8])/i);
    if (singleSquareMatch) {
        const targetSq = singleSquareMatch[1].toLowerCase();
        const tr = 8 - parseInt(targetSq[1]);
        const tc = targetSq.charCodeAt(0) - 97;

        // Search current player's pieces for a valid move to targetSq
        if (typeof board !== 'undefined' && typeof turn !== 'undefined' && typeof window.isOwn === 'function') {
            let candidates = [];
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    const p = board[r][c];
                    if (p && window.isOwn(p, turn)) {
                        if (pieceType && p.toUpperCase() !== pieceType) continue;
                        if (window.canMoveLogic(r, c, tr, tc) && window.isSafeMove(r, c, tr, tc)) {
                            const fromCol = String.fromCharCode(97 + c);
                            const fromRow = 8 - r;
                            candidates.push({ fr: r, fc: c, fromSq: `${fromCol}${fromRow}` });
                        }
                    }
                }
            }

            if (candidates.length === 1) {
                const move = candidates[0];
                const safeRaw = typeof escapeHtml === 'function' ? escapeHtml(rawText) : String(rawText).replace(/[<>&"']/g, '');
                window.doMove(move.fr, move.fc, tr, tc);
                if (statusEl) statusEl.innerHTML = `<span style='color: #2ecc71;'>✅ Erkannt: "${safeRaw}" &rarr; <b>${move.fromSq} &rarr; ${targetSq}</b> ausgeführt!</span>`;
                return;
            } else if (candidates.length > 1) {
                if (statusEl) statusEl.innerHTML = `<span style='color: #f1c40f;'>⚠️ Mehrere Figuren können nach <b>${targetSq}</b> ziehen. Nenne Startfeld (z.B. '${candidates[0].fromSq} nach ${targetSq}').</span>`;
                return;
            }
        }
    }

    if (statusEl) {
        const safeRaw = typeof escapeHtml === 'function' ? escapeHtml(rawText) : String(rawText).replace(/[<>&"']/g, '');
        statusEl.innerHTML = `<span style='color: #e74c3c;'>❓ Nicht erkannt: "${safeRaw}". Sage z.B. <i>'e2 nach e4'</i> oder <i>'Springer c3'</i>.</span>`;
    }
}


// ==========================================
// 🚀 SEAMLESS BACKGROUND REST API INTEGRATION
// ==========================================
async function preloadApiData() {
    try {
        // 1. Leaderboard background prefetch & sync
        fetch('/api/leaderboard')
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data && data.success && Array.isArray(data.list) && data.list.length > 0) {
                    const listEl = document.getElementById('leaderboard-list');
                    if (listEl && (!listEl.children || listEl.children.length === 0 || listEl.innerText.includes('Lädt'))) {
                        window.currentLeaderboardUsers = data.list;
                        if (typeof window.renderModalLeaderboard === 'function') {
                            window.renderModalLeaderboard(data.list);
                        }
                    }
                }
            })
            .catch(() => {});

        // 2. Platform stats background warm-up
        fetch('/api/stats')
            .then(res => res.ok ? res.json() : null)
            .then(stats => {
                if (stats && stats.success) {
                    window.__serverStats = stats;
                }
            })
            .catch(() => {});

        // 3. Daily puzzles background pre-caching
        fetch('/api/puzzles')
            .then(res => res.ok ? res.json() : null)
            .then(puzzleData => {
                if (puzzleData && puzzleData.success && Array.isArray(puzzleData.puzzles)) {
                    window.__dailyPuzzles = puzzleData.puzzles;
                }
            })
            .catch(() => {});
    } catch(e) {}
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', preloadApiData);
} else {
    preloadApiData();
}

window.viewPlayerProfile = async function(name) {
    const modal = document.getElementById('player-profile-modal');
    if (modal) modal.style.display = 'flex';
    const nameEl = document.getElementById('ppm-name');
    if (nameEl) nameEl.textContent = name;
    const historyEl = document.getElementById('ppm-history');
    if (historyEl) historyEl.innerHTML = '<div style="color:#888; font-style:italic;">Lädt Spieler-Statistiken...</div>';

    // 1. Seamless REST API Call to /api/player/:username
    try {
        const res = await fetch(`/api/player/${encodeURIComponent(name)}`);
        if (res.ok) {
            const data = await res.json();
            if (data.success && data.player) {
                const p = data.player;
                const eloEl = document.getElementById('ppm-elo');
                const levelEl = document.getElementById('ppm-level');
                const roleEl = document.getElementById('ppm-role');

                if (eloEl) eloEl.textContent = `Elo: ${Number(p.elo) || 1200}`;
                if (levelEl) levelEl.textContent = `Level: ${Number(p.level) || 1} (XP: ${Number(p.xp) || 0})`;
                if (roleEl) roleEl.textContent = `Partien: ${Number(p.totalGames) || ((Number(p.wins) || 0) + (Number(p.losses) || 0))}`;

                if (historyEl) {
                    const winrate = typeof escapeHtml === 'function' ? escapeHtml(p.winrate || '0%') : String(p.winrate || '0%').replace(/[<>&"']/g, '');
                    historyEl.innerHTML = `
                        <div style="background: rgba(255,255,255,0.04); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); display: flex; flex-direction: column; gap: 6px;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.95em;">
                                <span>🏆 Siege: <strong style="color: #2ecc71;">${Number(p.wins) || 0}</strong></span>
                                <span>💀 Niederlagen: <strong style="color: #e74c3c;">${Number(p.losses) || 0}</strong></span>
                                <span>📊 Siegquote: <strong style="color: #f1c40f;">${winrate}</strong></span>
                            </div>
                            <div style="display: flex; justify-content: space-between; font-size: 0.85em; color: #aaa; margin-top: 4px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 6px;">
                                <span>💰 Vorhersage-Coins: <strong style="color: #f39c12;">${Number(p.coins) || 1000}</strong></span>
                                <span>🎖️ Level ${Number(p.level) || 1}</span>
                            </div>
                        </div>
                    `;
                }
            }
        }
    } catch(e) {}
    
    // 2. WebSocket Fallback
    if (window.socket && window.socket.readyState === WebSocket.OPEN) {
        window.socket.send(JSON.stringify({
            type: 'get_player_profile',
            username: name
        }));
    }
};
