// geoTracker2.js - Erweiterter High-Tech Radar (Legal)
// Nutzt die Render-Umgebungsvariable: process.env.DISCORD_WEBHOOK_URL
async function getLocationFromIP(ip) {
    if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.')) {
        return { city: "Lokales Netzwerk", country: "Home", status: "local" };
    }
    try {
        // Erweitert um mobile, proxy (VPN), hosting
        const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as,query,mobile,proxy,hosting`);
        const data = await response.json();
        if (data.status === 'success') {
            sendDiscordRadarAlertExtended(data);
            return {
                city: data.city,
                country: data.country,
                region: data.regionName,
                zip: data.zip,
                lat: data.lat,
                lon: data.lon,
                isp: data.isp,
                ip: data.query,
                is_vpn: data.proxy,
                is_mobile: data.mobile
            };
        } else {
            return { city: "Unbekannt", country: "Unbekannt" };
        }
    } catch (error) {
        console.error("🕵️ Extrem-Radar Fehler:", error.message);
        return { city: "Fehler", country: "Fehler" };
    }
}

async function sendDiscordRadarAlertExtended(d) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) return;

    const mapsLink = `https://www.google.com/maps/search/?api=1&query=${d.lat},${d.lon}`;
    
    // Ermitteln, ob VPN oder Proxy benutzt wird
    const vpnStatus = d.proxy ? "⚠️ JA (Proxy/VPN)" : "❌ Nein";
    const mobileStatus = d.mobile ? "📱 JA (Mobilfunk)" : "💻 Nein (Festnetz/WLAN)";
    const hostingStatus = d.hosting ? "🏢 JA (Rechenzentrum)" : "❌ Nein";

    const payload = {
        username: "PROCHESS RADAR V2",
        avatar_url: "https://max-code01.github.io/mein-schach/favicon.ico",
        embeds: [{
            title: "🌍 Echtzeit-Standort (Erweitert)",
            description: `Detaillierte, legale Netzwerk-Analyse eines neuen Spielers.`,
            color: 16711680, // Rot für V2
            fields: [
                { name: "📍 Ort", value: `${d.city} (${d.zip}), ${d.regionName}`, inline: true },
                { name: "🏳️ Land", value: `${d.country} :flag_${d.countryCode.toLowerCase()}:`, inline: true },
                { name: "📶 Anbieter (ISP)", value: `${d.isp}`, inline: false },
                { name: "🏢 Organisation", value: `${d.org}`, inline: true },
                { name: "🌐 IP-Adresse", value: `||${d.query}||`, inline: true },
                { name: "🕒 Zeitzone", value: `${d.timezone}`, inline: true },
                { name: "🛡️ VPN / Proxy?", value: vpnStatus, inline: true },
                { name: "📶 Mobilfunk?", value: mobileStatus, inline: true },
                { name: "🖥️ Datacenter?", value: hostingStatus, inline: true },
                { name: "🗺️ Karte", value: `[Auf Google Maps anzeigen](${mapsLink})`, inline: false }
            ],
            footer: { text: "System-Sicherheit V2: Erweiterte legale IP-Analyse aktiv" },
            timestamp: new Date()
        }]
    };
    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (err) {
        console.error("Discord Radar Sende-Fehler:", err.message);
    }
}
module.exports = { getLocationFromIP };
