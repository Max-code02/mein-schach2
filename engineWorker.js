// engineWorker.js
self.onmessage = function(e) {
    // Basic AI engine worker stub
    const { board, turn } = e.data;
    if (!board || turn !== "black") return;
    
    // Simple random legal move calculation
    let moves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            let p = board[r][c];
            if (p && p === p.toLowerCase()) {
                for (let tr = 0; tr < 8; tr++) {
                    for (let tc = 0; tc < 8; tc++) {
                        // Simple pawn forward or piece move check
                        if (r !== tr || c !== tc) {
                            if (p === 'p' && tr === r + 1 && c === tc && board[tr][tc] === "") {
                                moves.push({ fr: r, fc: c, tr, tc });
                            } else if (p === 'n' && (Math.abs(tr-r)===2 && Math.abs(tc-c)===1)) {
                                if (!board[tr][tc] || board[tr][tc] === board[tr][tc].toUpperCase()) {
                                    moves.push({ fr: r, fc: c, tr, tc });
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    if (moves.length > 0) {
        const choice = moves[Math.floor(Math.random() * moves.length)];
        self.postMessage(choice);
    }
};
