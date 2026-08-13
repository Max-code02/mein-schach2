// features.js - Emotes, Voice Chat, Friends, Match History

window.initFeatures = function(socket, myName) {
    if (!socket) return;
    
    // --- 1. Emotes ---
    const emoteBtn = document.getElementById('emoteBtn');
    const emoteMenu = document.getElementById('emote-menu');
    const emoteSelects = document.querySelectorAll('.emote-select');
    const emotePopupArea = document.getElementById('emote-popup-area');

    if (emoteBtn) {
        emoteBtn.onclick = () => {
            emoteMenu.style.display = emoteMenu.style.display === 'none' ? 'block' : 'none';
        };
    }

    emoteSelects.forEach(btn => {
        btn.onclick = (e) => {
            const emote = e.target.innerText;
            if (socket.readyState === WebSocket.OPEN) {
                if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'emote', emote: emote, sender: localStorage.getItem('playerName') || 'Anonym' }));
            }
            emoteMenu.style.display = 'none';
            showEmoteOnBoard(emote, true);
        };
    });

    window.showEmoteOnBoard = function(emote, isSelf) {
        if (!emotePopupArea) return;
        const el = document.createElement('div');
        el.innerText = emote;
        el.style.position = 'absolute';
        el.style.fontSize = '4em';
        el.style.transition = 'all 1.5s ease-out';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0) scale(1)';
        el.style.left = isSelf ? '20%' : '70%'; // Self left, opponent right
        el.style.top = '50%';
        
        emotePopupArea.appendChild(el);
        
        setTimeout(() => {
            el.style.transform = 'translateY(-100px) scale(1.5)';
            el.style.opacity = '0';
        }, 50);
        
        setTimeout(() => {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, 1500);
    };

    // --- 2. Voice Chat ---
    let localStream = null;
    let peerConnection = null;
    let isVoiceActive = false;
    
    const voiceBtn = document.getElementById('voiceChatBtn');
    const voiceStatus = document.getElementById('voice-status');
    const gameModeSelect = document.getElementById("gameMode");

    if (voiceBtn) {
        // Only show in private mode
        setInterval(() => {
            if (gameModeSelect && gameModeSelect.value === 'online') {
                voiceBtn.style.display = 'inline-block';
            } else {
                voiceBtn.style.display = 'none';
                stopVoiceChat();
            }
        }, 1000);

        voiceBtn.onclick = async () => {
            if (!isVoiceActive) {
                await startVoiceChat();
            } else {
                stopVoiceChat();
            }
        };
    }

    async function startVoiceChat() {
        try {
            localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            isVoiceActive = true;
            voiceBtn.innerText = '🛑 Voice stoppen';
            voiceBtn.style.background = '#e74c3c';
            voiceStatus.innerText = 'Warte auf Gegner...';
            
            if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'voice_offer_request' }));
        } catch (err) {
            console.error(err);
            voiceStatus.innerText = '❌ Mikrofon blockiert';
        }
    }

    function stopVoiceChat() {
        if (localStream) {
            localStream.getTracks().forEach(t => t.stop());
            localStream = null;
        }
        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
        }
        isVoiceActive = false;
        if(voiceBtn) {
            voiceBtn.innerText = '🎤 Voice-Chat starten';
            voiceBtn.style.background = '#9b59b6';
        }
        if(voiceStatus) voiceStatus.innerText = '';
        if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'voice_stop' }));
    }

    const rtcConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

    window.handleVoiceSignal = async function(data) {
        if (!isVoiceActive && data.signalType !== 'request') return;

        if (data.signalType === 'request') {
            if (confirm(data.sender + ' möchte einen Voice-Chat starten. Annehmen?')) {
                await startVoiceChat();
                peerConnection = new RTCPeerConnection(rtcConfig);
                localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
                
                peerConnection.onicecandidate = (e) => {
                    if (e.candidate) {
                        if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'voice_signal', signalType: 'candidate', candidate: e.candidate }));
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

                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);
                if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'voice_signal', signalType: 'offer', offer: offer }));
                voiceStatus.innerText = 'Verbunden 🎙️';
            }
        } else if (data.signalType === 'offer') {
            peerConnection = new RTCPeerConnection(rtcConfig);
            localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
            
            peerConnection.onicecandidate = (e) => {
                if (e.candidate) {
                    if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'voice_signal', signalType: 'candidate', candidate: e.candidate }));
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

            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'voice_signal', signalType: 'answer', answer: answer }));
            voiceStatus.innerText = 'Verbunden 🎙️';

        } else if (data.signalType === 'answer') {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
        } else if (data.signalType === 'candidate') {
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        } else if (data.signalType === 'stop') {
            stopVoiceChat();
        }
    };

    // --- 3. Friends List ---
    const addFriendBtn = document.getElementById('addFriendBtn');
    const friendInput = document.getElementById('friend-name-input');
    
    if (addFriendBtn) {
        addFriendBtn.onclick = () => {
            const fname = friendInput.value.trim();
            if (fname && socket.readyState === WebSocket.OPEN) {
                if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'add_friend', friend: fname }));
                friendInput.value = '';
            }
        };
    }

    window.updateFriendsList = function(friends) {
        const list = document.getElementById('friends-list');
        if (!list) return;
        if (!friends || friends.length === 0) {
            list.innerHTML = '<div style="color: #aaa; text-align: center; font-style: italic;">Keine Freunde online</div>';
            return;
        }
        list.innerHTML = '';
        friends.forEach(f => {
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            div.style.padding = '5px';
            div.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
            
            const nameSpan = document.createElement('span');
            nameSpan.innerText = f.name + (f.online ? ' 🟢' : ' 🔴');
            nameSpan.style.color = f.online ? '#2ecc71' : '#aaa';
            
            const challengeBtn = document.createElement('button');
            challengeBtn.innerText = '⚔️';
            challengeBtn.style.background = 'none';
            challengeBtn.style.border = 'none';
            challengeBtn.style.cursor = 'pointer';
            challengeBtn.title = 'Herausfordern';
            
            if (f.online) {
                challengeBtn.onclick = () => {
                    if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'challenge_friend', friend: f.name }));
                    alert('Herausforderung an ' + f.name + ' gesendet!');
                };
            } else {
                challengeBtn.style.opacity = '0.3';
                challengeBtn.style.cursor = 'not-allowed';
            }
            
            div.appendChild(nameSpan);
            div.appendChild(challengeBtn);
            list.appendChild(div);
        });
    };

    // --- 4. Match History / Replays ---
    const loadHistoryBtn = document.getElementById('loadHistoryBtn');
    
    if (loadHistoryBtn) {
        loadHistoryBtn.onclick = () => {
            if (socket.readyState === WebSocket.OPEN) {
                if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'get_match_history' }));
                loadHistoryBtn.innerText = 'Lade...';
            }
        };
    }

    window.updateMatchHistory = function(games) {
        const list = document.getElementById('match-history-list');
        const btn = document.getElementById('loadHistoryBtn');
        if (btn) btn.innerText = 'Laden';
        if (!list) return;
        
        if (!games || games.length === 0) {
            list.innerHTML = '<div style="color: #aaa; text-align: center; font-style: italic;">Noch keine Spiele</div>';
            return;
        }
        
        list.innerHTML = '';
        games.forEach(g => {
            const div = document.createElement('div');
            div.style.padding = '8px';
            div.style.background = 'rgba(0,0,0,0.2)';
            div.style.marginBottom = '5px';
            div.style.borderRadius = '5px';
            
            const title = document.createElement('div');
            title.innerHTML = `<strong>${g.white}</strong> vs <strong>${g.black}</strong>`;
            
            const res = document.createElement('div');
            res.style.fontSize = '0.85em';
            res.style.color = '#aaa';
            res.innerText = `Ergebnis: ${g.result || '?'} | Züge: ${g.moves ? g.moves.length : 0}`;
            
            const replayBtn = document.createElement('button');
            replayBtn.innerText = '▶️ Replay ansehen';
            replayBtn.style.marginTop = '5px';
            replayBtn.style.background = '#3498db';
            replayBtn.style.color = 'white';
            replayBtn.style.border = 'none';
            replayBtn.style.padding = '5px 10px';
            replayBtn.style.borderRadius = '3px';
            replayBtn.style.cursor = 'pointer';
            
            replayBtn.onclick = () => {
                alert("Replay gestartet. Klicke auf 'Nächster Zug' (simuliert).");
                // Reset board and play moves with delay
                if (window.startReplay) window.startReplay(g.moves);
            };
            
            div.appendChild(title);
            div.appendChild(res);
            div.appendChild(replayBtn);
            list.appendChild(div);
        });
    };
    
    // Add replay feature to chess logic
    window.startReplay = function(movesList) {
        if (!movesList || movesList.length === 0) return;
        if (typeof resetGame === 'function') resetGame();
        
        // Stop current game logic
        window.isReplayMode = true;
        
        let moveIndex = 0;
        const interval = setInterval(() => {
            if (moveIndex >= movesList.length) {
                clearInterval(interval);
                window.isReplayMode = false;
                alert("Replay beendet!");
                return;
            }
            const mv = movesList[moveIndex];
            if (typeof processMoveStr === 'function') {
                processMoveStr(mv);
            }
            moveIndex++;
        }, 1500); // 1.5s per move
    };
};
