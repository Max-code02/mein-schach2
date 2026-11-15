// features.js - Emotes, Voice Chat, Friends, Match History & Interactive Replay

(function() {
    let voiceModePollId = null;
    let outsideEmoteBound = false;

    const replayState = {
        active: false,
        paused: false,
        speedMs: 1200,
        timerId: null,
        totalMoves: 0,
        currentPly: 0,
        moves: []
    };

    function clearReplayTimer() {
        if (replayState.timerId) {
            clearTimeout(replayState.timerId);
            replayState.timerId = null;
        }
    }

    function updateReplayBarUI() {
        const bar = document.getElementById('replay-controls-bar');
        const statusEl = document.getElementById('replay-status-text');
        const pauseBtn = document.getElementById('replayPauseBtn');
        if (bar) {
            bar.style.display = replayState.active ? 'flex' : 'none';
        }
        if (statusEl) {
            statusEl.textContent = replayState.active
                ? `Replay: Zug ${replayState.currentPly} / ${replayState.totalMoves}${replayState.paused ? ' (Pausiert)' : ''}`
                : '';
        }
        if (pauseBtn) {
            pauseBtn.textContent = replayState.paused ? '▶️ Weiter' : '⏸️ Pause';
        }
    }

    function applyReplayMove(mv) {
        if (!mv) return false;
        if (typeof mv === 'object' && mv.fr !== undefined && mv.fc !== undefined && mv.tr !== undefined && mv.tc !== undefined) {
            if (typeof window.doMove === 'function') {
                window._lastMoveWasDrag = true;
                window.doMove(mv.fr, mv.fc, mv.tr, mv.tc, false, mv.promotion || null);
                return true;
            }
        }
        const s = String(mv).trim();
        if (/^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(s) && typeof window.makeMove === 'function') {
            const fc = s.charCodeAt(0) - 97;
            const fr = 8 - parseInt(s[1], 10);
            const tc = s.charCodeAt(2) - 97;
            const tr = 8 - parseInt(s[3], 10);
            const promo = s[4] ? s[4].toLowerCase() : null;
            if (typeof window.doMove === 'function') {
                window._lastMoveWasDrag = true;
                window.doMove(fr, fc, tr, tc, false, promo);
                return true;
            }
        }
        if (typeof window.applySanMoveSilent === 'function') {
            return window.applySanMoveSilent(s);
        }
        if (typeof window.processMoveStr === 'function') {
            window.processMoveStr(s);
            return true;
        }
        return false;
    }

    function scheduleNextReplayTick() {
        clearReplayTimer();
        if (!replayState.active || replayState.paused) return;
        replayState.timerId = setTimeout(() => {
            if (!replayState.active || replayState.paused) return;
            if (replayState.currentPly >= replayState.totalMoves) {
                replayState.paused = true;
                updateReplayBarUI();
                if (typeof window.showInAppNotification === 'function') {
                    window.showInAppNotification('Replay beendet', 'Alle Züge wurden abgespielt. Du kannst jetzt vor-/zurückspringen.', 'info');
                }
                return;
            }
            if (typeof window.stepHistory === 'function' && window._replaySnapshotsReady) {
                replayState.currentPly++;
                window.jumpToMoveIndex?.(replayState.currentPly);
            } else {
                const mv = replayState.moves[replayState.currentPly];
                applyReplayMove(mv);
                replayState.currentPly++;
            }
            updateReplayBarUI();
            scheduleNextReplayTick();
        }, replayState.speedMs);
    }

    window.startReplay = function(movesOrPgn) {
        let movesList = [];
        if (Array.isArray(movesOrPgn)) {
            movesList = movesOrPgn.filter(Boolean);
        } else if (typeof movesOrPgn === 'string' && window.PGNEngine) {
            const parsed = window.PGNEngine.parsePGN(movesOrPgn);
            if (parsed && Array.isArray(parsed.moves)) movesList = parsed.moves;
        }
        if (!movesList || movesList.length === 0) {
            window.showInAppNotification?.('Replay nicht verfügbar', 'Für diese Partie wurden keine Zugdaten gespeichert.', 'warning');
            return;
        }

        clearReplayTimer();
        window._replaySnapshotsReady = false;
        if (typeof window.resetGame === 'function') {
            window.resetGame(true, { keepReplay: true });
        }

        const gmSelect = document.getElementById('gameMode');
        if (gmSelect) gmSelect.value = 'local';

        replayState.active = true;
        replayState.paused = false;
        replayState.moves = movesList;
        replayState.totalMoves = movesList.length;
        replayState.currentPly = 0;
        window.isReplayMode = true;

        // If snapshots helper exists, pre-build snapshots and jump to move 0 so both forward and backward scrubbing work
        if (typeof window.buildReplaySnapshots === 'function') {
            const builtCount = window.buildReplaySnapshots(movesList);
            if (builtCount > 0) {
                replayState.totalMoves = builtCount;
                window._replaySnapshotsReady = true;
                window.jumpToMoveIndex?.(0);
            }
        }

        if (typeof window.switchSidebarTab === 'function') {
            const gameBtn = document.querySelector('.sidebar-tab-btn[data-arg1="tab-game"]');
            if (gameBtn) window.switchSidebarTab('tab-game', gameBtn);
        }

        updateReplayBarUI();
        scheduleNextReplayTick();
    };

    window.pauseReplay = function() {
        if (!replayState.active) return;
        replayState.paused = true;
        clearReplayTimer();
        updateReplayBarUI();
    };

    window.resumeReplay = function() {
        if (!replayState.active) return;
        if (replayState.currentPly >= replayState.totalMoves) {
            replayState.currentPly = 0;
            if (window._replaySnapshotsReady) window.jumpToMoveIndex?.(0);
        }
        replayState.paused = false;
        updateReplayBarUI();
        scheduleNextReplayTick();
    };

    window.toggleReplayPause = function() {
        if (!replayState.active) return;
        if (replayState.paused) window.resumeReplay();
        else window.pauseReplay();
    };

    window.stepReplay = function(delta) {
        if (!replayState.active) return;
        replayState.paused = true;
        clearReplayTimer();
        if (window._replaySnapshotsReady && typeof window.jumpToMoveIndex === 'function') {
            const nextPly = Math.max(0, Math.min(replayState.totalMoves, replayState.currentPly + delta));
            replayState.currentPly = nextPly;
            window.jumpToMoveIndex(nextPly);
        } else if (delta > 0 && replayState.currentPly < replayState.totalMoves) {
            applyReplayMove(replayState.moves[replayState.currentPly]);
            replayState.currentPly++;
        }
        updateReplayBarUI();
    };

    window.setReplaySpeed = function(speedVal) {
        const mult = parseFloat(speedVal) || 1;
        replayState.speedMs = Math.max(250, Math.round(1200 / mult));
        if (replayState.active && !replayState.paused) {
            scheduleNextReplayTick();
        }
    };

    window.stopReplay = function() {
        if (!replayState.active && !window.isReplayMode) return;
        clearReplayTimer();
        replayState.active = false;
        replayState.paused = false;
        replayState.currentPly = 0;
        replayState.totalMoves = 0;
        replayState.moves = [];
        window._replaySnapshotsReady = false;
        window.isReplayMode = false;
        updateReplayBarUI();
    };

    window.initFeatures = function(socket) {
        if (!socket) return;

        // --- 1. Emotes ---
        const emoteBtn = document.getElementById('emoteBtn');
        const emoteMenu = document.getElementById('emote-menu');
        const emoteSelects = document.querySelectorAll('.emote-select');
        const emotePopupArea = document.getElementById('emote-popup-area');
        let lastEmoteSentAt = 0;

        const isFlexEmoteMenu = () => document.body.classList.contains('mobile-device');

        if (emoteBtn && emoteMenu) {
            emoteBtn.onclick = (e) => {
                e.stopPropagation();
                const isHidden = emoteMenu.style.display === 'none' || !emoteMenu.style.display;
                emoteMenu.style.display = isHidden ? (isFlexEmoteMenu() ? 'flex' : 'block') : 'none';
            };

            if (!outsideEmoteBound) {
                outsideEmoteBound = true;
                document.addEventListener('click', (e) => {
                    const menu = document.getElementById('emote-menu');
                    const btn = document.getElementById('emoteBtn');
                    if (menu && menu.style.display !== 'none' && !menu.contains(e.target) && (!btn || !btn.contains(e.target))) {
                        menu.style.display = 'none';
                    }
                });
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        const menu = document.getElementById('emote-menu');
                        if (menu) menu.style.display = 'none';
                    }
                });
            }
        }

        emoteSelects.forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const now = Date.now();
                if (now - lastEmoteSentAt < 700) return;
                lastEmoteSentAt = now;

                const emote = e.currentTarget.innerText.trim();
                const myName = (typeof window.getMyName === 'function' ? window.getMyName() : localStorage.getItem('playerName')) || 'Anonym';
                if (socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({ type: 'emote', emote: emote, sender: myName }));
                }
                if (emoteMenu) emoteMenu.style.display = 'none';
                window.showEmoteOnBoard(emote, true);
            };
        });

        window.showEmoteOnBoard = function(emote, isSelf) {
            if (!emotePopupArea) return;
            const el = document.createElement('div');
            el.innerText = emote;
            el.style.position = 'absolute';
            el.style.fontSize = '3.6rem';
            el.style.transition = 'all 1.4s ease-out';
            el.style.opacity = '1';
            el.style.transform = 'translateY(0) scale(1)';
            el.style.left = isSelf ? '18%' : '72%';
            el.style.top = '50%';
            el.style.pointerEvents = 'none';
            el.style.filter = 'drop-shadow(0 4px 8px rgba(0,0,0,0.45))';

            emotePopupArea.appendChild(el);

            setTimeout(() => {
                el.style.transform = 'translateY(-95px) scale(1.4)';
                el.style.opacity = '0';
            }, 40);

            setTimeout(() => {
                if (el.parentNode) el.parentNode.removeChild(el);
            }, 1450);
        };

        // --- 2. Voice Chat (WebRTC with ICE queue & mute toggle) ---
        let localStream = null;
        let peerConnection = null;
        let isVoiceActive = false;
        let isVoiceMuted = false;
        let pendingIceCandidates = [];

        const voiceBtn = document.getElementById('voiceChatBtn');
        const voiceMuteBtn = document.getElementById('voiceMuteBtn');
        const voiceStatus = document.getElementById('voice-status');
        const gameModeSelect = document.getElementById('gameMode');
        const rtcConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] };

        function updateVoiceButtonsUI() {
            if (voiceBtn) {
                voiceBtn.innerText = isVoiceActive ? '🛑 Voice stoppen' : '🎤 Voice-Chat';
                voiceBtn.style.background = isVoiceActive ? '#e74c3c' : '';
            }
            if (voiceMuteBtn) {
                voiceMuteBtn.style.display = isVoiceActive ? 'inline-block' : 'none';
                voiceMuteBtn.innerText = isVoiceMuted ? '🔇 Entstummen' : '🎙️ Mikro an';
            }
        }

        if (voiceBtn) {
            if (voiceModePollId) clearInterval(voiceModePollId);
            voiceModePollId = setInterval(() => {
                const mode = gameModeSelect ? gameModeSelect.value : 'local';
                const isOnlineMatch = (mode === 'online' || mode === 'random');
                voiceBtn.style.display = isOnlineMatch ? 'inline-block' : 'none';
                if (!isOnlineMatch && isVoiceActive) {
                    stopVoiceChat(true);
                }
            }, 1000);

            voiceBtn.onclick = async () => {
                if (!isVoiceActive) {
                    await startVoiceChat(true);
                } else {
                    stopVoiceChat(true);
                }
            };
        }

        window.toggleVoiceMute = function() {
            if (!localStream) return;
            isVoiceMuted = !isVoiceMuted;
            localStream.getAudioTracks().forEach(t => {
                t.enabled = !isVoiceMuted;
            });
            updateVoiceButtonsUI();
        };

        async function startVoiceChat(sendOfferRequest = true) {
            if (isVoiceActive && localStream) return true;
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                if (voiceStatus) voiceStatus.innerText = '❌ Mikrofon nicht unterstützt';
                return false;
            }
            try {
                localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                isVoiceActive = true;
                isVoiceMuted = false;
                updateVoiceButtonsUI();
                if (voiceStatus) voiceStatus.innerText = sendOfferRequest ? 'Warte auf Gegner...' : 'Verbinde...';

                if (sendOfferRequest && socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({ type: 'voice_offer_request' }));
                }
                return true;
            } catch (err) {
                console.error(err);
                if (voiceStatus) voiceStatus.innerText = '❌ Mikrofon blockiert';
                window.showInAppNotification?.('Mikrofon-Fehler', 'Bitte erlaube den Mikrofon-Zugriff im Browser.', 'warning');
                return false;
            }
        }

        function createPeerConnection() {
            if (peerConnection) {
                try { peerConnection.close(); } catch (e) {}
            }
            pendingIceCandidates = [];
            peerConnection = new RTCPeerConnection(rtcConfig);

            if (localStream) {
                localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
            }

            peerConnection.onicecandidate = (e) => {
                if (e.candidate && socket && socket.readyState === WebSocket.OPEN) {
                    const candidateData = e.candidate.toJSON ? e.candidate.toJSON() : {
                        candidate: e.candidate.candidate,
                        sdpMid: e.candidate.sdpMid,
                        sdpMLineIndex: e.candidate.sdpMLineIndex
                    };
                    socket.send(JSON.stringify({ type: 'voice_signal', signalType: 'candidate', candidate: candidateData }));
                }
            };

            peerConnection.ontrack = (e) => {
                let audio = document.getElementById('remoteAudio');
                if (!audio) {
                    audio = document.createElement('audio');
                    audio.id = 'remoteAudio';
                    audio.autoplay = true;
                    document.body.appendChild(audio);
                }
                audio.srcObject = e.streams[0];
            };

            peerConnection.onconnectionstatechange = () => {
                if (!peerConnection) return;
                if (peerConnection.connectionState === 'connected' && voiceStatus) {
                    voiceStatus.innerText = 'Verbunden 🎙️';
                } else if ((peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected') && isVoiceActive) {
                    if (voiceStatus) voiceStatus.innerText = 'Verbindung getrennt';
                }
            };

            return peerConnection;
        }

        async function flushPendingIceCandidates() {
            if (!peerConnection || !peerConnection.remoteDescription) return;
            while (pendingIceCandidates.length > 0) {
                const cand = pendingIceCandidates.shift();
                try {
                    await peerConnection.addIceCandidate(new RTCIceCandidate(cand));
                } catch (e) {}
            }
        }

        function stopVoiceChat(notifyRemote = false) {
            const wasActive = isVoiceActive;
            if (localStream) {
                localStream.getTracks().forEach(t => t.stop());
                localStream = null;
            }
            if (peerConnection) {
                try { peerConnection.close(); } catch (e) {}
                peerConnection = null;
            }
            const audio = document.getElementById('remoteAudio');
            if (audio) {
                audio.srcObject = null;
            }
            pendingIceCandidates = [];
            isVoiceActive = false;
            isVoiceMuted = false;
            updateVoiceButtonsUI();
            if (voiceStatus) voiceStatus.innerText = '';
            if (notifyRemote && wasActive && socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'voice_stop' }));
            }
        }

        window.handleVoiceSignal = async function(data) {
            if (!data) return;
            if (!isVoiceActive && data.signalType !== 'request' && data.signalType !== 'offer') return;

            if (data.signalType === 'request') {
                const acceptVoice = async () => {
                    const ok = await startVoiceChat(false);
                    if (!ok) return;
                    const pc = createPeerConnection();
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    if (socket && socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({
                            type: 'voice_signal',
                            signalType: 'offer',
                            offer: { type: offer.type, sdp: offer.sdp }
                        }));
                    }
                    if (voiceStatus) voiceStatus.innerText = 'Verbunden 🎙️';
                };
                if (typeof window.showGameRequestModal === 'function') {
                    window.showGameRequestModal('🎙️', 'Voice-Chat Anfrage', `${data.sender || 'Dein Gegner'} möchte einen Voice-Chat starten.`, '🎙️ Annehmen', 'Ablehnen', acceptVoice, () => {});
                } else {
                    await acceptVoice();
                }
            } else if (data.signalType === 'offer') {
                if (!localStream) {
                    const ok = await startVoiceChat(false);
                    if (!ok) return;
                }
                const pc = createPeerConnection();
                await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
                await flushPendingIceCandidates();
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                        type: 'voice_signal',
                        signalType: 'answer',
                        answer: { type: answer.type, sdp: answer.sdp }
                    }));
                }
                if (voiceStatus) voiceStatus.innerText = 'Verbunden 🎙️';
            } else if (data.signalType === 'answer') {
                if (peerConnection && data.answer) {
                    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
                    await flushPendingIceCandidates();
                }
            } else if (data.signalType === 'candidate' && data.candidate) {
                if (peerConnection && peerConnection.remoteDescription) {
                    try {
                        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
                    } catch (e) {}
                } else {
                    pendingIceCandidates.push(data.candidate);
                }
            } else if (data.signalType === 'stop') {
                stopVoiceChat(false);
                window.showInAppNotification?.('Voice-Chat', 'Dein Gegner hat den Voice-Chat beendet.', 'info');
            }
        };

        // --- 3. Friends List ---
        const addFriendBtn = document.getElementById('addFriendBtn');
        const friendInput = document.getElementById('friend-name-input');

        function submitAddFriend() {
            if (!friendInput) return;
            const fname = friendInput.value.trim();
            if (!fname) return;
            const myName = (typeof window.getMyName === 'function' ? window.getMyName() : localStorage.getItem('playerName') || '').trim();
            if (myName && fname.toLowerCase() === myName.toLowerCase()) {
                window.showInAppNotification?.('Freunde', 'Du kannst dich nicht selbst als Freund hinzufügen.', 'warning');
                return;
            }
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'add_friend', friend: fname }));
                friendInput.value = '';
            }
        }

        if (addFriendBtn) {
            addFriendBtn.onclick = submitAddFriend;
        }
        if (friendInput) {
            friendInput.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    submitAddFriend();
                }
            };
        }

        window.refreshFriendsList = function() {
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'get_friends' }));
            }
        };

        window.updateFriendsList = function(friends) {
            const list = document.getElementById('friends-list');
            if (!list) return;
            if (!friends || friends.length === 0) {
                list.innerHTML = '<div style="color: #aaa; text-align: center; font-style: italic; padding: 6px 0;">Keine Freunde in deiner Liste</div>';
                return;
            }
            list.innerHTML = '';
            friends.forEach(f => {
                const div = document.createElement('div');
                div.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:6px 4px; border-bottom:1px solid rgba(255,255,255,0.08); gap:6px;';

                const nameSpan = document.createElement('span');
                nameSpan.textContent = `${f.online ? '🟢' : '⚪'} ${f.name}`;
                nameSpan.style.color = f.online ? '#2ecc71' : '#bbb';
                nameSpan.style.fontWeight = f.online ? '600' : '400';
                nameSpan.style.overflow = 'hidden';
                nameSpan.style.textOverflow = 'ellipsis';
                nameSpan.style.whiteSpace = 'nowrap';

                const actionsWrap = document.createElement('div');
                actionsWrap.style.cssText = 'display:flex; align-items:center; gap:4px; flex-shrink:0;';

                const challengeBtn = document.createElement('button');
                challengeBtn.type = 'button';
                challengeBtn.textContent = '⚔️';
                challengeBtn.style.cssText = 'background:none; border:none; font-size:1em; padding:2px 4px;';
                challengeBtn.title = f.online ? 'Herausfordern' : 'Spieler ist offline';

                if (f.online) {
                    challengeBtn.style.cursor = 'pointer';
                    challengeBtn.onclick = () => {
                        if (socket && socket.readyState === WebSocket.OPEN) {
                            socket.send(JSON.stringify({ type: 'challenge_friend', friend: f.name }));
                        }
                        window.showInAppNotification?.('Herausforderung gesendet', `Einladung an ${f.name} übermittelt.`, 'info');
                    };
                } else {
                    challengeBtn.style.opacity = '0.3';
                    challengeBtn.style.cursor = 'not-allowed';
                }

                const removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.textContent = '✖';
                removeBtn.title = 'Freund entfernen';
                removeBtn.style.cssText = 'background:none; border:none; color:#e74c3c; cursor:pointer; font-size:0.85em; padding:2px 4px;';
                removeBtn.onclick = () => {
                    if (socket && socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({ type: 'remove_friend', friend: f.name }));
                    }
                };

                actionsWrap.appendChild(challengeBtn);
                actionsWrap.appendChild(removeBtn);
                div.appendChild(nameSpan);
                div.appendChild(actionsWrap);
                list.appendChild(div);
            });
        };

        // --- 4. Match History & Replays ---
        const loadHistoryBtn = document.getElementById('loadHistoryBtn');

        if (loadHistoryBtn) {
            loadHistoryBtn.onclick = async () => {
                loadHistoryBtn.innerText = 'Lade...';
                const resetTimer = setTimeout(() => {
                    if (loadHistoryBtn.innerText === 'Lade...') loadHistoryBtn.innerText = 'Laden';
                }, 4000);

                try {
                    const apiBase = window.apiBase || '';
                    const res = await fetch(`${apiBase}/api/games`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data && data.success && Array.isArray(data.games) && data.games.length > 0) {
                            clearTimeout(resetTimer);
                            window.updateMatchHistory(data.games);
                            return;
                        }
                    }
                } catch (e) {}

                if (socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({ type: 'get_match_history' }));
                } else {
                    clearTimeout(resetTimer);
                    loadHistoryBtn.innerText = 'Laden';
                }
            };
        }

        window.updateMatchHistory = function(games) {
            const list = document.getElementById('match-history-list');
            const btn = document.getElementById('loadHistoryBtn');
            if (btn) btn.innerText = 'Laden';
            if (!list) return;

            if (!games || games.length === 0) {
                list.innerHTML = '<div style="color: #aaa; text-align: center; font-style: italic; padding: 8px 0;">Noch keine Spiele</div>';
                return;
            }

            list.innerHTML = '';
            games.forEach(g => {
                const div = document.createElement('div');
                div.style.cssText = 'padding:8px; background:rgba(0,0,0,0.25); margin-bottom:6px; border-radius:6px; border:1px solid rgba(255,255,255,0.06);';

                const title = document.createElement('div');
                const safeWhite = typeof window.escapeHtml === 'function' ? window.escapeHtml(g.white_player || g.white || 'Spieler 1') : String(g.white_player || g.white || 'Spieler 1').replace(/[<>&"']/g, '');
                const safeBlack = typeof window.escapeHtml === 'function' ? window.escapeHtml(g.black_player || g.black || 'Spieler 2') : String(g.black_player || g.black || 'Spieler 2').replace(/[<>&"']/g, '');
                title.innerHTML = `<strong>${safeWhite}</strong> vs <strong>${safeBlack}</strong>`;

                let replayPayload = Array.isArray(g.moves) && g.moves.length > 0 ? g.moves : null;
                let movesCount = replayPayload ? replayPayload.length : 0;
                if (!replayPayload && g.pgn && window.PGNEngine) {
                    const parsed = window.PGNEngine.parsePGN(g.pgn);
                    if (parsed && Array.isArray(parsed.moves) && parsed.moves.length > 0) {
                        replayPayload = parsed.moves;
                        movesCount = parsed.moves.length;
                    }
                }

                const res = document.createElement('div');
                res.style.cssText = 'font-size:0.82em; color:#aaa; margin-top:2px;';
                const outcomeText = g.result || g.winner || g.reason || '?';
                res.innerText = `Ergebnis: ${outcomeText} | Züge: ${movesCount}`;

                div.appendChild(title);
                div.appendChild(res);

                if (replayPayload) {
                    const replayBtn = document.createElement('button');
                    replayBtn.type = 'button';
                    replayBtn.innerText = '▶️ Replay ansehen';
                    replayBtn.style.cssText = 'margin-top:6px; background:#3498db; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:0.8em; font-weight:bold;';
                    replayBtn.onclick = () => {
                        window.showInAppNotification?.('Replay gestartet', 'Züge werden schrittweise abgespielt.', 'info');
                        window.startReplay(replayPayload);
                    };
                    div.appendChild(replayBtn);
                }

                list.appendChild(div);
            });
        };
    };
})();
