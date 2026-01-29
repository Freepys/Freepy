const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

// Render gibt den Port automatisch vor, lokal nutzen wir 3000
const PORT = process.env.PORT || 3000;

// Erlaubt dem Server, JSON-Daten zu empfangen (für den Login)
app.use(express.json());

// Macht alle deine Dateien (HTML, CSS, Bilder) öffentlich zugänglich
app.use(express.static('./'));

// --- ADMIN DATEN (Greift auf die Render Environment Variables zu) ---
const ADMIN_USER = process.env.ADMIN_USER || "Admin Freeperr";
const ADMIN_PASS = process.env.ADMIN_PASS || "fallback-passwort"; 

/**
 * Login Endpunkt: Prüft Benutzername und Passwort sicher auf dem Server
 */
app.post('/api/login', (req, res) => {
    const { user, pass } = req.body;
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: "Falsche Zugangsdaten!" });
    }
});

/**
 * API: Scannt den 'img' Ordner und erstellt automatisch die Projektliste
 */
app.get('/api/projects', (req, res) => {
    const imgDir = path.join(__dirname, 'img');
    
    // Falls kein img-Ordner da ist, sende leere Liste
    if (!fs.existsSync(imgDir)) return res.json([]);

    const projects = [];
    const folders = fs.readdirSync(imgDir);

    folders.forEach(folder => {
        const folderPath = path.join(imgDir, folder);
        
        // Nur Ordner verarbeiten
        if (fs.lstatSync(folderPath).isDirectory()) {
            
            // 1. Cover im Unterordner "start" suchen
            const startDir = path.join(folderPath, 'start');
            let coverImg = "";
            if (fs.existsSync(startDir)) {
                const startFiles = fs.readdirSync(startDir)
                    .filter(f => f.toLowerCase().endsWith('.png') || f.toLowerCase().endsWith('.jpg'));
                if (startFiles.length > 0) {
                    coverImg = `img/${folder}/start/${startFiles[0]}`;
                }
            }

            // 2. Galerie-Bilder (alle PNG/JPG direkt im Projektordner)
            const images = fs.readdirSync(folderPath)
                .filter(file => file.toLowerCase().endsWith('.png') || file.toLowerCase().endsWith('.jpg'))
                .sort((a, b) => {
                    // Sortiert Zahlen in Dateinamen (image1, image2, image10...) korrekt
                    const numA = parseInt(a.replace(/\D/g, '')) || 0;
                    const numB = parseInt(b.replace(/\D/g, '')) || 0;
                    return numA - numB;
                })
                .map(file => `img/${folder}/${file}`);

            // Projekt hinzufügen
            projects.push({
                name: folder.replace(/_/g, ' '), // Unterstriche zu Leerzeichen
                cover: coverImg,
                images: images
            });
        }
    });

    res.json(projects);
});

// Server starten
app.listen(PORT, () => {
    console.log(`================================================`);
    console.log(`MINECRAFT PORTFOLIO SERVER GESTARTET!`);
    console.log(`Port: ${PORT}`);
    console.log(`================================================`);
});