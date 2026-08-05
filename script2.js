// script2.js - Account & Leaderboard Management

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

let firebaseConfig = null;
let fbApp = null;
let fbAuth = null;
let fbDb = null;

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
                if (loaded && loaded.apiKey) firebaseConfig = loaded;
            }
        } catch(e) {
            console.warn("Could not load /firebase-applet-config.json, using default config", e);
        }
        
        fbApp = initializeApp(firebaseConfig);
        fbAuth = getAuth(fbApp);
        
        if (firebaseConfig.firestoreDatabaseId) {
            fbDb = getFirestore(fbApp, firebaseConfig.firestoreDatabaseId);
        } else {
            fbDb = getFirestore(fbApp);
        }

            let userUnsubscribe = null;
            let adminUnsubscribe = null;

            onAuthStateChanged(fbAuth, async (user) => {
                if (userUnsubscribe) userUnsubscribe();
                if (adminUnsubscribe) adminUnsubscribe();
                
                if (user) {
                    const pName = user.displayName || user.email.split('@')[0];
                    const userDoc = doc(fbDb, 'players', user.uid);
                    
                    // Listen for real-time changes (e.g. role updates, elo changes)
                    userUnsubscribe = onSnapshot(userDoc, (snapshot) => {
                        if (snapshot.exists()) {
                            const data = snapshot.data();
                            const dbName = data.username || pName;
                            
                            // Speichere den Namen für Websocket und andere Features
                            localStorage.setItem('playerName', dbName);
                            const ws = window.socket || (typeof socket !== 'undefined' ? socket : null);
                            if (ws && ws.readyState === WebSocket.OPEN && ws.playerName !== dbName) {
                                ws.send(JSON.stringify({
                                    type: 'login_attempt',
                                    playerName: dbName,
                                    uid: user.uid,
                                    password: 'firebase-auth-token',
                                    isRegister: false
                                }));
                                ws.playerName = dbName;
                            }
                            
                            updateProfileDisplay(dbName, data.elo || 1200, data.wins || 0, data.losses || 0, data.level || 1, data.xp || 0, data.achievements || []);
                            
                            // Check admin role
                            const isAdmin = (data.role === 'admin' || data.role === 'moderator'); // Let's just make both see it for now, or just admin
                            const adminPanel = document.getElementById('admin-panel');
                            if (adminPanel) {
                                adminPanel.style.display = data.role === 'admin' ? 'block' : 'none';
                            }
                            
                            if (data.role === 'admin') {
                                // Load all users for admin console
                                adminUnsubscribe = onSnapshot(collection(fbDb, 'players'), (usersSnap) => {
                                    const listEl = document.getElementById('admin-user-list');
                                    if (!listEl) return;
                                    listEl.innerHTML = '';
                                    usersSnap.forEach(uDoc => {
                                        const u = uDoc.data();
                                        const uName = u.username || uDoc.id;
                                        const uRole = u.role || 'user';
                                        
                                        const div = document.createElement('div');
                                        div.style.display = 'flex';
                                        div.style.justifyContent = 'space-between';
                                        div.style.alignItems = 'center';
                                        div.style.background = 'rgba(0,0,0,0.3)';
                                        div.style.padding = '8px';
                                        div.style.borderRadius = '5px';
                                        
                                        let roleColor = '#aaa';
                                        if (uRole === 'admin') roleColor = '#e74c3c';
                                        if (uRole === 'moderator') roleColor = '#2ecc71';
                                        
                                        div.innerHTML = `
                                            <div>
                                                <span style="color: #fff; font-weight: bold;">${uName}</span>
                                                <span style="font-size: 0.8em; color: ${roleColor}; margin-left: 5px;">[${uRole}]</span>
                                            </div>
                                            <div style="display: flex; gap: 5px;">
                                                <button onclick="window.setRole('${uDoc.id}', 'admin')" style="background: #e74c3c; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.8em;">Admin</button>
                                                <button onclick="window.setRole('${uDoc.id}', 'moderator')" style="background: #2ecc71; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.8em;">Mod</button>
                                                <button onclick="window.setRole('${uDoc.id}', 'user')" style="background: #7f8c8d; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.8em;">User</button>
                                            </div>
                                        `;
                                        listEl.appendChild(div);
                                    });
                                });
                            }
                        }
                    });
                    
                    localStorage.setItem('playerName', pName);
                    localStorage.setItem('firebaseUid', user.uid);
                    
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
                            password: 'firebase-auth-token',
                            isRegister: false
                        }));
                    }
                } else {
                    const savedGuest = localStorage.getItem('guestName');
                    if (savedGuest) {
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
                }
            });
            
            window.setRole = async function(uid, role) {
                if (!fbDb) return;
                try {
                    await setDoc(doc(fbDb, 'players', uid), { role: role }, { merge: true });
                } catch(e) {
                    console.error("Fehler beim Ändern der Rolle", e);
                }
            };
            
            window.logout = async function() {
                localStorage.removeItem('guestName');
                localStorage.removeItem('playerName');
                localStorage.removeItem('firebaseUid');
                if (fbAuth && fbAuth.currentUser) {
                    try {
                        await signOut(fbAuth);
                    } catch(e) {
                        console.error("Fehler beim Abmelden", e);
                    }
                }
                alert("Du wurdest erfolgreich abgemeldet.");
                window.location.reload();
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
        const pName = user.displayName || user.email.split('@')[0];

        const userDoc = doc(fbDb, 'players', user.uid);
        const docSnap = await getDoc(userDoc);
        if (!docSnap.exists()) {
            await setDoc(userDoc, {
                username: pName,
                uid: user.uid,
                role: 'user',
                elo: 1200,
                wins: 0,
                losses: 0,
                level: 1,
                xp: 0
            });
        }

        localStorage.setItem('playerName', pName);
        localStorage.setItem('firebaseUid', user.uid);

        const ws = window.socket || (typeof socket !== 'undefined' ? socket : null);
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'login_attempt',
                playerName: pName,
                uid: user.uid,
                password: 'firebase-auth-token',
                isRegister: false
            }));
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
            status.innerHTML = "<span style='color: #e74c3c;'>❌ " + msg + "</span>";
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
        const pName = user.displayName || user.email.split('@')[0];

        const userDoc = doc(fbDb, 'players', user.uid);
        await setDoc(userDoc, {
            username: pName,
            uid: user.uid,
            role: 'user',
            elo: 1200,
            wins: 0,
            losses: 0,
            level: 1,
            xp: 0
        });

        localStorage.setItem('playerName', pName);
        localStorage.setItem('firebaseUid', user.uid);

        const ws = window.socket || (typeof socket !== 'undefined' ? socket : null);
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'login_attempt',
                playerName: pName,
                uid: user.uid,
                password: 'firebase-auth-token',
                isRegister: true
            }));
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
            status.innerHTML = "<span style='color: #e74c3c;'>❌ " + msg + "</span>";
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
        const pName = user.displayName || user.email.split('@')[0];
        
        const userDoc = doc(fbDb, 'players', user.uid);
        const docSnap = await getDoc(userDoc);
        if (!docSnap.exists()) {
            await setDoc(userDoc, {
                username: pName,
                uid: user.uid,
                role: 'user',
                elo: 1200,
                wins: 0,
                losses: 0,
                level: 1,
                xp: 0
            });
        }
        
        localStorage.setItem('playerName', pName);
        localStorage.setItem('firebaseUid', user.uid);
        
        const ws = window.socket || (typeof socket !== 'undefined' ? socket : null);
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'login_attempt',
                playerName: pName,
                uid: user.uid,
                password: 'firebase-auth-token',
                isRegister: !docSnap.exists()
            }));
        }
        
        setTimeout(() => { 
            const modal = document.getElementById('auth-modal');
            if (modal) modal.style.display = 'none'; 
        }, 1000);
    } catch (error) {
        console.error("Auth error:", error);
        if (status) {
            if (error.code === 'auth/unauthorized-domain' || (error.message && error.message.includes('auth/unauthorized-domain'))) {
                const currentHost = window.location.hostname;
                status.innerHTML = `
                    <div style="background: rgba(231, 76, 60, 0.15); border: 1px solid #e74c3c; padding: 12px; border-radius: 8px; margin-top: 10px; color: #ff6b6b; font-size: 0.85em; text-align: left; line-height: 1.4;">
                        <strong>⚠️ Domain nicht autorisiert in Firebase!</strong><br>
                        Die Adresse <code>${currentHost}</code> muss in der Firebase Console zugelassen werden.<br><br>
                        <strong>Lösung in der Console:</strong><br>
                        1. Öffne <a href="https://console.firebase.google.com/" target="_blank" style="color: #3498db; text-decoration: underline;">Firebase Console</a> &gt; Authentication &gt; Settings &gt; Authorized Domains.<br>
                        2. Füge <code>${currentHost}</code> als Domain hinzu.<br><br>
                        <strong>Alternative:</strong> Spiele direkt ohne Google-Anmeldung als Gast:
                        <button onclick="playAsGuest()" style="margin-top: 8px; width: 100%; background: #2ecc71; color: white; border: none; padding: 8px; border-radius: 6px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
                            👤 Jetzt als Gast weiterspielen
                        </button>
                    </div>
                `;
            } else {
                status.innerHTML = "<span style='color: #e74c3c;'>❌ " + (error.message || error) + "</span>";
            }
        }
    }
};

window.openNameModal = function() {
    if (!fbAuth || !fbAuth.currentUser) {
        alert("Bitte logge dich zuerst ein.");
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
    
    status.innerHTML = "<span style='color: #3498db;'>⏳ Speichere...</span>";

    try {
        const userDoc = doc(fbDb, 'players', fbAuth.currentUser.uid);
        await updateDoc(userDoc, {
            username: normalized
        });
        
        status.innerHTML = "<span style='color: #2ecc71;'>✅ Name gespeichert!</span>";
        
        setTimeout(() => { 
            const modal = document.getElementById('name-modal');
            if (modal) modal.style.display = 'none'; 
        }, 1000);
    } catch (error) {
        console.error("Name change error:", error);
        status.innerHTML = "<span style='color: #e74c3c;'>❌ " + error.message + "</span>";
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
};

function updateProfileDisplay(name, elo, wins, losses = 0, level = 1, xp = 0, achievements = []) {
    const profileName = document.getElementById('profile-name');
    const profileStats = document.getElementById('profile-stats');
    if (profileName) profileName.innerText = name;
    if (profileStats) profileStats.innerText = `Elo: ${elo || 1200} | S: ${wins || 0} N: ${losses || 0}`;
    
    const navAuthBtn = document.getElementById('navAuthBtn');
    const navUserPill = document.getElementById('navUserPill');
    const navUserName = document.getElementById('navUserName');
    
    const authBtn = document.getElementById('openAuthBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    if (name && name !== 'Gastspieler') {
        if (authBtn) authBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';
        
        if (navAuthBtn) navAuthBtn.style.display = 'none';
        if (navUserPill) navUserPill.style.display = 'flex';
        if (navUserName) navUserName.innerText = `${name} (${elo || 1200} Elo)`;
    } else {
        if (authBtn) authBtn.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        
        if (navAuthBtn) navAuthBtn.style.display = 'block';
        if (navUserPill) navUserPill.style.display = 'none';
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
    notif.innerHTML = `
        <div style="font-size: 2em; animation: pulse 1s infinite;">🏆</div>
        <div>
            <div style="font-weight: bold; color: #f1c40f; font-size: 1.05em; margin-bottom: 2px;">Erfolg freigeschaltet!</div>
            <div style="font-size: 0.95em; font-weight: 600; color: white;">${title}</div>
            <div style="font-size: 0.8em; color: #aaa; margin-top: 1px;">${description}</div>
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
                        if (listEl && data.list) {
                            listEl.innerHTML = data.list.map((p, i) => {
                                let badge = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
                                let color = i === 0 ? '#f1c40f' : i === 1 ? '#bdc3c7' : i === 2 ? '#cd7f32' : 'rgba(255,255,255,0.7)';
                                let bg = i === 0 ? 'linear-gradient(135deg, rgba(241,196,15,0.2) 0%, rgba(0,0,0,0) 100%)' : 'rgba(255,255,255,0.03)';
                                return `
                                <div style="background: ${bg}; padding: 12px; border-radius: 10px; margin-bottom: 8px; border: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: space-between; transition: 0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                                    <div style="display: flex; align-items: center; gap: 10px;">
                                        <div style="width: 24px; text-align: center; font-weight: bold; color: ${color}; font-size: 1.1em;">
                                            ${badge || `#${i + 1}`}
                                        </div>
                                        <div style="display: flex; flex-direction: column;">
                                            <strong style="color: white; font-size: 1.05em; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">${p.name}</strong>
                                            <span style="color: #95a5a6; font-size: 0.8em;">Lvl ${p.level || 1} • Elo: ${p.elo || 1200}</span>
                                        </div>
                                    </div>
                                    <div style="text-align: right;">
                                        <div style="color: #f1c40f; font-weight: bold; font-size: 1.1em;">${p.wins || 0} 🏆</div>
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
                        
                        // Show admin panel if admin
                        const isAdminUser = data.role === 'admin' || (data.name && data.name.toLowerCase() === 'max');
                        const adminPanel = document.getElementById('admin-panel');
                        if (adminPanel) {
                            adminPanel.style.display = isAdminUser ? 'block' : 'none';
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
                        if (status) status.innerHTML = "<span style='color: #e74c3c;'>❌ " + (data.text || "Fehler") + "</span>";
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
    let savedGuest = localStorage.getItem('guestName');
    if (!savedGuest) {
        const defaultGuestName = "Gast_" + Math.floor(1000 + Math.random() * 9000);
        const input = prompt("Wähle einen Gast-Namen:", defaultGuestName);
        savedGuest = (input ? input.trim() : defaultGuestName) || defaultGuestName;
        savedGuest = savedGuest.replace(/[^a-zA-Z0-9_.-]/g, '');
        if (!savedGuest) savedGuest = defaultGuestName;
        localStorage.setItem('guestName', savedGuest);
    }
    
    localStorage.setItem('playerName', savedGuest);
    if (typeof updateProfileDisplay === 'function') {
        updateProfileDisplay(savedGuest, 1200, 0, 0, 1, 0, []);
    }
    
    const ws = window.socket || (typeof socket !== 'undefined' ? socket : null);
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'login_attempt',
            playerName: savedGuest,
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
            if (window.canMoveLogic(fr, fc, tr, tc) && window.isSafeMove(fr, fc, tr, tc)) {
                window.doMove(fr, fc, tr, tc);
                if (statusEl) statusEl.innerHTML = `<span style='color: #2ecc71;'>✅ Erkannt: "${rawText}" &rarr; <b>${fromSq} &rarr; ${toSq}</b> ausgeführt!</span>`;
                return;
            } else {
                if (statusEl) statusEl.innerHTML = `<span style='color: #e74c3c;'>⚠️ Erkannt: "${rawText}" &rarr; Zug <b>${fromSq} &rarr; ${toSq}</b> ist unzulässig!</span>`;
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
                window.doMove(move.fr, move.fc, tr, tc);
                if (statusEl) statusEl.innerHTML = `<span style='color: #2ecc71;'>✅ Erkannt: "${rawText}" &rarr; <b>${move.fromSq} &rarr; ${targetSq}</b> ausgeführt!</span>`;
                return;
            } else if (candidates.length > 1) {
                if (statusEl) statusEl.innerHTML = `<span style='color: #f1c40f;'>⚠️ Mehrere Figuren können nach <b>${targetSq}</b> ziehen. Nenne Startfeld (z.B. '${candidates[0].fromSq} nach ${targetSq}').</span>`;
                return;
            }
        }
    }

    if (statusEl) {
        statusEl.innerHTML = `<span style='color: #e74c3c;'>❓ Nicht erkannt: "${rawText}". Sage z.B. <i>'e2 nach e4'</i> oder <i>'Springer c3'</i>.</span>`;
    }
}

