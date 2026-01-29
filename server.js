const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;
const PROJECTS_FILE = path.join(__dirname, 'projects.json');

app.use(express.json());
app.use(express.static('./'));

// Admin-Daten
const ADMIN_USER = process.env.ADMIN_USER || "Admin Freeperr";
const ADMIN_PASS = process.env.ADMIN_PASS || "dein-passwort";

// Hilfsfunktion: Findet Dateien egal ob Start/start oder .PNG/.png
function findFileCaseInsensitive(basePath, filename) {
    if (!fs.existsSync(basePath)) return null;
    const files = fs.readdirSync(basePath);
    const match = files.find(f => f.toLowerCase() === filename.toLowerCase());
    return match ? match : null;
}

app.post('/api/login', (req, res) => {
    const { user, pass } = req.body;
    if (user === ADMIN_USER && pass === ADMIN_PASS) res.json({ success: true });
    else res.status(401).json({ success: false });
});

// Projekte aus projects.json laden
app.get('/api/projects', (req, res) => {
    if (!fs.existsSync(PROJECTS_FILE)) return res.json([]);
    const data = fs.readJsonSync(PROJECTS_FILE);
    res.json(data);
});

// Projekt speichern (Reihenfolge & Namen)
app.post('/api/projects/save', (req, res) => {
    try {
        fs.writeJsonSync(PROJECTS_FILE, req.body, { spaces: 2 });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Speichern fehlgeschlagen" });
    }
});

app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));