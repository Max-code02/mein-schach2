// app-ui.js - Externalized UI & Modal Controllers for Strict Nonce CSP

(function() {
    'use strict';

    // Service Worker Registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then(reg => console.log('Service Worker registriert!', reg))
                .catch(err => console.log('Service Worker Fehler:', err));
        });
    }

    // 1. Device Preference Controller
    function checkDevicePreferenceOnLoad() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('mode') === 'desktop') {
            sessionStorage.setItem('device_choice_dismissed', 'true');
            return;
        }
        const pref = localStorage.getItem('device_preference');
        if (pref === 'mobile') {
            window.location.href = 'handy.html';
            return;
        }
        if (pref === 'pc' || sessionStorage.getItem('device_choice_dismissed') === 'true') {
            return;
        }
        const modal = document.getElementById('device-select-modal');
        if (modal) {
            modal.style.display = 'flex';
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (window.innerWidth <= 768);
            if (isMobile) {
                const mobileBtn = document.getElementById('device-btn-mobile');
                if (mobileBtn) {
                    mobileBtn.style.boxShadow = '0 0 15px rgba(46, 204, 113, 0.6)';
                }
            }
        }
    }
    window.checkDevicePreferenceOnLoad = checkDevicePreferenceOnLoad;

    function chooseDeviceSelection(choice) {
        const remember = document.getElementById('remember-device-choice')?.checked;
        if (remember) {
            localStorage.setItem('device_preference', choice);
        }
        sessionStorage.setItem('device_choice_dismissed', 'true');
        const modal = document.getElementById('device-select-modal');
        if (modal) modal.style.display = 'none';
        if (choice === 'mobile') {
            window.location.href = 'handy.html';
        }
    }
    window.chooseDeviceSelection = chooseDeviceSelection;

    // 2. Sidebar Navigation & Layout Toggles
    function toggleSidebarCollapse() {
        const sidebar = document.getElementById('chesscom-sidebar');
        const layout = document.getElementById('chesscom-layout');
        const icon = document.getElementById('sidebarCollapseIcon');
        if (!sidebar) return;
        const isCollapsed = sidebar.classList.toggle('collapsed');
        if (layout) layout.classList.toggle('sidebar-collapsed', isCollapsed);
        if (icon) icon.innerText = isCollapsed ? '»' : '«';
        try {
            localStorage.setItem('chesscom_sidebar_collapsed', isCollapsed ? 'true' : 'false');
        } catch (e) {}
    }
    window.toggleSidebarCollapse = toggleSidebarCollapse;

    function toggleMobileSidebar() {
        const sidebar = document.getElementById('chesscom-sidebar');
        const backdrop = document.getElementById('sidebar-backdrop');
        if (!sidebar) return;
        const isOpen = sidebar.classList.toggle('mobile-open');
        if (backdrop) backdrop.classList.toggle('active', isOpen);
    }
    window.toggleMobileSidebar = toggleMobileSidebar;

    function closeMobileSidebar() {
        const sidebar = document.getElementById('chesscom-sidebar');
        const backdrop = document.getElementById('sidebar-backdrop');
        if (sidebar) sidebar.classList.remove('mobile-open');
        if (backdrop) backdrop.classList.remove('active');
    }
    window.closeMobileSidebar = closeMobileSidebar;

    // 3. Leaderboard Modal Controller
    window.openLeaderboardModal = function() {
        if (window.innerWidth <= 1024) closeMobileSidebar();
        const modal = document.getElementById('leaderboard-modal');
        if (modal) {
            modal.style.display = 'flex';
            const searchInput = document.getElementById('modal-leaderboard-search');
            if (searchInput) searchInput.value = '';
            if (window.currentLeaderboardUsers && window.currentLeaderboardUsers.length > 0) {
                window.renderModalLeaderboard(window.currentLeaderboardUsers);
            } else if (typeof window.requestLeaderboardRefresh === 'function') {
                window.requestLeaderboardRefresh();
            }
        }
    };

    window.closeLeaderboardModal = function() {
        const modal = document.getElementById('leaderboard-modal');
        if (modal) modal.style.display = 'none';
    };

    window.renderModalLeaderboard = function(users) {
        const modalList = document.getElementById('modal-leaderboard-list');
        const countEl = document.getElementById('modal-leaderboard-count');
        if (!modalList) return;
        const list = users || window.currentLeaderboardUsers || [];
        if (countEl) countEl.innerText = `${list.length} Spieler`;
        
        if (list.length === 0) {
            modalList.innerHTML = '<div style="text-align: center; color: #888; padding: 30px 0;">Keine Spieler in der Rangliste gefunden.</div>';
            return;
        }

        const myName = (localStorage.getItem('playerName') || '').toLowerCase();
        const safeEscape = typeof window.escapeHtml === 'function' ? window.escapeHtml : (str => String(str || '').replace(/[<>&"']/g, ''));

        modalList.innerHTML = list.map((p, i) => {
            const rawName = p.name || p.username || 'Spieler';
            const safeName = safeEscape(rawName);
            const encName = encodeURIComponent(rawName);
            const badge = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
            const badgeColor = i === 0 ? '#f1c40f' : i === 1 ? '#bdc3c7' : i === 2 ? '#cd7f32' : '#8c8a87';
            const isMe = rawName.toLowerCase() === myName;
            const rowBg = isMe 
                ? 'rgba(129, 182, 76, 0.18)' 
                : (i === 0 
                    ? 'linear-gradient(90deg, rgba(241,196,15,0.12), transparent)' 
                    : (i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'));
            const borderStyle = isMe ? '1px solid rgba(129, 182, 76, 0.5)' : '1px solid rgba(255,255,255,0.04)';

            return `
            <div data-view-profile="${encName}" class="leaderboard-player-row" style="cursor: pointer; background: ${rowBg}; border: ${borderStyle}; border-radius: 8px; padding: 10px 12px; display: grid; grid-template-columns: 50px 1fr 110px 80px; align-items: center; transition: all 0.15s ease;">
                <div style="font-weight: 800; font-size: ${i < 3 ? '1.25rem' : '0.9rem'}; color: ${badgeColor};">
                    ${badge}
                </div>
                <div style="display: flex; align-items: center; gap: 10px; overflow: hidden;">
                    <span style="font-size: 1.1rem;">♟️</span>
                    <strong style="color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.95rem;">${safeName}</strong>
                </div>
                <div style="text-align: right; font-weight: 700; color: #f1c40f; font-size: 0.95rem;">
                    ${parseInt(p.elo, 10) || 1200} Elo
                </div>
                <div style="text-align: right; color: #8c8a87; font-size: 0.85rem;">
                    ${parseInt(p.wins, 10) || 0} Siege
                </div>
            </div>`;
        }).join('');
    };

    window.filterModalLeaderboard = function(query) {
        const list = window.currentLeaderboardUsers || [];
        const q = String(query || '').toLowerCase().trim();
        if (!q) {
            window.renderModalLeaderboard(list);
            return;
        }
        const filtered = list.filter(p => {
            const name = String(p.name || p.username || '').toLowerCase();
            return name.includes(q);
        });
        window.renderModalLeaderboard(filtered);
    };

    // 4. Video Modal Controller
    function playVideo(url) {
        const modal = document.getElementById('videoModal');
        const player = document.getElementById('player');
        if (modal && player) {
            player.src = url;
            modal.style.display = 'flex';
            player.play().catch(() => {});
        }
    }
    window.playVideo = playVideo;

    // 5. Dedicated Profile Modal Controller (Fix F7)
    function openProfileModal() {
        if (window.innerWidth <= 1024) closeMobileSidebar();
        const modal = document.getElementById('profile-modal');
        if (modal) {
            modal.style.display = 'flex';
            const name = (typeof window.getMyName === 'function' ? window.getMyName() : null) || localStorage.getItem('playerName') || 'Gastspieler';
            const userObj = (typeof window.currentUserData === 'object' && window.currentUserData) ? window.currentUserData : null;
            if (userObj && typeof window.updateProfileDisplay === 'function') {
                window.updateProfileDisplay(userObj.username || name, userObj.elo, userObj.wins, userObj.losses, userObj.level, userObj.xp, userObj.achievements);
            }
        }
    }
    window.openProfileModal = openProfileModal;

    function closeProfileModal() {
        const modal = document.getElementById('profile-modal');
        if (modal) modal.style.display = 'none';
    }
    window.closeProfileModal = closeProfileModal;

    // 6. Navigation & Mobile Helpers
    window.switchMobileTab = function(tabId, btn) {
        document.querySelectorAll('.sidebar-tab-content').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.mobile-bottom-nav .sidebar-tab-btn').forEach(b => b.classList.remove('active'));
        const target = document.getElementById(tabId);
        if (target) target.classList.add('active');
        if (btn) btn.classList.add('active');
        try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {}
    };

    window.setPcPreference = function() {
        try { localStorage.setItem('device_preference', 'pc'); } catch (e) {}
    };

    window.navSelectTab = function(tabId) {
        if (window.innerWidth <= 1024) {
            closeMobileSidebar();
        }
        document.querySelectorAll('.sidebar-nav-btn').forEach(b => b.classList.remove('active'));
        const targetBtn = document.querySelector(`.sidebar-tab-btn[data-arg1="${tabId}"]`);
        if (typeof window.switchSidebarTab === 'function') {
            window.switchSidebarTab(tabId, targetBtn);
        } else {
            window.switchMobileTab(tabId, targetBtn);
        }
    };

    window.selectModeFromModal = function(mode, autoStart) {
        const gm = document.getElementById('gameMode');
        if (gm) {
            gm.value = mode;
            gm.dispatchEvent(new Event('change'));
        }
        if (autoStart) {
            if (typeof window.resetGame === 'function') window.resetGame();
            if (typeof window.closeGameModeModal === 'function') window.closeGameModeModal();
            if (typeof window.showInAppNotification === 'function') {
                const label = mode === 'bot' ? 'Gegen KI-Bot' : (mode === 'random' ? 'Online-Suche' : (mode === 'local' ? 'Lokales Spiel' : 'Privater Raum'));
                window.showInAppNotification("Spielmodus gewählt", label + " gestartet.", "info");
            }
        }
    };

    window.openGameModeModal = function() {
        if (window.innerWidth <= 1024) closeMobileSidebar();
        const modal = document.getElementById('gamemode-modal');
        if (modal) modal.style.display = 'flex';
    };
    window.closeGameModeModal = function() {
        const modal = document.getElementById('gamemode-modal');
        if (modal) modal.style.display = 'none';
    };

    window.openFeaturesModal = function() {
        if (window.innerWidth <= 1024) closeMobileSidebar();
        const modal = document.getElementById('features-modal');
        if (modal) modal.style.display = 'flex';
    };
    window.closeFeaturesModal = function() {
        const modal = document.getElementById('features-modal');
        if (modal) modal.style.display = 'none';
    };

    window.openPuzzleModal = function() {
        if (window.innerWidth <= 1024) closeMobileSidebar();
        const modal = document.getElementById('puzzle-modal');
        if (modal) modal.style.display = 'flex';
    };
    window.closePuzzleModal = function() {
        const modal = document.getElementById('puzzle-modal');
        if (modal) modal.style.display = 'none';
    };

    window.openCasinoModal = function() {
        if (window.innerWidth <= 1024) closeMobileSidebar();
        const modal = document.getElementById('casino-modal');
        if (modal) modal.style.display = 'flex';
    };
    window.closeCasinoModal = function() {
        const modal = document.getElementById('casino-modal');
        if (modal) modal.style.display = 'none';
    };

    window.updateModalBetDisplay = function(amount) {
        const el = document.getElementById('modal-current-bet');
        if (el) el.innerText = `${parseInt(amount, 10) || 0} Coins`;
    };

    window.openAnalysisModal = function() {
        if (window.innerWidth <= 1024) closeMobileSidebar();
        const syncMap = [
            ['elo-display', 'modal-elo-display'],
            ['accuracy-display', 'modal-accuracy-display'],
            ['aggro-display', 'modal-aggro-display'],
            ['material-display', 'modal-material-display']
        ];
        syncMap.forEach(([srcId, destId]) => {
            const src = document.getElementById(srcId);
            const dest = document.getElementById(destId);
            if (src && dest) dest.innerText = src.innerText;
        });
        const modal = document.getElementById('analysis-modal');
        if (modal) modal.style.display = 'flex';
    };
    window.closeAnalysisModal = function() {
        const modal = document.getElementById('analysis-modal');
        if (modal) modal.style.display = 'none';
    };

    window.requestLeaderboardRefresh = async function() {
        const apiBaseUrl = window.location.hostname.includes('github.io') ? 'https://mein-schach2.onrender.com' : '';
        try {
            const res = await fetch(`${apiBaseUrl}/api/leaderboard`);
            const data = await res.json();
            if (data && data.success && Array.isArray(data.list)) {
                window.currentLeaderboardUsers = data.list;
                window.renderModalLeaderboard(data.list);
            }
        } catch (e) {}
    };

    // Global ESC Key Listener
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (typeof window.closeLeaderboardModal === 'function') window.closeLeaderboardModal();
            if (typeof window.closePuzzleModal === 'function') window.closePuzzleModal();
            if (typeof window.closeCasinoModal === 'function') window.closeCasinoModal();
            if (typeof window.closeAnalysisModal === 'function') window.closeAnalysisModal();
            if (typeof window.closeProfileModal === 'function') window.closeProfileModal();
            if (typeof window.closeGameModeModal === 'function') window.closeGameModeModal();
            if (typeof window.closeFeaturesModal === 'function') window.closeFeaturesModal();
            if (typeof window.closeFenPgnModal === 'function') window.closeFenPgnModal();
            if (typeof window.closeSaveGameModal === 'function') window.closeSaveGameModal();
            const devModal = document.getElementById('device-select-modal');
            if (devModal) devModal.style.display = 'none';
            const vidModal = document.getElementById('videoModal');
            if (vidModal) vidModal.style.display = 'none';
            const authModal = document.getElementById('auth-modal');
            if (authModal) authModal.style.display = 'none';
            const nameModal = document.getElementById('name-modal');
            if (nameModal) nameModal.style.display = 'none';
            const mateModal = document.getElementById('checkmate-modal');
            if (mateModal) mateModal.style.display = 'none';
            const ppm = document.getElementById('player-profile-modal');
            if (ppm) ppm.style.display = 'none';
        }
    });

    // 7. Universal Event Delegation for Nonce CSP (Safely executing actions without eval)
    document.addEventListener('click', function(e) {
        // Handle toast close button
        const toastClose = e.target.closest('[data-toast-close]');
        if (toastClose) {
            const toastEl = toastClose.closest('.in-app-toast') || toastClose.parentElement?.parentElement;
            if (toastEl) toastEl.remove();
            return;
        }

        // Handle clickable admin command pills in system chat
        const cmdPill = e.target.closest('[data-insert-cmd]');
        if (cmdPill) {
            const cmd = cmdPill.getAttribute('data-insert-cmd');
            if (cmd && typeof window.insertAdminCommand === 'function') {
                window.insertAdminCommand(cmd);
            }
            return;
        }

        // Handle spectate buttons
        const spectateBtn = e.target.closest('[data-spectate-room]');
        if (spectateBtn) {
            const roomEnc = spectateBtn.getAttribute('data-spectate-room');
            if (roomEnc && typeof window.joinSpectate === 'function') {
                window.joinSpectate(decodeURIComponent(roomEnc));
            }
            return;
        }

        // Handle saved games load / delete buttons
        const savedBtn = e.target.closest('[data-saved-action]');
        if (savedBtn) {
            const act = savedBtn.getAttribute('data-saved-action');
            const idEnc = savedBtn.getAttribute('data-game-id');
            const gameId = idEnc ? decodeURIComponent(idEnc) : '';
            if (act === 'load' && typeof window.loadSavedGame === 'function') {
                window.loadSavedGame(gameId);
            } else if (act === 'delete' && typeof window.deleteSavedGame === 'function') {
                window.deleteSavedGame(gameId);
            }
            return;
        }

        // Handle admin panel user / ticket actions cleanly without inline onclick
        const adminBtn = e.target.closest('[data-admin-action]');
        if (adminBtn) {
            const admAct = adminBtn.getAttribute('data-admin-action');
            const targetEnc = adminBtn.getAttribute('data-target') || '';
            const target = targetEnc ? decodeURIComponent(targetEnc) : '';
            const roleVal = adminBtn.getAttribute('data-role') || '';
            const ticketEnc = adminBtn.getAttribute('data-ticket-id') || '';
            const ticketId = ticketEnc ? decodeURIComponent(ticketEnc) : '';
            if (admAct === 'kick' && typeof window.adminKickUser === 'function') window.adminKickUser(target);
            else if (admAct === 'ban' && typeof window.adminBanUser === 'function') window.adminBanUser(target);
            else if (admAct === 'unban' && typeof window.adminUnbanUser === 'function') window.adminUnbanUser(target);
            else if (admAct === 'role' && typeof window.setUserRole === 'function') window.setUserRole(target, roleVal);
            else if (admAct === 'ban-user' && typeof window.banUser === 'function') window.banUser(targetEnc);
            else if (admAct === 'unban-user' && typeof window.unbanUser === 'function') window.unbanUser(targetEnc);
            else if (admAct === 'unban-ticket' && typeof window.unbanTicket === 'function') window.unbanTicket(ticketId, target);
            else if (admAct === 'reply-ticket' && typeof window.replyToTicket === 'function') window.replyToTicket(ticketId);
            else if (admAct === 'reject-ticket' && typeof window.rejectTicket === 'function') window.rejectTicket(ticketId);
            return;
        }

        // Handle video play buttons
        const videoBtn = e.target.closest('[data-play-video]');
        if (videoBtn) {
            const urlEnc = videoBtn.getAttribute('data-play-video');
            if (urlEnc) playVideo(decodeURIComponent(urlEnc));
            return;
        }

        // Handle Opening Explorer continuation suggestion clicks
        const openChip = e.target.closest('[data-opening-uci]');
        if (openChip) {
            const uci = openChip.getAttribute('data-opening-uci');
            if (uci && uci.length >= 4 && typeof window.makeMove === 'function') {
                window.makeMove(uci.slice(0, 2), uci.slice(2, 4), uci[4] || null);
            }
            return;
        }

        // Handle leaderboard player profile lookup
        const lbRow = e.target.closest('[data-view-profile]');
        if (lbRow) {
            const enc = lbRow.getAttribute('data-view-profile');
            if (enc && typeof window.viewPlayerProfile === 'function') {
                window.viewPlayerProfile(decodeURIComponent(enc));
            }
            return;
        }

        // Handle open challenges list actions
        const chBtn = e.target.closest('.open-challenge-action-btn');
        if (chBtn) {
            const action = chBtn.getAttribute('data-challenge-action');
            const chId = chBtn.getAttribute('data-challenge-id');
            if (action === 'cancel' && typeof window.cancelOpenChallenge === 'function') {
                window.cancelOpenChallenge(chId);
            } else if (action === 'join' && typeof window.joinOpenChallenge === 'function') {
                window.joinOpenChallenge(chId);
            }
            return;
        }

        // Handle generic data-action
        const actionEl = e.target.closest('[data-action]');
        if (!actionEl) return;

        const action = actionEl.getAttribute('data-action');
        const arg1 = actionEl.getAttribute('data-arg1');
        const arg2 = actionEl.getAttribute('data-arg2');

        switch (action) {
            case 'openProfileModal':
                openProfileModal();
                break;
            case 'closeProfileModal':
                closeProfileModal();
                break;
            case 'openGameModeModal':
                if (typeof window.openGameModeModal === 'function') window.openGameModeModal();
                break;
            case 'closeGameModeModal':
                if (typeof window.closeGameModeModal === 'function') window.closeGameModeModal();
                break;
            case 'openFeaturesModal':
                if (typeof window.openFeaturesModal === 'function') window.openFeaturesModal();
                break;
            case 'closeFeaturesModal':
                if (typeof window.closeFeaturesModal === 'function') window.closeFeaturesModal();
                break;
            case 'openLeaderboardModal':
                window.openLeaderboardModal();
                break;
            case 'closeLeaderboardModal':
                window.closeLeaderboardModal();
                break;
            case 'openPuzzleModal':
                if (typeof window.openPuzzleModal === 'function') window.openPuzzleModal();
                break;
            case 'closePuzzleModal':
                if (typeof window.closePuzzleModal === 'function') window.closePuzzleModal();
                break;
            case 'openCasinoModal':
                if (typeof window.openCasinoModal === 'function') window.openCasinoModal();
                break;
            case 'closeCasinoModal':
                if (typeof window.closeCasinoModal === 'function') window.closeCasinoModal();
                break;
            case 'openAnalysisModal':
                if (typeof window.openAnalysisModal === 'function') window.openAnalysisModal();
                break;
            case 'closeAnalysisModal':
                if (typeof window.closeAnalysisModal === 'function') window.closeAnalysisModal();
                break;
            case 'openFenPgnModal':
                if (typeof window.openFenPgnModal === 'function') window.openFenPgnModal();
                break;
            case 'closeFenPgnModal':
                if (typeof window.closeFenPgnModal === 'function') window.closeFenPgnModal();
                break;
            case 'openSaveGameModal':
                if (typeof window.openSaveGameModal === 'function') window.openSaveGameModal();
                break;
            case 'closeSaveGameModal':
                if (typeof window.closeSaveGameModal === 'function') window.closeSaveGameModal();
                break;
            case 'openAuthModal':
                if (typeof window.openAuthModal === 'function') window.openAuthModal();
                break;
            case 'closeAuthModal':
                {
                    const m = document.getElementById('auth-modal');
                    if (m) m.style.display = 'none';
                }
                break;
            case 'openNameModal':
                if (typeof window.openNameModal === 'function') window.openNameModal();
                break;
            case 'closeNameModal':
                {
                    const m = document.getElementById('name-modal');
                    if (m) m.style.display = 'none';
                }
                break;
            case 'closeCheckmateModal':
                {
                    const m = document.getElementById('checkmate-modal');
                    if (m) m.style.display = 'none';
                    if (arg1 === 'reset' && typeof window.resetGame === 'function') window.resetGame();
                }
                break;
            case 'closeVideoModal':
                {
                    const m = document.getElementById('videoModal');
                    if (m) m.style.display = 'none';
                    const p = document.getElementById('player');
                    if (p) p.pause();
                }
                break;
            case 'closePlayerProfileModal':
                {
                    const m = document.getElementById('player-profile-modal');
                    if (m) m.style.display = 'none';
                }
                break;
            case 'toggleAppTheme':
                if (typeof window.toggleAppTheme === 'function') window.toggleAppTheme();
                break;
            case 'toggleChessMode':
                if (typeof window.toggleChessMode === 'function') window.toggleChessMode();
                break;
            case 'flipBoard':
                if (typeof window.flipBoard === 'function') window.flipBoard();
                break;
            case 'saveCurrentGame':
                if (typeof window.saveCurrentGame === 'function') window.saveCurrentGame();
                break;
            case 'confirmSaveCurrentGame':
                if (typeof window.confirmSaveCurrentGame === 'function') window.confirmSaveCurrentGame();
                break;
            case 'applyFenFromModal':
                if (typeof window.applyFenFromModal === 'function') window.applyFenFromModal();
                break;
            case 'applyPgnFromModal':
                if (typeof window.applyPgnFromModal === 'function') window.applyPgnFromModal();
                break;
            case 'copyCurrentFEN':
                if (typeof window.copyCurrentFEN === 'function') window.copyCurrentFEN();
                break;
            case 'copyCurrentPGN':
                if (typeof window.copyCurrentPGN === 'function') window.copyCurrentPGN();
                break;
            case 'jumpToMoveIndex':
                if (typeof window.jumpToMoveIndex === 'function') window.jumpToMoveIndex(parseInt(arg1, 10) || 0);
                break;
            case 'stepHistory':
                if (typeof window.stepHistory === 'function') window.stepHistory(parseInt(arg1, 10) || 0);
                break;
            case 'jumpToLive':
                if (typeof window.jumpToLive === 'function') window.jumpToLive();
                break;
            case 'switchSidebarTab':
                if (typeof window.switchSidebarTab === 'function') window.switchSidebarTab(arg1, actionEl);
                break;
            case 'navSelectTab':
                window.navSelectTab(arg1);
                break;
            case 'chooseDeviceSelection':
                chooseDeviceSelection(arg1);
                break;
            case 'acceptAGB':
                if (typeof window.acceptAGB === 'function') window.acceptAGB();
                break;
            case 'playAsGuest':
                if (typeof window.playAsGuest === 'function') window.playAsGuest();
                break;
            case 'logout':
                if (typeof window.logout === 'function') window.logout();
                break;
            case 'submitAuthEmailLogin':
                if (typeof window.submitAuthEmailLogin === 'function') window.submitAuthEmailLogin();
                break;
            case 'submitAuthEmailRegister':
                if (typeof window.submitAuthEmailRegister === 'function') window.submitAuthEmailRegister();
                break;
            case 'submitAuthGoogle':
                if (typeof window.submitAuthGoogle === 'function') window.submitAuthGoogle();
                break;
            case 'submitNameChange':
                if (typeof window.submitNameChange === 'function') window.submitNameChange();
                break;
            case 'selectModeFromModal':
                window.selectModeFromModal(arg1, arg2 === 'true');
                break;
            case 'startVariantGame':
                if (typeof window.startVariantGame === 'function') window.startVariantGame();
                if (typeof window.closeFeaturesModal === 'function') window.closeFeaturesModal();
                break;
            case 'startPassAndPlay':
                if (typeof window.startPassAndPlay === 'function') window.startPassAndPlay();
                if (typeof window.closeFeaturesModal === 'function') window.closeFeaturesModal();
                break;
            case 'quickCopyInviteLink':
                if (typeof window.quickCopyInviteLink === 'function') window.quickCopyInviteLink();
                break;
            case 'quickNativeShare':
                if (typeof window.quickNativeShare === 'function') window.quickNativeShare();
                break;
            case 'shareGameForAnalysis':
                if (typeof window.shareGameForAnalysis === 'function') window.shareGameForAnalysis();
                break;
            case 'downloadReplay':
                if (typeof window.downloadReplay === 'function') window.downloadReplay();
                break;
            case 'shareVictoryWhatsApp':
                if (typeof window.shareVictoryWhatsApp === 'function') window.shareVictoryWhatsApp();
                break;
            case 'setCasinoBet':
                if (typeof window.setCasinoBet === 'function') window.setCasinoBet(parseInt(arg1, 10) || 0);
                if (typeof window.updateModalBetDisplay === 'function') window.updateModalBetDisplay(parseInt(arg1, 10) || 0);
                break;
            case 'toggleVoiceMoveControl':
                if (typeof window.toggleVoiceMoveControl === 'function') window.toggleVoiceMoveControl();
                break;
            case 'toggleSidebarCollapse':
                toggleSidebarCollapse();
                break;
            case 'toggleMobileSidebar':
                toggleMobileSidebar();
                break;
            case 'startBotMatchFromNav':
                window.selectModeFromModal('bot', true);
                break;
            case 'startModalPuzzle':
                if (typeof window.startModalPuzzle === 'function') window.startModalPuzzle();
                break;
            case 'startGeneration':
                if (typeof window.startGeneration === 'function') window.startGeneration();
                break;
            case 'closeMobileSidebar':
                closeMobileSidebar();
                break;
            case 'switchMobileTab':
                window.switchMobileTab(arg1, actionEl);
                break;
            case 'setPcPreference':
                window.setPcPreference();
                break;
            case 'requestAdminUsersRefresh':
                if (typeof window.requestAdminUsersRefresh === 'function') window.requestAdminUsersRefresh();
                break;
            case 'closeBanReasonModal':
                if (typeof window.closeBanReasonModal === 'function') window.closeBanReasonModal();
                break;
            case 'submitBanWithReasonModal':
                if (typeof window.submitBanWithReasonModal === 'function') window.submitBanWithReasonModal();
                break;
            case 'requestHintMove':
                if (typeof window.requestHintMove === 'function') window.requestHintMove();
                break;
            case 'toggleSoundEnabled':
                if (typeof window.toggleSoundEnabled === 'function') window.toggleSoundEnabled();
                break;
            case 'toggleVoiceMute':
                if (typeof window.toggleVoiceMute === 'function') window.toggleVoiceMute();
                break;
            case 'toggleOpeningTrainer':
                if (typeof window.toggleOpeningTrainer === 'function') window.toggleOpeningTrainer();
                break;
            case 'replayTogglePause':
                if (typeof window.toggleReplayPause === 'function') window.toggleReplayPause();
                break;
            case 'replayStep':
                if (typeof window.stepReplay === 'function') window.stepReplay(parseInt(arg1, 10) || 0);
                break;
            case 'replayStop':
                if (typeof window.stopReplay === 'function') window.stopReplay();
                break;
            case 'closeShareModal':
                {
                    const m = document.getElementById('share-link-modal');
                    if (m) m.style.display = 'none';
                }
                break;
            case 'copyShareModalText':
                if (typeof window.copyShareModalText === 'function') window.copyShareModalText();
                break;
            default:
                break;
        }
    });

    function bindExternalInputAndSelectListeners() {
        const lbSearch = document.getElementById('modal-leaderboard-search');
        if (lbSearch && !lbSearch.dataset.bound) {
            lbSearch.dataset.bound = 'true';
            lbSearch.addEventListener('input', (e) => {
                window.filterModalLeaderboard(e.target.value);
            });
        }
        const pieceSelect = document.getElementById('pieceSetSelect');
        if (pieceSelect && !pieceSelect.dataset.bound) {
            pieceSelect.dataset.bound = 'true';
            pieceSelect.addEventListener('change', (e) => {
                if (typeof window.changePieceSet === 'function') window.changePieceSet(e.target.value);
            });
        }
        const soundSelect = document.getElementById('soundPackSelect');
        if (soundSelect && !soundSelect.dataset.bound) {
            soundSelect.dataset.bound = 'true';
            soundSelect.addEventListener('change', (e) => {
                if (typeof window.changeSoundPack === 'function') window.changeSoundPack(e.target.value);
            });
        }
        const replaySpeedSelect = document.getElementById('replay-speed-select');
        if (replaySpeedSelect && !replaySpeedSelect.dataset.bound) {
            replaySpeedSelect.dataset.bound = 'true';
            replaySpeedSelect.addEventListener('change', (e) => {
                if (typeof window.setReplaySpeed === 'function') window.setReplaySpeed(e.target.value);
            });
        }
        const botColorSelect = document.getElementById('botColorSelect');
        if (botColorSelect && !botColorSelect.dataset.bound) {
            botColorSelect.dataset.bound = 'true';
            try {
                const savedBotCol = localStorage.getItem('bot_player_color');
                if (savedBotCol && ['white', 'black', 'random'].includes(savedBotCol)) {
                    botColorSelect.value = savedBotCol;
                }
            } catch (e) {}
            botColorSelect.addEventListener('change', (e) => {
                try { localStorage.setItem('bot_player_color', e.target.value); } catch (err) {}
            });
        }
    }

    window.addEventListener('DOMContentLoaded', () => {
        checkDevicePreferenceOnLoad();
        bindExternalInputAndSelectListeners();
    });
})();
