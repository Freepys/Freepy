const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

// Statische Dateien (HTML, Fonts, Bilder) verfügbar machen
app.use(express.static('./'));

/**
 * API-Endpunkt: Scannt den 'img' Ordner und gibt alle Projekte zurück
 */
app.get('/api/projects', (req, res) => {
    const imgDir = path.join(__dirname, 'img');
    
    // Falls der img-Ordner nicht existiert, leere Liste senden
    if (!fs.existsSync(imgDir)) {
        return res.json([]);
    }

    const projects = [];
    const folders = fs.readdirSync(imgDir);

    folders.forEach(folder => {
        const folderPath = path.join(imgDir, folder);
        
        // Nur echte Verzeichnisse scannen
        if (fs.lstatSync(folderPath).isDirectory()) {
            
            // 1. Cover-Bild suchen (im Unterordner "start")
            const startDir = path.join(folderPath, 'start');
            let coverImg = "";
            
            if (fs.existsSync(startDir)) {
                const startFiles = fs.readdirSync(startDir)
                    .filter(f => f.toLowerCase().endsWith('.png'));
                if (startFiles.length > 0) {
                    // Nimmt das erste PNG im start-Ordner als Cover
                    coverImg = `img/${folder}/start/${startFiles[0]}`;
                }
            }

            // 2. Galerie-Bilder suchen (alle PNGs im Projekt-Hauptordner)
            const images = fs.readdirSync(folderPath)
                .filter(file => file.toLowerCase().endsWith('.png'))
                .sort((a, b) => {
                    // Extrahiert Zahlen aus dem Dateinamen für korrekte Sortierung (1, 2, 10...)
                    const numA = parseInt(a.replace(/\D/g, '')) || 0;
                    const numB = parseInt(b.replace(/\D/g, '')) || 0;
                    return numA - numB;
                })
                .map(file => `img/${folder}/${file}`);

            // Projekt zum Array hinzufügen
            projects.push({
                name: folder.replace(/_/g, ' '), // Ersetzt Unterstriche durch Leerzeichen für die Anzeige
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
    console.log(`Link: http://localhost:${PORT}`);
    console.log(`================================================`);
});