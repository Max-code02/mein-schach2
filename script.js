
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
window.escapeHtml = escapeHtml;

function parsePerlRegex(text) {
    let safeText = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    // Strict chess move regex
    const moveRegex = /(^|\s)(O-O(?:-O)?|[KQRBN][a-h]?[1-8]?x?[a-h][1-8][+#]?|[a-h]x[a-h][1-8](?:=[QRBN])?[+#]?|[a-h][1-8](?:=[QRBN])?[+#]?)(?=\s|$|[!?,.])/g;
    
    safeText = safeText.replace(moveRegex, (match, space, move) => {
        let piece = "♟";
        if (move.includes("O-O")) piece = "🏰";
        else if (move.startsWith("K")) piece = "♔";
        else if (move.startsWith("Q")) piece = "♕";
        else if (move.startsWith("R")) piece = "♖";
        else if (move.startsWith("B")) piece = "♗";
        else if (move.startsWith("N")) piece = "♘";
        
        return space + `<span class="perl-regex-move" style="background: rgba(142, 68, 173, 0.2); border: 1px dashed #8e44ad; border-radius: 4px; padding: 2px 5px; color: #d2b4de; font-family: monospace; font-weight: bold; font-size: 0.9em; box-shadow: 0 0 5px rgba(142, 68, 173, 0.5);" title="Perl RegEx-Interceptor">👁️ ${piece} ${move}</span>`;
    });
    return safeText;
}

// --- DYNAMISCHES BAN-OVERLAY & CHECK ---
function showBanOverlay(message) {
    localStorage.setItem('banned', 'true');
    localStorage.setItem('ban_message', message || 'Deine IP-Adresse oder dein Account wurden permanent gesperrt.');
    
    let overlay = document.getElementById('ban-fullscreen-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'ban-fullscreen-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.backgroundColor = 'rgba(10, 5, 5, 0.98)';
        overlay.style.color = '#ff3b30';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.zIndex = '999999';
        overlay.style.fontFamily = 'system-ui, -apple-system, sans-serif';
        overlay.style.textAlign = 'center';
        overlay.style.padding = '2rem';
        overlay.style.boxSizing = 'border-box';
        
        const content = document.createElement('div');
        content.style.maxWidth = '600px';
        content.style.padding = '3rem';
        content.style.borderRadius = '16px';
        content.style.border = '2px solid #ff3b30';
        content.style.backgroundColor = '#1a0d0d';
        content.style.boxShadow = '0 0 30px rgba(255, 59, 48, 0.3)';
        content.style.animation = 'pulseGlow 2s infinite alternate';
        
        const title = document.createElement('h1');
        title.innerText = '⛔ ZUGRIFF GESPERRT';
        title.style.fontSize = '3rem';
        title.style.margin = '0 0 1.5rem 0';
        title.style.letterSpacing = '2px';
        title.style.fontWeight = '800';
        title.style.textShadow = '0 0 10px rgba(255, 59, 48, 0.5)';
        
        const desc = document.createElement('p');
        desc.id = 'ban-overlay-desc';
        desc.innerText = message || 'Deine IP-Adresse oder dein Account wurden permanent gesperrt.';
        desc.style.fontSize = '1.25rem';
        desc.style.lineHeight = '1.6';
        desc.style.color = '#f5f5f7';
        desc.style.margin = '0 0 2rem 0';
        
        const subtext = document.createElement('p');
        subtext.innerText = 'Diese Sperre ist permanent und kann nicht umgangen werden. Wende dich bei Fragen an den Administrator.';
        subtext.style.fontSize = '0.9rem';
        subtext.style.color = '#8e8e93';
        subtext.style.margin = '0';

        const checkBtn = document.createElement('button');
        checkBtn.innerText = 'Status prüfen / Aktualisieren';
        checkBtn.style.marginTop = '2rem';
        checkBtn.style.padding = '0.75rem 1.5rem';
        checkBtn.style.backgroundColor = 'transparent';
        checkBtn.style.border = '1px solid #ff3b30';
        checkBtn.style.color = '#ff3b30';
        checkBtn.style.borderRadius = '8px';
        checkBtn.style.cursor = 'pointer';
        checkBtn.style.fontWeight = 'bold';
        checkBtn.style.transition = 'all 0.3s';
        checkBtn.onmouseover = () => {
            checkBtn.style.backgroundColor = '#ff3b30';
            checkBtn.style.color = '#1a0d0d';
        };
        checkBtn.onmouseout = () => {
            checkBtn.style.backgroundColor = 'transparent';
            checkBtn.style.color = '#ff3b30';
        };
        checkBtn.onclick = () => {
            checkBtn.innerText = 'Prüfe...';
            checkBtn.disabled = true;
            
            const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
            const testSocket = new WebSocket(`${protocol}//${window.location.host}`);
            
            let wasDisconnected = false;
            testSocket.onclose = () => {
                wasDisconnected = true;
                checkBtn.innerText = 'Sperre aktiv!';
                setTimeout(() => {
                    checkBtn.innerText = 'Status prüfen / Aktualisieren';
                    checkBtn.disabled = false;
                }, 2000);
            };
            
            testSocket.onopen = () => {
                setTimeout(() => {
                    if (!wasDisconnected) {
                        localStorage.removeItem('banned');
                        localStorage.removeItem('ban_message');
                        window.location.reload();
                    }
                }, 1500);
            };
        };
        
        const style = document.createElement('style');
        style.innerHTML = `
            @keyframes pulseGlow {
                from { box-shadow: 0 0 20px rgba(255, 59, 48, 0.2); border-color: #d32f2f; }
                to { box-shadow: 0 0 40px rgba(255, 59, 48, 0.5); border-color: #ff3b30; }
            }
            body { overflow: hidden !important; }
        `;
        document.head.appendChild(style);
        
        content.appendChild(title);
        content.appendChild(desc);
        content.appendChild(subtext);
        content.appendChild(checkBtn);
        overlay.appendChild(content);
        document.body.appendChild(overlay);
    } else {
        const desc = document.getElementById('ban-overlay-desc');
        if (desc) desc.innerText = message;
    }
}

if (localStorage.getItem('banned') === 'true') {
    const savedMsg = localStorage.getItem('ban_message') || '';
    if (savedMsg.includes('Nur Administratoren dürfen') || savedMsg.includes('Benutzerdaten abrufen') || savedMsg.includes('Keine Berechtigung')) {
        localStorage.removeItem('banned');
        localStorage.removeItem('ban_message');
    } else {
        window.addEventListener('DOMContentLoaded', () => {
            showBanOverlay(savedMsg);
        });
    }
}

// --- IN-APP BENACHRICHTIGUNGEN & ADMIN-PANEL HELFER ---
window.showInAppConfirmToast = function(title, message, onAccept, onDecline) {
    const container = document.getElementById('in-app-toast-container');
    if (!container) {
        if (typeof window.showGameRequestModal === 'function') {
            window.showGameRequestModal('❓', title, message, 'Bestätigen', 'Abbrechen', onAccept, onDecline);
        } else {
            console.warn('[ConfirmToast] Kein Container gefunden:', title, message);
        }
        return;
    }

    const toast = document.createElement('div');
    toast.style.pointerEvents = 'auto';
    toast.style.background = '#1e2836';
    toast.style.borderLeft = '5px solid #f39c12';
    toast.style.border = '1px solid rgba(243, 156, 18, 0.5)';
    toast.style.borderRadius = '8px';
    toast.style.padding = '12px 15px';
    toast.style.color = '#fff';
    toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
    toast.style.transition = 'all 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';

    const toastId = 'confirm_toast_' + Date.now();
    toast.id = toastId;

    toast.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="font-weight: bold; font-size: 0.9em; color: #f39c12;">${title || 'Anfrage'}</div>
            <div style="font-size: 0.85em; color: #e0e0e0; line-height: 1.4;">${message || ''}</div>
            <div style="display: flex; gap: 8px; margin-top: 4px;">
                <button id="${toastId}_accept" style="flex: 1; background: #27ae60; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 0.85em;">✅ Akzeptieren</button>
                <button id="${toastId}_decline" style="flex: 1; background: #c0392b; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 0.85em;">❌ Ablehnen</button>
            </div>
        </div>
    `;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 10);

    const acceptBtn = document.getElementById(`${toastId}_accept`);
    const declineBtn = document.getElementById(`${toastId}_decline`);

    if (acceptBtn) {
        acceptBtn.onclick = () => {
            toast.remove();
            if (typeof onAccept === 'function') onAccept();
        };
    }
    if (declineBtn) {
        declineBtn.onclick = () => {
            toast.remove();
            if (typeof onDecline === 'function') onDecline();
        };
    }
};

window.showInAppPrompt = function(title, message, defaultVal, onSubmit) {
    let modal = document.getElementById('dynamic-prompt-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'dynamic-prompt-modal';
        modal.className = 'modal-overlay';
        modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(0,0,0,0.8); backdrop-filter:blur(5px); z-index:2600000; justify-content:center; align-items:center; padding:15px;';
        modal.innerHTML = `
            <div style="background:#1e1d1a; border:1px solid rgba(255,255,255,0.18); border-radius:12px; padding:22px; width:100%; max-width:400px; color:white; box-sizing:border-box;">
                <h3 id="dp-title" style="margin:0 0 8px 0; color:#f1c40f; font-size:1.1rem;"></h3>
                <p id="dp-msg" style="font-size:0.86rem; color:#bab8b5; margin:0 0 12px 0;"></p>
                <input id="dp-input" type="text" style="width:100%; box-sizing:border-box; padding:9px 11px; border-radius:6px; background:#161512; border:1px solid rgba(255,255,255,0.2); color:white; margin-bottom:14px;" />
                <div style="display:flex; gap:8px;">
                    <button id="dp-cancel" class="glass-btn" style="flex:1; padding:9px;">Abbrechen</button>
                    <button id="dp-ok" class="glass-btn success" style="flex:1; padding:9px;">Bestätigen</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    const titleEl = document.getElementById('dp-title');
    const msgEl = document.getElementById('dp-msg');
    const inputEl = document.getElementById('dp-input');
    const cancelBtn = document.getElementById('dp-cancel');
    const okBtn = document.getElementById('dp-ok');
    if (titleEl) titleEl.textContent = title || 'Eingabe';
    if (msgEl) msgEl.textContent = message || '';
    if (inputEl) inputEl.value = defaultVal || '';
    modal.style.display = 'flex';
    setTimeout(() => { if (inputEl) inputEl.focus(); }, 30);

    const close = () => { modal.style.display = 'none'; };
    if (cancelBtn) cancelBtn.onclick = close;
    if (okBtn) okBtn.onclick = () => {
        const val = inputEl ? inputEl.value : '';
        close();
        if (typeof onSubmit === 'function') onSubmit(val);
    };
    if (inputEl) inputEl.onkeydown = (e) => {
        if (e.key === 'Enter') { okBtn?.click(); }
        if (e.key === 'Escape') { close(); }
    };
};

window.showInAppNotification = function(title, message, level = 'info') {
    const container = document.getElementById('in-app-toast-container');
    if (!container) {
        console.log(`[In-App Notification] ${title}: ${message}`);
        return;
    }

    const toast = document.createElement('div');
    toast.className = 'in-app-toast';
    toast.style.pointerEvents = 'auto';
    toast.style.background = level === 'warning' ? '#2c1515' : '#1e2836';
    toast.style.borderLeft = level === 'warning' ? '5px solid #e74c3c' : '5px solid #3498db';
    toast.style.border = level === 'warning' ? '1px solid rgba(231,76,60,0.5)' : '1px solid rgba(52,152,219,0.5)';
    toast.style.borderRadius = '8px';
    toast.style.padding = '12px 15px';
    toast.style.color = '#fff';
    toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
    toast.style.transition = 'all 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';

    const esc = typeof escapeHtml === 'function' ? escapeHtml : (s => String(s || ''));
    toast.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
            <div>
                <div style="font-weight: bold; font-size: 0.9em; color: ${level === 'warning' ? '#ff6b6b' : '#5db0e6'}; margin-bottom: 4px;">${esc(title || 'System-Benachrichtigung')}</div>
                <div style="font-size: 0.85em; color: #e0e0e0; line-height: 1.4;">${esc(message || '')}</div>
            </div>
            <button type="button" class="toast-close-btn" data-toast-close="1" style="background: none; border: none; color: #888; cursor: pointer; font-size: 1.1em; line-height: 1;">&times;</button>
        </div>
    `;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 10);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        setTimeout(() => toast.remove(), 300);
    }, 7000);
};

window.showAccountBannedOverlay = function(reason) {
    const cleanReason = reason || "Verstoß gegen die Community-Richtlinien / Admin-Entscheidung";
    window.location.href = '/banned?reason=' + encodeURIComponent(cleanReason);
};

window.showGameRequestModal = function(icon, title, message, acceptText, declineText, onAccept, onDecline) {
    const modal = document.getElementById('game-request-modal');
    if (!modal) {
        if (typeof window.showInAppConfirmToast === 'function') {
            window.showInAppConfirmToast(title, message, onAccept, onDecline);
        }
        return;
    }

    const iconEl = document.getElementById('game-request-icon');
    const titleEl = document.getElementById('game-request-title');
    const msgEl = document.getElementById('game-request-message');
    const acceptBtn = document.getElementById('game-request-accept-btn');
    const declineBtn = document.getElementById('game-request-decline-btn');

    if (iconEl) iconEl.textContent = icon || '🤝';
    if (titleEl) titleEl.textContent = title || 'Anfrage erhalten!';
    if (msgEl) msgEl.textContent = message || '';
    if (acceptBtn) acceptBtn.innerHTML = acceptText || '✅ Annehmen';
    if (declineBtn) declineBtn.innerHTML = declineText || '❌ Ablehnen';

    modal.style.display = 'flex';

    if (typeof playCheckSound === 'function') {
        try { playCheckSound(); } catch(e) {}
    }

    if (acceptBtn) {
        acceptBtn.onclick = () => {
            modal.style.display = 'none';
            if (typeof onAccept === 'function') onAccept();
        };
    }

    if (declineBtn) {
        declineBtn.onclick = () => {
            modal.style.display = 'none';
            if (typeof onDecline === 'function') onDecline();
        };
    }
};

window.requestAdminUsersRefresh = function() {
    const listEl = document.getElementById('admin-user-list');
    if (listEl) {
        listEl.innerHTML = `<div style="color: #3498db; text-align: center; font-size: 0.85em; padding: 10px 0;">🔄 Lade Benutzerliste vom Server...</div>`;
    }
    if (socket && socket.readyState === 1) {
        socket.send(JSON.stringify({ type: 'get_admin_users' }));
    } else {
        if (listEl) {
            listEl.innerHTML = `<div style="color: #e74c3c; text-align: center; font-size: 0.85em; padding: 10px 0;">❌ Keine Serververbindung aktiv. Bitte verbinde dich neu.</div>`;
        }
    }
};

window.handleAdminUsersUpdate = function(users) {
    const listEl = document.getElementById('admin-user-list');
    if (!listEl) return;

    if (!users || users.length === 0) {
        listEl.innerHTML = `<div style="color: #aaa; text-align: center; font-size: 0.85em; padding: 10px 0;">Keine Benutzer gefunden.</div>`;
        return;
    }

    listEl.innerHTML = users.map(u => {
        const isOnline = u.is_online ? '🟢 Online' : '⚪ Offline';
        const role = u.role || 'user';
        const isBanned = u.is_banned;
        const safeUname = escapeHtml(u.username);
        const encodedUname = encodeURIComponent(u.username || '');
        const safeRole = escapeHtml(role);
        const safeIP = escapeHtml(u.ip_address || '127.0.0.1');
        
        let roleBadge = '<span style="background: #34495e; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.75em;">User</span>';
        if (role === 'admin' || role === 'Admin') roleBadge = '<span style="background: #e74c3c; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.75em; font-weight: bold;">👑 Admin</span>';
        else if (role === 'moderator' || role === 'Mod') roleBadge = '<span style="background: #f39c12; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.75em;">🛡️ Mod</span>';

        let kickBtn = `<button type="button" data-admin-action="kick" data-target="${encodedUname}" style="background: #e67e22; color: white; border: none; padding: 3px 7px; border-radius: 4px; font-size: 0.75em; cursor: pointer; font-weight: bold;" title="Spieler kicken">⚡ Kick</button>`;

        let banBtn = `<button type="button" data-admin-action="ban" data-target="${encodedUname}" style="background: #c0392b; color: white; border: none; padding: 3px 7px; border-radius: 4px; font-size: 0.75em; cursor: pointer; font-weight: bold;" title="Spieler bannen">⛔ Ban</button>`;
        if (isBanned) {
            banBtn = `<button type="button" data-admin-action="unban" data-target="${encodedUname}" style="background: #27ae60; color: white; border: none; padding: 3px 7px; border-radius: 4px; font-size: 0.75em; cursor: pointer; font-weight: bold;" title="Spieler entbannen">🔓 Entbannen</button>`;
        }

        return `
            <div style="background: rgba(255,255,255,0.05); padding: 8px 10px; border-radius: 6px; display: flex; flex-direction: column; gap: 4px; border: 1px solid rgba(255,255,255,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-weight: bold; font-size: 0.9em; color: white;">
                        ${safeUname} ${roleBadge} <span style="font-size: 0.75em; color: ${u.is_online ? '#2ecc71' : '#7f8c8d'}; margin-left: 5px;">${isOnline}</span>
                    </div>
                    <div style="font-size: 0.8em; color: #f39c12; font-weight: bold;">${Number(u.elo) || 1200} ELO</div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75em; color: #aaa; margin-top: 2px;">
                    <div>IP: ${safeIP} | Siege: ${Number(u.wins) || 0}</div>
                    <div style="display: flex; gap: 4px;">
                        <button type="button" data-admin-action="role" data-target="${encodedUname}" data-role="admin" style="background: #8e44ad; color: white; border: none; padding: 3px 6px; border-radius: 3px; font-size: 0.7em; cursor: pointer;">👑 Admin</button>
                        <button type="button" data-admin-action="role" data-target="${encodedUname}" data-role="moderator" style="background: #d35400; color: white; border: none; padding: 3px 6px; border-radius: 3px; font-size: 0.7em; cursor: pointer;">🛡️ Mod</button>
                        ${kickBtn}
                        ${banBtn}
                    </div>
                </div>
            </div>
        `;
    }).join('');
};

window.adminKickUser = function(username) {
    const executeKick = (reason) => {
        if (reason !== null && socket && socket.readyState === 1) {
            socket.send(JSON.stringify({ type: 'admin_action', action: 'kick', target: username, reason: reason }));
            socket.send(JSON.stringify({ type: 'chat_message', username: getMyName(), content: `/kick "${username}" ${reason}` }));
            window.showInAppNotification("Admin", `Kick für ${username} gesendet.`, "warning");
            setTimeout(window.requestAdminUsersRefresh, 500);
        }
    };
    if (typeof window.showInAppPrompt === 'function') {
        window.showInAppPrompt("Spieler kicken", `Grund für Kick von ${username}:`, "Fehlverhalten im Spiel / Chat", executeKick);
    } else {
        executeKick("Fehlverhalten im Spiel / Chat");
    }
};

window.sendBannedUserSupportTicket = function() {
    const contact = document.getElementById('ban-ticket-contact')?.value?.trim();
    const text = document.getElementById('ban-ticket-text')?.value?.trim();
    const statusEl = document.getElementById('ban-ticket-status');
    const reasonText = document.getElementById('account-banned-reason-text')?.innerText || 'Admin-Gesperrt';

    if (!text) {
        if (statusEl) {
            statusEl.style.color = '#e74c3c';
            statusEl.innerText = '❌ Bitte gib eine Nachricht an den Support ein.';
        }
        return;
    }

    if (statusEl) {
        statusEl.style.color = '#f39c12';
        statusEl.innerText = '⏳ Sende Support-Ticket...';
    }

    const payload = {
        user: contact || window.currentUser || 'Gesperrter Spieler',
        contact: contact || 'Keine Angabe',
        email: 'schachlivesupport.jailer914@slmail.me',
        text: text,
        banReason: reasonText
    };

    fetch('/api/support-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).then(res => res.json()).then(data => {
        if (data && data.success) {
            if (statusEl) {
                statusEl.style.color = '#2ecc71';
                statusEl.innerHTML = `✅ Ticket <strong>${data.ticketId}</strong> erfolgreich übermittelt! E-Mail: <strong>schachlivesupport.jailer914@slmail.me</strong>`;
            }
            const txtInput = document.getElementById('ban-ticket-text');
            if (txtInput) txtInput.value = '';
        } else {
            throw new Error(data?.message || 'Senden fehlgeschlagen');
        }
    }).catch(err => {
        if (socket && socket.readyState === 1) {
            socket.send(JSON.stringify({ type: 'submit_support_ticket', ...payload }));
            if (statusEl) {
                statusEl.style.color = '#2ecc71';
                statusEl.innerHTML = `✅ Ticket gesendet! Support-E-Mail: <strong>schachlivesupport.jailer914@slmail.me</strong>`;
            }
            const txtInput = document.getElementById('ban-ticket-text');
            if (txtInput) txtInput.value = '';
        } else {
            if (statusEl) {
                statusEl.style.color = '#e74c3c';
                statusEl.innerText = '❌ Senden fehlgeschlagen. Wende dich bitte direkt per E-Mail an schachlivesupport.jailer914@slmail.me';
            }
        }
    });
};

window.requestAdminTicketsRefresh = function() {
    fetch('/api/admin/tickets')
        .then(res => res.json())
        .then(data => {
            if (data && data.tickets) {
                window.renderAdminTickets(data.tickets);
            }
        })
        .catch(err => {
            if (socket && socket.readyState === 1) {
                socket.send(JSON.stringify({ type: 'get_admin_tickets' }));
            }
        });
};

window.renderAdminTickets = function(tickets) {
    const container = document.getElementById('admin-tickets-container');
    if (!container) return;

    if (!tickets || tickets.length === 0) {
        container.innerHTML = `<div style="color: #aaa; text-align: center; font-style: italic; font-size: 0.85em; padding: 10px 0;">Keine Support-Tickets vorhanden.</div>`;
        return;
    }

    container.innerHTML = tickets.map(t => {
        const statusColor = t.status === 'Offen' ? '#e74c3c' : (t.status === 'In Bearbeitung' ? '#f39c12' : (t.status === 'Entbannt' ? '#2ecc71' : '#95a5a6'));
        return `
            <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-left: 4px solid ${statusColor}; border-radius: 6px; padding: 8px 10px; margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <span style="font-weight: bold; color: #fff; font-size: 0.85em;">👤 ${escapeHtml(t.user)} <span style="font-size: 0.75em; color: #888;">(${escapeHtml(t.id)})</span></span>
                    <span style="background: ${statusColor}; color: white; padding: 1px 6px; border-radius: 10px; font-size: 0.7em; font-weight: bold;">${escapeHtml(t.status || 'Offen')}</span>
                </div>
                <div style="font-size: 0.75em; color: #aaa; margin-bottom: 4px;">Kontakt: ${escapeHtml(t.contact || t.email || 'N/A')} ${t.clientIP ? `| IP: ${escapeHtml(t.clientIP)}` : ''} | ${escapeHtml(t.createdAt || '')}</div>
                <div style="font-size: 0.8em; color: #ddd; background: rgba(0,0,0,0.3); padding: 6px; border-radius: 4px; margin-bottom: 6px;">${escapeHtml(t.text)}</div>
                ${t.banReason ? `<div style="font-size: 0.75em; color: #ff9999; margin-bottom: 4px;">Bann-Grund: ${escapeHtml(t.banReason)}</div>` : ''}
                ${t.reply ? `<div style="font-size: 0.75em; color: #2ecc71; margin-bottom: 4px;">Antwort: ${escapeHtml(t.reply)}</div>` : ''}
                <div style="display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap;">
                    ${t.status !== 'Entbannt' ? `<button type="button" data-admin-action="unban-ticket" data-ticket-id="${encodeURIComponent(t.id || '')}" data-target="${encodeURIComponent(t.user || '')}" style="background: #27ae60; color: white; border: none; padding: 3px 8px; border-radius: 4px; font-size: 0.7em; cursor: pointer; font-weight: bold;">🔓 Entbannen &amp; Genehmigen</button>` : ''}
                    <button type="button" data-admin-action="reply-ticket" data-ticket-id="${encodeURIComponent(t.id || '')}" style="background: #3498db; color: white; border: none; padding: 3px 8px; border-radius: 4px; font-size: 0.7em; cursor: pointer;">💬 Antworten</button>
                    ${t.status !== 'Abgelehnt' ? `<button type="button" data-admin-action="reject-ticket" data-ticket-id="${encodeURIComponent(t.id || '')}" style="background: #e74c3c; color: white; border: none; padding: 3px 8px; border-radius: 4px; font-size: 0.7em; cursor: pointer;">❌ Ablehnen</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
};

window.unbanTicket = function(ticketId, username) {
    const runUnban = () => {
        fetch('/api/admin/unban-ticket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticketId, reply: 'Entbannungsantrag genehmigt! Account & IP wurden freigeschaltet.' })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success && window.showInAppNotification) {
                window.showInAppNotification("Admin", data.message || `Ticket ${ticketId} erfolgreich entbannt!`, "success");
            }
            window.requestAdminTicketsRefresh();
            if (window.requestAdminUsersRefresh) window.requestAdminUsersRefresh();
        })
        .catch(() => {
            if (socket && socket.readyState === 1) {
                socket.send(JSON.stringify({ type: 'unban_ticket', ticketId, reply: 'Entbannungsantrag genehmigt!' }));
            }
        });
    };
    if (typeof window.showGameRequestModal === 'function') {
        window.showGameRequestModal("🔓", "Ticket genehmigen", `Möchtest du Ticket ${ticketId} genehmigen und '${username}' entsperren?`, "Entsperren", "Abbrechen", runUnban, () => {});
    } else {
        runUnban();
    }
};

window.rejectTicket = function(ticketId) {
    window.showInAppPrompt("Ticket ablehnen", "Grund für die Ablehnung des Support-Tickets:", "Entbannungsantrag abgelehnt.", (reason) => {
        fetch('/api/admin/reply-ticket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticketId, reply: reason, status: 'Abgelehnt' })
        }).then(() => window.requestAdminTicketsRefresh());
    });
};

window.replyToTicket = function(ticketId) {
    window.showInAppPrompt("Ticket beantworten", "Antwort / Statusänderung für Support-Ticket:", "", (reply) => {
        if (!reply || !reply.trim()) return;
        fetch('/api/admin/reply-ticket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticketId, reply, status: 'Beantwortet' })
        }).then(() => window.requestAdminTicketsRefresh());
    });
};

window.setUserRole = function(username, role) {
    if (socket && socket.readyState === 1) {
        socket.send(JSON.stringify({ type: 'set_user_role', target: username, role: role }));
        window.showInAppNotification("Admin", `Rolle von ${username} auf ${role} geändert.`, "success");
    }
};

window.adminBanUser = function(username) {
    if (typeof openBanReasonModal === 'function') {
        openBanReasonModal(username);
    } else {
        window.showInAppPrompt("Spieler bannen", `Bann-Grund für ${username}:`, "Admin-Entscheidung", (reason) => {
            if (reason && socket && socket.readyState === 1) {
                socket.send(JSON.stringify({ type: 'admin_ban_user', target: username, reason: reason }));
                window.showInAppNotification("Admin", `Bann für ${username} gesendet.`, "warning");
            }
        });
    }
};

window.adminUnbanUser = function(username) {
    if (socket && socket.readyState === 1) {
        socket.send(JSON.stringify({ type: 'admin_unban_user', target: username }));
        socket.send(JSON.stringify({ type: 'chat_message', username: getMyName(), content: `/unban ${username}` }));
        window.showInAppNotification("Admin", `Entbannung für ${username} gesendet.`, "info");
        setTimeout(() => {
            if (window.requestAdminUsersRefresh) window.requestAdminUsersRefresh();
            if (window.requestAdminTicketsRefresh) window.requestAdminTicketsRefresh();
        }, 500);
    }
};

window.openBanReasonModal = function(username) {
    let modal = document.getElementById('ban-reason-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'ban-reason-modal';
        modal.className = 'modal-overlay';
        modal.style.cssText = 'display: flex; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(5px); z-index: 999999; justify-content: center; align-items: center; padding: 15px;';
        modal.innerHTML = `
        <div class="modal-box" style="max-width: 440px; width: 90%; border: 1px solid rgba(231, 76, 60, 0.5); background: #181c24; padding: 25px; border-radius: 12px; text-align: center; color: white; position: relative;">
            <span class="close-modal" data-action="closeBanReasonModal" style="position: absolute; top: 10px; right: 14px; font-size: 24px; cursor: pointer; color: #888;">&times;</span>
            <h3 style="color: #e74c3c; margin-top: 0; margin-bottom: 8px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                <span>🔨</span> Spieler bannen
            </h3>
            <p style="color: #bdc3c7; font-size: 0.85em; margin-bottom: 15px;">
                Einen Grund für den Bann von <strong id="ban-reason-target-name" style="color: #3498db;">${escapeHtml(username)}</strong> eingeben:
            </p>
            <input type="hidden" id="ban-reason-target-input" value="${escapeHtml(username)}">
            <div style="margin-bottom: 15px; text-align: left;">
                <label style="display: block; font-size: 0.8em; color: #aaa; margin-bottom: 5px;">Bann-Grund:</label>
                <textarea id="ban-reason-text-input" class="auth-input" style="width: 100%; height: 80px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: rgba(10, 10, 15, 0.5); color: white; padding: 10px; font-family: inherit; box-sizing: border-box; resize: vertical;" placeholder="z. B. Beleidigung im Chat, Cheating, Spam..."></textarea>
            </div>
            <div style="display: flex; gap: 10px;">
                <button type="button" style="flex: 1; background: #7f8c8d; color: white; padding: 10px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;" data-action="closeBanReasonModal" class="glass-btn">Abbrechen</button>
                <button type="button" style="flex: 1; color: white; padding: 10px; border-radius: 6px; cursor: pointer; font-weight: bold;" data-action="submitBanWithReasonModal" class="glass-btn danger">Bannen ausführen</button>
            </div>
        </div>`;
        document.body.appendChild(modal);
    } else {
        const targetText = document.getElementById('ban-reason-target-name');
        const targetInput = document.getElementById('ban-reason-target-input');
        if (targetText) targetText.innerText = username;
        if (targetInput) targetInput.value = username;
        modal.style.display = 'flex';
    }

    const reasonInput = document.getElementById('ban-reason-text-input');
    if (reasonInput) {
        reasonInput.value = '';
        reasonInput.focus();
    }
};

window.closeBanReasonModal = function() {
    const modal = document.getElementById('ban-reason-modal');
    if (modal) modal.remove();
};

window.submitBanWithReasonModal = function() {
    const targetInput = document.getElementById('ban-reason-target-input');
    const reasonInput = document.getElementById('ban-reason-text-input');
    const username = targetInput ? targetInput.value : '';
    const reason = reasonInput ? reasonInput.value.trim() || 'Admin-Entscheidung' : 'Admin-Entscheidung';

    if (!username) return;

    window.executeBanUser(username, reason);
    window.closeBanReasonModal();
};

window.executeBanUser = function(username, reason) {
    const ws = window.socket || (typeof socket !== 'undefined' ? socket : null);
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'admin_ban_user',
            target: username,
            reason: reason
        }));
        ws.send(JSON.stringify({ type: 'chat', text: `/ban "${username}" ${reason}` }));
    } else if (typeof window.showInAppNotification === 'function') {
        window.showInAppNotification("Verbindung", "Du bist nicht mit dem Server verbunden!", "warning");
    }
};

window.banUserAdmin = function(username) {
    window.openBanReasonModal(username);
};

window.toggleAdminLogsPanel = function() {
    const container = document.getElementById('admin-logs-container');
    const arrow = document.getElementById('admin-logs-arrow');
    if (!container) return;

    if (container.style.display === 'none' || !container.style.display) {
        container.style.display = 'block';
        if (arrow) arrow.innerText = '▲';
        window.requestAdminLogsRefresh();
    } else {
        container.style.display = 'none';
        if (arrow) arrow.innerText = '▼';
    }
};

window.requestAdminLogsRefresh = function() {
    const ws = window.socket || (typeof socket !== 'undefined' ? socket : null);
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'get_admin_logs' }));
    }
};

window.renderAdminLogs = function(logs) {
    const listEl = document.getElementById('admin-logs-list');
    if (!listEl) return;

    if (!logs || !Array.isArray(logs) || logs.length === 0) {
        listEl.innerHTML = '<div style="color: #aaa; text-align: center; font-style: italic; padding: 10px 0;">Keine verdächtigen Bann-Versuche protokolliert.</div>';
        return;
    }

    listEl.innerHTML = '';
    logs.forEach(log => {
        const div = document.createElement('div');
        div.style.background = 'rgba(231, 76, 60, 0.12)';
        div.style.borderLeft = '3px solid #e74c3c';
        div.style.padding = '8px 10px';
        div.style.borderRadius = '4px';
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.gap = '2px';

        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; font-weight: bold; color: #ff6b6b;">
                <span>🛡️ Angriff auf Admin: ${escapeHtml(log.targetAdminId || 'Admin')}</span>
                <span style="font-size: 0.75em; color: #aaa; font-weight: normal;">${escapeHtml(log.formattedTime || log.timestamp || '')}</span>
            </div>
            <div style="color: #ddd; font-size: 0.85em;">
                <strong>Verursacher (User-ID):</strong> ${escapeHtml(log.executorId || log.executorName || 'Unbekannt')}
            </div>
            <div style="color: #bbb; font-size: 0.8em;">
                <strong>Grund / Parameter:</strong> ${escapeHtml(log.reason || 'Keine Angabe')}
            </div>
        `;
        listEl.appendChild(div);
    });
};

// --- GLOBALE VARIABLEN & SHIM (KÖNIG- & TEXTUR-DEFINITIONEN) ---
function findKing(turnColor) {
    if (typeof board === 'undefined' || !board || !Array.isArray(board)) return null;
    const color = turnColor || (typeof turn !== 'undefined' ? turn : "white");
    const target = color === "white" ? "K" : "k";
    for (let r = 0; r < 8; r++) {
        if (!board[r]) continue;
        for (let c = 0; c < 8; c++) {
            if (board[r][c] === target) return { r, c };
        }
    }
    return null;
}

const PIECES = {
    'P': 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg', 'R': 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
    'N': 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg', 'B': 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
    'Q': 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg', 'K': 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg',
    'p': 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg', 'r': 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
    'n': 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg', 'b': 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
    'q': 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg', 'k': 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg'
};

const PIECE_THEMES = {
    classic: PIECES,
    goldsilver: {
        'P': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/anarcandy/wP.svg',
        'R': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/anarcandy/wR.svg',
        'N': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/anarcandy/wN.svg',
        'B': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/anarcandy/wB.svg',
        'Q': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/anarcandy/wQ.svg',
        'K': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/anarcandy/wK.svg',
        'p': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/anarcandy/bP.svg',
        'r': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/anarcandy/bR.svg',
        'n': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/anarcandy/bN.svg',
        'b': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/anarcandy/bB.svg',
        'q': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/anarcandy/bQ.svg',
        'k': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/anarcandy/bK.svg'
    },
    neon: {
        'P': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/pirouetti/wP.svg',
        'R': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/pirouetti/wR.svg',
        'N': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/pirouetti/wN.svg',
        'B': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/pirouetti/wB.svg',
        'Q': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/pirouetti/wQ.svg',
        'K': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/pirouetti/wK.svg',
        'p': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/pirouetti/bP.svg',
        'r': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/pirouetti/bR.svg',
        'n': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/pirouetti/bN.svg',
        'b': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/pirouetti/bB.svg',
        'q': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/pirouetti/bQ.svg',
        'k': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/pirouetti/bK.svg'
    },
    vintage: {
        'P': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/caliente/wP.svg',
        'R': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/caliente/wR.svg',
        'N': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/caliente/wN.svg',
        'B': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/caliente/wB.svg',
        'Q': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/caliente/wQ.svg',
        'K': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/caliente/wK.svg',
        'p': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/caliente/bP.svg',
        'r': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/caliente/bR.svg',
        'n': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/caliente/bN.svg',
        'b': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/caliente/bB.svg',
        'q': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/caliente/bQ.svg',
        'k': 'https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/caliente/bK.svg'
    }
};

const textures = PIECES;
const texture = PIECES;

if (typeof window !== 'undefined') {
    window.findKing = findKing;
    window.PIECES = PIECES;
    window.textures = textures;
    window.texture = texture;
}
if (typeof globalThis !== 'undefined') {
    globalThis.findKing = findKing;
    globalThis.PIECES = PIECES;
    globalThis.textures = textures;
    globalThis.texture = texture;
}
if (typeof self !== 'undefined') {
    self.findKing = findKing;
    self.PIECES = PIECES;
    self.textures = textures;
    self.texture = texture;
}

const boardEl = document.getElementById("chess-board");
const statusEl = document.getElementById("status-display");
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
// --- FARBWAHL LOGIK (Safe and persistent binding initialized in initCustomizationControls) ---
// Diese Funktion wird aufgerufen, wenn der Balken bei 100% ist
function onVideoReady(videoUrl, promptText) {
    const statusEl = document.getElementById("videoStatus"); // Das Textfeld unter dem Button
    const container = document.getElementById("videoResultContainer"); // Ein Container für das Ergebnis

    if (statusEl) {
        statusEl.innerHTML = "✅ Video fertig erstellt!";
    }

    if (container) {
        const safeUrl = sanitizeVideoUrl(videoUrl);
        container.innerHTML = `
            <div class="video-success-box">
                <p>🎬 <strong>Dein Video:</strong> ${escapeHtml(promptText)}</p>
                ${safeUrl ? `<button type="button" data-play-video="${encodeURIComponent(safeUrl)}" class="play-btn">▶ JETZT ANSEHEN</button>` : ''}
            </div>
        `;
    }
}

const gameModeSelect = document.getElementById("gameMode");
const nameInput = document.getElementById("playerName");
const passInput = document.getElementById("playerPass"); // Neu für Passwort
let illegalMoveCount = 0;
let opponentName = "Unbekannt"; // Diese Zeile neu einfügen
let onlineRoom = ""; // Hier wird sie erstellt
let myColor = "white"; // Hier wird sie erstellt
let botColor = "black";
window.isTacticalPuzzleMode = false;
let lastMove = null;
let premove = null;

// Chess.com Pro Engine State
let isBoardFlipped = false;
let moveSnapshots = [];
let viewPly = -1; // -1 = live board
let drawArrows = [];
let highlightSquares = {};
let hintMoveSquares = null;
let currentEvalCp = 0.0;
let currentEvalMate = null;
let evalRequestCounter = 0;
let pendingEvalByPly = {};
let pendingHintEvalId = null;
let currentOpening = null;
let gameEnded = false;
let activeVariant = 'standard';
let pendingStockfishFallbackTimer = null;
let lastSecondTickPlayed = -1;
let trainerActive = false;
let trainerRepertoireId = localStorage.getItem('trainer_repertoire_id') || 'sicilian_main';

let whiteTime = 600;
let blackTime = 600;
let timeInc = 0;
let timerInterval = null;

function formatTime(secs) {
    if (secs === Infinity || secs === 'unlimited' || secs === undefined || secs === null || isNaN(secs)) return '∞';
    const safe = Math.max(0, Number(secs));
    if (safe < 20) {
        const m = Math.floor(safe / 60);
        const s = (safe % 60).toFixed(1).padStart(4, '0');
        return `${m}:${s}`;
    }
    const totalSecs = Math.floor(safe);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    const tcSelect = document.getElementById("timeControl");
    const tc = tcSelect ? tcSelect.value : "unlimited";
    if (tc === 'unlimited' || whiteTime === Infinity || blackTime === Infinity || isNaN(whiteTime) || gameEnded) {
        updateTimerUI();
        return;
    }
    let lastTick = performance.now();
    lastSecondTickPlayed = -1;
    timerInterval = setInterval(() => {
        if (gameEnded) {
            clearInterval(timerInterval);
            return;
        }
        const now = performance.now();
        const dt = Math.min(0.5, (now - lastTick) / 1000);
        lastTick = now;

        if (turn === 'white') {
            if (whiteTime > 0) {
                whiteTime = Math.max(0, whiteTime - dt);
                if (whiteTime < 10 && whiteTime > 0) {
                    const secInt = Math.ceil(whiteTime);
                    if (secInt !== lastSecondTickPlayed) {
                        lastSecondTickPlayed = secInt;
                        window.SoundEngine?.playClockTickSound();
                    }
                }
                if (whiteTime <= 0) { whiteTime = 0; handleTimeout('Weiß'); }
            }
        } else {
            if (blackTime > 0) {
                blackTime = Math.max(0, blackTime - dt);
                if (blackTime < 10 && blackTime > 0) {
                    const secInt = Math.ceil(blackTime);
                    if (secInt !== lastSecondTickPlayed) {
                        lastSecondTickPlayed = secInt;
                        window.SoundEngine?.playClockTickSound();
                    }
                }
                if (blackTime <= 0) { blackTime = 0; handleTimeout('Schwarz'); }
            }
        }
        updateTimerUI();
    }, 100);
}

function updateTimerUI() {
    const wtEl = document.getElementById('time-white');
    const btEl = document.getElementById('time-black');
    if (wtEl) wtEl.innerText = formatTime(whiteTime);
    if (btEl) btEl.innerText = formatTime(blackTime);

    const wClock = document.getElementById('clock-white');
    const bClock = document.getElementById('clock-black');
    const wBar = document.getElementById('player-bar-white');
    const bBar = document.getElementById('player-bar-black');

    if (wClock && bClock) {
        if (turn === 'white' && !gameEnded) {
            wClock.classList.add('active');
            bClock.classList.remove('active');
            if (wBar) wBar.classList.add('active-turn');
            if (bBar) bBar.classList.remove('active-turn');
        } else if (!gameEnded) {
            bClock.classList.add('active');
            wClock.classList.remove('active');
            if (bBar) bBar.classList.add('active-turn');
            if (wBar) wBar.classList.remove('active-turn');
        } else {
            wClock.classList.remove('active');
            bClock.classList.remove('active');
            if (wBar) wBar.classList.remove('active-turn');
            if (bBar) bBar.classList.remove('active-turn');
        }

        if (whiteTime !== Infinity && !isNaN(whiteTime) && whiteTime < 20) wClock.classList.add('low-time');
        else wClock.classList.remove('low-time');

        if (blackTime !== Infinity && !isNaN(blackTime) && blackTime < 20) bClock.classList.add('low-time');
        else bClock.classList.remove('low-time');
    }
}

function handleTimeout(color) {
    if (gameEnded) return;
    gameEnded = true;
    if (timerInterval) clearInterval(timerInterval);
    const winner = color === 'Weiß' ? 'Schwarz' : 'Weiß';
    window.SoundEngine?.playMateSound();
    showCheckmateModal(winner, `Zeit abgelaufen (${color})!`);

    const ws = window.socket || (typeof socket !== 'undefined' ? socket : null);
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'game_over', reason: 'timeout', text: `${color} hat keine Zeit mehr! ${winner} gewinnt.` }));
        if ((myColor === "white" && winner === "Weiß") || (myColor === "black" && winner === "Schwarz") || (typeof gameModeSelect !== 'undefined' && gameModeSelect && gameModeSelect.value === 'local')) {
            const pName = getMyName();
            if (pName) {
                const moves = typeof moveHistoryLog !== 'undefined' ? moveHistoryLog.length : 0;
                const mode = gameModeSelect ? gameModeSelect.value : 'local';
                ws.send(JSON.stringify({ type: 'win', name: pName, movesCount: moves, gameMode: mode }));
            }
        }
    }
}

function showCheckmateModal(winnerName, reason = "Schachmatt!") {
    const modal = document.getElementById('checkmate-modal');
    const winnerText = document.getElementById('checkmate-winner-text');
    const title = document.querySelector('.checkmate-title');
    const iconEl = document.getElementById('checkmate-icon');
    const accEl = document.getElementById('checkmate-accuracy-summary');

    if (modal && winnerText && title) {
        title.innerText = reason;
        const isDraw = winnerName === 'Remis' || winnerName === 'Unentschieden';
        if (iconEl) {
            if (isDraw) iconEl.innerText = '🤝';
            else if (reason.toLowerCase().includes('zeit')) iconEl.innerText = '⏱️';
            else iconEl.innerText = '👑';
        }
        winnerText.innerText = isDraw ? 'Die Partie endet Remis (½–½).' : `${winnerName} gewinnt die Partie!`;

        if (accEl && window.EvalEngine && moveSnapshots.length >= 2) {
            const evalArr = moveSnapshots.map(s => Number(s.evalAfter ?? s.evalBefore ?? 0));
            const acc = window.EvalEngine.calculateMatchAccuracy(evalArr);
            const openText = currentOpening ? `${currentOpening.eco} · ${currentOpening.name}` : 'Freie Eröffnung';
            accEl.style.display = 'block';
            accEl.innerHTML = `
                <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                    <span>⚪ Genauigkeit Weiß: <strong style="color:#81b64c;">${acc.whiteAccuracy}%</strong></span>
                    <span>⚫ Schwarz: <strong style="color:#f1c40f;">${acc.blackAccuracy}%</strong></span>
                </div>
                <div style="color:#bab8b5; font-size:0.8rem;">📖 ${escapeHtml(openText)} • ${moveHistoryLog.length} Halbzüge</div>
            `;
        } else if (accEl) {
            accEl.style.display = 'none';
        }

        modal.style.display = 'flex';
        if (!isDraw && typeof showConfetti === 'function') {
            showConfetti();
        }
    }
}

let isGlobalLocked = false;
// FÜGE ES HIER EIN:
// 1. Einmalig beim Laden der Seite einen festen Zufallsnamen erstellen
const fixedRandomName = "Spieler_" + Math.floor(Math.random() * 10000);

function getMyName() { 
    // 1. Wenn eingeloggt, nimm den gespeicherten Namen aus dem localStorage
    const savedName = localStorage.getItem("customUsername") || localStorage.getItem("playerName");
    if (savedName && savedName.trim() !== "") {
        return savedName.trim();
    }
    // 2. Ansonsten gib den festen Gastnamen für diese Session zurück
    return fixedRandomName; 
}

function getMyPass() { 
    return (passInput && passInput.value) || ""; 
}
let pingStart;

function startPingCheck() {
    setInterval(() => {
        // Prüfen, ob der WebSocket (socket) existiert und offen ist
        if (window.socket && window.socket.readyState === WebSocket.OPEN) {
            pingStart = performance.now(); 
            window.socket.send(JSON.stringify({ type: 'ping' }));
        } else {
            const statusEl = document.getElementById('server-status');
            if (statusEl) {
                statusEl.innerText = "Offline";
                statusEl.style.color = "red";
            }
        }
    }, 5000); // Alle 5 Sekunden prüfen
}

// Starte die Prüfung
startPingCheck();
// NEU: Wir nutzen let und warten auf die index.html
async function getIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        if (!response.ok) return "Nicht erkannt";
        const ipData = await response.json();
        return ipData.ip || "Nicht erkannt";
    } catch(e) {
        return "Nicht erkannt";
    }
}

// --- 1. KONFIGURATION ---
// Variable für DEINEN Bot -> nutzt DEINE Datei
let myEngineWorker = new Worker('engineWorker.js'); 

// Variable für STOCKFISH -> nutzt die NEUE Datei mit Cache-Buster, um alte fehlerhafte Versionen zu umgehen
let stockfishWorker = new Worker('stockfishWorker.js?v=10.0.2');
stockfishWorker.postMessage('uci');
stockfishWorker.postMessage('setoption name Skill Level value 20');
stockfishWorker.postMessage('setoption name Hash value 32');
stockfishWorker.postMessage('isready');
const RENDER_SERVER = 'mein-schach2.onrender.com';
const isGitHubPages = typeof window !== 'undefined' && window.location.hostname.includes('github.io');

const wsProtocol = (typeof window !== 'undefined' && (window.location.protocol === 'https:' || isGitHubPages)) ? 'wss:' : 'ws:';
const wsHost = isGitHubPages ? RENDER_SERVER : (typeof window !== 'undefined' ? window.location.host : RENDER_SERVER);
const apiBase = isGitHubPages ? `https://${RENDER_SERVER}` : '';
const wsQuery = (typeof window !== 'undefined' && window.location.search) ? window.location.search : '';

const socket = new WebSocket(`${wsProtocol}//${wsHost}${wsQuery}`);
window.socket = socket;
window.apiBase = apiBase;
let isSpectatorMode = false;

// Pre-fill username from URL if present (e.g. ?user=Max or ?player=Max) without granting admin
if (typeof window !== 'undefined' && window.location.search) {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlUser = urlParams.get('user') || urlParams.get('player') || urlParams.get('name');
        if (urlUser) {
            document.addEventListener('DOMContentLoaded', () => {
                const pInput = document.getElementById('playerName');
                if (pInput && !localStorage.getItem('playerName')) {
                    pInput.value = urlUser;
                }
            });
        }
    } catch (e) {
        console.warn("URL parse error:", e);
    }
}

const sounds = {
    move: new Audio('https://images.chesscomfiles.com/chess-themes/pieces/neo/sounds/move-self.mp3'),
    cap: new Audio('https://images.chesscomfiles.com/chess-themes/pieces/neo/sounds/capture.mp3'),
    check: new Audio('https://images.chesscomfiles.com/chess-themes/pieces/neo/sounds/move-check.mp3')
};

let board, turn = "white", selected = null, history = [];
let moveHistoryLog = [];

// --- SPEZIALZUG VARIABLEN ---
let hasMoved = {
    whiteK: false, whiteR1: false, whiteR8: false,
    blackK: false, blackR1: false, blackR8: false
};
let enPassantTarget = null; 

// --- REMIS-VARIABLEN ---
let halfMoveClock = 0; // Für die 50-Züge-Regel
let positionHistory = {}; // Für die 3-fache Wiederholung

// --- SCHACH REGELN & HILFSFUNKTIONEN ---
function isOwn(p, turnColor) {
    if (!p) return false;
    return turnColor === "white" ? p === p.toUpperCase() : p === p.toLowerCase();
}
window.isOwn = isOwn;

function isPathClear(fr, fc, tr, tc) {
    const dr = Math.sign(tr - fr);
    const dc = Math.sign(tc - fc);
    let r = fr + dr;
    let c = fc + dc;
    while (r !== tr || c !== tc) {
        if (board[r][c] !== "") return false;
        r += dr;
        c += dc;
    }
    return true;
}

function isAttacked(tr, tc, attackerColor) {
    if (!board) return false;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            if (p && isOwn(p, attackerColor)) {
                const dr = tr - r;
                const dc = tc - c;
                const ar = Math.abs(dr);
                const ac = Math.abs(dc);
                const type = p.toLowerCase();
                let canAttack = false;
                if (type === 'p') {
                    const dir = p === 'P' ? -1 : 1;
                    if (ac === 1 && dr === dir) canAttack = true;
                } else if (type === 'r') {
                    if ((r === tr || c === tc) && isPathClear(r, c, tr, tc)) canAttack = true;
                } else if (type === 'b') {
                    if (ar === ac && isPathClear(r, c, tr, tc)) canAttack = true;
                } else if (type === 'q') {
                    if ((r === tr || c === tc || ar === ac) && isPathClear(r, c, tr, tc)) canAttack = true;
                } else if (type === 'n') {
                    if ((ar === 2 && ac === 1) || (ar === 1 && ac === 2)) canAttack = true;
                } else if (type === 'k') {
                    if (ar <= 1 && ac <= 1) canAttack = true;
                }
                if (canAttack) return true;
            }
        }
    }
    return false;
}

let evalWorker = null;
try {
    if (typeof Worker !== 'undefined') {
        evalWorker = new Worker('engineWorker.js');
        evalWorker.onmessage = (e) => {
            const res = e.data;
            if (!res || res.type !== 'eval_result') return;

            if (pendingHintEvalId !== null && res.evalId === pendingHintEvalId) {
                pendingHintEvalId = null;
                if (res.bestMove) {
                    const bm = res.bestMove;
                    hintMoveSquares = { fr: bm.fr, fc: bm.fc, tr: bm.tr, tc: bm.tc };
                    if (!Array.isArray(drawArrows)) drawArrows = [];
                    drawArrows = drawArrows.filter(a => !a.isHint);
                    drawArrows.push({ fr: bm.fr, fc: bm.fc, tr: bm.tr, tc: bm.tc, color: 'blue', isHint: true });
                    draw();
                    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
                    const moveLabel = `${files[bm.fc]}${8 - bm.fr} → ${files[bm.tc]}${8 - bm.tr}`;
                    window.showInAppNotification?.('💡 Zug-Tipp', `Empfohlener Zug: ${moveLabel}`, 'info');
                } else {
                    window.showInAppNotification?.('💡 Zug-Tipp', 'Keine legalen Züge mehr verfügbar.', 'info');
                }
                return;
            }

            const plyIdx = pendingEvalByPly[res.evalId];
            currentEvalCp = Number(res.cp) || 0;
            currentEvalMate = res.mate !== undefined ? res.mate : null;
            updateEvalBarUI(currentEvalCp, currentEvalMate);

            if (plyIdx !== undefined && moveSnapshots[plyIdx]) {
                const snap = moveSnapshots[plyIdx];
                snap.evalAfter = currentEvalCp;
                snap.mate = currentEvalMate;
                if (plyIdx > 0 && window.EvalEngine) {
                    const prevEval = Number(moveSnapshots[plyIdx - 1]?.evalAfter ?? 0);
                    const wasWhite = (plyIdx % 2) === 1;
                    snap.quality = window.EvalEngine.classifyMove(prevEval, currentEvalCp, wasWhite);
                }
                renderInteractiveMoveHistory();
                delete pendingEvalByPly[res.evalId];
            }
        };
    }
} catch (err) {
    console.warn('Eval worker init skipped:', err);
}

function getCurrentCastlingRights() {
    let castling = "";
    if (!hasMoved.whiteK) { if (!hasMoved.whiteR8) castling += "K"; if (!hasMoved.whiteR1) castling += "Q"; }
    if (!hasMoved.blackK) { if (!hasMoved.blackR8) castling += "k"; if (!hasMoved.blackR1) castling += "q"; }
    return castling;
}

function requestLiveEval(plyIdx) {
    if (!evalWorker || !board) return;
    evalRequestCounter++;
    pendingEvalByPly[evalRequestCounter] = plyIdx;
    evalWorker.postMessage({
        action: 'eval',
        evalId: evalRequestCounter,
        board,
        turn,
        castling: getCurrentCastlingRights(),
        enPassantTarget
    });
}

window.requestHintMove = function() {
    if (gameEnded) {
        window.showInAppNotification?.('Zug-Tipp', 'Die Partie ist bereits beendet.', 'info');
        return;
    }
    if (window.isReplayMode) {
        window.showInAppNotification?.('Zug-Tipp', 'Im Replay-Modus nicht verfügbar.', 'info');
        return;
    }
    if (!evalWorker || !board) {
        const legal = getAllLegalMoves(turn);
        if (legal.length > 0) {
            const m = legal[0];
            hintMoveSquares = { fr: m.fr, fc: m.fc, tr: m.tr, tc: m.tc };
            drawArrows = (drawArrows || []).filter(a => !a.isHint);
            drawArrows.push({ fr: m.fr, fc: m.fc, tr: m.tr, tc: m.tc, color: 'blue', isHint: true });
            draw();
        }
        return;
    }
    evalRequestCounter++;
    pendingHintEvalId = evalRequestCounter;
    evalWorker.postMessage({
        action: 'eval',
        evalId: evalRequestCounter,
        board,
        turn,
        castling: getCurrentCastlingRights(),
        enPassantTarget
    });
};

function syncSoundButtonUI() {
    const enabled = window.SoundEngine && typeof window.SoundEngine.isSoundEnabled === 'function'
        ? window.SoundEngine.isSoundEnabled()
        : localStorage.getItem('sound_enabled') !== 'false';
    const btn = document.getElementById('soundToggleBtn');
    if (btn) {
        btn.textContent = enabled ? '🔊 Ton' : '🔇 Stumm';
        btn.style.opacity = enabled ? '1' : '0.72';
    }
}
window.syncSoundButtonUI = syncSoundButtonUI;

window.toggleSoundEnabled = function() {
    const currentlyEnabled = window.SoundEngine && typeof window.SoundEngine.isSoundEnabled === 'function'
        ? window.SoundEngine.isSoundEnabled()
        : localStorage.getItem('sound_enabled') !== 'false';
    const nextEnabled = !currentlyEnabled;
    if (window.SoundEngine && typeof window.SoundEngine.setSoundEnabled === 'function') {
        window.SoundEngine.setSoundEnabled(nextEnabled);
    } else {
        try { localStorage.setItem('sound_enabled', nextEnabled ? 'true' : 'false'); } catch (e) {}
    }
    syncSoundButtonUI();
    if (nextEnabled) {
        window.SoundEngine?.playMoveSound();
    }
};

function updateEvalBarUI(cp, mate = null) {
    const barContainer = document.getElementById('eval-bar-container');
    const barWhite = document.getElementById('eval-bar-white');
    const labelEl = document.getElementById('eval-score-label');
    if (!barContainer || !barWhite || !labelEl) return;

    const pct = window.EvalEngine ? window.EvalEngine.getWinPercentage(cp, mate) : Math.max(4, Math.min(96, Math.round(50 + cp * 5)));
    const isHoriz = barContainer.classList.contains('eval-horizontal');

    if (isHoriz) {
        barWhite.style.width = `${pct}%`;
        barWhite.style.height = '100%';
    } else {
        barWhite.style.height = `${pct}%`;
        barWhite.style.width = '100%';
    }

    if (mate !== null && mate !== undefined) {
        labelEl.textContent = (mate > 0 ? `+M${mate}` : `-M${Math.abs(mate)}`);
    } else {
        const val = Number(cp) || 0;
        labelEl.textContent = (val > 0 ? '+' : '') + val.toFixed(1);
    }

    if ((mate !== null && mate < 0) || (mate === null && cp < -0.15)) {
        barContainer.classList.add('eval-black-adv');
    } else {
        barContainer.classList.remove('eval-black-adv');
    }
}
window.updateEvalBarUI = updateEvalBarUI;

function canMoveLogic(fr, fc, tr, tc, turnOverride = null) {
    if (!board || fr < 0 || fr > 7 || fc < 0 || fc > 7 || tr < 0 || tr > 7 || tc < 0 || tc > 7) return false;
    if (fr === tr && fc === tc) return false;
    const p = board[fr][fc];
    if (!p) return false;
    const activeTurn = turnOverride || turn;
    if (!isOwn(p, activeTurn)) return false;
    const t = board[tr][tc];
    if (t && isOwn(t, activeTurn)) return false;

    const dr = tr - fr;
    const dc = tc - fc;
    const ar = Math.abs(dr);
    const ac = Math.abs(dc);
    const type = p.toLowerCase();

    if (type === 'p') {
        const dir = p === 'P' ? -1 : 1;
        if (dc === 0 && dr === dir && !t) return true;
        if (dc === 0 && dr === 2 * dir && !t && board[fr + dir][fc] === "" && (p === 'P' ? fr === 6 : fr === 1)) return true;
        if (ac === 1 && dr === dir && t) return true;
        if (ac === 1 && dr === dir && !t && enPassantTarget && enPassantTarget.r === tr && enPassantTarget.c === tc) return true;
        return false;
    }
    if (type === 'r') return (fr === tr || fc === tc) && isPathClear(fr, fc, tr, tc);
    if (type === 'b') return ar === ac && isPathClear(fr, fc, tr, tc);
    if (type === 'q') return (fr === tr || fc === tc || ar === ac) && isPathClear(fr, fc, tr, tc);
    if (type === 'n') return (ar === 2 && ac === 1) || (ar === 1 && ac === 2);
    if (type === 'k') {
        if (ar <= 1 && ac <= 1) return true;
        if (dr === 0 && ac === 2) {
            const opponentColor = activeTurn === "white" ? "black" : "white";
            const expectedRook = activeTurn === "white" ? "R" : "r";
            const expectedRow = activeTurn === "white" ? 7 : 0;
            if (fr !== expectedRow || fc !== 4) return false;
            if (isAttacked(fr, fc, opponentColor)) return false;
            if (tc === 6) {
                if (board[fr][7] === expectedRook && board[fr][5] === "" && board[fr][6] === "" &&
                    !isAttacked(fr, 5, opponentColor) &&
                    !isAttacked(fr, 6, opponentColor)) {
                    return activeTurn === "white" ? (!hasMoved.whiteK && !hasMoved.whiteR8) : (!hasMoved.blackK && !hasMoved.blackR8);
                }
            }
            if (tc === 2) {
                if (board[fr][0] === expectedRook && board[fr][1] === "" && board[fr][2] === "" && board[fr][3] === "" &&
                    !isAttacked(fr, 3, opponentColor) &&
                    !isAttacked(fr, 2, opponentColor)) {
                    return activeTurn === "white" ? (!hasMoved.whiteK && !hasMoved.whiteR1) : (!hasMoved.blackK && !hasMoved.blackR1);
                }
            }
        }
        return false;
    }
    return false;
}

function isSafeMove(fr, fc, tr, tc, turnOverride = null) {
    if (!board) return false;
    const activeTurn = turnOverride || turn;
    const backupPiece = board[tr][tc];
    const piece = board[fr][fc];
    const isEnPassant = piece && piece.toLowerCase() === 'p' && fc !== tc && !backupPiece &&
        enPassantTarget && enPassantTarget.r === tr && enPassantTarget.c === tc;

    let epCaptured = "";
    if (isEnPassant) {
        epCaptured = board[fr][tc];
        board[fr][tc] = "";
    }

    board[tr][tc] = piece;
    board[fr][fc] = "";

    const k = typeof findKing === 'function' ? findKing(activeTurn) : (window.findKing ? window.findKing(activeTurn) : null);
    const opponent = activeTurn === "white" ? "black" : "white";
    const safe = k ? !isAttacked(k.r, k.c, opponent) : true;

    board[fr][fc] = piece;
    board[tr][tc] = backupPiece;
    if (isEnPassant) {
        board[fr][tc] = epCaptured;
    }
    return safe;
}

function getAllLegalMoves(color) {
    const legal = [];
    if (!board) return legal;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c] && isOwn(board[r][c], color)) {
                for (let tr = 0; tr < 8; tr++) {
                    for (let tc = 0; tc < 8; tc++) {
                        if (canMoveLogic(r, c, tr, tc, color) && isSafeMove(r, c, tr, tc, color)) {
                            legal.push({ fr: r, fc: c, tr, tc });
                        }
                    }
                }
            }
        }
    }
    return legal;
}

function isCheckmate(color) {
    const k = typeof findKing === 'function' ? findKing(color) : (window.findKing ? window.findKing(color) : null);
    if (!k || !isAttacked(k.r, k.c, color === "white" ? "black" : "white")) return false;
    return getAllLegalMoves(color).length === 0;
}

function isStalemate(color) {
    const k = typeof findKing === 'function' ? findKing(color) : (window.findKing ? window.findKing(color) : null);
    if (k && isAttacked(k.r, k.c, color === "white" ? "black" : "white")) return false;
    return getAllLegalMoves(color).length === 0;
}

function isInsufficientMaterial() {
    if (!board) return false;
    const pieces = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            if (!p) continue;
            const t = p.toLowerCase();
            if (t === 'q' || t === 'r' || t === 'p') return false;
            if (t !== 'k') pieces.push({ type: t, color: p === p.toUpperCase() ? 'w' : 'b', sqColor: (r + c) % 2 });
        }
    }
    if (pieces.length === 0) return true; // K vs K
    if (pieces.length === 1 && (pieces[0].type === 'n' || pieces[0].type === 'b')) return true; // K+B/N vs K
    if (pieces.length === 2 && pieces[0].type === 'b' && pieces[1].type === 'b' && pieces[0].color !== pieces[1].color && pieces[0].sqColor === pieces[1].sqColor) {
        return true; // K+B vs K+B on same-colored squares
    }
    return false;
}

function getPositionKey() {
    const boardStr = board.map(r => r.map(x => x || '.').join('')).join('/');
    let castling = "";
    if (!hasMoved.whiteK) { if (!hasMoved.whiteR8) castling += "K"; if (!hasMoved.whiteR1) castling += "Q"; }
    if (!hasMoved.blackK) { if (!hasMoved.blackR8) castling += "k"; if (!hasMoved.blackR1) castling += "q"; }
    const ep = enPassantTarget ? `${enPassantTarget.r},${enPassantTarget.c}` : '-';
    return `${boardStr}|${turn}|${castling || '-'}|${ep}`;
}

function applyFlipLayout() {
    const col = document.getElementById('board-area-column');
    if (col) col.classList.toggle('flipped-layout', isBoardFlipped);
    const evalC = document.getElementById('eval-bar-container');
    if (evalC && !evalC.classList.contains('eval-horizontal')) {
        evalC.classList.toggle('flipped-eval', isBoardFlipped);
    }
    if (typeof draw === 'function') draw();
}

function flipBoard() {
    isBoardFlipped = !isBoardFlipped;
    applyFlipLayout();
}
window.flipBoard = flipBoard;

function updateCapturedMaterialUI() {
    if (!window.EvalEngine || !board) return;
    const data = window.EvalEngine.getCapturedAndMaterial(board);
    const glyphsWhite = { P: '♙', N: '♘', B: '♗', R: '♖', Q: '♕' };
    const glyphsBlack = { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛' };

    const capW = document.getElementById('captured-white');
    const capB = document.getElementById('captured-black');
    const matW = document.getElementById('material-white');
    const matB = document.getElementById('material-black');

    if (capW) capW.textContent = data.capturedByWhite.map(p => glyphsBlack[p] || '').join('');
    if (capB) capB.textContent = data.capturedByBlack.map(p => glyphsWhite[p] || '').join('');
    if (matW) matW.textContent = data.whiteLead > 0 ? `+${data.whiteLead}` : '';
    if (matB) matB.textContent = data.blackLead > 0 ? `+${data.blackLead}` : '';
}
window.updateCapturedMaterialUI = updateCapturedMaterialUI;

function playUciMoveOnBoard(uciStr, broadcast = false) {
    if (!uciStr || uciStr.length < 4) return false;
    const fc = uciStr.charCodeAt(0) - 97;
    const fr = 8 - parseInt(uciStr[1], 10);
    const tc = uciStr.charCodeAt(2) - 97;
    const tr = 8 - parseInt(uciStr[3], 10);
    const promo = uciStr[4] ? uciStr[4].toLowerCase() : null;
    if (canMoveLogic(fr, fc, tr, tc, turn) && isSafeMove(fr, fc, tr, tc, turn)) {
        doMove(fr, fc, tr, tc, broadcast, promo);
        return true;
    }
    return false;
}

function syncTrainerUI(statusMessage = '') {
    const toggleBtn = document.getElementById('trainerToggleBtn');
    const statusEl = document.getElementById('trainer-status-text');
    if (toggleBtn) {
        toggleBtn.textContent = trainerActive ? '🎓 Aktiv' : '🎓 Trainer';
        toggleBtn.style.background = trainerActive ? 'rgba(129, 182, 76, 0.25)' : '';
        toggleBtn.style.borderColor = trainerActive ? '#81b64c' : '';
    }
    if (statusEl) {
        if (trainerActive) {
            statusEl.style.display = 'block';
            if (statusMessage) statusEl.textContent = statusMessage;
        } else {
            statusEl.style.display = 'none';
            statusEl.textContent = '';
        }
    }
}

window.toggleOpeningTrainer = function() {
    trainerActive = !trainerActive;
    if (!trainerActive) {
        syncTrainerUI('');
        return;
    }
    const sel = document.getElementById('trainer-repertoire-select');
    if (sel && sel.value) {
        trainerRepertoireId = sel.value;
        try { localStorage.setItem('trainer_repertoire_id', trainerRepertoireId); } catch (e) {}
    }
    const rep = window.OpeningTrainer?.getRepertoire(trainerRepertoireId);
    if (!rep) {
        trainerActive = false;
        syncTrainerUI('');
        return;
    }

    const gm = document.getElementById('gameMode');
    if (gm) gm.value = 'local';
    resetGame(true);
    myColor = rep.side;
    isBoardFlipped = (rep.side === 'black');
    applyFlipLayout();

    syncTrainerUI(`${rep.name} (${rep.side === 'white' ? 'Weiß' : 'Schwarz'}) — Spiele die Theorie!`);
    if (rep.side === 'black' && rep.moves.length > 0) {
        setTimeout(() => {
            if (trainerActive && moveSnapshots.length === 1 && !gameEnded) {
                playUciMoveOnBoard(rep.moves[0], false);
            }
        }, 300);
    }
};

function updateOpeningExplorer() {
    const badge = document.getElementById('opening-name-badge');
    const contBar = document.getElementById('opening-continuations');
    const uciList = moveSnapshots.slice(1).map(s => s.uci).filter(Boolean);

    if (badge && window.OpeningBook) {
        if (uciList.length === 0) {
            currentOpening = null;
            badge.textContent = 'Startstellung';
            badge.title = 'Standard-Schachstellung';
        } else {
            const found = window.OpeningBook.identifyOpening(uciList);
            if (found) {
                currentOpening = found;
                badge.textContent = `${found.eco} · ${found.name}`;
                badge.title = `${found.eco}: ${found.name}`;
            } else if (!currentOpening) {
                badge.textContent = 'Freie Partie';
            }
        }
    }

    if (contBar && window.OpeningBook) {
        if (uciList.length < 14 && !gameEnded && !window.isReplayMode && !window.isTacticalPuzzleMode) {
            const nextList = window.OpeningBook.getBookContinuations(uciList).slice(0, 5);
            if (nextList.length > 0) {
                const esc = typeof escapeHtml === 'function' ? escapeHtml : (s => String(s || ''));
                contBar.innerHTML = nextList.map(m => {
                    const label = m.uci.length >= 4 ? `${m.uci.slice(0, 2)}-${m.uci.slice(2, 4)}` : m.uci;
                    return `<button type="button" class="opening-move-chip" data-opening-uci="${esc(m.uci)}" title="${esc(m.eco + ' ' + m.name)}">${esc(label)} <span style="opacity:0.7;">${esc(m.eco)}</span></button>`;
                }).join('');
                contBar.style.display = 'flex';
            } else {
                contBar.innerHTML = '';
                contBar.style.display = 'none';
            }
        } else {
            contBar.innerHTML = '';
            contBar.style.display = 'none';
        }
    }

    if (trainerActive && window.OpeningTrainer && uciList.length > 0 && !window._suppressEvalAndSound) {
        const rep = window.OpeningTrainer.getRepertoire(trainerRepertoireId);
        if (rep) {
            const lastIdx = uciList.length - 1;
            const moverWasWhite = (lastIdx % 2) === 0;
            const isPlayerMove = (rep.side === 'white' && moverWasWhite) || (rep.side === 'black' && !moverWasWhite);
            if (isPlayerMove) {
                const check = window.OpeningTrainer.validateTrainerMove(trainerRepertoireId, lastIdx, uciList[lastIdx]);
                syncTrainerUI(check.message);
                const statusEl = document.getElementById('trainer-status-text');
                if (statusEl) statusEl.style.color = check.valid ? '#a9d977' : '#f1c40f';
                if (check.valid && !check.isCompleted && check.nextTheoreticalMove) {
                    const expectedReply = check.nextTheoreticalMove;
                    setTimeout(() => {
                        if (trainerActive && !gameEnded && moveSnapshots.length - 1 === uciList.length) {
                            playUciMoveOnBoard(expectedReply, false);
                        }
                    }, 340);
                }
            }
        }
    }
}

window.applySanMoveSilent = function(sanToken) {
    if (!sanToken || !board) return false;
    const cleanSan = String(sanToken).trim().replace(/[+#!?]+$/g, '').replace(/0-0-0/g, 'O-O-O').replace(/0-0/g, 'O-O');
    if (/^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(cleanSan)) {
        const fc = cleanSan.charCodeAt(0) - 97;
        const fr = 8 - parseInt(cleanSan[1], 10);
        const tc = cleanSan.charCodeAt(2) - 97;
        const tr = 8 - parseInt(cleanSan[3], 10);
        const promo = cleanSan[4] ? cleanSan[4].toLowerCase() : null;
        if (canMoveLogic(fr, fc, tr, tc, turn) && isSafeMove(fr, fc, tr, tc, turn)) {
            window._lastMoveWasDrag = true;
            doMove(fr, fc, tr, tc, false, promo);
            return true;
        }
        return false;
    }

    const legal = getAllLegalMoves(turn);
    const promoMatch = cleanSan.match(/=([QRBNDTLS])/i);
    const promoMapDe = { D: 'q', Q: 'q', T: 'r', R: 'r', L: 'b', B: 'b', S: 'n', N: 'n' };
    const promoP = promoMatch ? promoMapDe[promoMatch[1].toUpperCase()] : null;

    for (const m of legal) {
        const p = board[m.fr][m.fc];
        const isCap = board[m.tr][m.tc] !== "" || (p.toLowerCase() === 'p' && enPassantTarget && m.tr === enPassantTarget.r && m.tc === enPassantTarget.c);
        const genDe = getAlgebraicNotation(m.fr, m.fc, m.tr, m.tc, p, isCap, board, promoP, false, false, turn);
        const genEn = genDe.replace('D', 'Q').replace('T', 'R').replace('L', 'B').replace('S', 'N').replace('=D', '=Q').replace('=T', '=R').replace('=L', '=B').replace('=S', '=N');
        if (genDe === cleanSan || genEn === cleanSan) {
            window._lastMoveWasDrag = true;
            doMove(m.fr, m.fc, m.tr, m.tc, false, promoP);
            return true;
        }
    }
    return false;
};

window.buildReplaySnapshots = function(movesList) {
    if (!Array.isArray(movesList) || movesList.length === 0) return 0;
    window._suppressEvalAndSound = true;
    let applied = 0;
    try {
        for (const mv of movesList) {
            if (typeof mv === 'object' && mv.fr !== undefined && mv.fc !== undefined && mv.tr !== undefined && mv.tc !== undefined) {
                window._lastMoveWasDrag = true;
                doMove(mv.fr, mv.fc, mv.tr, mv.tc, false, mv.promotion || null);
                applied++;
            } else if (window.applySanMoveSilent(String(mv))) {
                applied++;
            } else {
                break;
            }
        }
    } finally {
        window._suppressEvalAndSound = false;
    }
    updateCapturedMaterialUI();
    updateOpeningExplorer();
    renderInteractiveMoveHistory();
    requestLiveEval(moveSnapshots.length - 1);
    return applied;
};

function updatePlayerNamesBar() {
    const nw = document.getElementById('name-white');
    const nb = document.getElementById('name-black');
    const mode = gameModeSelect ? gameModeSelect.value : 'local';
    const me = typeof getMyName === 'function' ? getMyName() : 'Spieler';

    if (mode === 'bot') {
        const diffEl = document.getElementById('botDifficulty');
        const diffTxt = diffEl ? diffEl.options[diffEl.selectedIndex]?.text || 'KI' : 'KI';
        if (myColor === 'black') {
            if (nw) nw.textContent = `🤖 ${diffTxt}`;
            if (nb) nb.textContent = me;
        } else {
            if (nw) nw.textContent = me;
            if (nb) nb.textContent = `🤖 ${diffTxt}`;
        }
    } else if (mode === 'online' || mode === 'random') {
        if (myColor === 'white') {
            if (nw) nw.textContent = me;
            if (nb) nb.textContent = opponentName || 'Gegner';
        } else {
            if (nw) nw.textContent = opponentName || 'Gegner';
            if (nb) nb.textContent = me;
        }
    } else {
        if (nw) nw.textContent = 'Spieler Weiß';
        if (nb) nb.textContent = 'Spieler Schwarz';
    }
}

let isAnimating = false;

function doMove(fr, fc, tr, tc, broadcast = true, promoPiece = null) {
    if (gameEnded || !board || fr === undefined || fc === undefined || tr === undefined || tc === undefined) return;
    if (viewPly !== -1) jumpToLive();
    const piece = board[fr][fc];
    if (!piece) return;

    const currentBoardEl = document.getElementById("chess-board") || boardEl;
    const skipAnim = !!window._lastMoveWasDrag;
    window._lastMoveWasDrag = false;
    let animationDuration = 0;

    if (!skipAnim && currentBoardEl && currentBoardEl.children.length >= 64) {
        const startSq = currentBoardEl.querySelector(`[data-r="${fr}"][data-c="${fc}"]`);
        const destSq = currentBoardEl.querySelector(`[data-r="${tr}"][data-c="${tc}"]`);
        const img = startSq ? startSq.querySelector("img") : null;

        if (img && destSq) {
            isAnimating = true;
            animationDuration = 160;

            const startRect = startSq.getBoundingClientRect();
            const destRect = destSq.getBoundingClientRect();
            const dx = destRect.left - startRect.left;
            const dy = destRect.top - startRect.top;

            const destImg = destSq.querySelector("img");
            if (destImg) {
                destImg.style.transition = "all 140ms ease-out";
                destImg.style.transform = "scale(0)";
                destImg.style.opacity = "0";
            }

            if (piece.toLowerCase() === 'p' && enPassantTarget && tr === enPassantTarget.r && tc === enPassantTarget.c && !board[tr][tc]) {
                const epSq = currentBoardEl.querySelector(`[data-r="${fr}"][data-c="${tc}"]`);
                const epImg = epSq ? epSq.querySelector("img") : null;
                if (epImg) {
                    epImg.style.transition = "all 140ms ease-out";
                    epImg.style.transform = "scale(0)";
                    epImg.style.opacity = "0";
                }
            }

            if (piece.toLowerCase() === 'k' && Math.abs(tc - fc) === 2) {
                const rookFc = tc === 6 ? 7 : 0;
                const rookTc = tc === 6 ? 5 : 3;
                const rookSq = currentBoardEl.querySelector(`[data-r="${fr}"][data-c="${rookFc}"]`);
                const targetRookSq = currentBoardEl.querySelector(`[data-r="${fr}"][data-c="${rookTc}"]`);
                const rImg = rookSq ? rookSq.querySelector("img") : null;
                if (rImg && targetRookSq) {
                    const rDx = targetRookSq.getBoundingClientRect().left - rookSq.getBoundingClientRect().left;
                    rImg.style.transition = "transform 160ms cubic-bezier(0.25, 1, 0.5, 1)";
                    rImg.style.transform = `translate(${rDx}px, 0px)`;
                }
            }

            img.style.zIndex = "150";
            img.style.transition = "transform 160ms cubic-bezier(0.25, 1, 0.5, 1)";
            img.style.transform = `translate(${dx}px, ${dy}px)`;
        }
    }

    const finalizeMove = () => {
        isAnimating = false;
        const moverColor = isOwn(piece, "white") ? "white" : "black";
        const isEnPassant = piece.toLowerCase() === 'p' && enPassantTarget && tr === enPassantTarget.r && tc === enPassantTarget.c && !board[tr][tc];
        const isCapture = board[tr][tc] !== "" || isEnPassant;
        const isCastle = piece.toLowerCase() === 'k' && Math.abs(tc - fc) === 2;

        // Snapshot for SAN disambiguation before board changes
        const boardBefore = board.map(r => [...r]);

        history.push({
            board: boardBefore,
            turn,
            hasMoved: { ...hasMoved },
            enPassantTarget,
            halfMoveClock
        });

        let appliedPromo = null;
        let finalPiece = piece;
        if (piece.toLowerCase() === 'p' && (tr === 0 || tr === 7)) {
            const pNorm = (promoPiece && ['q', 'r', 'b', 'n'].includes(String(promoPiece).toLowerCase())) ? String(promoPiece).toLowerCase() : 'q';
            appliedPromo = pNorm;
            finalPiece = moverColor === 'white' ? pNorm.toUpperCase() : pNorm;
        }

        if (isEnPassant) {
            board[fr][tc] = "";
        }

        if (piece.toLowerCase() === 'p' && Math.abs(tr - fr) === 2) {
            enPassantTarget = { r: (fr + tr) / 2, c: fc };
        } else {
            enPassantTarget = null;
        }

        if (isCastle) {
            if (tc === 6) {
                board[fr][5] = board[fr][7];
                board[fr][7] = "";
            } else if (tc === 2) {
                board[fr][3] = board[fr][0];
                board[fr][0] = "";
            }
        }

        if (fr === 7 && fc === 4) hasMoved.whiteK = true;
        if (fr === 7 && fc === 0) hasMoved.whiteR1 = true;
        if (fr === 7 && fc === 7) hasMoved.whiteR8 = true;
        if (fr === 0 && fc === 4) hasMoved.blackK = true;
        if (fr === 0 && fc === 0) hasMoved.blackR1 = true;
        if (fr === 0 && fc === 7) hasMoved.blackR8 = true;

        board[tr][tc] = finalPiece;
        board[fr][fc] = "";
        lastMove = { fr, fc, tr, tc };

        if (piece.toLowerCase() === 'p' || isCapture) halfMoveClock = 0;
        else halfMoveClock++;

        // --- DAILY TACTICAL PUZZLE CHECKER (Server-Authoritative - Fix F6) ---
        if (window.isTacticalPuzzleMode && window.activePuzzle) {
            const ap = window.activePuzzle;
            const pStatus = document.getElementById("puzzle-status") || document.getElementById("modal-puzzle-status");
            if (pStatus) {
                pStatus.innerText = "⏳ Zug wird auf dem Server geprüft...";
                pStatus.style.color = "#f1c40f";
            }
            window.__puzzleAttemptFen = ap.fen;
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'solve_puzzle',
                    playerName: getMyName(),
                    puzzleId: ap.id,
                    move: { fr, fc, tr, tc }
                }));
            } else {
                if (pStatus) {
                    pStatus.innerText = "❌ Keine Server-Verbindung zur Rätsel-Prüfung.";
                    pStatus.style.color = "#e74c3c";
                }
            }
            draw();
            return;
        }

        if (timeInc > 0 && (!onlineRoom || onlineRoom === 'global' || !socket || socket.readyState !== WebSocket.OPEN)) {
            if (turn === "white") whiteTime += timeInc;
            else blackTime += timeInc;
        }

        turn = turn === "white" ? "black" : "white";

        const oppKing = findKing(turn);
        const oppInCheck = oppKing ? isAttacked(oppKing.r, oppKing.c, moverColor) : false;
        const oppMated = oppInCheck ? isCheckmate(turn) : false;
        const oppStalemated = !oppInCheck ? isStalemate(turn) : false;

        // Exact SAN notation
        const notation = getAlgebraicNotation(fr, fc, tr, tc, piece, isCapture, boardBefore, appliedPromo, oppInCheck, oppMated, moverColor);
        const uciMove = String.fromCharCode(97 + fc) + (8 - fr) + String.fromCharCode(97 + tc) + (8 - tr) + (appliedPromo || '');
        const currentFen = typeof boardToFEN === 'function' ? boardToFEN() : '';

        moveHistoryLog.push(notation);
        moveSnapshots.push({
            board: board.map(r => [...r]),
            turn,
            hasMoved: { ...hasMoved },
            enPassantTarget,
            halfMoveClock,
            lastMove: { ...lastMove },
            san: notation,
            uci: uciMove,
            fen: currentFen,
            evalBefore: currentEvalCp,
            evalAfter: currentEvalCp,
            quality: null
        });
        viewPly = -1;

        const posKey = getPositionKey();
        positionHistory[posKey] = (positionHistory[posKey] || 0) + 1;

        // Rich Web Audio Sounds
        if (!window._suppressEvalAndSound) {
            if (oppMated) {
                window.SoundEngine?.playMateSound();
            } else if (oppInCheck) {
                window.SoundEngine?.playCheckSound();
            } else if (isCastle) {
                window.SoundEngine?.playCastleSound();
            } else if (appliedPromo) {
                window.SoundEngine?.playPromoteSound();
            } else if (isCapture) {
                window.SoundEngine?.playCaptureSound();
            } else {
                window.SoundEngine?.playMoveSound();
            }
        }

        drawArrows = [];
        highlightSquares = {};
        hintMoveSquares = null;

        if (!window._suppressEvalAndSound) {
            sendeAnAnalyse(fr, fc, tr, tc, finalPiece, isCapture);
            renderInteractiveMoveHistory();
            updateOpeningExplorer();
            updateCapturedMaterialUI();
            requestLiveEval(moveSnapshots.length - 1);
        }

        const sEl = document.getElementById("status-display") || statusEl;
        if (sEl) {
            if (oppMated) sEl.textContent = `Schachmatt! ${moverColor === 'white' ? 'Weiß' : 'Schwarz'} gewinnt.`;
            else if (oppInCheck) sEl.textContent = (turn === "white" ? "Weiß" : "Schwarz") + " steht im SCHACH!";
            else sEl.textContent = (turn === "white" ? "Weiß" : "Schwarz") + " am Zug";
        }

        updateTimerUI();

        if (broadcast && socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'move',
                room: onlineRoom,
                fr, fc, tr, tc,
                piece: finalPiece,
                promotion: appliedPromo,
                turn,
                fen: currentFen
            }));
        }

        if (!window._suppressEvalAndSound) {
            draw();
        }

        // Check KOTH victory
        const kothCenter = (r, c) => (r === 3 || r === 4) && (c === 3 || c === 4);
        if (activeVariant === 'koth' && piece.toLowerCase() === 'k' && kothCenter(tr, tc)) {
            gameEnded = true;
            if (timerInterval) clearInterval(timerInterval);
            const winner = moverColor === "white" ? "Weiß" : "Schwarz";
            window.SoundEngine?.playMateSound();
            showCheckmateModal(winner, "King of the Hill!");
            return;
        }

        // Terminal FIDE checks
        if (oppMated) {
            gameEnded = true;
            if (timerInterval) clearInterval(timerInterval);
            const winner = moverColor === "white" ? "Weiß" : "Schwarz";
            showCheckmateModal(winner, "Schachmatt!");
            if (typeof triggerGoldDustCelebration === 'function') triggerGoldDustCelebration();
            if (broadcast && socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'game_over', reason: 'checkmate', text: `Schachmatt! ${winner} gewinnt.` }));
                if ((myColor === "white" && winner === "Weiß") || (myColor === "black" && winner === "Schwarz") || (gameModeSelect && gameModeSelect.value === 'local')) {
                    const pName = getMyName();
                    if (pName) {
                        socket.send(JSON.stringify({ type: 'win', name: pName, movesCount: moveHistoryLog.length, gameMode: gameModeSelect ? gameModeSelect.value : 'local' }));
                    }
                }
            }
            return;
        } else if (oppStalemated) {
            gameEnded = true;
            if (timerInterval) clearInterval(timerInterval);
            window.SoundEngine?.playDrawSound();
            showCheckmateModal("Remis", "Patt (Stalemate)!");
            if (broadcast && socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'game_over', reason: 'stalemate', text: 'Patt! Die Partie endet unentschieden.' }));
            }
            return;
        } else if (isInsufficientMaterial()) {
            gameEnded = true;
            if (timerInterval) clearInterval(timerInterval);
            window.SoundEngine?.playDrawSound();
            showCheckmateModal("Remis", "Ungenügendes Material!");
            if (broadcast && socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'game_over', reason: 'insufficient_material', text: 'Remis wegen ungenügenden Materials.' }));
            }
            return;
        } else if (halfMoveClock >= 100) {
            gameEnded = true;
            if (timerInterval) clearInterval(timerInterval);
            window.SoundEngine?.playDrawSound();
            showCheckmateModal("Remis", "50-Züge-Regel!");
            return;
        } else if (positionHistory[posKey] >= 3) {
            gameEnded = true;
            if (timerInterval) clearInterval(timerInterval);
            window.SoundEngine?.playDrawSound();
            showCheckmateModal("Remis", "Dreifache Stellungswiederholung!");
            return;
        }

        // Bot trigger
        if (!window._suppressEvalAndSound && gameModeSelect && gameModeSelect.value === "bot" && turn === botColor && !gameEnded) {
            triggerBotMove(currentFen);
        }

        // Execute Premove if queued
        if (premove && turn === myColor && !gameEnded) {
            const pm = premove;
            premove = null;
            if (board[pm.fr] && board[pm.fr][pm.fc] && isOwn(board[pm.fr][pm.fc], turn) &&
                canMoveLogic(pm.fr, pm.fc, pm.tr, pm.tc) && isSafeMove(pm.fr, pm.fc, pm.tr, pm.tc)) {
                const pPromo = (board[pm.fr][pm.fc].toLowerCase() === 'p' && (pm.tr === 0 || pm.tr === 7)) ? (pm.promo || 'q') : null;
                setTimeout(() => doMove(pm.fr, pm.fc, pm.tr, pm.tc, true, pPromo), 15);
            } else {
                window.SoundEngine?.playIllegalSound();
                draw();
            }
        }
    };

    if (animationDuration > 0) setTimeout(finalizeMove, animationDuration);
    else finalizeMove();
}

function triggerBotMove(fenOverride = null) {
    if (gameEnded || !gameModeSelect || gameModeSelect.value !== 'bot' || turn !== botColor) return;
    const diffSelect = document.getElementById("botDifficulty");
    const diffVal = diffSelect ? diffSelect.value : "instant";
    const currentFen = fenOverride || boardToFEN();

    if (window.OpeningBook && moveSnapshots.length <= 10) {
        const uciSeq = moveSnapshots.slice(1).map(s => s.uci);
        const bookMoveStr = window.OpeningBook.getBookMove(uciSeq);
        if (bookMoveStr && bookMoveStr.length >= 4) {
            const bfc = bookMoveStr.charCodeAt(0) - 97;
            const bfr = 8 - parseInt(bookMoveStr[1], 10);
            const btc = bookMoveStr.charCodeAt(2) - 97;
            const btr = 8 - parseInt(bookMoveStr[3], 10);
            const bPromo = bookMoveStr[4] ? bookMoveStr[4].toLowerCase() : null;
            if (canMoveLogic(bfr, bfc, btr, btr >= 0 ? btc : -1, botColor) && isSafeMove(bfr, bfc, btr, btc, botColor)) {
                setTimeout(() => {
                    if (!gameEnded && turn === botColor && gameModeSelect.value === 'bot') {
                        doMove(bfr, bfc, btr, btc, false, bPromo);
                    }
                }, 140);
                return;
            }
        }
    }

    if (diffVal === "10" && typeof stockfishWorker !== 'undefined') {
        if (pendingStockfishFallbackTimer) clearTimeout(pendingStockfishFallbackTimer);
        pendingStockfishFallbackTimer = setTimeout(() => {
            pendingStockfishFallbackTimer = null;
            if (!gameEnded && turn === botColor && gameModeSelect && gameModeSelect.value === "bot") {
                myEngineWorker.postMessage({ board, turn: botColor, fen: currentFen, difficulty: "10" });
            }
        }, 1200);

        stockfishWorker.postMessage('setoption name Skill Level value 20');
        stockfishWorker.postMessage(`position fen ${currentFen}`);
        stockfishWorker.postMessage(`go depth 10`);
    } else {
        myEngineWorker.postMessage({ board, turn: botColor, fen: currentFen, difficulty: diffVal });
    }
}

function resetGame(keepCurrentMode = true, opts = {}) {
    if (!opts?.keepReplay) {
        window.stopReplay?.();
    }
    if (typeof window.switchSidebarTab === "function") {
        const gameBtn = document.querySelectorAll(".sidebar-tab-btn")[0];
        if (gameBtn) window.switchSidebarTab("tab-game", gameBtn);
    }
    const gmSelect = document.getElementById("gameMode");
    const currentMode = gmSelect ? gmSelect.value : "local";

    const botDiff = document.getElementById("bot-difficulty-container");
    if (botDiff) botDiff.style.display = (currentMode === "bot") ? "block" : "none";

    const timeCtrl = document.getElementById("time-control-container");
    if (timeCtrl) timeCtrl.style.display = "block";

    if (currentMode === "bot") {
        const colSel = document.getElementById("botColorSelect");
        const prefCol = (colSel && colSel.value) || localStorage.getItem('bot_player_color') || 'white';
        if (prefCol === 'random') {
            myColor = Math.random() < 0.5 ? 'white' : 'black';
        } else {
            myColor = prefCol === 'black' ? 'black' : 'white';
        }
        botColor = myColor === 'white' ? 'black' : 'white';
        opponentName = "Computer (KI)";
        onlineRoom = "";
    } else if (currentMode === "local") {
        myColor = "white";
        botColor = "black";
        opponentName = "Lokaler Spieler";
        onlineRoom = "";
    } else {
        botColor = myColor === 'white' ? 'black' : 'white';
    }

    gameEnded = false;
    window.isTacticalPuzzleMode = false;
    const resetPuzzleBtn = document.getElementById("resetPuzzleBtn");
    if (resetPuzzleBtn) resetPuzzleBtn.style.display = "none";
    const puzzleStatus = document.getElementById("puzzle-status");
    if (puzzleStatus) puzzleStatus.innerText = "";

    board = [
        ['r','n','b','q','k','b','n','r'],
        ['p','p','p','p','p','p','p','p'],
        ['','','','','','','',''],
        ['','','','','','','',''],
        ['','','','','','','',''],
        ['','','','','','','',''],
        ['P','P','P','P','P','P','P','P'],
        ['R','N','B','Q','K','B','N','R']
    ];
    turn = "white";
    selected = null;
    history = [];
    hasMoved = {
        whiteK: false, whiteR1: false, whiteR8: false,
        blackK: false, blackR1: false, blackR8: false
    };
    enPassantTarget = null;
    halfMoveClock = 0;
    positionHistory = {};
    lastMove = null;
    premove = null;
    drawArrows = [];
    highlightSquares = {};
    hintMoveSquares = null;
    currentEvalCp = 0.0;
    currentEvalMate = null;
    currentOpening = null;
    viewPly = -1;
    moveHistoryLog = [];
    moveSnapshots = [{
        board: board.map(r => [...r]),
        turn: 'white',
        hasMoved: { ...hasMoved },
        enPassantTarget: null,
        halfMoveClock: 0,
        lastMove: null,
        san: null,
        uci: null,
        fen: boardToFEN(),
        evalBefore: 0,
        evalAfter: 0,
        quality: null
    }];
    positionHistory[getPositionKey()] = 1;

    isBoardFlipped = (currentMode === 'online' || currentMode === 'random' || currentMode === 'bot') && myColor === 'black';

    const tcSelect = document.getElementById("timeControl");
    const tc = tcSelect ? tcSelect.value : "unlimited";

    let tSecs = 600;
    timeInc = 0;
    if (tc !== 'unlimited') {
        if (tc.includes('+')) {
            const pts = tc.split('+');
            tSecs = parseInt(pts[0], 10) * 60;
            timeInc = parseInt(pts[1], 10) || 0;
        } else {
            tSecs = (parseInt(tc, 10) || 10) * 60;
        }
    } else {
        tSecs = Infinity;
    }

    whiteTime = tSecs;
    blackTime = tSecs;
    updatePlayerNamesBar();
    updateTimerUI();
    startTimer();
    renderInteractiveMoveHistory();
    updateOpeningExplorer();
    updateCapturedMaterialUI();
    updateEvalBarUI(0, null);

    const sEl = document.getElementById('status-display');
    const liveTitleEl = document.getElementById('match-live-title');
    if (sEl) {
        if (currentMode === "bot") {
            sEl.textContent = "🤖 Partie gegen KI - Weiß am Zug";
            if (liveTitleEl) liveTitleEl.textContent = "🤖 Spiel gegen KI-Bot";
        } else if (currentMode === "online" || currentMode === "random") {
            sEl.textContent = "Online gegen " + (opponentName || "Gegner") + " (" + (myColor === "white" ? "Weiß" : "Schwarz") + ")";
            if (liveTitleEl) liveTitleEl.textContent = "⚔️ Online-Partie";
        } else {
            sEl.textContent = "Weiß am Zug";
            if (liveTitleEl) liveTitleEl.textContent = "👥 Lokale Partie";
        }
    }
    applyFlipLayout();

    if (currentMode === 'bot' && turn === botColor && !gameEnded && !opts?.keepReplay) {
        setTimeout(() => triggerBotMove(), 240);
    }
}
window.resetGame = resetGame;

function makeMove(fromSquare, toSquare, promo = null) {
    if (!fromSquare || !toSquare || fromSquare.length < 2 || toSquare.length < 2) return;
    if (gameEnded || window.isReplayMode) return;
    const fc = fromSquare.charCodeAt(0) - 97;
    const fr = 8 - parseInt(fromSquare[1], 10);
    const tc = toSquare.charCodeAt(0) - 97;
    const tr = 8 - parseInt(toSquare[1], 10);
    const isLocal = !gameModeSelect || gameModeSelect.value === 'local';
    if (!isLocal && turn !== myColor) return;
    if (canMoveLogic(fr, fc, tr, tc) && isSafeMove(fr, fc, tr, tc) && typeof doMove === 'function') {
        doMove(fr, fc, tr, tc, true, promo);
    }
}
window.makeMove = makeMove;

// --- FEN-GENERATOR ---
function boardToFEN() {
    if (!board) return "";
    let castling = "";
    if (!hasMoved.whiteK) {
        if (!hasMoved.whiteR8) castling += "K";
        if (!hasMoved.whiteR1) castling += "Q";
    }
    if (!hasMoved.blackK) {
        if (!hasMoved.blackR8) castling += "k";
        if (!hasMoved.blackR1) castling += "q";
    }
    const epSq = enPassantTarget ? (String.fromCharCode(97 + enPassantTarget.c) + (8 - enPassantTarget.r)) : "-";
    const fullMoves = Math.floor(moveHistoryLog.length / 2) + 1;
    if (window.PGNEngine) {
        return window.PGNEngine.boardToFEN(board, turn, castling || "-", epSq, halfMoveClock, fullMoves);
    }
    let fen = "";
    for (let r = 0; r < 8; r++) {
        let empty = 0;
        for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            if (p === "") empty++;
            else { if (empty > 0) { fen += empty; empty = 0; } fen += p; }
        }
        if (empty > 0) fen += empty;
        if (r < 7) fen += "/";
    }
    return `${fen} ${turn === "white" ? "w" : "b"} ${castling || "-"} ${epSq} ${halfMoveClock} ${fullMoves}`;
}

// --- 🐍 PYTHON/NODE ANALYSE SCHNITTSTELLE (Optimiert für Ultra-Stats) ---
let analyseRequestInFlight = false;
let pendingAnalyseCall = null;

async function sendeAnAnalyse(fr, fc, tr, tc, figur, istSchlag) {
    if (analyseRequestInFlight) {
        pendingAnalyseCall = [fr, fc, tr, tc, figur, istSchlag];
        return;
    }
    analyseRequestInFlight = true;

    const von = String.fromCharCode(97 + fc) + (8 - fr);
    const nach = String.fromCharCode(97 + tc) + (8 - tr);
    const currentFen = typeof boardToFEN === 'function' ? boardToFEN() : '';
    const lastSan = moveHistoryLog[moveHistoryLog.length - 1] || `${von}-${nach}`;

    const accDisp = document.getElementById("accuracy-display");
    const aggroDisp = document.getElementById("aggro-display");
    const matDisp = document.getElementById("material-display");
    const eloDisp = document.getElementById("elo-display");
    const modalAcc = document.getElementById("modal-accuracy-display");
    const modalAggro = document.getElementById("modal-aggro-display");
    const modalMat = document.getElementById("modal-material-display");
    const modalElo = document.getElementById("modal-elo-display");

    if (window.EvalEngine && board) {
        const matData = window.EvalEngine.getCapturedAndMaterial(board);
        const matDiff = matData.whiteLead > 0 ? `+${matData.whiteLead} Weiß` : (matData.blackLead > 0 ? `+${matData.blackLead} Schwarz` : 'Ausgeglichen (0)');
        if (matDisp) matDisp.textContent = `Gewonnenes Material: ${matDiff}`;
        if (modalMat) modalMat.textContent = matDiff;
        if (moveSnapshots.length >= 2) {
            const acc = window.EvalEngine.calculateMatchAccuracy(moveSnapshots.map(s => Number(s.evalAfter ?? 0)));
            const activeAcc = myColor === 'black' ? acc.blackAccuracy : acc.whiteAccuracy;
            if (accDisp) accDisp.textContent = `Genauigkeit: ${activeAcc}%`;
            if (modalAcc) modalAcc.textContent = `${activeAcc}%`;
        }
    }

    const zugDaten = {
        spieler: getMyName(),
        fen: currentFen,
        zug: lastSan,
        von: von,
        nach: nach,
        figur: figur,
        wert: 100,
        ist_schlagzug: istSchlag
    };

    try {
        const response = await fetch(`${apiBase}/analyse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(zugDaten)
        });

        if (!response.ok) throw new Error("Server antwortet nicht korrekt");

        const ergebnis = await response.json();
        const perf = ergebnis.Basis_Werte || ergebnis.Performance_Metriken || {};
        const pos = ergebnis.Positions_Analyse || {};
        const aggro = ergebnis.Aggressivitäts_Index || {};

        const esc = typeof escapeHtml === 'function' ? escapeHtml : (s => String(s || ''));
        const eloVal = esc(perf["Geschätzte_Elo"] || perf["Elo"] || 1200);
        const rangVal = esc(perf["Rang"] || "Spieler");
        const accuracyVal = esc(perf["Genauigkeit"] || 75);
        const classVal = esc(perf["Klassifizierung"] || "Guter Zug");
        const zentrumVal = esc(pos["Zentrum"] || "Solide");
        const devVal = esc(pos["Entwicklung"] || "Normal");
        const materialVal = esc(pos["Material_Vorteil"] || "0");
        const bestMoveVal = esc(pos["Bester_Zug"] || "-");
        const aggroVal = esc(aggro["Gesamt"] || 50);
        const aggroLevel = esc(aggro["Level"] || "Normal");
        const explanation = esc(ergebnis.Erklaerung || "Ein solider Zug im Partie-Verlauf.");

        if (accDisp) accDisp.textContent = `Genauigkeit: ${accuracyVal}%`;
        if (aggroDisp) aggroDisp.textContent = `Aggressivität: ${aggroLevel} (${aggroVal}%)`;
        if (matDisp) matDisp.textContent = `Material: ${materialVal}`;
        if (modalElo) modalElo.textContent = `${eloVal} (${rangVal})`;
        if (modalAcc) modalAcc.textContent = `${accuracyVal}%`;
        if (modalAggro) modalAggro.textContent = `${aggroLevel} (${aggroVal}%)`;
        if (modalMat) modalMat.textContent = materialVal;

        if (eloDisp) {
            eloDisp.innerHTML = `
                <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 12px; border-left: 5px solid #2ecc71; box-shadow: 0 4px 20px rgba(0,0,0,0.4); font-family: sans-serif;">
                    <div style="font-size: 0.8em; color: #95a5a6; letter-spacing: 1.5px; font-weight: bold; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
                        <span>📊 KI-POSITIONSANALYSE</span>
                        <span style="background: #2196f3; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.8em;">AKTIV</span>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
                        <div>
                            <div style="font-size: 0.8em; color: #bdc3c7;">Geschätzte Elo:</div>
                            <div style="font-size: 1.4em; font-weight: bold; color: #f1c40f;">${eloVal} <span style="font-size: 0.6em; color: #fff; background: #e67e22; padding: 1px 4px; border-radius: 3px; font-weight: normal; margin-left: 3px;">${rangVal}</span></div>
                        </div>
                        <div>
                            <div style="font-size: 0.8em; color: #bdc3c7;">Genauigkeit:</div>
                            <div style="font-size: 1.4em; font-weight: bold; color: #2ecc71;">${accuracyVal}%</div>
                        </div>
                    </div>
                    <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; margin-bottom: 12px; border-left: 3px solid #e74c3c;">
                        <div style="font-size: 0.85em; font-weight: bold; color: #fff; display: flex; justify-content: space-between;">
                            <span>Letzter Zug: <span style="color: #3498db;">${esc(lastSan)}</span></span>
                            <span style="color: #f1c40f;">${classVal}</span>
                        </div>
                        <div style="font-size: 0.85em; color: #ecf0f1; margin-top: 4px; line-height: 1.4;">${explanation}</div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.85em; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
                        <div>💥 Aggro: <b style="color: #e74c3c;">${aggroVal}% (${aggroLevel})</b></div>
                        <div>🏰 Zentrum: <b style="color: #f1c40f;">${zentrumVal}</b></div>
                        <div>🚀 Entwicklung: <b style="color: #3498db;">${devVal}</b></div>
                        <div>⚖️ Material: <b style="color: #2ecc71;">${materialVal}</b></div>
                        <div style="grid-column: span 2; border-top: 1px dashed rgba(255,255,255,0.05); padding-top: 5px; margin-top: 5px;">
                            💡 Empfohlener Zug: <b style="color: #2ecc71; font-family: monospace; font-size: 1.1em;">${bestMoveVal}</b>
                        </div>
                    </div>
                </div>
            `;
        }
    } catch (e) {
        if (eloDisp) {
            eloDisp.innerHTML = `<div style="color: #f1c40f; font-size: 0.85em;">Lokale Engine-Bewertung: ${(currentEvalCp > 0 ? '+' : '') + Number(currentEvalCp || 0).toFixed(1)}</div>`;
        }
    } finally {
        analyseRequestInFlight = false;
        if (pendingAnalyseCall) {
            const nextArgs = pendingAnalyseCall;
            pendingAnalyseCall = null;
            setTimeout(() => {
                sendeAnAnalyse(...nextArgs);
            }, 300);
        }
    }
}

function getAlgebraicNotation(fr, fc, tr, tc, piece, isCapture, boardBefore = null, promoPiece = null, inCheck = false, inMate = false, moverColor = null) {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    const type = piece.toLowerCase();
    const toSquare = files[tc] + ranks[tr];
    const suffix = inMate ? '#' : (inCheck ? '+' : '');

    if (type === 'k' && Math.abs(tc - fc) === 2) {
        return (tc === 6 ? "O-O" : "O-O-O") + suffix;
    }

    const promoMap = { q: 'D', r: 'T', b: 'L', n: 'S' };
    const promoSuffix = promoPiece ? `=${promoMap[promoPiece.toLowerCase()] || 'D'}` : '';

    if (type === 'p') {
        return (isCapture ? files[fc] + 'x' : '') + toSquare + promoSuffix + suffix;
    }

    const pieceMap = { k: 'K', q: 'D', r: 'T', b: 'L', n: 'S' };
    const pChar = pieceMap[type] || '';
    let disambig = '';

    if (boardBefore && (type === 'r' || type === 'n' || type === 'b' || type === 'q')) {
        const sameColor = moverColor || (piece === piece.toUpperCase() ? 'white' : 'black');
        const savedBoard = board;
        board = boardBefore;
        const others = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if ((r !== fr || c !== fc) && board[r][c] === piece &&
                    canMoveLogic(r, c, tr, tc, sameColor) && isSafeMove(r, c, tr, tc, sameColor)) {
                    others.push({ r, c });
                }
            }
        }
        board = savedBoard;
        if (others.length > 0) {
            const sameFile = others.some(o => o.c === fc);
            const sameRank = others.some(o => o.r === fr);
            if (!sameFile) disambig = files[fc];
            else if (!sameRank) disambig = ranks[fr];
            else disambig = files[fc] + ranks[fr];
        }
    }

    return pChar + disambig + (isCapture ? 'x' : '') + toSquare + suffix;
}

function renderInteractiveMoveHistory() {
    const listEl = document.getElementById('move-history-list');
    if (!listEl) return;

    const totalPlies = Math.max(moveHistoryLog.length, moveSnapshots.length - 1);
    if (totalPlies === 0) {
        listEl.innerHTML = '<div style="color:#8c8a87; text-align:center; padding:18px 8px; font-size:0.82rem; font-style:italic;">Noch keine Züge gespielt</div>';
        return;
    }

    const activePly = viewPly === -1 ? (moveSnapshots.length - 1) : viewPly;
    let html = '';
    for (let i = 0; i < totalPlies; i += 2) {
        const moveNum = Math.floor(i / 2) + 1;
        const wPly = i + 1;
        const bPly = i + 2;
        const wSan = moveHistoryLog[i] || '';
        const bSan = moveHistoryLog[i + 1] || '';

        const wQ = moveSnapshots[wPly]?.quality;
        const bQ = moveSnapshots[bPly]?.quality;

        const badge = (q) => {
            if (!q || q.type === 'best') return '';
            return `<span class="move-quality-badge mq-${q.type}" title="${escapeHtml(q.label)}">${escapeHtml(q.glyph)}</span>`;
        };

        html += `
            <div class="move-row">
                <span class="move-num">${moveNum}.</span>
                <span class="move-ply ${activePly === wPly ? 'active' : ''}" data-action="jumpToMoveIndex" data-arg1="${wPly}">${escapeHtml(wSan)}${badge(wQ)}</span>
                ${bSan ? `<span class="move-ply ${activePly === bPly ? 'active' : ''}" data-action="jumpToMoveIndex" data-arg1="${bPly}">${escapeHtml(bSan)}${badge(bQ)}</span>` : '<span></span>'}
            </div>
        `;
    }
    listEl.innerHTML = html;
    const activeEl = listEl.querySelector('.move-ply.active');
    if (activeEl) activeEl.scrollIntoView({ block: 'nearest' });

    const banner = document.getElementById('replay-review-banner');
    if (banner) {
        banner.style.display = (viewPly !== -1 && viewPly < moveSnapshots.length - 1) ? 'block' : 'none';
    }
}

function addMoveToSidebar() {
    renderInteractiveMoveHistory();
}

function jumpToMoveIndex(plyIdx) {
    if (!moveSnapshots || moveSnapshots.length === 0) return;
    const clamped = Math.max(0, Math.min(moveSnapshots.length - 1, plyIdx));
    const snap = moveSnapshots[clamped];
    if (!snap) return;

    if (clamped === moveSnapshots.length - 1) {
        viewPly = -1;
    } else {
        viewPly = clamped;
    }

    board = snap.board.map(r => [...r]);
    turn = snap.turn;
    lastMove = snap.lastMove ? { ...snap.lastMove } : null;
    hintMoveSquares = null;
    selected = null;

    if (snap.evalAfter !== undefined) {
        updateEvalBarUI(snap.evalAfter, snap.mate ?? null);
    }
    updateCapturedMaterialUI();
    renderInteractiveMoveHistory();
    draw();
}
window.jumpToMoveIndex = jumpToMoveIndex;

function stepHistory(delta) {
    if (!moveSnapshots || moveSnapshots.length <= 1) return;
    const curr = viewPly === -1 ? (moveSnapshots.length - 1) : viewPly;
    jumpToMoveIndex(curr + delta);
}
window.stepHistory = stepHistory;

function jumpToLive() {
    if (!moveSnapshots || moveSnapshots.length === 0) return;
    jumpToMoveIndex(moveSnapshots.length - 1);
}
window.jumpToLive = jumpToLive;

window.copyCurrentFEN = function() {
    const fen = boardToFEN();
    if (navigator.clipboard && fen) {
        navigator.clipboard.writeText(fen).then(() => {
            window.showInAppNotification?.("FEN kopiert", "Aktuelle Brettstellung in Zwischenablage kopiert.", "success");
        }).catch(() => window.openFenPgnModal?.());
    } else {
        window.openFenPgnModal?.();
    }
};

window.copyCurrentPGN = function() {
    const pgn = buildFullPGN();
    if (navigator.clipboard && pgn) {
        navigator.clipboard.writeText(pgn).then(() => {
            window.showInAppNotification?.("PGN kopiert", "Komplette Partie-Notation in Zwischenablage kopiert.", "success");
        }).catch(() => window.openFenPgnModal?.());
    } else {
        window.openFenPgnModal?.();
    }
};

function buildFullPGN() {
    let result = "*";
    const modalTextEl = document.getElementById('checkmate-winner-text');
    if (gameEnded && modalTextEl) {
        const modalText = modalTextEl.innerText || "";
        if (modalText.includes("Weiß")) result = "1-0";
        else if (modalText.includes("Schwarz")) result = "0-1";
        else if (modalText.includes("Remis") || modalText.includes("Unentschieden")) result = "1/2-1/2";
    }
    const pName = typeof getMyName === 'function' ? getMyName() : 'Spieler';
    const opp = opponentName || 'Gegner';
    const whiteName = myColor === 'white' ? pName : opp;
    const blackName = myColor === 'black' ? pName : opp;
    if (window.PGNEngine) {
        return window.PGNEngine.exportToPGN({
            event: "Schach Live Match",
            site: "Schach Live",
            white: whiteName,
            black: blackName,
            result,
            eco: currentOpening?.eco || "A00",
            opening: currentOpening?.name || "",
            moveHistory: moveHistoryLog
        });
    }
    return moveHistoryLog.join(' ');
}

window.openFenPgnModal = function() {
    let modal = document.getElementById('fen-pgn-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'fen-pgn-modal';
        modal.className = 'modal-overlay';
        modal.style.cssText = 'display:none; z-index:100000; background:rgba(0,0,0,0.8); backdrop-filter:blur(8px); justify-content:center; align-items:center; position:fixed; inset:0; padding:15px; box-sizing:border-box;';
        modal.innerHTML = `
            <div class="modal-box" style="max-width:500px; width:100%; background:#1e1d1a; border:1px solid rgba(255,255,255,0.15); border-radius:14px; text-align:left; padding:20px; color:white;">
                <span class="close-modal" data-action="closeFenPgnModal">&times;</span>
                <h2 style="margin:0 0 12px 0; font-size:1.2rem; color:#f1c40f;">📄 FEN &amp; PGN Import / Export</h2>
                <label style="font-size:0.82rem; color:#bab8b5; font-weight:bold;">FEN:</label>
                <input type="text" id="fen-modal-input" style="width:100%; box-sizing:border-box; font-family:monospace; font-size:0.82rem; margin:4px 0 8px 0;" />
                <button type="button" data-action="applyFenFromModal" class="glass-btn primary" style="width:100%; padding:8px; margin-bottom:12px;">📥 FEN laden</button>
                <label style="font-size:0.82rem; color:#bab8b5; font-weight:bold;">PGN:</label>
                <textarea id="pgn-modal-input" rows="4" style="width:100%; box-sizing:border-box; font-family:monospace; font-size:0.82rem; margin:4px 0 8px 0;"></textarea>
                <button type="button" data-action="applyPgnFromModal" class="glass-btn success" style="width:100%; padding:8px;">📥 PGN laden</button>
            </div>
        `;
        document.body.appendChild(modal);
    }
    const fenInp = document.getElementById('fen-modal-input');
    const pgnInp = document.getElementById('pgn-modal-input');
    if (fenInp) fenInp.value = boardToFEN();
    if (pgnInp) pgnInp.value = buildFullPGN();
    modal.style.display = 'flex';
};

window.closeFenPgnModal = function() {
    const modal = document.getElementById('fen-pgn-modal');
    if (modal) modal.style.display = 'none';
};

window.applyFenFromModal = function() {
    const fenInp = document.getElementById('fen-modal-input');
    const fen = fenInp ? fenInp.value.trim() : '';
    if (!fen) return;
    if (window.PGNEngine && !window.PGNEngine.parseFEN(fen)) {
        window.showInAppNotification?.("Ungültige FEN", "Bitte prüfe das FEN-Format.", "warning");
        return;
    }
    const gmSelect = document.getElementById("gameMode");
    if (gmSelect) gmSelect.value = "local";
    loadFEN(fen);
    window.closeFenPgnModal();
    window.showInAppNotification?.("FEN geladen", "Stellung wurde erfolgreich auf das Brett übernommen.", "success");
};

window.applyPgnFromModal = function() {
    const pgnInp = document.getElementById('pgn-modal-input');
    const raw = pgnInp ? pgnInp.value.trim() : '';
    if (!raw || !window.PGNEngine) return;
    const parsed = window.PGNEngine.parsePGN(raw);
    if (!parsed || !parsed.moves || parsed.moves.length === 0) {
        window.showInAppNotification?.("Ungültige PGN", "Keine gültigen Züge in der PGN gefunden.", "warning");
        return;
    }
    const gmSelect = document.getElementById("gameMode");
    if (gmSelect) gmSelect.value = "local";
    resetGame(true);
    let played = 0;
    for (const sanToken of parsed.moves) {
        const cleanSan = sanToken.replace(/[+#!?]+$/g, '').replace(/0-0-0/g, 'O-O-O').replace(/0-0/g, 'O-O');
        const legal = getAllLegalMoves(turn);
        let matched = null;
        for (const m of legal) {
            const p = board[m.fr][m.fc];
            const isCap = board[m.tr][m.tc] !== "" || (p.toLowerCase() === 'p' && enPassantTarget && m.tr === enPassantTarget.r && m.tc === enPassantTarget.c);
            const promoMatch = cleanSan.match(/=([QRBNDTLS])/i);
            const promoMapDe = { D: 'q', Q: 'q', T: 'r', R: 'r', L: 'b', B: 'b', S: 'n', N: 'n' };
            const promoP = promoMatch ? promoMapDe[promoMatch[1].toUpperCase()] : null;
            const genDe = getAlgebraicNotation(m.fr, m.fc, m.tr, m.tc, p, isCap, board, promoP, false, false, turn);
            const genEn = genDe.replace('D', 'Q').replace('T', 'R').replace('L', 'B').replace('S', 'N').replace('=D', '=Q').replace('=T', '=R').replace('=L', '=B').replace('=S', '=N');
            if (genDe === cleanSan || genEn === cleanSan) {
                matched = { ...m, promoP };
                break;
            }
        }
        if (!matched) break;
        // Apply immediately synchronously without animation
        window._lastMoveWasDrag = true;
        doMove(matched.fr, matched.fc, matched.tr, matched.tc, false, matched.promoP);
        played++;
    }
    window.closeFenPgnModal();
    window.showInAppNotification?.("PGN importiert", `${played} Züge wurden geladen.`, "success");
};
// --- 2. CHAT & SYSTEM ---
function formatSystemMessage(text) {
    if (!text) return "";
    let clean = String(text);
    
    // Strip redundant leading ⚙️ if followed by an emoji or header
    clean = clean.replace(/^⚙️\s*([🛡️📜🤖⚠️✅🚨💡⚡💬👑🔒🖥️📊ℹ️⏱️📧])/u, '$1');

    // Escape basic HTML
    let escaped = clean
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Format Custom Admin Tags
    escaped = escaped.replace(/\[CARD\]/g, '<div class="admin-card">')
                     .replace(/\[\/CARD\]/g, '</div>')
                     .replace(/\[HEADER\]/g, '<div class="admin-card-header">')
                     .replace(/\[\/HEADER\]/g, '</div>')
                     .replace(/\[FLEX\]/g, '<div class="admin-card-grid">')
                     .replace(/\[\/FLEX\]/g, '</div>')
                     .replace(/\[DIVIDER\]/g, '<div class="admin-divider"></div>');

    // Format Dividers
    escaped = escaped.replace(/[═=]{6,}/g, '<div class="admin-divider"></div>');

    // Format Markdown Bold: **text**
    escaped = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Format Markdown Italic: *text*
    escaped = escaped.replace(/(^|[^\*])\*([^\*\n]+?)\*([^\*]|$)/g, '$1<em>$2</em>$3');

    // Format Code pills: `code`
    escaped = escaped.replace(/`([^`\n]+?)`/g, function(match, cmdContent) {
        const safeAttr = cmdContent.replace(/"/g, '&quot;');
        return `<code class="admin-cmd-pill" title="Klicken zum Einfügen in den Chat" data-insert-cmd="${safeAttr}">${cmdContent}</code>`;
    });

    // Replace newlines with <br>, avoiding unwanted breaks directly around block tags
    escaped = escaped.replace(/\n/g, '<br>');
    escaped = escaped.replace(/(<div[^>]*>)<br>+/gi, '$1')
                     .replace(/<br>+(<\/div>)/gi, '$1')
                     .replace(/<div class="admin-divider"><\/div><br>+/gi, '<div class="admin-divider"></div>');

    return escaped;
}
window.formatSystemMessage = formatSystemMessage;

window.insertAdminCommand = function(cmd) {
    const inp = document.getElementById("chat-input") || (typeof chatInput !== 'undefined' ? chatInput : null);
    if (!inp) return;
    const baseCmd = String(cmd).trim();
    inp.value = baseCmd + " ";
    inp.focus();
    if (inp.setSelectionRange) {
        const len = inp.value.length;
        inp.setSelectionRange(len, len);
    }
};

function addChat(sender, text, type) {
    const m = document.createElement("div");
    m.className = type === "system" ? "msg system-msg" : `msg ${type === 'me' ? 'my-msg' : 'other-msg'}`;

    if (type === "system") {
        m.innerHTML = formatSystemMessage(text);
    } else {
        const strong = document.createElement("strong");
        strong.textContent = sender + ": ";
        m.appendChild(strong);

        const span = document.createElement("span");
        span.innerHTML = parsePerlRegex(text);
        m.appendChild(span);
    }

    const container = document.getElementById("chat-messages") || (typeof chatMessages !== 'undefined' ? chatMessages : null);
    if (container) {
        container.appendChild(m);
        container.scrollTop = container.scrollHeight;
    }
}
window.addChat = addChat;

document.querySelectorAll('.emoji-btn').forEach(b => {
    b.onclick = () => {
        const inp = document.getElementById("chat-input") || chatInput;
        if (inp) { inp.value += b.textContent; inp.focus(); }
    };
});

function sendMsg() {
    const inp = document.getElementById("chat-input") || chatInput;
    if (!inp) return;
    const t = inp.value.trim();
    if (t && socket && socket.readyState === WebSocket.OPEN) {
        if (typeof isSpectatorMode !== 'undefined' && isSpectatorMode) {
            socket.send(JSON.stringify({
                type: 'spectate_chat',
                room: onlineRoom,
                username: getMyName(),
                text: t
            }));
        } else {
            socket.send(JSON.stringify({ 
                 type: 'chat_message', 
                 username: getMyName(),
                 content: t,
                 lobby: window.currentLobbyId || 'global'
            }));
        }
        inp.value = "";
    }
}
window.sendMsg = sendMsg;

window.addEventListener('DOMContentLoaded', () => {
    const sendChatBtn = document.getElementById("send-chat");
    if (sendChatBtn) sendChatBtn.onclick = sendMsg;
    const inp = document.getElementById("chat-input");
    if (inp) inp.onkeydown = (e) => { 
        if(e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            sendMsg(); 
        }
    };

    const connectMPBtn = document.getElementById("connectMP");
    if (connectMPBtn) {
        connectMPBtn.onclick = () => {
            const roomInput = document.getElementById("roomID");
            const roomId = roomInput ? roomInput.value.trim() : "";
            if (roomId) {
                onlineRoom = roomId;
                const tcSelect = document.getElementById("timeControl");
                const timeControl = tcSelect ? tcSelect.value : "unlimited";
                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                        type: 'join_room',
                        room: roomId,
                        playerName: getMyName(),
                        timeControl: timeControl,
                        allowBotFallback: false
                    }));
                }
                addChat("System", "Raum '" + roomId + "' beigetreten. Warte auf Mitspieler...", "system");
            } else {
                window.showInAppNotification?.("Fehlende Raum-ID", "Bitte eine Raum-ID eingeben.", "warning");
            }
        };
    }

    // 1-Klick WhatsApp / Freunde Einladungslink Generator
    function getActiveInviteUrl() {
        const roomInput = document.getElementById("roomID");
        let rId = roomInput ? roomInput.value.trim() : "";
        if (!rId) {
            rId = "duell_" + Math.random().toString(36).substr(2, 6);
            if (roomInput) roomInput.value = rId;
        }
        onlineRoom = rId;

        const tcSelect = document.getElementById("timeControl");
        const tc = tcSelect ? tcSelect.value : "10";

        // Raum aktiv beitreten / registrieren OHNE Bots
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'join_room',
                room: rId,
                playerName: getMyName(),
                timeControl: tc,
                allowBotFallback: false
            }));
        }

        const origin = window.location.origin + window.location.pathname;
        const inviteUrl = `${origin}?room=${rId}&tc=${encodeURIComponent(tc)}`;
        return { inviteUrl, rId, tc };
    }
    window.getActiveInviteUrl = getActiveInviteUrl;

    function quickCopyInviteLink() {
        const { inviteUrl, rId } = getActiveInviteUrl();
        if (navigator.clipboard) {
            navigator.clipboard.writeText(inviteUrl).then(() => {
                showInviteFeedback("✅ Einladungs-Link kopiert! Sende ihn an deine Freunde.");
            }).catch(() => {
                window.showInAppPrompt?.("Einladungslink", "Kopiere deinen Einladungslink:", inviteUrl, () => {});
            });
        } else {
            window.showInAppPrompt?.("Einladungslink", "Kopiere deinen Einladungslink:", inviteUrl, () => {});
        }
        if (typeof addChat === 'function') {
            addChat("System", `🔗 Einladungs-Link für Raum '${rId}' kopiert! Warte auf Gegner...`, "system");
        }
    }
    window.quickCopyInviteLink = quickCopyInviteLink;

    function quickNativeShare() {
        const { inviteUrl } = getActiveInviteUrl();
        if (navigator.share) {
            navigator.share({
                title: "Schach Duell Einladung",
                text: "⚔️ Lass uns eine Runde Schach spielen!",
                url: inviteUrl
            }).catch(() => {});
        } else {
            quickCopyInviteLink();
        }
    }
    window.quickNativeShare = quickNativeShare;

    window.openShareModal = function(title, plainText, whatsappUrl) {
        let modal = document.getElementById('share-link-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'share-link-modal';
            modal.className = 'modal-overlay';
            modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(0,0,0,0.78); backdrop-filter:blur(6px); z-index:100000; justify-content:center; align-items:center; padding:16px;';
            modal.innerHTML = `
                <div class="modal-box" style="max-width:440px; width:100%; background:#1e1d1a; border:1px solid rgba(255,255,255,0.16); border-radius:14px; padding:20px; color:#fff; text-align:left;">
                    <span class="close-modal" data-action="closeShareModal">&times;</span>
                    <h3 id="share-modal-title" style="margin:0 0 10px 0; color:#f1c40f;"></h3>
                    <textarea id="share-modal-textarea" rows="4" readonly style="width:100%; box-sizing:border-box; border-radius:8px; padding:10px; background:#141310; color:#e6e6e6; border:1px solid rgba(255,255,255,0.15); font-size:0.86rem; resize:none; margin-bottom:12px;"></textarea>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <button type="button" data-action="copyShareModalText" class="glass-btn primary" style="flex:1; padding:9px 12px; font-weight:bold;">📋 Text kopieren</button>
                        <a id="share-whatsapp-anchor" href="#" target="_blank" rel="noopener noreferrer" class="glass-btn success" style="flex:1; padding:9px 12px; font-weight:bold; text-align:center; text-decoration:none;">💬 WhatsApp öffnen</a>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        const tEl = document.getElementById('share-modal-title');
        const txtEl = document.getElementById('share-modal-textarea');
        const waEl = document.getElementById('share-whatsapp-anchor');
        if (tEl) tEl.textContent = title || 'Teilen';
        if (txtEl) txtEl.value = plainText || '';
        if (waEl) waEl.href = whatsappUrl || 'https://api.whatsapp.com/';
        modal.style.display = 'flex';
    };

    window.copyShareModalText = function() {
        const txtEl = document.getElementById('share-modal-textarea');
        const text = txtEl ? txtEl.value : '';
        if (!text) return;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                window.showInAppNotification?.('Kopiert', 'Nachricht in Zwischenablage kopiert.', 'success');
            }).catch(() => {});
        }
    };

    function shareVictoryWhatsApp() {
        const origin = window.location.origin + window.location.pathname;
        const myName = getMyName ? getMyName() : 'Ich';
        const plain = `🏆 ${myName} hat gerade eine spannende Schachpartie mit Schachmatt gewonnen!\n\nTraust du dich gegen mich anzutreten? Klick hier und spiel direkt im Browser:\n${origin}`;
        const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(plain)}`;
        if (navigator.share) {
            navigator.share({ title: 'Schach-Sieg teilen', text: plain, url: origin }).catch(() => {
                window.openShareModal('🏆 Sieg teilen', plain, waUrl);
            });
        } else {
            window.openShareModal('🏆 Sieg teilen', plain, waUrl);
        }
    }
    window.shareVictoryWhatsApp = shareVictoryWhatsApp;

    function showInviteFeedback(text) {
        const fbs = document.querySelectorAll("#invite-feedback");
        fbs.forEach(fb => {
            fb.innerText = text;
            fb.style.display = "block";
            setTimeout(() => { fb.style.display = "none"; }, 5000);
        });
    }

    const inviteFriendBtn = document.getElementById("inviteFriendBtn");
    if (inviteFriendBtn) {
        inviteFriendBtn.onclick = () => {
            const { inviteUrl, rId } = getActiveInviteUrl();
            const plain = `⚔️ Schach-Duell!\n\nIch fordere dich zu einer Partie Schach heraus! Klick hier, um sofort gegen mich anzutreten:\n${inviteUrl}`;
            const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(plain)}`;
            window.openShareModal('⚔️ Freund einladen', plain, waUrl);
            showInviteFeedback(`💬 Einladung für Raum '${rId}' erstellt!`);
            if (typeof addChat === 'function') {
                addChat("System", `🔗 Einladungs-Link für Raum '${rId}' erstellt! Warte auf deinen Freund...`, "system");
            }
        };
    }

    // Offene Herausforderung erstellen Button
    const createOpenChBtn = document.getElementById("createOpenChallengeBtn");
    if (createOpenChBtn) {
        createOpenChBtn.onclick = () => {
            const tcSelect = document.getElementById("timeControl");
            const tc = tcSelect ? tcSelect.value : "10";
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'create_open_challenge',
                    timeControl: tc,
                    color: 'random',
                    playerName: getMyName()
                }));
                addChat("System", `⚔️ Offene Herausforderung (${tc} min) in der Live-Lobby platziert!`, "system");
            }
        };
    }
    
    const createTournamentBtn = document.getElementById("createTournamentBtn");
    if (createTournamentBtn) {
        createTournamentBtn.onclick = () => {
            const tNameInput = document.getElementById("tournamentName");
            const tName = tNameInput ? tNameInput.value.trim() : "";
            if (tName) {
                const tcSelect = document.getElementById("timeControl");
                const timeControl = tcSelect ? tcSelect.value : "unlimited";
                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                        type: 'create_tournament',
                        tournamentName: tName,
                        playerName: getMyName(),
                        timeControl: timeControl
                    }));
                }
                addChat("System", "Turnier '" + tName + "' erstellt.", "system");
            } else {
                window.showInAppNotification?.("Fehlender Name", "Bitte einen Turniernamen eingeben.", "warning");
            }
        };
    }

    const timeControlSelect = document.getElementById("timeControl");
    if (timeControlSelect) {
        timeControlSelect.onchange = () => {
            const val = timeControlSelect.value;
            let tSecs = 600;
            timeInc = 0;
            if (val !== 'unlimited') {
                if (val.includes('+')) {
                    const pts = val.split('+');
                    tSecs = parseInt(pts[0]) * 60;
                    timeInc = parseInt(pts[1]) || 0;
                } else {
                    tSecs = (parseInt(val) || 10) * 60;
                }
            } else {
                tSecs = Infinity;
            }
            whiteTime = tSecs;
            blackTime = tSecs;
            updateTimerUI();
            if (val === 'unlimited') {
                if (timerInterval) clearInterval(timerInterval);
            } else {
                startTimer();
            }
        };
    }

    if (gameModeSelect) {
        gameModeSelect.onchange = () => {
            window.isTacticalPuzzleMode = false;
            const resetPuzzleBtn = document.getElementById("resetPuzzleBtn");
            if (resetPuzzleBtn) resetPuzzleBtn.style.display = "none";
            const puzzleStatus = document.getElementById("puzzle-status");
            if (puzzleStatus) puzzleStatus.innerText = "";
            const mode = gameModeSelect.value;
            
            const botDiff = document.getElementById("bot-difficulty-container");
            if (botDiff) botDiff.style.display = (mode === "bot") ? "block" : "none";
            
            const timeCtrl = document.getElementById("time-control-container");
            if (timeCtrl) timeCtrl.style.display = (mode === "online" || mode === "random" || mode === "local" || mode === "bot") ? "block" : "none";

            if (mode === "random") {
                const tcSelect = document.getElementById("timeControl");
                const timeControl = tcSelect ? tcSelect.value : "unlimited";
                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({ type: 'find_random', playerName: getMyName(), timeControl: timeControl, bet: window.casinoBet || 0 }));
                    addChat("System", "⚢ Elixir Hub sucht nach einem Gegner...", "system");
                } else {
                    addChat("System", "Nicht mit dem Server verbunden.", "system");
                }
            } else if (mode === "online") {
                const roomInput = document.getElementById("roomID");
                if (roomInput && roomInput.value.trim()) {
                    onlineRoom = roomInput.value.trim();
                }
            } else if (mode === "bot") {
                resetGame(true);
                addChat("System", "🤖 Spiel gegen den Computer gestartet! Wähle deine Schwierigkeit.", "system");
            } else {
                resetGame(true);
            }
        };
    }
});

// ==========================================
// CHAT LOBBY SYSTEM CONTROLLER
// ==========================================
window.currentLobbyId = 'global';
window.currentLobbyName = '🌐 Global Chat';
let availableLobbiesList = [];
let pendingLobbyToJoin = null;

function renderLobbiesDropdown(lobbies) {
    if (!Array.isArray(lobbies)) return;
    availableLobbiesList = lobbies;

    const selectEl = document.getElementById("chatLobbySelect");
    if (selectEl) {
        selectEl.innerHTML = "";

        const presetGroup = document.createElement("optgroup");
        presetGroup.label = "OFFIZIELLE LOBBIES";

        const customGroup = document.createElement("optgroup");
        customGroup.label = "BENUTZER-LOBBIES";

        lobbies.forEach(lob => {
            const opt = document.createElement("option");
            opt.value = lob.id;
            const lockIcon = lob.isProtected ? "🔒 " : "";
            const userText = ` (${lob.userCount || 0})`;
            opt.textContent = `${lockIcon}${lob.name}${userText}`;

            if (lob.isPreset) {
                presetGroup.appendChild(opt);
            } else {
                customGroup.appendChild(opt);
            }
        });

        if (presetGroup.children.length > 0) selectEl.appendChild(presetGroup);
        if (customGroup.children.length > 0) selectEl.appendChild(customGroup);

        selectEl.value = window.currentLobbyId;
    }

    const currentLobObj = lobbies.find(l => l.id === window.currentLobbyId);
    if (currentLobObj) {
        window.currentLobbyName = currentLobObj.name;
        const nameEl = document.getElementById("currentLobbyName");
        if (nameEl) nameEl.textContent = currentLobObj.name;

        const countEl = document.getElementById("currentLobbyUsers");
        if (countEl) countEl.textContent = `● ${currentLobObj.userCount || 1} Online`;

        const userCounter = document.getElementById("user-counter");
        if (userCounter) userCounter.textContent = `● Online: ${currentLobObj.userCount || 1}`;
    }
}

function handleLobbySelectChange(e) {
    const targetId = e.target.value;
    const lob = availableLobbiesList.find(l => l.id === targetId);

    if (!lob) return;

    if (lob.isProtected) {
        e.target.value = window.currentLobbyId;
        pendingLobbyToJoin = lob;

        const targetNameDisplay = document.getElementById("targetLobbyNameDisplay");
        if (targetNameDisplay) targetNameDisplay.textContent = lob.name;

        const pwInput = document.getElementById("joinLobbyPasswordInput");
        if (pwInput) pwInput.value = "";

        const errDiv = document.getElementById("joinLobbyPasswordError");
        if (errDiv) errDiv.textContent = "";

        const modal = document.getElementById("joinLobbyPasswordModal");
        if (modal) {
            modal.style.display = "flex";
            if (pwInput) pwInput.focus();
        }
    } else {
        joinLobbyDirectly(lob.id);
    }
}

function joinLobbyDirectly(lobbyId, password = "") {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'join_lobby',
            lobbyId: lobbyId,
            password: password
        }));
    }
}

function submitJoinProtectedLobby() {
    if (!pendingLobbyToJoin) return;
    const pwInput = document.getElementById("joinLobbyPasswordInput");
    const password = pwInput ? pwInput.value.trim() : "";

    if (!password) {
        const errDiv = document.getElementById("joinLobbyPasswordError");
        if (errDiv) errDiv.textContent = "Bitte gib ein Passwort ein.";
        return;
    }

    joinLobbyDirectly(pendingLobbyToJoin.id, password);

    const modal = document.getElementById("joinLobbyPasswordModal");
    if (modal) modal.style.display = "none";
}

function openCreateLobbyModal() {
    const nameInput = document.getElementById("newLobbyNameInput");
    const pwInput = document.getElementById("newLobbyPasswordInput");
    const errDiv = document.getElementById("createLobbyError");

    if (nameInput) nameInput.value = "";
    if (pwInput) pwInput.value = "";
    if (errDiv) errDiv.textContent = "";

    const modal = document.getElementById("createLobbyModal");
    if (modal) {
        modal.style.display = "flex";
        if (nameInput) nameInput.focus();
    }
}

function submitCreateLobby() {
    const nameInput = document.getElementById("newLobbyNameInput");
    const pwInput = document.getElementById("newLobbyPasswordInput");
    const errDiv = document.getElementById("createLobbyError");

    const name = nameInput ? nameInput.value.trim() : "";
    const password = pwInput ? pwInput.value.trim() : "";

    if (!name || name.length < 2) {
        if (errDiv) errDiv.textContent = "Lobby-Name muss mindestens 2 Zeichen haben.";
        return;
    }

    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'create_custom_lobby',
            name: name,
            password: password
        }));
    }

    const modal = document.getElementById("createLobbyModal");
    if (modal) modal.style.display = "none";
}

function setupLobbyEventListeners() {
    const lobbySelect = document.getElementById("chatLobbySelect");
    if (lobbySelect) {
        lobbySelect.removeEventListener("change", handleLobbySelectChange);
        lobbySelect.addEventListener("change", handleLobbySelectChange);
    }

    const refreshBtn = document.getElementById("refreshLobbiesBtn");
    if (refreshBtn) {
        refreshBtn.onclick = () => {
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'get_lobbies' }));
            }
        };
    }

    const openCreateBtn = document.getElementById("openCreateLobbyModalBtn");
    if (openCreateBtn) openCreateBtn.onclick = openCreateLobbyModal;

    const closeCreateBtn = document.getElementById("closeCreateLobbyModalBtn");
    if (closeCreateBtn) {
        closeCreateBtn.onclick = () => {
            const m = document.getElementById("createLobbyModal");
            if (m) m.style.display = "none";
        };
    }

    const cancelCreateBtn = document.getElementById("cancelCreateLobbyBtn");
    if (cancelCreateBtn) {
        cancelCreateBtn.onclick = () => {
            const m = document.getElementById("createLobbyModal");
            if (m) m.style.display = "none";
        };
    }

    const submitCreateBtn = document.getElementById("submitCreateLobbyBtn");
    if (submitCreateBtn) submitCreateBtn.onclick = submitCreateLobby;

    const closeJoinPwBtn = document.getElementById("closeJoinLobbyPasswordModalBtn");
    if (closeJoinPwBtn) {
        closeJoinPwBtn.onclick = () => {
            const m = document.getElementById("joinLobbyPasswordModal");
            if (m) m.style.display = "none";
        };
    }

    const cancelJoinPwBtn = document.getElementById("cancelJoinLobbyPasswordBtn");
    if (cancelJoinPwBtn) {
        cancelJoinPwBtn.onclick = () => {
            const m = document.getElementById("joinLobbyPasswordModal");
            if (m) m.style.display = "none";
        };
    }

    const submitJoinPwBtn = document.getElementById("submitJoinLobbyPasswordBtn");
    if (submitJoinPwBtn) submitJoinPwBtn.onclick = submitJoinProtectedLobby;

    const newLobbyNameInput = document.getElementById("newLobbyNameInput");
    if (newLobbyNameInput) {
        newLobbyNameInput.onkeydown = (e) => {
            if (e.key === "Enter") submitCreateLobby();
        };
    }

    const joinLobbyPasswordInput = document.getElementById("joinLobbyPasswordInput");
    if (joinLobbyPasswordInput) {
        joinLobbyPasswordInput.onkeydown = (e) => {
            if (e.key === "Enter") submitJoinProtectedLobby();
        };
    }
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', setupLobbyEventListeners);
} else {
    setupLobbyEventListeners();
}

function loadChatHistory() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'get_chat_history', lobby: window.currentLobbyId || 'global' }));
        socket.send(JSON.stringify({ type: 'get_lobbies' }));
    }
}
window.loadChatHistory = loadChatHistory; 

socket.onmessage = (e) => {
    try {
        const data = JSON.parse(e.data);
        if (data.type === 'pong') {
            const pingEl = document.getElementById('ping-display');
            if (pingEl && typeof pingStart !== 'undefined') {
                const ms = Math.round(performance.now() - pingStart);
                pingEl.innerText = `${ms} ms`;
            }
            const statusEl = document.getElementById('server-status');
            if (statusEl) {
                statusEl.innerText = "Online";
                statusEl.style.color = "#00ff00";
            }
            return;
        }
        if (data.type === 'gameStart') {
            if (data.room) onlineRoom = data.room;
            if (data.color) myColor = data.color;
            if (data.opponent) opponentName = data.opponent;
            if (gameModeSelect) gameModeSelect.value = "online";
            if (data.timeControl) {
                const tcSelect = document.getElementById("timeControl");
                if (tcSelect) tcSelect.value = data.timeControl;
            }

            localStorage.setItem('active_game_room', onlineRoom);
            localStorage.setItem('my_color', myColor || 'white');
            if (opponentName) localStorage.setItem('opponent_name', opponentName);

            resetGame(true);

            if (data.timeWhite !== undefined && data.timeWhite !== null) whiteTime = data.timeWhite;
            if (data.timeBlack !== undefined && data.timeBlack !== null) blackTime = data.timeBlack;
            isBoardFlipped = (myColor === 'black');
            applyFlipLayout();
            updatePlayerNamesBar();
            updateTimerUI();
            startTimer();

            const statusEl = document.getElementById('status-display');
            if (statusEl) {
                statusEl.textContent = "Online gegen " + (opponentName || "Gegner") + " (" + (myColor === "white" ? "Weiß" : "Schwarz") + ")";
            }
            if (typeof window.switchSidebarTab === 'function') {
                const chatBtn = document.querySelectorAll('.sidebar-tab-btn')[2];
                if (chatBtn) window.switchSidebarTab('tab-chat', chatBtn);
            }
            addChat("System", "🎮 Spiel gestartet gegen " + (opponentName || "Gegner") + "! Du bist " + (myColor === "white" ? "Weiß" : "Schwarz") + ".", "system");
            return;
        }
        if (data.type === 'rejoin_success') {
            onlineRoom = data.room;
            myColor = data.color || 'white';
            opponentName = data.opponent || 'Gegner';
            gameEnded = false;
            if (gameModeSelect) gameModeSelect.value = "online";

            localStorage.setItem('active_game_room', onlineRoom);
            localStorage.setItem('my_color', myColor);
            localStorage.setItem('opponent_name', opponentName);

            if (data.board) board = data.board;
            if (data.turn) turn = data.turn;
            if (data.timeWhite !== undefined && data.timeWhite !== null) whiteTime = data.timeWhite;
            if (data.timeBlack !== undefined && data.timeBlack !== null) blackTime = data.timeBlack;

            isBoardFlipped = (myColor === 'black');
            if (!moveSnapshots || moveSnapshots.length === 0) {
                moveSnapshots = [{
                    board: board.map(r => [...r]),
                    turn,
                    hasMoved: { ...hasMoved },
                    enPassantTarget,
                    halfMoveClock,
                    lastMove: null,
                    san: null,
                    uci: null,
                    fen: boardToFEN(),
                    evalBefore: 0,
                    evalAfter: 0,
                    quality: null
                }];
            }

            const statusEl = document.getElementById('status-display');
            if (statusEl) {
                statusEl.textContent = "Online gegen " + (opponentName || "Gegner") + " (" + (myColor === "white" ? "Weiß" : "Schwarz") + ")";
            }

            applyFlipLayout();
            updatePlayerNamesBar();
            updateTimerUI();
            startTimer();
            updateCapturedMaterialUI();
            updateOpeningExplorer();
            requestLiveEval(moveSnapshots.length - 1);

            if (typeof window.showInAppNotification === 'function') {
                window.showInAppNotification(
                    "🔄 Wiederverbunden",
                    `Erfolgreich wieder mit deinem Spiel in Raum ${data.room} verbunden!`,
                    "info"
                );
            }
            addChat("System", `🔄 Du bist wieder mit Raum ${data.room} verbunden!`, "system");
            return;
        }
        if (data.type === 'rejoin_failed') {
            localStorage.removeItem('active_game_room');
            localStorage.removeItem('my_color');
            localStorage.removeItem('opponent_name');
            console.log(`Raum ${data.room} ist nicht mehr aktiv.`);
            return;
        }
        if (data.type === 'game_over') {
            gameEnded = true;
            localStorage.removeItem('active_game_room');
            localStorage.removeItem('my_color');
            localStorage.removeItem('opponent_name');
            const statusEl = document.getElementById('status-display');
            if (statusEl && data.text) statusEl.textContent = data.text;
            addChat("System", data.text || "Spiel beendet.", "system");
            if (data.text && (data.text.includes('Remis') || data.text.includes('Patt') || data.text.includes('Unentschieden'))) {
                window.SoundEngine?.playDrawSound();
            } else {
                window.SoundEngine?.playMateSound();
            }
            showCheckmateModal("Partie beendet", data.text || "Spiel beendet!");
            if (timerInterval) clearInterval(timerInterval);
            updateTimerUI();
            return;
        }
        if (data.type === 'admin_users_update') {
            if (window.handleAdminUsersUpdate) {
                window.handleAdminUsersUpdate(data.users);
            }
            return;
        }
        if (data.type === 'admin_tickets_update') {
            if (data.tickets && window.renderAdminTickets) {
                window.renderAdminTickets(data.tickets);
            }
            return;
        }
        if (data.type === 'support_ticket_response') {
            const statusEl = document.getElementById('ban-ticket-status');
            if (statusEl) {
                statusEl.innerHTML = `✅ Ticket <strong>${data.ticketId}</strong> erfolgreich übermittelt! Support-E-Mail: <strong>schachlivesupport.jailer914@slmail.me</strong>`;
            }
            return;
        }
        if (data.type === 'tournament_created') {
            const tName = data.tournamentName;
            const creator = data.creator || "Ein Spieler";
            addChat("System", `🏆 Turnier '${tName}' (${data.timeControl || '10+0'}) wurde von ${creator} erstellt!`, "system");
            
            if (creator !== getMyName() && window.showGameRequestModal) {
                window.showGameRequestModal(
                    "🏆",
                    "Neues Turnier gestartet!",
                    `Spieler '${creator}' hat das Turnier '${tName}' (${data.timeControl || '10+0'}) erstellt. Möchtest du beitreten?`,
                    "🏆 Jetzt Beitreten",
                    "Schließen",
                    () => {
                        socket.send(JSON.stringify({
                            type: 'join_tournament',
                            tournamentName: tName,
                            playerName: getMyName()
                        }));
                        window.showInAppNotification("Turnier", `Dem Turnier '${tName}' beigetreten! Warte auf Gegner...`, "success");
                    },
                    () => {}
                );
            }
            return;
        }
        if (data.type === 'takeback_request') {
            const sender = data.playerName || "Dein Gegner";
            addChat("System", `↩️ ${sender} bittet um eine Zug-Rücknahme!`, "system");
            if (window.showGameRequestModal) {
                window.showGameRequestModal(
                    "↩️",
                    "Zug-Rücknahme angefordert",
                    `Gegner '${sender}' möchte den letzten Zug zurücknehmen.`,
                    "✅ Zug erlauben",
                    "❌ Ablehnen",
                    () => {
                        socket.send(JSON.stringify({ type: 'takeback_accept', room: onlineRoom, playerName: getMyName() }));
                        addChat("System", "Du hast die Zug-Rücknahme akzeptiert.", "system");
                    },
                    () => {
                        addChat("System", "Du hast die Zug-Rücknahme abgelehnt.", "system");
                    }
                );
            }
            return;
        }
        if (data.type === 'draw_offer') {
            const sender = data.playerName || "Dein Gegner";
            addChat("System", `🤝 ${sender} bietet ein Remis an!`, "system");
            if (window.showGameRequestModal) {
                window.showGameRequestModal(
                    "🤝",
                    "Remis-Angebot (Unentschieden)",
                    `Gegner '${sender}' bietet ein Unentschieden (Remis) an.`,
                    "✅ Remis Akzeptieren",
                    "❌ Weiterspielen",
                    () => {
                        socket.send(JSON.stringify({ type: 'draw_accept', room: onlineRoom, playerName: getMyName() }));
                        addChat("System", "Du hast das Remis-Angebot akzeptiert.", "system");
                    },
                    () => {
                        addChat("System", "Du hast das Remis-Angebot abgelehnt.", "system");
                    }
                );
            }
            return;
        }
        if (data.type === 'takeback_accepted') {
            addChat("System", "Zug-Rücknahme wurde akzeptiert.", "system");
            if (history.length > 0) {
                const lastState = history.pop();
                board = lastState.board;
                turn = lastState.turn;
                hasMoved = lastState.hasMoved || hasMoved;
                enPassantTarget = lastState.enPassantTarget || null;
                halfMoveClock = lastState.halfMoveClock || 0;
                if (moveHistoryLog.length > 0) moveHistoryLog.pop();
                if (moveSnapshots.length > 1) moveSnapshots.pop();
                lastMove = moveSnapshots.length > 0 ? moveSnapshots[moveSnapshots.length - 1].lastMove : null;
                viewPly = -1;
                gameEnded = false;
                if (statusEl) statusEl.textContent = (turn === "white" ? "Weiß" : "Schwarz") + " am Zug (Rückgängig)";
                renderInteractiveMoveHistory();
                updateCapturedMaterialUI();
                updateOpeningExplorer();
                requestLiveEval(moveSnapshots.length - 1);
                updateTimerUI();
                draw();
            }
            return;
        }
        if (data.type === 'draw_accepted') {
            gameEnded = true;
            localStorage.removeItem('active_game_room');
            localStorage.removeItem('my_color');
            localStorage.removeItem('opponent_name');
            addChat("System", "Remis (Draw) wurde akzeptiert. Das Spiel endet unentschieden.", "system");
            window.SoundEngine?.playDrawSound();
            showCheckmateModal("Remis", "Das Spiel endete unentschieden.");
            if (timerInterval) clearInterval(timerInterval);
            updateTimerUI();
            return;
        }
        if (data.type === 'spectate_init' || data.type === 'spectator_join_success') {
            isSpectatorMode = true;
            window.isSpectatorMode = true;
            onlineRoom = data.room || onlineRoom;

            const banner = document.getElementById('spectating-banner');
            const text = document.getElementById('spectating-text');
            if (banner && text) {
                banner.style.display = 'flex';
                text.innerText = `👁️ Zuschauer-Modus: Raum ${data.room || onlineRoom} (${data.whitePlayer || 'Weiß'} vs ${data.blackPlayer || 'Schwarz'})`;
            }

            if (data.board) {
                board = data.board;
                if (data.turn) turn = data.turn;
                draw();
            }

            addChat("System", `👁️ Du schaust jetzt Raum ${data.room || 'dem Spiel'} zu.`, "system");
            return;
        }
        if (data.type === 'time_sync') {
            if (data.timeWhite !== undefined && data.timeWhite !== null && !isNaN(data.timeWhite)) {
                whiteTime = data.timeWhite;
            }
            if (data.timeBlack !== undefined && data.timeBlack !== null && !isNaN(data.timeBlack)) {
                blackTime = data.timeBlack;
            }
            updateTimerUI();
            return;
        }
        if (data.type === 'chat') {
            if (data.system) {
                addChat("System", data.text, "system");
            } else {
                const u = data.user || data.sender || data.name || data.playerName || "Anonym";
                const isMe = u === getMyName();
                addChat(u, data.text, isMe ? "me" : "other");
            }
            return;
        }
        if (data.type === 'emote') {
            if (data.sender !== getMyName() && window.showEmoteOnBoard) {
                window.showEmoteOnBoard(data.emote, false);
            }
            return;
        }
        if (data.type === 'voice_signal') {
            if (window.handleVoiceSignal) window.handleVoiceSignal(data);
            return;
        }
        if (data.type === 'friends_list') {
            if (window.updateFriendsList) window.updateFriendsList(data.friends);
            return;
        }
        if (data.type === 'match_history') {
            if (window.updateMatchHistory) window.updateMatchHistory(data.games);
            return;
        }
        
        
        if (data.type === 'player_profile_data') {
            const eloEl = document.getElementById('ppm-elo');
            const levelEl = document.getElementById('ppm-level');
            const roleEl = document.getElementById('ppm-role');
            if (eloEl) eloEl.textContent = "Elo: " + (Number(data.elo) || 1200);
            if (levelEl) levelEl.textContent = "Level: " + (Number(data.level) || 1);
            if (roleEl) roleEl.textContent = "Siege: " + (Number(data.wins) || 0);
            
            const histEl = document.getElementById('ppm-history');
            if (histEl) {
                if (data.recentWins && data.recentWins.length > 0) {
                    histEl.innerHTML = data.recentWins.map(w => {
                        const dateStr = escapeHtml(new Date(w.time).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }));
                        const safeOpp = escapeHtml(w.opp || 'Unbekannt');
                        const safeReason = escapeHtml(w.reason || 'checkmate');
                        return '<div style="background:rgba(255,255,255,0.05); padding:8px; border-radius:5px; font-size:0.9em;">' +
                               '<div style="color:#2ecc71; font-weight:bold;">Sieg vs ' + safeOpp + '</div>' +
                               '<div style="color:#aaa; font-size:0.8em;">' + dateStr + ' - ' + safeReason + '</div>' +
                               '</div>';
                    }).join('');
                } else {
                    histEl.innerHTML = '<div style="color:#888; font-style:italic;">Keine Siege gefunden.</div>';
                }
            }
            return;
        }

        
        if (data.type === 'lobbies_list') {
            renderLobbiesDropdown(data.lobbies);
            return;
        }
        if (data.type === 'lobby_joined') {
            window.currentLobbyId = data.lobbyId;
            window.currentLobbyName = data.lobbyName;

            const nameEl = document.getElementById("currentLobbyName");
            if (nameEl) nameEl.textContent = data.lobbyName;

            const selectEl = document.getElementById("chatLobbySelect");
            if (selectEl) selectEl.value = data.lobbyId;

            const container = document.getElementById("chat-messages") || chatMessages;
            if (container) container.innerHTML = "";

            addChat("System", `Du bist der Lobby '${data.lobbyName}' beigetreten.`, "system");

            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'get_chat_history', lobby: data.lobbyId }));
            }
            return;
        }
        if (data.type === 'lobby_error') {
            const createErr = document.getElementById("createLobbyError");
            if (createErr) createErr.textContent = data.text;

            const joinErr = document.getElementById("joinLobbyPasswordError");
            if (joinErr) joinErr.textContent = data.text;

            addChat("System", "🚨 " + data.text, "system");
            return;
        }

        if (data.type === 'chat_history') {
            const container = document.getElementById("chat-messages") || chatMessages;
            if (container) container.innerHTML = "";
            if (Array.isArray(data.messages)) {
                data.messages.forEach(msg => {
                    if (msg.system) {
                        addChat("System", msg.text, "system");
                    } else {
                        const u = msg.username || msg.user || msg.sender || msg.name || "Anonym";
                        const isMe = u === getMyName();
                        addChat(u, msg.content || msg.text || "", isMe ? "me" : "other");
                    }
                });
            }
            return;
        }
        if (data.type === 'in_app_notification') {
            if (window.showInAppNotification) window.showInAppNotification(data.title, data.message, data.level);
            return;
        }
        if (data.type === 'banned_redirect' || data.type === 'account_banned_overlay') {
            window.location.href = data.url || ('/banned?reason=' + encodeURIComponent(data.reason || 'Account gesperrt'));
            return;
        }
        if (data.type === 'admin_logs_update') {
            if (window.renderAdminLogs) window.renderAdminLogs(data.logs);
            return;
        }
        if (data.type === 'admin_users_update') {
            if (window.renderAdminUsers) window.renderAdminUsers(data.users);
            return;
        }
        if (data.type === 'admin_tickets_update') {
            if (window.renderAdminTickets) window.renderAdminTickets(data.tickets, data.supportEmail);
            return;
        }
        if (data.type === 'admin_elixir_update' || data.type === 'admin_elixir_queue') {
            if (window.renderAdminElixir) window.renderAdminElixir(data.queue || data.matches || []);
            return;
        }
        if (data.type === 'login_error') {
            addChat("System", "❌ Login-Fehler: " + (data.text || "Zugriff verweigert"), "system");
            if (data.banned || (data.text && (data.text.includes('gesperrt') || data.text.includes('gebannt')))) {
                window.location.href = data.redirect || ('/banned?reason=' + encodeURIComponent(data.reason || data.text || 'Account gesperrt'));
                return;
            }
            return;
        }
        if (data.type === 'system_alert') {
            addChat("SYSTEM ALERT", data.message, "system");
            if (data.message && (data.message.includes('GESPERRT') || data.message.includes('gebannt') || data.message.includes('ANTI-CHEAT SYSTEM'))) {
                window.location.href = '/banned?reason=' + encodeURIComponent(data.message);
                return;
            } else {
                if (typeof window.showInAppNotification === 'function') {
                    window.showInAppNotification("Hinweis", data.message, "info");
                }
            }
            return;
        }
        if (data.type === 'admin_login_success' || (data.type === 'login_success' && data.role === 'admin')) {
            const adminName = data.name || data.playerName || 'Max';
            localStorage.setItem("playerName", adminName);
            localStorage.setItem("customUsername", adminName);
            window.__serverVerifiedAdmin = true;

            // Reflect username in URL
            try {
                if (window.history && window.history.replaceState) {
                    window.history.replaceState(null, '', '?user=' + encodeURIComponent(adminName));
                }
            } catch (e) {}

            const navUserName = document.getElementById('navUserName');
            const navUserPill = document.getElementById('navUserPill');
            const navAuthBtn = document.getElementById('navAuthBtn');
            const adminPanel = document.getElementById('admin-panel');
            const profileName = document.getElementById('profile-name');
            const pInput = document.getElementById('playerName');

            if (navUserName) navUserName.innerHTML = `<span style="color: #f1c40f; font-weight: bold; text-shadow: 0 0 8px rgba(241,196,15,0.4);">👑 ${escapeHtml(adminName)} (Admin)</span>`;
            if (navUserPill) navUserPill.style.display = 'flex';
            if (navAuthBtn) navAuthBtn.style.display = 'none';
            if (adminPanel) adminPanel.style.display = 'block';
            if (profileName) profileName.innerText = `${adminName} (Admin)`;
            if (pInput) pInput.value = adminName;

            const profileStats = document.getElementById('profile-stats');
            if (profileStats) profileStats.innerText = `Elo: ${data.elo || 1200} | Siege: ${data.wins || 0}`;

            const authBtn = document.getElementById('openAuthBtn');
            if (authBtn) authBtn.style.display = 'none';
            const modal = document.getElementById('auth-modal');
            if (modal) modal.style.display = 'none';

            addChat("System", "👑 " + (data.message || "Willkommen zurück, Administrator!"), "system");
            window.refreshFriendsList?.();
            return;
        }
        if (data.type === 'login_success') {
            const statusBox = document.getElementById('save-status');
            if (statusBox) statusBox.innerHTML = "<span style='color: #00ff00;'>✅ Angemeldet als " + escapeHtml(data.name) + "</span>";
            if (data.name) {
                const pInput = document.getElementById('playerName');
                if (pInput) pInput.value = data.name;
                localStorage.setItem("playerName", data.name);
                window.__serverVerifiedAdmin = false;

                // Reflect username in URL
                try {
                    if (window.history && window.history.replaceState) {
                        window.history.replaceState(null, '', '?user=' + encodeURIComponent(data.name));
                    }
                } catch (e) {}

                const adminPanel = document.getElementById('admin-panel');
                if (adminPanel) adminPanel.style.display = 'none';

                const tempPw = localStorage.getItem('tempPasswordHash');
                if (tempPw) {
                    localStorage.setItem('playerPasswordHash', tempPw);
                    localStorage.removeItem('tempPasswordHash');
                }
                
                // Profile display update
                const profileName = document.getElementById('profile-name');
                const profileStats = document.getElementById('profile-stats');
                if (profileName) profileName.innerText = data.name;
                if (profileStats) profileStats.innerText = `Elo: ${data.elo || 1200} | Siege: ${data.wins || 0}`;
                const profileCoins = document.getElementById('profile-coins');
                if (profileCoins) profileCoins.innerText = '🏦 Coins: ' + (data.coins !== undefined ? data.coins : 1000);

                const navUserName = document.getElementById('navUserName');
                const navUserPill = document.getElementById('navUserPill');
                const navAuthBtn = document.getElementById('navAuthBtn');
                if (navUserName) navUserName.innerText = `${data.name} (${data.elo || 1200} Elo)`;
                if (navUserPill) navUserPill.style.display = 'flex';
                if (navAuthBtn) navAuthBtn.style.display = 'none';
                
                const authBtn = document.getElementById('openAuthBtn');
                if (authBtn) {
                    authBtn.style.display = 'none';
                }
                
                const modal = document.getElementById('auth-modal');
                if (modal) {
                    modal.style.display = 'none';
                }

                // Versuche automatisch ein aktives Spiel wiederzubetreten
                setTimeout(attemptGameRejoin, 300);
                window.refreshFriendsList?.();
            }
            return;
        }
        if (data.type === 'daily_puzzle') {
            const p = data.puzzle;
            window.activePuzzle = p;
            
            const titleEl = document.getElementById("puzzle-title") || document.getElementById("modal-puzzle-title");
            if (titleEl && p && p.title) {
                titleEl.innerText = p.title;
            }
            
            const descEl = document.getElementById("puzzle-desc") || document.getElementById("modal-puzzle-desc");
            if (descEl && p && p.description) {
                descEl.innerText = p.description + " (Deine Farbe: " + (p.color === "white" ? "Weiß" : "Schwarz") + ")";
            }
            
            const statusEl = document.getElementById("puzzle-status") || document.getElementById("modal-puzzle-status");
            const loadBtn = document.getElementById("loadPuzzleBtn");
            if (data.alreadySolved) {
                if (statusEl) {
                    statusEl.innerText = "✅ Heute bereits gelöst!";
                    statusEl.style.color = "#2ecc71";
                }
                if (loadBtn) {
                    loadBtn.innerText = "Geklärt (Heute gelöst)";
                    loadBtn.disabled = true;
                    loadBtn.style.opacity = "0.6";
                }
            } else {
                if (statusEl) {
                    statusEl.innerText = "Bereit zum Lösen!";
                    statusEl.style.color = "#f1c40f";
                }
                if (loadBtn) {
                    loadBtn.innerText = "Rätsel starten";
                    loadBtn.disabled = false;
                    loadBtn.style.opacity = "1";
                }
            }
            return;
        }
        
        if (data.type === 'puzzle_success') {
            window.SoundEngine?.playPromoteSound();
            if (typeof triggerGoldDustCelebration === 'function') triggerGoldDustCelebration();
            window.activePuzzle = null;
            window.isTacticalPuzzleMode = false;
            window.__puzzleAttemptFen = null;

            const statusEl = document.getElementById("puzzle-status") || document.getElementById("modal-puzzle-status");
            if (statusEl) {
                statusEl.innerText = data.text;
                statusEl.style.color = "#2ecc71";
            }
            if (typeof window.showInAppNotification === 'function') {
                window.showInAppNotification("Rätsel gelöst!", data.text, "success");
            }
            
            // Re-fetch puzzle state to update solved indicator
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'get_daily_puzzle' }));
            }
            return;
        }

        if (data.type === 'puzzle_wrong') {
            window.SoundEngine?.playIllegalSound();
            const statusEl = document.getElementById("puzzle-status") || document.getElementById("modal-puzzle-status");
            if (statusEl) {
                statusEl.innerText = data.text || "❌ Falscher Zug! Versuche es noch einmal.";
                statusEl.style.color = "#e74c3c";
            }
            const resetFen = data.fen || (window.activePuzzle && window.activePuzzle.fen) || window.__puzzleAttemptFen;
            if (resetFen) {
                setTimeout(() => {
                    if (typeof loadFEN === 'function') loadFEN(resetFen);
                }, 700);
            }
            return;
        }

        if (data.type === 'puzzle_info') {
            window.__puzzleAttemptFen = null;
            const statusEl = document.getElementById("puzzle-status") || document.getElementById("modal-puzzle-status");
            if (statusEl) {
                statusEl.innerText = data.text;
                statusEl.style.color = "#f1c40f";
            }
            if (typeof window.showInAppNotification === 'function') {
                window.showInAppNotification("Rätsel Info", data.text, "info");
            }
            return;
        }

        if (data.type === 'login_error') {
            const statusBox = document.getElementById('save-status');
            if (statusBox) statusBox.innerHTML = "<span style='color: #ff4444;'>❌ " + escapeHtml(data.text || "Login fehlgeschlagen") + "</span>";
            if (data.text && (data.text.includes('gesperrt') || data.text.includes('gebannt') || data.text.includes('Sperre'))) {
                if (typeof showBanOverlay === 'function') {
                    showBanOverlay(data.text);
                }
            }
            return;
        }
        if (data.type === 'sync_board') {
            if (data.fen && typeof loadFEN === 'function') loadFEN(data.fen);
            window.SoundEngine?.playIllegalSound();
            window.showInAppNotification?.('Synchronisation', data.reason || 'Brett wurde mit dem Server synchronisiert.', 'warning');
            return;
        }
        if (data.type === 'move') {
            const fr = data.fr !== undefined ? data.fr : (data.move ? data.move.fr : undefined);
            const fc = data.fc !== undefined ? data.fc : (data.move ? data.move.fc : undefined);
            const tr = data.tr !== undefined ? data.tr : (data.move ? data.move.tr : undefined);
            const tc = data.tc !== undefined ? data.tc : (data.move ? data.move.tc : undefined);
            const promo = data.promotion || (data.move ? data.move.promotion : null);
            if (fr !== undefined && fc !== undefined && tr !== undefined && tc !== undefined) {
                doMove(fr, fc, tr, tc, false, promo);
            }
            return;
        }
        if (data.type === 'leaderboard') {
            const listEl = document.getElementById('leaderboard-list');
            if (listEl && Array.isArray(data.list)) {
                // script2.js has a nicer rendering, so let's let script2.js handle it if it exists.
                // If not, we do a nice fallback:
                if (typeof window.script2Loaded === 'undefined') {
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

                    window.currentLeaderboardUsers = cleanList;
                    if (typeof window.renderModalLeaderboard === 'function') {
                        window.renderModalLeaderboard(cleanList);
                    }

                    listEl.innerHTML = cleanList.map((p, i) => {
                        let badge = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
                        let color = i === 0 ? '#f1c40f' : i === 1 ? '#bdc3c7' : i === 2 ? '#cd7f32' : 'rgba(255,255,255,0.7)';
                        let bg = i === 0 ? 'linear-gradient(135deg, rgba(241,196,15,0.2) 0%, rgba(0,0,0,0) 100%)' : 'rgba(255,255,255,0.03)';
                        return `
                        <div data-view-profile="${encodeURIComponent(p.name || '')}" class="leaderboard-player-row" style="cursor: pointer; background: ${bg}; padding: 12px; border-radius: 10px; margin-bottom: 8px; border: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: space-between; transition: 0.2s;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div style="width: 24px; text-align: center; font-weight: bold; color: ${color}; font-size: 1.1em;">
                                    ${badge || `#${i + 1}`}
                                </div>
                                <div style="display: flex; flex-direction: column;">
                                    <strong style="color: white; font-size: 1.05em; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">${escapeHtml(p.name)}</strong>
                                    <span style="color: #95a5a6; font-size: 0.8em;">Lvl ${Number(p.level) || 1} • Elo: ${Number(p.elo) || 1200}</span>
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="color: #f1c40f; font-weight: bold; font-size: 1.1em;">${Number(p.wins) || 0} 🏆</div>
                                <div style="color: #ccc; font-size: 0.7em;">Siege</div>
                            </div>
                        </div>`;
                    }).join('');
                }
            }
            return;
        }
        if (data.type === 'active_games_list') {
            const listEl = document.getElementById('spectator-games-list');
            if (listEl) {
                if (!data.games || data.games.length === 0) {
                    listEl.innerHTML = `<div style="color: #aaa; font-style: italic; text-align: center; font-size: 0.85em; padding: 10px 0;">Keine laufenden Online-Spiele.</div>`;
                } else {
                    listEl.innerHTML = data.games.map(g => `
                        <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 8px; display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 0.85em;">
                            <div style="display: flex; flex-direction: column; gap: 2px;">
                                <span style="font-weight: bold; color: #f1c40f;">Raum ${escapeHtml(g.room)}</span>
                                <span style="color: #ccc;">⚪ ${escapeHtml(g.whitePlayer)} vs ⚫ ${escapeHtml(g.blackPlayer)}</span>
                            </div>
                            <button type="button" data-spectate-room="${encodeURIComponent(g.room || '')}" style="background: #3498db; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.85em;">👁️ Zuschauen</button>
                        </div>
                    `).join('');
                }
            }
            return;
        }

        if (data.type === 'spectator_join_success') {
            isSpectatorMode = true;
            onlineRoom = data.room;
            
            const banner = document.getElementById('spectating-banner');
            const text = document.getElementById('spectating-text');
            if (banner && text) {
                banner.style.display = 'flex';
                text.innerText = `👁️ Zuschauer-Modus: Raum ${data.room} (${data.whitePlayer} vs ${data.blackPlayer})`;
            }
            
            if (data.board) {
                board = data.board;
                if (data.turn) turn = data.turn;
                draw();
            }
            
            addChat("System", `👁️ Du schaust jetzt Raum ${data.room} zu. Chatnachrichten im Zuschauer-Chat stören die Spieler nicht!`, "system");
            return;
        }

        if (data.type === 'spectator_board_update') {
            if (data.board) board = data.board;
            if (data.turn) turn = data.turn;
            if (data.lastMove) {
                lastMove = data.lastMove;
            }
            draw();
            return;
        }

        if (data.type === 'spectator_chat') {
            const u = data.user || "Zuschauer";
            addChat("👁️ " + u, data.text, "spectator");
            return;
        }

        if (data.type === 'spectator_count') {
            const countEl = document.getElementById('spectator-count-display');
            if (countEl) {
                countEl.innerText = `👁️ Zuschauer: ${data.count}`;
                countEl.style.display = data.count > 0 ? 'inline-block' : 'none';
            }
            return;
        }
        if (data.type === 'video_ready') {
            if (typeof onVideoReady === 'function') onVideoReady(data.url, data.prompt);
            addVideoToFeed({ url: data.url, prompt: data.prompt, playerName: data.playerName });
            return;
        }

        if (data.type === 'online_stats') {
            const count = data.onlineCount !== undefined ? data.onlineCount : 1;
            const onlineEl = document.getElementById('online-users-count');
            if (onlineEl) {
                onlineEl.innerText = `🟢 ${count} online`;
            }
            const navCounter = document.getElementById('nav-user-counter');
            if (navCounter) {
                navCounter.innerText = `${count} Online`;
            }
            return;
        }

        if (data.type === 'room_joined') {
            const rName = data.room || onlineRoom || 'Duell';
            if (typeof window.showInAppNotification === 'function') {
                window.showInAppNotification('⏳ Raum erstellt / beigetreten', `Raum '${rName}'. Warte auf deinen Freund (WhatsApp)...`, 'info');
            }
            addChat("System", `⏳ Du bist in Raum '${rName}'. Warte auf deinen Freund...`, "system");
            const statusDisplay = document.getElementById("status-display");
            if (statusDisplay) {
                statusDisplay.style.display = "block";
                statusDisplay.innerText = `⏳ Warte auf Freund in Raum '${rName}'...`;
            }
            return;
        }

        if (data.type === 'open_challenges_list') {
            renderOpenChallenges(data.challenges);
            return;
        }

        if (data.type === 'open_challenge_created') {
            if (typeof window.showInAppNotification === 'function') {
                window.showInAppNotification('⚔️ Herausforderung erstellt', 'Warte darauf, dass ein Spieler deine Herausforderung annimmt...', 'info');
            }
            return;
        }

        if (data.type === 'challenge_error') {
            window.showInAppNotification?.("Herausforderung", data.text || "Herausforderung nicht mehr verfügbar.", "warning");
            return;
        }
    } catch(err) {
        console.error("Fehler beim Verarbeiten der Server-Nachricht:", err);
    }
};

function renderOpenChallenges(challenges) {
    const listEl = document.getElementById('open-challenges-list');
    if (!listEl) return;

    if (!Array.isArray(challenges) || challenges.length === 0) {
        listEl.innerHTML = `<div style="font-size: 0.85em; color: #888; text-align: center; padding: 12px; font-style: italic;">Keine offenen Herausforderungen. Erstelle die erste! ⚡</div>`;
        return;
    }

    const myName = getMyName();
    const safeEscape = typeof escapeHtml === 'function' ? escapeHtml : (str => String(str || '').replace(/[<>&"']/g, ''));

    listEl.innerHTML = challenges.map(ch => {
        const safeCreator = safeEscape(ch.creator || 'Gast');
        const safeId = safeEscape(ch.id || '');
        const safeElo = parseInt(ch.creatorElo, 10) || 1200;
        const isMyChallenge = ch.creator === myName;
        const colorIcon = ch.color === 'white' ? '⚪ Weiß' : ch.color === 'black' ? '⚫ Schwarz' : '🎲 Zufall';
        const tcLabel = ch.timeControl === 'unlimited' ? 'Unbegrenzt' : `${safeEscape(ch.timeControl)} min`;

        return `
            <div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 8px 12px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                <div style="display: flex; flex-direction: column;">
                    <strong style="color: #f1c40f; font-size: 0.95em;">${safeCreator} <span style="font-size: 0.8em; color: #aaa;">(${safeElo} ELO)</span></strong>
                    <span style="font-size: 0.8em; color: #bdc3c7;">⏱️ ${tcLabel} • ${colorIcon}</span>
                </div>
                ${isMyChallenge ? 
                    `<button data-challenge-action="cancel" data-challenge-id="${safeId}" class="glass-btn danger open-challenge-action-btn" style="padding: 4px 8px; font-size: 0.8em; cursor: pointer;">Abbrechen</button>` :
                    `<button data-challenge-action="join" data-challenge-id="${safeId}" class="glass-btn success open-challenge-action-btn" style="padding: 6px 12px; font-size: 0.85em; font-weight: bold; cursor: pointer;">⚔️ Annehmen</button>`
                }
            </div>
        `;
    }).join('');
}
window.renderOpenChallenges = renderOpenChallenges;

function joinOpenChallenge(chId) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'join_open_challenge',
            challengeId: chId,
            playerName: getMyName()
        }));
    }
}
window.joinOpenChallenge = joinOpenChallenge;

function cancelOpenChallenge(chId) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'cancel_open_challenge',
            challengeId: chId
        }));
    }
}
window.cancelOpenChallenge = cancelOpenChallenge;

function checkUrlInviteParam() {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    const tcParam = params.get('tc');

    if (roomParam) {
        console.log("🔗 Raum aus Einladungs-Link erkannt:", roomParam);
        const roomInput = document.getElementById("roomID");
        if (roomInput) roomInput.value = roomParam;
        onlineRoom = roomParam;

        if (tcParam) {
            const tcSelect = document.getElementById("timeControl");
            if (tcSelect) tcSelect.value = tcParam;
        }

        const modeSelect = document.getElementById("gameMode");
        if (modeSelect) modeSelect.value = "online";

        setTimeout(() => {
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'join_room',
                    room: roomParam,
                    playerName: getMyName(),
                    timeControl: tcParam || '10',
                    allowBotFallback: false
                }));
                addChat("System", `🔗 Du bist über einen Einladungs-Link Raum '${roomParam}' beigetreten! Warte auf Gegner...`, "system");
            }
        }, 800);
    }
}
window.addEventListener('DOMContentLoaded', checkUrlInviteParam);

function attemptGameRejoin() {
    const savedRoom = localStorage.getItem('active_game_room');
    const myName = getMyName ? getMyName() : (localStorage.getItem('playerName') || 'Gast');
    if (savedRoom && socket && socket.readyState === WebSocket.OPEN && myName) {
        console.log(`🔄 Automatischer Rejoin-Versuch für Raum: ${savedRoom} als ${myName}`);
        socket.send(JSON.stringify({
            type: 'rejoin_room',
            room: savedRoom,
            playerName: myName
        }));
    }
}
window.attemptGameRejoin = attemptGameRejoin;

socket.onopen = () => {
    loadChatHistory();
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'get_open_challenges' }));
    }
    setInterval(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'get_open_challenges' }));
        }
    }, 8000);
    
    // Auto-Login, falls bereits eingeloggt
    const savedName = localStorage.getItem('playerName');
    const savedUid = localStorage.getItem('firebaseUid');
    const savedHash = localStorage.getItem('playerPasswordHash');
    
    if (savedName && savedUid) {
        console.log("Automatischer Firebase-Login für " + savedName);
        (async () => {
            try {
                let token = '';
                if (window.fbAuth && window.fbAuth.currentUser) {
                    token = await window.fbAuth.currentUser.getIdToken();
                }
                if (socket && socket.readyState === 1) {
                    socket.send(JSON.stringify({
                        type: 'login_attempt',
                        playerName: savedName,
                        uid: savedUid,
                        firebaseToken: token,
                        isRegister: false
                    }));
                }
            } catch (e) {
                console.warn("Konnte Firebase Token für Auto-Login nicht abrufen:", e);
            }
        })();
    } else if (savedName && savedHash) {
        console.log("Automatischer Hintergrund-Login für " + savedName);
        socket.send(JSON.stringify({
            type: 'login_attempt',
            playerName: savedName,
            password: savedHash
        }));
    } else {
        setTimeout(attemptGameRejoin, 400);
    }
    
    if (window.initFeatures) window.initFeatures(socket, savedName);
};

function getActivePieceTheme() {
    const raw = localStorage.getItem('piece_theme') || 'classic';
    const map = { neo: 'classic', wood: 'vintage', pixel: 'classic' };
    const resolved = map[raw] || raw;
    return (typeof PIECE_THEMES !== 'undefined' && PIECE_THEMES[resolved]) ? PIECE_THEMES[resolved] : PIECES;
}

function renderBoardArrowsSvg() {
    const wrapper = document.getElementById('board-wrapper');
    if (!wrapper) return;

    let svg = document.getElementById('board-arrows-svg');
    if (!svg) {
        svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.id = 'board-arrows-svg';
        svg.setAttribute("viewBox", "0 0 100 100");
        svg.style.cssText = "position:absolute; inset:0; width:100%; height:100%; pointer-events:none; z-index:40;";
        wrapper.appendChild(svg);
    } else if (!svg.getAttribute("viewBox")) {
        svg.setAttribute("viewBox", "0 0 100 100");
    }

    const colorMap = {
        green: "rgba(105, 190, 80, 0.85)",
        red: "rgba(235, 97, 80, 0.88)",
        blue: "rgba(82, 176, 220, 0.85)",
        yellow: "rgba(247, 198, 49, 0.88)",
        premove: "rgba(231, 76, 60, 0.9)"
    };

    const defsHtml = Object.entries(colorMap).map(([key, col]) =>
        `<marker id="cc-arrow-${key}" markerWidth="4" markerHeight="4" refX="2.5" refY="2" orient="auto">
            <polygon points="0 0, 3.6 2, 0 4" fill="${col}" />
        </marker>`
    ).join('');

    const sqCenter = (r, c) => {
        const vr = isBoardFlipped ? 7 - r : r;
        const vc = isBoardFlipped ? 7 - c : c;
        return { x: (vc + 0.5) * 12.5, y: (vr + 0.5) * 12.5 };
    };

    let shapes = '';
    if (typeof premove !== 'undefined' && premove) {
        const p1 = sqCenter(premove.fr, premove.fc);
        const p2 = sqCenter(premove.tr, premove.tc);
        shapes += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${colorMap.premove}" stroke-width="1.4" stroke-linecap="round" stroke-dasharray="2.5,1.8" marker-end="url(#cc-arrow-premove)" />`;
    }

    if (Array.isArray(drawArrows)) {
        for (const arr of drawArrows) {
            const cName = colorMap[arr.color] ? arr.color : 'green';
            const col = colorMap[cName];
            const p1 = sqCenter(arr.fr, arr.fc);
            const p2 = sqCenter(arr.tr, arr.tc);
            const dr = Math.abs(arr.tr - arr.fr);
            const dc = Math.abs(arr.tc - arr.fc);
            if ((dr === 2 && dc === 1) || (dr === 1 && dc === 2)) {
                // Knight L-shape arrow like Chess.com
                const elbow = dr === 2 ? { x: p1.x, y: p2.y } : { x: p2.x, y: p1.y };
                const dx = p2.x - elbow.x;
                const dy = p2.y - elbow.y;
                const len = Math.hypot(dx, dy) || 1;
                const ex = p2.x - (dx / len) * 2.2;
                const ey = p2.y - (dy / len) * 2.2;
                shapes += `<polyline points="${p1.x},${p1.y} ${elbow.x},${elbow.y} ${ex},${ey}" fill="none" stroke="${col}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" marker-end="url(#cc-arrow-${cName})" />`;
            } else {
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const len = Math.hypot(dx, dy) || 1;
                const sx = p1.x + (dx / len) * 1.5;
                const sy = p1.y + (dy / len) * 1.5;
                const ex = p2.x - (dx / len) * 2.4;
                const ey = p2.y - (dy / len) * 2.4;
                shapes += `<line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" stroke="${col}" stroke-width="2.2" stroke-linecap="round" marker-end="url(#cc-arrow-${cName})" />`;
            }
        }
    }

    svg.innerHTML = `<defs>${defsHtml}</defs>${shapes}`;
}

function draw() {
    const currentBoardEl = document.getElementById("chess-board") || boardEl;
    if (!currentBoardEl) return;
    currentBoardEl.innerHTML = "";
    const k = typeof findKing === 'function' ? findKing(turn) : (window.findKing ? window.findKing(turn) : null);
    const inCheck = k ? isAttacked(k.r, k.c, turn === "white" ? "black" : "white") : false;

    let possibleMoves = [];
    let selectedPieceObj = null;
    if (selected && board[selected.r] && board[selected.r][selected.c]) {
        selectedPieceObj = board[selected.r][selected.c];
        const selectedPieceColor = isOwn(selectedPieceObj, "white") ? "white" : "black";
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (canMoveLogic(selected.r, selected.c, r, c, selectedPieceColor) && isSafeMove(selected.r, selected.c, r, c, selectedPieceColor)) {
                    possibleMoves.push({ r, c });
                }
            }
        }
    }

    const themePieces = getActivePieceTheme();

    for (let vr = 0; vr < 8; vr++) {
        for (let vc = 0; vc < 8; vc++) {
            const r = isBoardFlipped ? 7 - vr : vr;
            const c = isBoardFlipped ? 7 - vc : vc;
            const p = (board[r] && board[r][c]) ? board[r][c] : "";

            const d = document.createElement("div");
            const isDarkSq = (r + c) % 2 === 1;
            d.className = `square ${isDarkSq ? "black-sq" : "white-sq"}`;
            d.dataset.r = r;
            d.dataset.c = c;
            d.dataset.vr = vr;
            d.dataset.vc = vc;
            d.style.position = "relative";

            // Rank label (8-1) on leftmost visual column
            if (vc === 0) {
                const rankLabel = document.createElement("span");
                rankLabel.className = "board-label";
                rankLabel.innerText = 8 - r;
                rankLabel.style.cssText = `position:absolute; top:2px; left:4px; font-size:10px; font-weight:700; pointer-events:none; user-select:none; color:${isDarkSq ? 'var(--board-white, #eeeed2)' : 'var(--board-black, #769656)'};`;
                d.appendChild(rankLabel);
            }

            // File label (a-h) on bottom visual row
            if (vr === 7) {
                const fileLabel = document.createElement("span");
                fileLabel.className = "board-label";
                fileLabel.innerText = String.fromCharCode(97 + c);
                fileLabel.style.cssText = `position:absolute; bottom:2px; right:4px; font-size:10px; font-weight:700; pointer-events:none; user-select:none; color:${isDarkSq ? 'var(--board-white, #eeeed2)' : 'var(--board-black, #769656)'};`;
                d.appendChild(fileLabel);
            }

            if (typeof lastMove !== 'undefined' && lastMove &&
                ((r === lastMove.fr && c === lastMove.fc) || (r === lastMove.tr && c === lastMove.tc))) {
                d.classList.add("last-move");
            }

            if (typeof premove !== 'undefined' && premove &&
                ((r === premove.fr && c === premove.fc) || (r === premove.tr && c === premove.tc))) {
                d.classList.add("premove");
            }

            const hlColor = highlightSquares && highlightSquares[`${r},${c}`];
            if (hlColor) {
                d.classList.add(`sq-hl-${hlColor}`);
            }

            if (hintMoveSquares) {
                if (hintMoveSquares.fr === r && hintMoveSquares.fc === c) d.classList.add("sq-hint-from");
                if (hintMoveSquares.tr === r && hintMoveSquares.tc === c) d.classList.add("sq-hint-to");
            }

            if (selected && selected.r === r && selected.c === c) d.classList.add("selected");
            if (inCheck && p && p.toLowerCase() === 'k' && isOwn(p, turn)) d.classList.add("in-check");

            if (possibleMoves.some(m => m.r === r && m.c === c)) {
                const dot = document.createElement("div");
                dot.className = "move-dot";
                const isEpCap = selectedPieceObj && selectedPieceObj.toLowerCase() === 'p' && enPassantTarget && r === enPassantTarget.r && c === enPassantTarget.c;
                if (p || isEpCap) {
                    dot.classList.add("capture-dot");
                }
                d.appendChild(dot);
            }

            if (p) {
                const img = document.createElement("img");
                img.src = themePieces[p] || PIECES[p];
                img.dataset.pieceColor = isOwn(p, 'white') ? 'white' : 'black';
                img.draggable = false;
                img.style.width = "85%";
                if (activeVariant === 'blindfold') {
                    img.style.opacity = '0';
                }
                d.appendChild(img);
            }

            currentBoardEl.appendChild(d);
        }
    }

    renderBoardArrowsSvg();
}
window.draw = draw;
window.resetGame = resetGame;
window.doMove = doMove;
window.canMoveLogic = canMoveLogic;
window.isSafeMove = isSafeMove;
window.isAttacked = isAttacked;

function closePromotionPicker() {
    const picker = document.getElementById('promotion-picker');
    if (picker) {
        picker.style.display = 'none';
        picker.innerHTML = '';
    }
    window._promoCallback = null;
}
window.closePromotionPicker = closePromotionPicker;

function openPromotionPicker(fr, fc, tr, tc, color, callback) {
    const picker = document.getElementById('promotion-picker');
    if (!picker) {
        callback('q');
        return;
    }

    const themePieces = getActivePieceTheme();
    const isWhite = color === 'white';
    const options = isWhite ? ['Q', 'R', 'B', 'N'] : ['q', 'r', 'b', 'n'];
    const vr = isBoardFlipped ? 7 - tr : tr;
    const vc = isBoardFlipped ? 7 - tc : tc;

    picker.innerHTML = '';
    picker.style.left = `${vc * 12.5}%`;
    if (vr <= 3) {
        picker.style.top = '0';
        picker.style.bottom = 'auto';
    } else {
        picker.style.bottom = '0';
        picker.style.top = 'auto';
    }

    window._promoCallback = callback;
    options.forEach(code => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'promo-option';
        btn.title = code.toUpperCase();
        const img = document.createElement('img');
        img.src = themePieces[code] || PIECES[code];
        img.draggable = false;
        btn.appendChild(img);
        btn.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
        });
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const cb = window._promoCallback;
            closePromotionPicker();
            if (typeof cb === 'function') cb(code.toLowerCase());
        });
        picker.appendChild(btn);
    });

    picker.style.display = 'flex';
}

function getSquareFromClientXY(clientX, clientY) {
    const bEl = document.getElementById('chess-board');
    if (!bEl) return null;
    const rect = bEl.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
        return null;
    }
    const vc = Math.min(7, Math.max(0, Math.floor(((clientX - rect.left) / rect.width) * 8)));
    const vr = Math.min(7, Math.max(0, Math.floor(((clientY - rect.top) / rect.height) * 8)));
    const r = isBoardFlipped ? 7 - vr : vr;
    const c = isBoardFlipped ? 7 - vc : vc;
    return { r, c, vr, vc, rect };
}

function initBoardPointerInteractions() {
    const bEl = document.getElementById('chess-board');
    if (!bEl || bEl.dataset.pointerBound === '1') return;
    bEl.dataset.pointerBound = '1';

    let rightDragStart = null;
    let dragState = null;

    bEl.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    bEl.addEventListener('pointerdown', (e) => {
        const sq = getSquareFromClientXY(e.clientX, e.clientY);
        if (!sq) return;

        // Right mouse button: highlight square or draw SVG arrow
        if (e.button === 2) {
            e.preventDefault();
            let col = 'green';
            if (e.shiftKey) col = 'red';
            else if (e.altKey) col = 'blue';
            else if (e.ctrlKey || e.metaKey) col = 'yellow';
            rightDragStart = { r: sq.r, c: sq.c, color: col };
            return;
        }

        if (e.button !== 0) return;

        // Close open promotion picker if clicking elsewhere on board
        closePromotionPicker();

        // Left click clears right-click arrows/highlights immediately
        if ((drawArrows && drawArrows.length > 0) || (highlightSquares && Object.keys(highlightSquares).length > 0)) {
            drawArrows = [];
            highlightSquares = {};
        }

        if (gameEnded || isSpectatorMode || isAnimating || window.isReplayMode) return;

        const piece = board[sq.r] ? board[sq.r][sq.c] : '';
        const isLocal = gameModeSelect && gameModeSelect.value === 'local';
        const controllableColor = isLocal ? turn : myColor;
        const canPickForDrag = piece && isOwn(piece, controllableColor);

        if (canPickForDrag && viewPly === -1) {
            dragState = {
                pointerId: e.pointerId,
                fr: sq.r,
                fc: sq.c,
                piece,
                startX: e.clientX,
                startY: e.clientY,
                sqWidth: sq.rect.width / 8,
                active: false,
                ghost: null,
                lastHoverSq: null
            };
            try { bEl.setPointerCapture(e.pointerId); } catch (err) {}
        } else {
            dragState = {
                pointerId: e.pointerId,
                fr: sq.r,
                fc: sq.c,
                piece: '',
                startX: e.clientX,
                startY: e.clientY,
                active: false,
                ghost: null,
                tapOnly: true
            };
        }
    });

    bEl.addEventListener('pointermove', (e) => {
        if (!dragState || dragState.pointerId !== e.pointerId || dragState.tapOnly) return;
        const dist = Math.hypot(e.clientX - dragState.startX, e.clientY - dragState.startY);

        if (!dragState.active && dist >= 6) {
            dragState.active = true;
            selected = { r: dragState.fr, c: dragState.fc };
            draw();

            const originEl = bEl.querySelector(`[data-r="${dragState.fr}"][data-c="${dragState.fc}"]`);
            if (originEl) originEl.classList.add('dragging-origin');

            const themePieces = getActivePieceTheme();
            const ghost = document.createElement('img');
            ghost.src = themePieces[dragState.piece] || PIECES[dragState.piece];
            ghost.className = 'drag-ghost-piece';
            ghost.style.width = `${Math.max(36, dragState.sqWidth * 0.92)}px`;
            ghost.style.height = `${Math.max(36, dragState.sqWidth * 0.92)}px`;
            ghost.style.left = `${e.clientX}px`;
            ghost.style.top = `${e.clientY}px`;
            document.body.appendChild(ghost);
            dragState.ghost = ghost;
        }

        if (dragState.active && dragState.ghost) {
            dragState.ghost.style.left = `${e.clientX}px`;
            dragState.ghost.style.top = `${e.clientY}px`;

            if (dragState.lastHoverSq) {
                dragState.lastHoverSq.classList.remove('drag-over');
                dragState.lastHoverSq = null;
            }
            const hoverSq = getSquareFromClientXY(e.clientX, e.clientY);
            if (hoverSq) {
                const el = bEl.querySelector(`[data-r="${hoverSq.r}"][data-c="${hoverSq.c}"]`);
                if (el) {
                    el.classList.add('drag-over');
                    dragState.lastHoverSq = el;
                }
            }
        }
    });

    const finishLeftPointer = (e, cancelled) => {
        if (!dragState || dragState.pointerId !== e.pointerId) return;
        const st = dragState;
        dragState = null;

        if (st.ghost && st.ghost.parentNode) st.ghost.parentNode.removeChild(st.ghost);
        bEl.querySelectorAll('.dragging-origin, .drag-over').forEach(el => el.classList.remove('dragging-origin', 'drag-over'));
        try { if (bEl.hasPointerCapture(e.pointerId)) bEl.releasePointerCapture(e.pointerId); } catch (err) {}

        if (cancelled) {
            draw();
            return;
        }

        if (!st.active) {
            const tapSq = getSquareFromClientXY(e.clientX, e.clientY) || { r: st.fr, c: st.fc };
            handleSquareClick(tapSq.r, tapSq.c);
            return;
        }

        const dropSq = getSquareFromClientXY(e.clientX, e.clientY);
        if (!dropSq || (dropSq.r === st.fr && dropSq.c === st.fc)) {
            draw();
            return;
        }

        const isLocal = gameModeSelect && gameModeSelect.value === 'local';
        if (!isLocal && turn !== myColor) {
            // Queue premove via drag
            if (canMoveLogic(st.fr, st.fc, dropSq.r, dropSq.c, myColor) || st.fr !== dropSq.r || st.fc !== dropSq.c) {
                premove = { fr: st.fr, fc: st.fc, tr: dropSq.r, tc: dropSq.c };
                selected = null;
            }
            draw();
            return;
        }

        if (canMoveLogic(st.fr, st.fc, dropSq.r, dropSq.c) && isSafeMove(st.fr, st.fc, dropSq.r, dropSq.c)) {
            const movingP = board[st.fr][st.fc];
            selected = null;
            if (movingP && movingP.toLowerCase() === 'p' && (dropSq.r === 0 || dropSq.r === 7)) {
                draw();
                openPromotionPicker(st.fr, st.fc, dropSq.r, dropSq.c, turn, (choice) => {
                    window._lastMoveWasDrag = true;
                    doMove(st.fr, st.fc, dropSq.r, dropSq.c, true, choice);
                });
            } else {
                window._lastMoveWasDrag = true;
                doMove(st.fr, st.fc, dropSq.r, dropSq.c, true, null);
            }
        } else {
            window.SoundEngine?.playIllegalSound();
            draw();
        }
    };

    bEl.addEventListener('pointerup', (e) => {
        if (e.button === 2 && rightDragStart) {
            const toggle = document.getElementById('arrowToggle');
            const endSq = getSquareFromClientXY(e.clientX, e.clientY);
            if (endSq && rightDragStart.r === endSq.r && rightDragStart.c === endSq.c) {
                if (typeof premove !== 'undefined' && premove) {
                    premove = null;
                    selected = null;
                } else if (!toggle || toggle.checked) {
                    const key = `${endSq.r},${endSq.c}`;
                    if (highlightSquares[key] === rightDragStart.color) delete highlightSquares[key];
                    else highlightSquares[key] = rightDragStart.color;
                }
                draw();
            } else if (endSq && (!toggle || toggle.checked)) {
                const idx = drawArrows.findIndex(a => a.fr === rightDragStart.r && a.fc === rightDragStart.c && a.tr === endSq.r && a.tc === endSq.c);
                if (idx >= 0) {
                    drawArrows.splice(idx, 1);
                } else {
                    drawArrows.push({ fr: rightDragStart.r, fc: rightDragStart.c, tr: endSq.r, tc: endSq.c, color: rightDragStart.color });
                }
                renderBoardArrowsSvg();
            }
            rightDragStart = null;
            return;
        }
        finishLeftPointer(e, false);
    });

    bEl.addEventListener('pointercancel', (e) => {
        rightDragStart = null;
        finishLeftPointer(e, true);
    });
}

function startGeneration() {
    const myName = getMyName();
    const promptInput = document.getElementById('videoPrompt');
    const statusEl = document.getElementById('videoStatus');

    if (!promptInput) return;
    const promptText = promptInput.value.trim();
    if (promptText === "") {
        window.showInAppNotification?.("Eingabe fehlt", "Bitte beschreibe zuerst, was im Video passieren soll!", "warning");
        return;
    }

    if (statusEl) statusEl.innerHTML = "⏳ <b>KI arbeitet...</b> Bitte warten (ca. 5 Sek.)";
    
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'generate_video',
            prompt: promptText,
            playerName: myName
        }));
    } else {
        if (statusEl) statusEl.innerHTML = "<span style='color:red;'>❌ Fehler: Server nicht verbunden!</span>";
    }
}
window.startGeneration = startGeneration;

function handleSquareClick(r, c) {
    if (gameEnded || isSpectatorMode || isAnimating || window.isReplayMode) return;
    if (viewPly !== -1) {
        jumpToLive();
        return;
    }

    const isLocal = gameModeSelect && gameModeSelect.value === "local";
    if (!isLocal && turn !== myColor) {
        if (selected) {
            if (board[r] && board[r][c] && isOwn(board[r][c], myColor)) {
                selected = (selected.r === r && selected.c === c) ? null : { r, c };
            } else {
                premove = { fr: selected.r, fc: selected.c, tr: r, tc: c };
                selected = null;
            }
        } else {
            if (board[r] && board[r][c] && isOwn(board[r][c], myColor)) {
                selected = { r, c };
                premove = null;
            } else if (premove) {
                premove = null;
            }
        }
        draw();
        return;
    }

    if (selected) {
        if (selected.r === r && selected.c === c) {
            selected = null;
            draw();
            return;
        }
        if (canMoveLogic(selected.r, selected.c, r, c) && isSafeMove(selected.r, selected.c, r, c)) {
            const fr = selected.r;
            const fc = selected.c;
            const piece = board[fr][fc];
            selected = null;

            if (piece && piece.toLowerCase() === 'p' && (r === 0 || r === 7)) {
                draw();
                openPromotionPicker(fr, fc, r, c, turn, (choice) => {
                    doMove(fr, fc, r, c, true, choice);
                });
                return;
            }
            doMove(fr, fc, r, c, true, null);
        } else {
            if (board[r][c] && isOwn(board[r][c], turn)) {
                selected = { r, c };
            } else {
                selected = null;
            }
        }
    } else if (board[r][c] && isOwn(board[r][c], turn)) {
        selected = { r, c };
    }
    draw();
}

const undoBtn = document.getElementById("undoBtn");
if (undoBtn) {
    undoBtn.onclick = () => {
        if (gameModeSelect && (gameModeSelect.value === 'online' || gameModeSelect.value === 'random')) {
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'takeback_request', room: onlineRoom, playerName: getMyName() }));
                addChat("System", "Zug-Rücknahme (Takeback) angefragt...", "system");
            }
            return;
        }

        if (history.length > 0) {
            const isBot = gameModeSelect && gameModeSelect.value === 'bot';
            const steps = (isBot && turn === myColor && history.length >= 2) ? 2 : 1;
            for (let i = 0; i < steps && history.length > 0; i++) {
                const lastState = history.pop();
                board = lastState.board;
                turn = lastState.turn;
                hasMoved = lastState.hasMoved || hasMoved;
                enPassantTarget = lastState.enPassantTarget || null;
                halfMoveClock = lastState.halfMoveClock || 0;
                if (moveHistoryLog.length > 0) moveHistoryLog.pop();
                if (moveSnapshots.length > 1) moveSnapshots.pop();
            }
            lastMove = moveSnapshots.length > 0 ? moveSnapshots[moveSnapshots.length - 1].lastMove : null;
            viewPly = -1;
            gameEnded = false;
            selected = null;
            premove = null;
            const sEl = document.getElementById("status-display") || statusEl;
            if (sEl) sEl.textContent = (turn === "white" ? "Weiß" : "Schwarz") + " am Zug (Rückgängig)";
            renderInteractiveMoveHistory();
            updateCapturedMaterialUI();
            updateOpeningExplorer();
            requestLiveEval(moveSnapshots.length - 1);
            updateTimerUI();
            draw();
        }
    };
}

const offerDrawBtn = document.getElementById("offerDrawBtn");
if (offerDrawBtn) {
    offerDrawBtn.onclick = () => {
        if (gameModeSelect && (gameModeSelect.value === 'online' || gameModeSelect.value === 'random')) {
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'draw_offer', room: onlineRoom, playerName: getMyName() }));
                addChat("System", "Remis (Draw) angeboten...", "system");
            }
        } else {
            window.showInAppNotification?.("Remis-Hinweis", "Remis-Angebote an Gegner sind nur in Online-Partien verfügbar.", "info");
        }
    };
}

const resetBtn = document.getElementById("resetBtn");
if (resetBtn && !resetBtn.hasAttribute('data-action') && !resetBtn.getAttribute('onclick')) resetBtn.onclick = () => resetGame(true);

const resignBtn = document.getElementById("resignBtn");
if (resignBtn) {
    resignBtn.onclick = () => {
        if (gameEnded) return;
        const performResign = () => {
            gameEnded = true;
            if (timerInterval) clearInterval(timerInterval);
            if (socket && socket.readyState === 1 && onlineRoom) {
                socket.send(JSON.stringify({
                    type: 'resign',
                    room: onlineRoom,
                    sender: getMyName()
                }));
            }
            addChat("System", "Du hast die Partie aufgegeben.", "system");
            const winner = (gameModeSelect && gameModeSelect.value === 'local')
                ? (turn === 'white' ? 'Schwarz' : 'Weiß')
                : (myColor === 'white' ? 'Schwarz' : 'Weiß');
            window.SoundEngine?.playMateSound();
            showCheckmateModal(winner, "Aufgabe!");
            updateTimerUI();
        };

        if (typeof window.showGameRequestModal === 'function') {
            window.showGameRequestModal(
                "🚩",
                "Partie aufgeben?",
                "Möchtest du die laufende Partie wirklich aufgeben?",
                "🚩 Ja, aufgeben",
                "Weiterspielen",
                performResign,
                () => {}
            );
        } else {
            performResign();
        }
    };
}

myEngineWorker.onmessage = (e) => {
    if (e.data && turn === botColor && gameModeSelect && gameModeSelect.value === "bot" && !gameEnded) {
        const { fr, fc, tr, tc, promotion } = e.data;
        const diffSelect = document.getElementById("botDifficulty");
        const isInstant = diffSelect && (diffSelect.value === "instant" || diffSelect.value === "1");
        const delay = isInstant ? 50 : 180;
        setTimeout(() => {
            if (!gameEnded && turn === botColor && board && board[fr] && board[fr][fc]) {
                doMove(fr, fc, tr, tc, false, promotion || null);
            }
        }, delay);
    }
};

stockfishWorker.onmessage = (e) => {
    const line = e.data;
    if (typeof line === 'string' && line.includes("bestmove")) {
        if (pendingStockfishFallbackTimer) {
            clearTimeout(pendingStockfishFallbackTimer);
            pendingStockfishFallbackTimer = null;
        }
        const match = line.match(/bestmove\s([a-h][1-8])([a-h][1-8])(q|r|b|n)?/);
        if (match && turn === botColor && gameModeSelect && gameModeSelect.value === "bot" && !gameEnded) {
            const cols = "abcdefgh";
            const fr = 8 - parseInt(match[1][1], 10);
            const fc = cols.indexOf(match[1][0]);
            const tr = 8 - parseInt(match[2][1], 10);
            const tc = cols.indexOf(match[2][0]);
            const prom = match[3] || null;
            setTimeout(() => {
                if (!gameEnded && turn === botColor) {
                    doMove(fr, fc, tr, tc, false, prom);
                }
            }, 80);
        }
    }
};

function getSecureSalat(text) {
    if (!text) return "";
    return CryptoJS.SHA256(text).toString();
}

function sanitizeVideoUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    const trimmed = rawUrl.trim();
    if (trimmed.startsWith('https://') || trimmed.startsWith('http://') || trimmed.startsWith('/videos/')) {
        return trimmed.replace(/[<>"'\s]/g, '');
    }
    return '';
}

function addVideoToFeed(video) {
    const feed = document.getElementById('videoFeed');
    if (!feed || !video) {
        if (!feed) console.error("Fehler: Element 'videoFeed' fehlt im HTML!");
        return;
    }

    const entry = document.createElement('div');
    entry.className = 'video-entry animate-pop-in';

    const infoDiv = document.createElement('div');
    infoDiv.className = 'video-info';

    const strong = document.createElement('strong');
    strong.textContent = `🎬 ${video.playerName || 'Künstliche Intelligenz'}`;

    const br = document.createElement('br');
    const small = document.createElement('small');
    small.textContent = String(video.prompt || '');

    infoDiv.appendChild(strong);
    infoDiv.appendChild(br);
    infoDiv.appendChild(small);

    const btn = document.createElement('button');
    btn.className = 'view-video-btn';
    btn.textContent = '▶ Video ansehen';

    const safeUrl = sanitizeVideoUrl(video.url);
    if (safeUrl) {
        btn.addEventListener('click', () => playVideo(safeUrl));
    } else {
        btn.disabled = true;
    }

    entry.appendChild(infoDiv);
    entry.appendChild(btn);
    feed.prepend(entry);
}

const emoteMenuBtn = document.getElementById("emote-menu-btn");
const emotePopup = document.getElementById("emote-popup");

if (emoteMenuBtn && emotePopup) {
    emoteMenuBtn.onclick = (e) => {
        e.stopPropagation();
        const isVisible = emotePopup.style.display === "block";
        emotePopup.style.display = isVisible ? "none" : "block";
    };

    document.addEventListener("click", () => {
        emotePopup.style.display = "none";
    });

    document.querySelectorAll(".emote-btn").forEach(btn => {
        btn.onclick = function() {
            const message = this.getAttribute("data-msg");

            let myName = "Gegner";
            try {
                if (typeof getMyName === "function") {
                    const dynamicName = getMyName();
                    if (dynamicName && dynamicName !== "undefined") {
                        myName = dynamicName;
                    }
                }
            } catch (err) {
                console.warn("Namens-Ermittlung fehlgeschlagen, nutze Fallback.");
            }

            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'chat',
                    text: message,
                    name: myName,
                    playerName: myName,
                    sender: myName
                }));

                const chatMessages = document.getElementById("chat-messages");
                if (chatMessages) {
                    const msgDiv = document.createElement("div");
                    
                    msgDiv.style.padding = "5px 8px";
                    msgDiv.style.margin = "4px 0";
                    msgDiv.style.borderRadius = "5px";
                    msgDiv.style.backgroundColor = "rgba(40, 167, 69, 0.15)";
                    msgDiv.style.borderLeft = "3px solid #28a745";
                    
                    msgDiv.innerHTML = `<strong style="color: #28a745;">${escapeHtml(myName)}:</strong> <span style="color: white;">${escapeHtml(message)}</span>`;
                    
                    chatMessages.appendChild(msgDiv);
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
                
                emotePopup.style.display = "none";
            }
        };
    });
}
resetGame();

// --- NEW: FEN PARSER / LOADER ---
function loadFEN(fen) {
    if (!fen) return;
    if (window.PGNEngine && typeof window.PGNEngine.parseFEN === 'function') {
        const parsed = window.PGNEngine.parseFEN(fen);
        if (!parsed) {
            window.showInAppNotification?.("Ungültige FEN", "Die FEN-Zeichenkette konnte nicht gelesen werden.", "warning");
            return;
        }
        board = parsed.board;
        turn = parsed.turn;
        const cas = parsed.castling || '-';
        hasMoved = {
            whiteK: !(cas.includes('K') || cas.includes('Q')),
            whiteR8: !cas.includes('K'),
            whiteR1: !cas.includes('Q'),
            blackK: !(cas.includes('k') || cas.includes('q')),
            blackR8: !cas.includes('k'),
            blackR1: !cas.includes('q')
        };
        enPassantTarget = parsed.epTarget;
        halfMoveClock = parsed.halfMoveClock || 0;
    } else {
        const parts = fen.split(" ");
        const boardPart = parts[0];
        const rows = boardPart.split("/");
        board = [];
        for (let r = 0; r < 8; r++) {
            const row = [];
            const fenRow = rows[r] || "";
            for (let i = 0; i < fenRow.length; i++) {
                const char = fenRow[i];
                if (/\d/.test(char)) {
                    for (let j = 0; j < parseInt(char, 10); j++) row.push("");
                } else {
                    row.push(char);
                }
            }
            board.push(row);
        }
        turn = (parts[1] === "b") ? "black" : "white";
        enPassantTarget = null;
        halfMoveClock = 0;
    }

    selected = null;
    history = [];
    moveHistoryLog = [];
    lastMove = null;
    premove = null;
    drawArrows = [];
    highlightSquares = {};
    viewPly = -1;
    gameEnded = false;
    positionHistory = {};
    positionHistory[getPositionKey()] = 1;
    moveSnapshots = [{
        board: board.map(r => [...r]),
        turn,
        hasMoved: { ...hasMoved },
        enPassantTarget,
        halfMoveClock,
        lastMove: null,
        san: null,
        uci: null,
        fen: boardToFEN(),
        evalBefore: 0,
        evalAfter: 0,
        quality: null
    }];

    renderInteractiveMoveHistory();
    updateCapturedMaterialUI();
    updateOpeningExplorer();
    updateTimerUI();
    requestLiveEval(0);
    if (typeof draw === "function") draw();
}
window.loadFEN = loadFEN;

// --- INITIALIZE PUZZLE ---
function initPuzzleControls() {
    const loadPuzzleBtn = document.getElementById("loadPuzzleBtn");
    const resetPuzzleBtn = document.getElementById("resetPuzzleBtn");
    
    if (loadPuzzleBtn) {
        loadPuzzleBtn.addEventListener("click", () => {
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'get_daily_puzzle' }));
                const pStatus = document.getElementById("puzzle-status") || document.getElementById("modal-puzzle-status");
                if (pStatus) {
                    pStatus.innerText = "Lade Position...";
                    pStatus.style.color = "#bdc3c7";
                }
                setTimeout(() => {
                    if (window.activePuzzle) {
                        window.isTacticalPuzzleMode = true;
                        loadFEN(window.activePuzzle.fen);
                        myColor = window.activePuzzle.color;
                        isBoardFlipped = (myColor === 'black');
                        applyFlipLayout();

                        const pStat = document.getElementById("puzzle-status") || document.getElementById("modal-puzzle-status");
                        if (pStat) {
                            pStat.innerText = "Rätsel aktiv! Mache deinen Zug.";
                            pStat.style.color = "#f1c40f";
                        }
                        if (resetPuzzleBtn) resetPuzzleBtn.style.display = "block";
                    }
                }, 600);
            } else {
                window.showInAppNotification?.("Offline", "Verbindung zum Server wird benötigt, um das Tägliche Rätsel zu laden.", "warning");
            }
        });
    }
    
    if (resetPuzzleBtn) {
        resetPuzzleBtn.addEventListener("click", () => {
            if (window.activePuzzle) {
                loadFEN(window.activePuzzle.fen);
                const pStat = document.getElementById("puzzle-status") || document.getElementById("modal-puzzle-status");
                if (pStat) {
                    pStat.innerText = "Position zurückgesetzt.";
                    pStat.style.color = "#f1c40f";
                }
            }
        });
    }
}

window.startModalPuzzle = function() {
    const pModal = document.getElementById("puzzle-modal");
    if (pModal) pModal.style.display = "none";
    const loadBtn = document.getElementById("loadPuzzleBtn");
    if (loadBtn) {
        loadBtn.click();
        return;
    }
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'get_daily_puzzle' }));
        setTimeout(() => {
            if (window.activePuzzle) {
                window.isTacticalPuzzleMode = true;
                loadFEN(window.activePuzzle.fen);
                myColor = window.activePuzzle.color;
                isBoardFlipped = (myColor === 'black');
                applyFlipLayout();
                window.showInAppNotification?.("Taktik-Rätsel", "Rätsel aktiv! Mache deinen Zug.", "info");
            }
        }, 400);
    } else {
        window.showInAppNotification?.("Offline", "Verbindung zum Server wird benötigt, um das Tägliche Rätsel zu laden.", "warning");
    }
};

// --- FULLSCREEN CONTROLS ---
function initFullscreenControls() {
    const fullscreenBtn = document.getElementById("fullscreenBtn");
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener("click", () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen()
                    .then(() => {
                        fullscreenBtn.innerText = "📺 Fenster";
                    })
                    .catch(err => {
                        console.error(`Fehler beim Aktivieren des Vollbildmodus: ${err.message}`);
                    });
            } else {
                document.exitFullscreen()
                    .then(() => {
                        fullscreenBtn.innerText = "📺 Vollbild";
                    });
            }
        });
    }
}

// Fetch puzzle status on startup
setTimeout(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'get_daily_puzzle' }));
    }
}, 1000);

// --- GLASSMORPHISM & PERFORMANCE TOGGLE LOGIK ---
function updateGlassmorphismState() {
    const isGlassEnabled = localStorage.getItem("glassmorphism_enabled") === "true";
    if (isGlassEnabled) {
        document.body.classList.add("glass-effects-enabled");
    } else {
        document.body.classList.remove("glass-effects-enabled");
    }
    const glassSelect = document.getElementById("glassEffectsSelect");
    if (glassSelect) {
        glassSelect.value = isGlassEnabled ? "enabled" : "disabled";
    }
}
updateGlassmorphismState();
if (document.readyState === 'loading') {
    document.addEventListener("DOMContentLoaded", updateGlassmorphismState);
} else {
    updateGlassmorphismState();
}

// --- CUSTOMIZATION & PIECE CUSTOM COLOR LOGIK ---
function initCustomizationControls() {
    updateGlassmorphismState();
    const glassSelect = document.getElementById("glassEffectsSelect");
    if (glassSelect) {
        glassSelect.value = localStorage.getItem("glassmorphism_enabled") === "true" ? "enabled" : "disabled";
        glassSelect.addEventListener("change", () => {
            const isEnabled = glassSelect.value === "enabled";
            localStorage.setItem("glassmorphism_enabled", isEnabled ? "true" : "false");
            updateGlassmorphismState();
        });
    }

    const boardThemeSelect = document.getElementById("boardThemeSelect");
    const pieceThemeSelect = document.getElementById("pieceThemeSelect");
    const cpWhite = document.getElementById("colorWhite");
    const cpBlack = document.getElementById("colorBlack");
    const cpMoveDot = document.getElementById("colorMoveDot");
    
    // Read from localStorage on boot
    const savedBoardTheme = localStorage.getItem("board_theme") || "classic";
    const savedPieceTheme = localStorage.getItem("piece_theme") || "classic";
    const savedColorWhite = localStorage.getItem("color_white") || "#eeeed2";
    const savedColorBlack = localStorage.getItem("color_black") || "#769656";
    const savedColorMoveDot = localStorage.getItem("color_move_dot");
    
    // Load and apply custom colors on boot
    if (cpWhite) cpWhite.value = savedColorWhite;
    if (cpBlack) cpBlack.value = savedColorBlack;
    if (cpMoveDot && savedColorMoveDot) cpMoveDot.value = savedColorMoveDot;
    document.documentElement.style.setProperty('--board-white', savedColorWhite);
    document.documentElement.style.setProperty('--board-black', savedColorBlack);
    if (savedColorMoveDot) {
        document.documentElement.style.setProperty('--move-dot-color', savedColorMoveDot);
    }
    
    if (cpMoveDot) {
        cpMoveDot.addEventListener("input", () => {
            const moveDotVal = cpMoveDot.value;
            localStorage.setItem("color_move_dot", moveDotVal);
            document.documentElement.style.setProperty('--move-dot-color', moveDotVal);
        });
    }

    // Bind event listeners for the custom color pickers safely
    if (cpWhite && cpBlack) {
        [cpWhite, cpBlack].forEach(cp => {
            cp.addEventListener("input", () => {
                const whiteVal = cpWhite.value;
                const blackVal = cpBlack.value;
                
                // Save custom colors to localStorage
                localStorage.setItem("color_white", whiteVal);
                localStorage.setItem("color_black", blackVal);
                
                // Apply the changes instantly to the document stylesheet variables
                document.documentElement.style.setProperty('--board-white', whiteVal);
                document.documentElement.style.setProperty('--board-black', blackVal);
                
                // Automatically switch the theme selection to "classic" so custom colors become visible
                if (boardThemeSelect && boardThemeSelect.value !== "classic") {
                    boardThemeSelect.value = "classic";
                    localStorage.setItem("board_theme", "classic");
                    applyThemes("classic", pieceThemeSelect ? pieceThemeSelect.value : "classic");
                }
            });
        });
    }
    
    if (boardThemeSelect) {
        boardThemeSelect.value = savedBoardTheme;
        boardThemeSelect.addEventListener("change", () => {
            const theme = boardThemeSelect.value;
            localStorage.setItem("board_theme", theme);
            applyThemes(theme, pieceThemeSelect ? pieceThemeSelect.value : "classic");
            
            // Sync settings to server
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'update_settings',
                    board_theme: theme,
                    piece_theme: pieceThemeSelect ? pieceThemeSelect.value : "classic"
                }));
            }
        });
    }
    
    if (pieceThemeSelect) {
        pieceThemeSelect.value = savedPieceTheme;
        pieceThemeSelect.addEventListener("change", () => {
            const theme = pieceThemeSelect.value;
            localStorage.setItem("piece_theme", theme);
            applyThemes(boardThemeSelect ? boardThemeSelect.value : "classic", theme);
            
            // Sync settings to server
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'update_settings',
                    board_theme: boardThemeSelect ? boardThemeSelect.value : "classic",
                    piece_theme: theme
                }));
            }
        });
    }

    const pieceSetSelect = document.getElementById("pieceSetSelect");
    if (pieceSetSelect) {
        const revMap = { classic: 'neo', vintage: 'wood', pixel: 'pixel' };
        if (revMap[savedPieceTheme]) pieceSetSelect.value = revMap[savedPieceTheme];
    }
    
    // Apply initial themes
    applyThemes(savedBoardTheme, savedPieceTheme);
}

function applyThemes(boardTheme, pieceTheme) {
    const boardEl = document.getElementById("chess-board");
    if (!boardEl) return;
    
    boardEl.classList.remove('theme-wood', 'theme-neon', 'theme-marble', 'theme-slate');
    if (boardTheme && boardTheme !== 'classic') {
        boardEl.classList.add(`theme-${boardTheme}`);
    }

    const pTheme = pieceTheme || localStorage.getItem('piece_theme') || 'classic';
    boardEl.classList.remove('piece-goldsilver', 'piece-neon', 'piece-vintage', 'piece-pixel');
    if (pTheme === 'goldsilver') boardEl.classList.add('piece-goldsilver');
    else if (pTheme === 'neon') boardEl.classList.add('piece-neon');
    else if (pTheme === 'vintage' || pTheme === 'wood') boardEl.classList.add('piece-vintage');
    else if (pTheme === 'pixel') boardEl.classList.add('piece-pixel');
    
    if (typeof draw === 'function') draw();
}
window.applyThemes = applyThemes;

window.changePieceSet = function(theme) {
    const map = { neo: 'classic', wood: 'vintage', pixel: 'pixel' };
    const normalized = map[theme] || theme || 'classic';
    localStorage.setItem('piece_theme', normalized);
    const pieceThemeSelect = document.getElementById('pieceThemeSelect');
    if (pieceThemeSelect && Array.from(pieceThemeSelect.options).some(o => o.value === normalized)) {
        pieceThemeSelect.value = normalized;
    }
    if (typeof applyThemes === 'function') {
        applyThemes(localStorage.getItem('board_theme') || 'classic', normalized);
    }
};

window.changeSoundPack = function(pack) {
    localStorage.setItem('sound_pack', pack);
    if (window.SoundEngine && typeof window.SoundEngine.setSoundPack === 'function') {
        window.SoundEngine.setSoundPack(pack);
        window.SoundEngine.playMoveSound();
    } else if (typeof playMoveSound === 'function') {
        playMoveSound();
    }
};

function generateChess960BackRank() {
    const rank = Array(8).fill('');
    const even = [0, 2, 4, 6];
    const odd = [1, 3, 5, 7];
    rank[even[Math.floor(Math.random() * even.length)]] = 'B';
    rank[odd[Math.floor(Math.random() * odd.length)]] = 'B';
    const placeEmpty = (piece) => {
        const empty = rank.map((v, i) => v === '' ? i : -1).filter(i => i >= 0);
        rank[empty[Math.floor(Math.random() * empty.length)]] = piece;
    };
    placeEmpty('Q');
    placeEmpty('N');
    placeEmpty('N');
    const rem = rank.map((v, i) => v === '' ? i : -1).filter(i => i >= 0);
    rank[rem[0]] = 'R';
    rank[rem[1]] = 'K';
    rank[rem[2]] = 'R';
    return rank;
}

window.startVariantGame = function() {
    const sel = document.getElementById('variantSelect');
    const variant = sel ? sel.value : 'standard';
    activeVariant = variant;
    const fModal = document.getElementById('features-modal');
    if (fModal) fModal.style.display = 'none';

    resetGame(true);
    if (variant === 'chess960') {
        const back = generateChess960BackRank();
        board[7] = [...back];
        board[0] = back.map(p => p.toLowerCase());
        hasMoved = { whiteK: true, whiteR1: true, whiteR8: true, blackK: true, blackR1: true, blackR8: true };
        if (moveSnapshots.length > 0) {
            moveSnapshots[0].board = board.map(r => [...r]);
            moveSnapshots[0].fen = boardToFEN();
        }
    }
    draw();
    window.showInAppNotification?.("Spielvariante", "Gestartet: " + variant, "info");
};

window.startPassAndPlay = function() {
    const fModal = document.getElementById('features-modal');
    if (fModal) fModal.style.display = 'none';
    const gmSelect = document.getElementById('gameMode');
    if (gmSelect) gmSelect.value = 'local';
    activeVariant = 'standard';
    resetGame(true);
    window.showInAppNotification?.("Lokal", "Pass & Play Modus (2 Spieler) gestartet", "success");
};

let keyboardMoveInput = "";
window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

    const promoPicker = document.getElementById('promotion-picker');
    if (promoPicker && promoPicker.style.display === 'flex') {
        const keyMap = { q: 'Q', d: 'Q', r: 'R', t: 'R', b: 'B', l: 'B', n: 'N', s: 'N' };
        const targetTitle = keyMap[e.key.toLowerCase()];
        if (targetTitle) {
            const btn = promoPicker.querySelector(`.promo-option[title="${targetTitle}"]`);
            if (btn) { e.preventDefault(); btn.click(); return; }
        }
        if (e.key === 'Escape') { e.preventDefault(); closePromotionPicker(); return; }
    }

    if (window.isReplayMode && e.code === 'Space') {
        e.preventDefault();
        window.toggleReplayPause?.();
        return;
    }

    // Navigation & Board flip shortcuts (Chess.com standard)
    if (e.key === 'ArrowLeft') { e.preventDefault(); stepHistory(-1); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); stepHistory(1); return; }
    if (e.key === 'Home') { e.preventDefault(); jumpToMoveIndex(0); return; }
    if (e.key === 'End') { e.preventDefault(); jumpToLive(); return; }
    if (e.key.toLowerCase() === 'f' && !(document.getElementById('keyboardToggle')?.checked)) {
        flipBoard();
        return;
    }

    const kbdToggle = document.getElementById('keyboardToggle');
    if (!kbdToggle || !kbdToggle.checked) return;

    if (e.key.length === 1 && /[a-h1-8]/.test(e.key.toLowerCase())) {
        keyboardMoveInput += e.key.toLowerCase();
        const statusEl = document.getElementById('voice-move-status');
        if (statusEl) statusEl.textContent = "Tastatur: " + keyboardMoveInput;

        if (keyboardMoveInput.length === 4) {
            const from = keyboardMoveInput.substring(0, 2);
            const to = keyboardMoveInput.substring(2, 4);
            keyboardMoveInput = "";
            const fc = from.charCodeAt(0) - 97;
            const fr = 8 - parseInt(from[1], 10);
            const tc = to.charCodeAt(0) - 97;
            const tr = 8 - parseInt(to[1], 10);

            if (canMoveLogic(fr, fc, tr, tc) && isSafeMove(fr, fc, tr, tc)) {
                doMove(fr, fc, tr, tc, true, null);
                if (statusEl) statusEl.textContent = "Gezogen: " + from + "-" + to;
            } else {
                window.SoundEngine?.playIllegalSound();
                if (statusEl) {
                    statusEl.textContent = "Ungültiger Zug: " + from + "-" + to;
                    setTimeout(() => { statusEl.textContent = ""; }, 2000);
                }
            }
        }
    } else if (e.key === 'Escape' || e.key === 'Backspace') {
        keyboardMoveInput = "";
        const statusEl = document.getElementById('voice-move-status');
        if (statusEl) statusEl.textContent = "";
    }
});

// Confetti effect
window.showConfetti = function() {
    const toggle = document.getElementById('confettiToggle');
    if (toggle && !toggle.checked) return;
    
    for (let i = 0; i < 100; i++) {
        createParticle();
    }
};

function createParticle() {
    const particle = document.createElement('div');
    document.body.appendChild(particle);
    
    const size = Math.random() * 10 + 5;
    const colors = ['#f1c40f', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    particle.style.position = 'fixed';
    particle.style.width = size + 'px';
    particle.style.height = size + 'px';
    particle.style.backgroundColor = color;
    particle.style.left = Math.random() * 100 + 'vw';
    particle.style.top = '-10px';
    particle.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
    particle.style.zIndex = '999999';
    particle.style.pointerEvents = 'none';
    
    const duration = Math.random() * 3 + 2;
    particle.animate([
        { transform: 'translate3d(0,0,0) rotate(0deg)', opacity: 1 },
        { transform: `translate3d(${Math.random()*200 - 100}px, 100vh, 0) rotate(${Math.random()*720}deg)`, opacity: 0 }
    ], {
        duration: duration * 1000,
        easing: 'cubic-bezier(.37,0,.63,1)'
    });
    
    setTimeout(() => {
        particle.remove();
    }, duration * 1000);
}

// --- SPECTATOR CONTROLS ---
isSpectatorMode = false;
window.isSpectatorMode = isSpectatorMode;

function initSpectatorControls() {
    const refreshGamesBtn = document.getElementById("refreshGamesBtn");
    const leaveSpectateBtn = document.getElementById("leaveSpectateBtn");
    
    if (refreshGamesBtn) {
        refreshGamesBtn.addEventListener("click", () => {
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'get_active_games' }));
            }
        });
        
        // Auto-refresh every 15 seconds
        setInterval(() => {
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'get_active_games' }));
            }
        }, 15000);
    }
    
    if (leaveSpectateBtn) {
        leaveSpectateBtn.addEventListener("click", leaveSpectate);
    }
}

function joinSpectate(room) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'spectate_join',
            room: room
        }));
    }
}
window.joinSpectate = joinSpectate;

function leaveSpectate() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'spectate_leave' }));
    }
    isSpectatorMode = false;
    window.isSpectatorMode = false;
    
    const banner = document.getElementById('spectating-banner');
    if (banner) banner.style.display = 'none';
    
    addChat("System", "👁️ Zuschauer-Modus beendet.", "system");
    resetGame();
}
window.leaveSpectate = leaveSpectate;

// Initialize all controls on DOM load
function initAllProBoardUI() {
    initBoardPointerInteractions();
    if (typeof renderInteractiveMoveHistory === 'function') renderInteractiveMoveHistory();
    if (typeof updateCapturedMaterialUI === 'function') updateCapturedMaterialUI();
    if (typeof updatePlayerNamesBar === 'function') updatePlayerNamesBar();
    if (typeof applyFlipLayout === 'function') applyFlipLayout();
}

window.addEventListener('DOMContentLoaded', () => {
    initPuzzleControls();
    initFullscreenControls();
    initCustomizationControls();
    initSpectatorControls();
    initAllProBoardUI();
    syncSoundButtonUI();

    const trainerSel = document.getElementById('trainer-repertoire-select');
    if (trainerSel && window.OpeningTrainer) {
        const reps = window.OpeningTrainer.getAvailableRepertoires();
        trainerSel.innerHTML = reps.map(r => `<option value="${escapeHtml(r.id)}">${escapeHtml(r.name)} (${r.side === 'white' ? 'Weiß' : 'Schwarz'})</option>`).join('');
        if (reps.some(r => r.id === trainerRepertoireId)) trainerSel.value = trainerRepertoireId;
        trainerSel.addEventListener('change', () => {
            trainerRepertoireId = trainerSel.value;
            try { localStorage.setItem('trainer_repertoire_id', trainerRepertoireId); } catch (e) {}
            if (trainerActive) {
                trainerActive = false;
                window.toggleOpeningTrainer();
            }
        });
    }
    
    // Pull active games list on load
    setTimeout(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'get_active_games' }));
        }
    }, 1500);
});
if (document.readyState !== 'loading') {
    initAllProBoardUI();
}

// Pure Canvas particle physics engine for Gold Dust explosion / celebration
function triggerGoldDustCelebration() {
    let canvas = document.getElementById("celebration-canvas");
    if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.id = "celebration-canvas";
        canvas.style.position = "fixed";
        canvas.style.top = "0";
        canvas.style.left = "0";
        canvas.style.width = "100vw";
        canvas.style.height = "100vh";
        canvas.style.pointerEvents = "none";
        canvas.style.zIndex = "999999";
        document.body.appendChild(canvas);
    }
    
    const ctx = canvas.getContext("2d");
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    
    const resizeHandler = () => {
        if (canvas) {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }
    };
    window.addEventListener("resize", resizeHandler);
    
    const particles = [];
    const sourceX1 = width * 0.15;
    const sourceX2 = width * 0.85;
    const sourceY = height * 0.85;
    
    // Left Fountain
    for (let i = 0; i < 90; i++) {
        particles.push({
            x: sourceX1,
            y: sourceY,
            vx: (Math.random() * 9 + 3), 
            vy: -(Math.random() * 16 + 12),
            radius: Math.random() * 4 + 2,
            color: `hsla(${Math.random() * 12 + 42}, 100%, ${Math.random() * 20 + 50}%, ${Math.random() * 0.7 + 0.3})`,
            gravity: 0.32,
            drag: 0.975,
            opacity: 1,
            spin: Math.random() * 360,
            spinSpeed: Math.random() * 12 - 6
        });
    }
    
    // Right Fountain
    for (let i = 0; i < 90; i++) {
        particles.push({
            x: sourceX2,
            y: sourceY,
            vx: -(Math.random() * 9 + 3), 
            vy: -(Math.random() * 16 + 12),
            radius: Math.random() * 4 + 2,
            color: `hsla(${Math.random() * 12 + 42}, 100%, ${Math.random() * 20 + 50}%, ${Math.random() * 0.7 + 0.3})`,
            gravity: 0.32,
            drag: 0.975,
            opacity: 1,
            spin: Math.random() * 360,
            spinSpeed: Math.random() * 12 - 6
        });
    }
    
    // Center sparkly explosions
    for (let i = 0; i < 70; i++) {
        particles.push({
            x: width / 2 + (Math.random() * 160 - 80),
            y: height * 0.4 + (Math.random() * 160 - 80),
            vx: (Math.random() * 6 - 3),
            vy: (Math.random() * 6 - 8),
            radius: Math.random() * 3 + 1,
            color: `#fff`,
            gravity: 0.12,
            drag: 0.96,
            opacity: 1,
            spin: Math.random() * 360,
            spinSpeed: Math.random() * 16 - 8
        });
    }
    
    function update() {
        ctx.clearRect(0, 0, width, height);
        let active = false;
        
        particles.forEach(p => {
            if (p.opacity > 0) {
                active = true;
                p.vy += p.gravity;
                p.vx *= p.drag;
                p.vy *= p.drag;
                p.x += p.vx;
                p.y += p.vy;
                p.spin += p.spinSpeed;
                p.opacity -= 0.007; 
                
                if (p.opacity < 0) p.opacity = 0;
                
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.spin * Math.PI / 180);
                ctx.fillStyle = p.color;
                ctx.shadowBlur = Math.random() * 8 + 4;
                ctx.shadowColor = "rgba(212, 175, 55, 0.75)";
                
                // Draw sparkly diamond
                ctx.beginPath();
                ctx.moveTo(0, -p.radius);
                ctx.lineTo(p.radius, 0);
                ctx.lineTo(0, p.radius);
                ctx.lineTo(-p.radius, 0);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
        });
        
        if (active) {
            requestAnimationFrame(update);
        } else {
            window.removeEventListener("resize", resizeHandler);
            if (canvas.parentNode) {
                canvas.parentNode.removeChild(canvas);
            }
        }
    }
    
    update();
}
window.triggerGoldDustCelebration = triggerGoldDustCelebration;

window.shareGameForAnalysis = function() {
    if (!moveHistoryLog || moveHistoryLog.length === 0) {
        if (window.showInAppNotification) {
            window.showInAppNotification("Analyse", "Keine Züge zum Analysieren vorhanden!", "warning");
        }
        return;
    }

    const pgn = (typeof buildFullPGN === 'function') ? buildFullPGN() : moveHistoryLog.join(" ");

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://lichess.org/api/import';
    form.target = '_blank';

    const pgnInput = document.createElement('input');
    pgnInput.type = 'hidden';
    pgnInput.name = 'pgn';
    pgnInput.value = pgn;
    form.appendChild(pgnInput);

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
}

function downloadReplay() {
    if (!moveHistoryLog || moveHistoryLog.length === 0) {
        if (window.showInAppNotification) {
            window.showInAppNotification("Replay", "Keine Züge zum Herunterladen vorhanden!", "warning");
        }
        return;
    }

    let pName = (typeof getMyName === 'function') ? getMyName() : "Gast";
    let oppName = (typeof opponentName !== 'undefined' && opponentName) ? opponentName : "Gegner";
    const whiteName = (typeof myColor !== 'undefined' && myColor === "white") ? pName : oppName;
    const blackName = (typeof myColor !== 'undefined' && myColor === "black") ? pName : oppName;

    const pgn = (typeof buildFullPGN === 'function') ? buildFullPGN() : moveHistoryLog.join(" ");

    try {
        const blob = new Blob([pgn], { type: "application/x-chess-pgn;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Schach_Replay_${whiteName}_vs_${blackName}.pgn`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (window.showInAppNotification) {
            window.showInAppNotification("PGN Export", "Partie wurde als PGN-Datei heruntergeladen.", "success");
        }
    } catch(e) {
        console.error("Fehler beim Herunterladen des Replays:", e);
        if (window.showInAppNotification) {
            window.showInAppNotification("Fehler", "Es gab einen Fehler beim Herunterladen des Replays.", "error");
        }
    }
}
window.downloadReplay = downloadReplay;
window.isChessMode = false;
window.toggleChessMode = function() {
    window.isChessMode = !window.isChessMode;
    const btn = document.getElementById('navFocusToggle');
    if (window.isChessMode) {
        document.body.classList.add('chess-mode');
        if (btn) btn.style.background = 'rgba(231, 76, 60, 0.4)';
    } else {
        document.body.classList.remove('chess-mode');
        if (btn) btn.style.background = '';
    }
};

// Automaticaly enable when match starts (optional but good idea)
const originalDoMove = window.doMove;
// we don't necessarily override doMove, we just provide the toggle so users can use it.


window.requestAdminElixirRefresh = function() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'get_admin_elixir' }));
        document.getElementById('admin-elixir-container').innerHTML = '<div style="color: #aaa; text-align: center; font-style: italic; font-size: 0.85em; padding: 10px 0;">Lade Queue...</div>';
    }
};


window.casinoBet = 0;
window.setCasinoBet = function(amount) {
    window.casinoBet = amount;
    document.getElementById('current-bet-display').innerText = amount + ' Coins';
    
    // Update active class on buttons
    const btns = document.querySelectorAll('.casino-bet-btn');
    btns.forEach(btn => btn.classList.remove('active-bet'));
    
    const targetBtn = Array.from(btns).find(b => parseInt(b.innerText) === amount || (amount===1000 && b.innerText.includes('1000')));
    if (targetBtn) targetBtn.classList.add('active-bet');
};

// ==========================================
// ADMIN USER MANAGEMENT & UNBAN SYSTEM ENGINE
// ==========================================

window.requestAdminUsersRefresh = function() {
    const listContainer = document.getElementById('admin-user-list');
    if (listContainer) {
        listContainer.innerHTML = '<div style="color: #aaa; text-align: center; font-style: italic; font-size: 0.85em; padding: 10px 0;">🔄 Lade Spielerliste...</div>';
    }

    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'get_admin_users' }));
    }

    // Also fetch via HTTP as fallback
    fetch('/api/admin/users')
        .then(res => res.json())
        .then(data => {
            if (data.success && data.users) {
                window.renderAdminUsers(data.users);
            }
        })
        .catch(err => console.warn("Admin users fetch:", err.message));
};

window.renderAdminUsers = function(users) {
    const listContainer = document.getElementById('admin-user-list');
    if (!listContainer) return;

    if (!users || !Array.isArray(users) || users.length === 0) {
        listContainer.innerHTML = '<div style="color: #aaa; text-align: center; font-style: italic; font-size: 0.85em; padding: 10px 0;">Keine registrierten Spieler gefunden.</div>';
        return;
    }

    let html = '';
    users.forEach(u => {
        const isBanned = !!u.is_banned;
        const isOnline = !!u.is_online;
        const role = u.role || 'user';
        const elo = u.elo || 1200;
        const wins = u.wins || 0;
        const name = u.username || u.name || 'Unbekannt';
        const banReason = u.ban_reason || 'Gesperrt';

        const statusBadge = isBanned 
            ? `<span style="background: rgba(231,76,60,0.25); color: #ff6b6b; border: 1px solid #e74c3c; padding: 2px 6px; border-radius: 4px; font-size: 0.75em; font-weight: bold;">🚫 GEBANNT</span>`
            : (isOnline 
                ? `<span style="background: rgba(46,204,113,0.2); color: #2ecc71; border: 1px solid #2ecc71; padding: 2px 6px; border-radius: 4px; font-size: 0.75em; font-weight: bold;">● LIVE</span>` 
                : `<span style="background: rgba(255,255,255,0.08); color: #888; border: 1px solid #555; padding: 2px 6px; border-radius: 4px; font-size: 0.75em;">○ OFFLINE</span>`);

        const roleBadge = role === 'admin' 
            ? `<span style="color: #f1c40f; font-weight: bold; font-size: 0.8em;">👑 Admin</span>` 
            : `<span style="color: #aaa; font-size: 0.8em;">${escapeHtml(role)}</span>`;

        html += `
            <div style="background: rgba(255,255,255,0.04); border: 1px solid ${isBanned ? 'rgba(231,76,60,0.4)' : 'rgba(255,255,255,0.08)'}; border-radius: 6px; padding: 8px 10px; display: flex; flex-direction: column; gap: 4px; transition: background 0.2s;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <strong style="color: ${isBanned ? '#ff6b6b' : '#fff'}; font-size: 0.9em;">${escapeHtml(name)}</strong>
                        ${roleBadge}
                    </div>
                    <div>${statusBadge}</div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.78em; color: #aaa;">
                    <span>Elo: ${Number(elo) || 1200} | Siege: ${Number(wins) || 0}</span>
                    <span>${u.ip_address ? 'IP: ' + escapeHtml(u.ip_address) : ''}</span>
                </div>
                ${isBanned ? `<div style="font-size: 0.75em; color: #ff8888; font-style: italic;">Grund: ${escapeHtml(banReason)}</div>` : ''}
                <div style="display: flex; gap: 6px; margin-top: 4px; justify-content: flex-end;">
                    ${isBanned ? `
                        <button type="button" data-admin-action="unban-user" data-target="${encodeURIComponent(name)}" class="glass-btn success" style="padding: 3px 8px; font-size: 0.75em; cursor: pointer; background: rgba(46,204,113,0.25); border: 1px solid #2ecc71; color: #a3e4d7;">
                            🔓 Entbannen
                        </button>
                    ` : `
                        <button type="button" data-admin-action="ban-user" data-target="${encodeURIComponent(name)}" class="glass-btn danger" style="padding: 3px 8px; font-size: 0.75em; cursor: pointer; background: rgba(231,76,60,0.25); border: 1px solid #e74c3c; color: #f5b7b1;">
                            🔨 Bannen
                        </button>
                    `}
                </div>
            </div>
        `;
    });

    listContainer.innerHTML = html;
};

window.unbanUser = function(encodedTarget) {
    const target = decodeURIComponent(encodedTarget);
    if (!target) return;

    const performUnban = async () => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'admin_unban_user',
                target: target
            }));
        }

        try {
            const res = await fetch('/api/admin/unban-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target: target })
            });
            const data = await res.json();
            if (data.success && window.showInAppNotification) {
                window.showInAppNotification("🔓 Spieler Entbannt", `Spieler '${target}' wurde erfolgreich entsperrt.`, "success");
            }
        } catch (e) {
            console.error("Unban user error:", e);
        }

        setTimeout(() => {
            window.requestAdminUsersRefresh();
            window.requestAdminTicketsRefresh();
        }, 400);
    };

    if (typeof window.showGameRequestModal === 'function') {
        window.showGameRequestModal("🔓", "Spieler entsperren", `Möchtest du '${target}' wirklich entsperren/entbannen?`, "Entsperren", "Abbrechen", performUnban, () => {});
    } else {
        performUnban();
    }
};

window.banUser = function(encodedTarget) {
    const target = decodeURIComponent(encodedTarget);
    if (!target) return;

    const performBan = async (reason) => {
        if (reason === null) return;
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'chat',
                text: `/ban "${target}" "${reason || 'Admin-Entscheidung'}"`
            }));
        }

        try {
            await fetch('/api/admin/ban-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target: target, reason: reason })
            });
        } catch (e) {}

        setTimeout(() => {
            window.requestAdminUsersRefresh();
        }, 400);
    };

    if (typeof window.showInAppPrompt === 'function') {
        window.showInAppPrompt("Spieler bannen", `Grund für den Bann von '${target}':`, "Admin-Entscheidung", performBan);
    } else {
        performBan("Admin-Entscheidung");
    }
};

// ==========================================
// ADMIN SUPPORT TICKETS & UNBAN REQUESTS
// ==========================================

window.requestAdminTicketsRefresh = function() {
    const container = document.getElementById('admin-tickets-container');
    if (container) {
        container.innerHTML = '<div style="color: #aaa; text-align: center; font-style: italic; font-size: 0.85em; padding: 10px 0;">🔄 Lade Support-Tickets...</div>';
    }

    fetch('/api/admin/tickets')
        .then(res => res.json())
        .then(data => {
            if (data.success && data.tickets) {
                window.renderAdminTickets(data.tickets, data.supportEmail);
            }
        })
        .catch(err => {
            if (container) container.innerHTML = '<div style="color: #ff6b6b; text-align: center; font-size: 0.85em;">Fehler beim Laden der Tickets.</div>';
        });
};

window.renderAdminTickets = function(tickets, supportEmail) {
    const container = document.getElementById('admin-tickets-container');
    if (!container) return;

    if (!tickets || !Array.isArray(tickets) || tickets.length === 0) {
        container.innerHTML = '<div style="color: #aaa; text-align: center; font-style: italic; font-size: 0.85em; padding: 10px 0;">Keine Support-Tickets vorhanden.</div>';
        return;
    }

    let html = '';
    tickets.forEach(t => {
        const isResolved = t.status === 'Entbannt' || t.status === 'Beantwortet' || t.status === 'Geschlossen';
        const statusColor = t.status === 'Entbannt' ? '#2ecc71' : (t.status === 'Beantwortet' ? '#3498db' : '#f1c40f');
        const user = t.user || t.contact || 'Unbekannt';

        html += `
            <div style="background: rgba(255,255,255,0.03); border: 1px solid ${isResolved ? 'rgba(46,204,113,0.3)' : 'rgba(241,196,15,0.3)'}; border-radius: 6px; padding: 8px 10px; margin-bottom: 8px; font-size: 0.82em;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <strong style="color: #fff;">${escapeHtml(t.id || 'Ticket')}</strong>
                    <span style="color: ${statusColor}; font-weight: bold; border: 1px solid ${statusColor}; padding: 1px 5px; border-radius: 3px; font-size: 0.75em;">${escapeHtml(t.status || 'Offen')}</span>
                </div>
                <div style="color: #ddd; margin-bottom: 3px;"><strong>Spieler/Kontakt:</strong> ${escapeHtml(user)} ${t.clientIP ? '(' + escapeHtml(t.clientIP) + ')' : ''}</div>
                <div style="color: #aaa; background: rgba(0,0,0,0.2); padding: 5px 8px; border-radius: 4px; margin-bottom: 4px;">${escapeHtml(t.text || '')}</div>
                ${t.reply ? `<div style="color: #2ecc71; font-style: italic; margin-bottom: 4px;">Antwort: ${escapeHtml(t.reply)}</div>` : ''}
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75em; color: #777;">
                    <span>${escapeHtml(t.createdAt || '')}</span>
                    <div style="display: flex; gap: 4px;">
                        ${!isResolved ? `
                            <button type="button" data-admin-action="unban-ticket" data-ticket-id="${encodeURIComponent(t.id || '')}" data-target="${encodeURIComponent(user || '')}" class="glass-btn success" style="padding: 2px 6px; font-size: 0.75em; cursor: pointer; background: rgba(46,204,113,0.25); border: 1px solid #2ecc71; color: #a3e4d7;">
                                🔓 Entbannen &amp; Genehmigen
                            </button>
                        ` : `
                            <button type="button" data-admin-action="unban-ticket" data-ticket-id="${encodeURIComponent(t.id || '')}" data-target="${encodeURIComponent(user || '')}" class="glass-btn" style="padding: 2px 6px; font-size: 0.75em; cursor: pointer;">
                                🔄 Erneut Freischalten
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
};

window.unbanTicket = function(ticketId) {
    if (!ticketId) return;

    const executeTicketUnban = async (replyText) => {
        if (replyText === null) return;

        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'admin_unban_ticket',
                ticketId: ticketId,
                reply: replyText
            }));
        }

        try {
            const res = await fetch('/api/admin/unban-ticket', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticketId: ticketId, reply: replyText })
            });
            const data = await res.json();
            if (data.success && window.showInAppNotification) {
                window.showInAppNotification("🔓 Ticket Entbannt", data.message || "Ticket erfolgreich entbannt.", "success");
            }
        } catch (e) {
            console.error("Unban ticket error:", e);
        }

        setTimeout(() => {
            window.requestAdminTicketsRefresh();
            window.requestAdminUsersRefresh();
        }, 400);
    };

    if (typeof window.showInAppPrompt === 'function') {
        window.showInAppPrompt("Ticket genehmigen", "Nachricht/Grund für Entbannung:", "Entbannungsantrag genehmigt! Dein Account/IP wurde freigeschaltet.", executeTicketUnban);
    } else {
        executeTicketUnban("Entbannungsantrag genehmigt! Dein Account/IP wurde freigeschaltet.");
    }
};

// ==========================================
// ADMIN LOGS & ELIXIR QUEUE VIEWER
// ==========================================

window.toggleAdminLogsPanel = function() {
    const container = document.getElementById('admin-logs-container');
    const arrow = document.getElementById('admin-logs-arrow');
    if (!container) return;

    if (container.style.display === 'none' || !container.style.display) {
        container.style.display = 'block';
        if (arrow) arrow.innerText = '▲';
        window.requestAdminLogsRefresh();
    } else {
        container.style.display = 'none';
        if (arrow) arrow.innerText = '▼';
    }
};

window.requestAdminLogsRefresh = function() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'get_admin_logs' }));
    }
};

window.renderAdminLogs = function(logs) {
    const list = document.getElementById('admin-logs-list');
    if (!list) return;

    if (!logs || !Array.isArray(logs) || logs.length === 0) {
        list.innerHTML = '<div style="color: #aaa; text-align: center; font-style: italic; padding: 10px 0;">Keine verdächtigen Aktivitäten protokolliert.</div>';
        return;
    }

    let html = '';
    logs.forEach(item => {
        html += `
            <div style="background: rgba(231,76,60,0.1); border: 1px solid rgba(231,76,60,0.3); border-radius: 4px; padding: 6px 8px;">
                <div style="display: flex; justify-content: space-between; color: #ff6b6b; font-weight: bold;">
                    <span>🛡️ ${escapeHtml(item.event || item.type || 'Admin-Conflict')}</span>
                    <span style="font-size: 0.75em; color: #aaa;">${escapeHtml(item.formattedTime || '')}</span>
                </div>
                <div style="color: #ddd; margin-top: 2px;">${escapeHtml(item.details || item.reason || '')}</div>
            </div>
        `;
    });
    list.innerHTML = html;
};

window.renderAdminElixir = function(queue) {
    const container = document.getElementById('admin-elixir-container');
    if (!container) return;

    if (!queue || queue.length === 0) {
        container.innerHTML = '<div style="color: #aaa; text-align: center; font-style: italic; font-size: 0.85em; padding: 10px 0;">Keine Spieler in der Matchmaking Queue.</div>';
        return;
    }

    let html = '';
    queue.forEach(item => {
        html += `
            <div style="background: rgba(155,89,182,0.1); border: 1px solid rgba(155,89,182,0.3); border-radius: 4px; padding: 6px 8px; margin-bottom: 4px; display: flex; justify-content: space-between;">
                <span style="color: #d2b4de; font-weight: bold;">${escapeHtml(item.playerName || 'Spieler')}</span>
                <span style="color: #aaa; font-size: 0.8em;">${escapeHtml(item.timeControl || '10 min')}</span>
            </div>
        `;
    });
    container.innerHTML = html;
};

// --- SAVED GAMES LOGIC ---
function persistSavedGameWithName(rawName) {
    const gameName = (rawName || "").trim() || ("Partie " + new Date().toLocaleString());
    const gameData = {
        id: Date.now().toString(),
        name: gameName,
        date: new Date().toISOString(),
        board: JSON.parse(JSON.stringify(board)),
        turn: turn,
        history: JSON.parse(JSON.stringify(history)),
        moveHistoryLog: JSON.parse(JSON.stringify(moveHistoryLog)),
        moveSnapshots: JSON.parse(JSON.stringify(moveSnapshots || [])),
        currentOpening: currentOpening ? JSON.parse(JSON.stringify(currentOpening)) : null,
        gameEnded: !!gameEnded,
        hasMoved: JSON.parse(JSON.stringify(hasMoved)),
        enPassantTarget: JSON.parse(JSON.stringify(enPassantTarget)),
        halfMoveClock: halfMoveClock,
        positionHistory: JSON.parse(JSON.stringify(positionHistory)),
        whiteTime: whiteTime,
        blackTime: blackTime,
        opponentName: opponentName,
        myColor: myColor
    };

    const savedGames = JSON.parse(localStorage.getItem('saved_chess_games') || '[]');
    savedGames.push(gameData);
    localStorage.setItem('saved_chess_games', JSON.stringify(savedGames));

    if (window.showInAppNotification) {
        window.showInAppNotification("Gespeichert", `Partie "${gameName}" wurde erfolgreich gesichert!`, "success");
    }
    window.renderSavedGamesList();
}

window.closeSaveGameModal = function() {
    const modal = document.getElementById('save-game-modal');
    if (modal) modal.style.display = 'none';
};

window.confirmSaveCurrentGame = function() {
    const input = document.getElementById('save-game-name-input');
    const name = input ? input.value : '';
    window.closeSaveGameModal();
    persistSavedGameWithName(name);
};

window.saveCurrentGame = function() {
    const defaultName = "Partie " + new Date().toLocaleString();
    const modal = document.getElementById('save-game-modal');
    const input = document.getElementById('save-game-name-input');
    if (modal && input) {
        input.value = defaultName;
        modal.style.display = 'flex';
        setTimeout(() => { input.focus(); input.select(); }, 30);
        return;
    }
    if (typeof window.showInAppPrompt === 'function') {
        window.showInAppPrompt("Partie speichern", "Gib einen Namen für die Partie ein:", defaultName, (name) => {
            if (name !== null) persistSavedGameWithName(name);
        });
    } else {
        persistSavedGameWithName(defaultName);
    }
};

window.loadSavedGame = function(id) {
    const savedGames = JSON.parse(localStorage.getItem('saved_chess_games') || '[]');
    const gameData = savedGames.find(g => g.id === id);
    if (!gameData) return;

    const performLoad = () => {
        window.stopReplay?.();
        const gameModeSelect = document.getElementById("gameMode");
        if (gameModeSelect) {
            gameModeSelect.value = "local";
            const botDiff = document.getElementById("bot-difficulty-container");
            if (botDiff) botDiff.style.display = "none";
        }

        board = JSON.parse(JSON.stringify(gameData.board));
        turn = gameData.turn || "white";
        history = JSON.parse(JSON.stringify(gameData.history || []));
        moveHistoryLog = JSON.parse(JSON.stringify(gameData.moveHistoryLog || []));
        moveSnapshots = JSON.parse(JSON.stringify(gameData.moveSnapshots || []));
        currentOpening = gameData.currentOpening || null;
        gameEnded = !!gameData.gameEnded;
        hasMoved = JSON.parse(JSON.stringify(gameData.hasMoved || { whiteK: false, whiteR1: false, whiteR8: false, blackK: false, blackR1: false, blackR8: false }));
        enPassantTarget = JSON.parse(JSON.stringify(gameData.enPassantTarget || null));
        halfMoveClock = gameData.halfMoveClock || 0;
        positionHistory = JSON.parse(JSON.stringify(gameData.positionHistory || {}));
        whiteTime = gameData.whiteTime ?? 600;
        blackTime = gameData.blackTime ?? 600;
        opponentName = gameData.opponentName || "Lokal";
        myColor = gameData.myColor || "white";
        isBoardFlipped = (myColor === "black");
        viewPly = -1;
        selected = null;
        premove = null;
        drawArrows = [];
        highlightSquares = {};
        hintMoveSquares = null;

        const lastSnap = moveSnapshots.length > 0 ? moveSnapshots[moveSnapshots.length - 1] : null;
        lastMove = lastSnap ? lastSnap.lastMove : null;

        if (typeof applyFlipLayout === 'function') applyFlipLayout();
        if (typeof draw === 'function') draw();
        const sEl = document.getElementById('status-display');
        if (sEl) sEl.textContent = (turn === 'white' ? 'Weiß' : 'Schwarz') + ' am Zug';
        if (typeof updateTimerUI === 'function') updateTimerUI();
        if (typeof renderInteractiveMoveHistory === 'function') renderInteractiveMoveHistory();
        if (typeof updateCapturedMaterialUI === 'function') updateCapturedMaterialUI();
        if (typeof updateOpeningExplorer === 'function') updateOpeningExplorer();
        if (typeof updatePlayerNamesBar === 'function') updatePlayerNamesBar();
        if (typeof requestLiveEval === 'function') requestLiveEval(Math.max(0, moveSnapshots.length - 1));

        if (typeof window.switchSidebarTab === "function") {
            const gameBtn = document.querySelectorAll(".sidebar-tab-btn")[0];
            if (gameBtn) window.switchSidebarTab("tab-game", gameBtn);
        }

        if (window.showInAppNotification) {
            window.showInAppNotification("Geladen", `Partie "${gameData.name}" geladen.`, "success");
        }
    };

    if (typeof window.showGameRequestModal === 'function') {
        window.showGameRequestModal("📂", "Partie laden", `Möchtest du die Partie "${gameData.name}" wirklich laden? Dein aktuelles ungespeichertes Spiel geht verloren.`, "Laden", "Abbrechen", performLoad, () => {});
    } else {
        performLoad();
    }
};

window.deleteSavedGame = function(id) {
    const performDelete = () => {
        let savedGames = JSON.parse(localStorage.getItem('saved_chess_games') || '[]');
        savedGames = savedGames.filter(g => g.id !== id);
        localStorage.setItem('saved_chess_games', JSON.stringify(savedGames));
        window.renderSavedGamesList();
        if (window.showInAppNotification) {
            window.showInAppNotification("Gelöscht", "Gespeicherte Partie wurde entfernt.", "info");
        }
    };

    if (typeof window.showGameRequestModal === 'function') {
        window.showGameRequestModal("🗑️", "Partie löschen", "Möchtest du diese gespeicherte Partie wirklich unwiderruflich löschen?", "Löschen", "Abbrechen", performDelete, () => {});
    } else {
        performDelete();
    }
};

window.renderSavedGamesList = function() {
    const listEl = document.getElementById('saved-games-list');
    if (!listEl) return;
    
    let savedGames = JSON.parse(localStorage.getItem('saved_chess_games') || '[]');
    if (savedGames.length === 0) {
        listEl.innerHTML = `<div style="font-size: 0.85em; color: #aaa; text-align: center; padding: 10px;">Keine Partien gespeichert.</div>`;
        return;
    }
    
    listEl.innerHTML = savedGames.map(game => {
        const safeGameName = escapeHtml(game.name || 'Partie');
        const encGameId = encodeURIComponent(game.id || '');
        return `
        <div style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; flex-direction: column; gap: 3px; overflow: hidden;">
                <span style="font-weight: bold; color: #3498db; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${safeGameName}">${safeGameName}</span>
                <span style="font-size: 0.75em; color: #888;">${escapeHtml(new Date(game.date).toLocaleString())} | Züge: ${game.history ? Number(game.history.length) : 0}</span>
            </div>
            <div style="display: flex; gap: 4px; flex-shrink: 0;">
                <button type="button" data-saved-action="load" data-game-id="${encGameId}" class="glass-btn success" style="padding: 4px 8px; font-size: 0.8em; border-radius: 4px; border: none; cursor: pointer;">Laden</button>
                <button type="button" data-saved-action="delete" data-game-id="${encGameId}" class="glass-btn danger" style="padding: 4px 8px; font-size: 0.8em; border-radius: 4px; border: none; cursor: pointer;">X</button>
            </div>
        </div>
    `;
    }).reverse().join('');
};

// Initialize list on load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.renderSavedGamesList();
    }, 1000);
});
window.renderSavedGamesList();
