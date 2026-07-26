from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app) # Erlaubt Browser-Zugriff

# Dummy / Minimal Klasse falls stats_manager nicht geladen werden kann
try:
    from stats_manager import SchachLaborPro
except ImportError:
    class SchachLaborPro:
        def __init__(self, spieler):
            self.spieler = spieler
            self.züge = []
        def analysiere_zug(self, von, nach, figur, wert, ist_schlagzug):
            self.züge.append({"von": von, "nach": nach, "figur": figur, "wert": wert, "ist_schlagzug": ist_schlagzug})
        def berechne_end_statistik(self):
            return {
                "Basis_Werte": {"Rang": "Expert", "Geschätzte_Elo": 1500},
                "Positions_Analyse": {"Zentrum": "Gut", "Entwicklung": "Solide", "Eröffnung": "Standard", "Material_Vorteil": "0"},
                "Aggressivitäts_Index": {"Gesamt": 50}
            }

analysen = {}

@app.route('/analyse', methods=['POST'])
def analyse_zug():
    data = request.json or {}
    spieler = data.get("spieler", "Unbekannt")
    
    if spieler not in analysen:
        analysen[spieler] = SchachLaborPro(spieler)
    
    labor = analysen[spieler]
    
    labor.analysiere_zug(
        data.get('von', 'e2'), 
        data.get('nach', 'e4'), 
        data.get('figur', 'Bauer'), 
        data.get('wert', 1), 
        data.get('ist_schlagzug', False)
    )
    
    stats = labor.berechne_end_statistik()
    return jsonify(stats)

if __name__ == '__main__':
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
