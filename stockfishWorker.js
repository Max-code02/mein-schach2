// stockfishWorker.js
self.onmessage = function(e) {
    const { fen } = e.data;
    if (!fen) return;
    // Simple worker stub for Stockfish
};
