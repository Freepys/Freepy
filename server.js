const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const multer = require('multer');
const simpleGit = require('simple-git');
const app = express();

const PORT = process.env.PORT || 3000;
const PROJECTS_FILE = path.join(__dirname, 'projects.json');

// Nutze den GITHUB_TOKEN für die Authentifizierung
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
// WICHTIG: Ersetze 'DeinNutzername' und 'DeinRepo' durch deine echten Daten oder nutze Umgebungsvariablen
const remote = `https://x-access-token:${GITHUB_TOKEN}@github.com/Freepys/Freepy.git`;

const git = simpleGit();

app.use(express.json());
app.use(express.static('./'));

const ADMIN_USER = "Admin Freeperr";
const ADMIN_PASS = process.env.ADMIN_PASS || "your-password";

// Speicher-Konfiguration für Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dest = path.join(__dirname, 'img', req.body.folder);
        fs.ensureDirSync(dest);
        cb(null, dest);
    },
    filename: (req, file, cb) => { cb(null, file.originalname); }
});
const upload = multer({ storage });

// Synchronisations-Funktion für GitHub
async function syncToGitHub(message) {
    if (!GITHUB_TOKEN) {
        console.log("Kein GitHub-Token gefunden. Sync übersprungen.");
        return;
    }
    try {
        await git.addConfig('user.email', 'portfolio-bot@render.com');
        await git.addConfig('user.name', 'Portfolio Sync Bot');
        
        await git.add('./*');
        await git.commit(message);
        await git.push(remote, 'main');
        console.log("Erfolgreich mit GitHub synchronisiert: " + message);
    } catch (err) {
        console.error("Git Sync Fehler:", err);
    }
}

// API: Login
app.post('/api/login', (req, res) => {
    const { user, pass } = req.body;
    if (user === ADMIN_USER && pass === ADMIN_PASS) res.json({ success: true });
    else res.status(401).json({ success: false });
});

// API: Projekte laden & Bilder scannen
app.get('/api/projects', (req, res) => {
    if (!fs.existsSync(PROJECTS_FILE)) return res.json([]);
    
    try {
        let config = fs.readJsonSync(PROJECTS_FILE);
        const fullData = config.map(proj => {
            const dir = path.join(__dirname, 'img', proj.folder);
            if (!fs.existsSync(dir)) return null;
            
            const allFiles = fs.readdirSync(dir);
            
            // Bilder finden, die mit "image" anfangen
            const diskImages = allFiles
                .filter(f => f.toLowerCase().startsWith('image') && /\.(png|jpg|jpeg)$/i.test(f))
                .map(f => `img/${proj.folder}/${f}`);
            
            // Sortierung beibehalten oder neue Bilder anhängen
            const sortedImages = proj.images && proj.images.length > 0 
                ? proj.images.filter(img => diskImages.includes(img)) 
                : diskImages;

            diskImages.forEach(img => { if(!sortedImages.includes(img)) sortedImages.push(img); });

            // Cover im "start"-Ordner suchen
            let cover = "";
            const startFolderName = allFiles.find(f => f.toLowerCase() === 'start');
            if (startFolderName) {
                const sPath = path.join(dir, startFolderName);
                if (fs.existsSync(sPath)) {
                    const sFiles = fs.readdirSync(sPath).filter(f => /\.(png|jpg|jpeg)$/i.test(f));
                    if (sFiles.length > 0) cover = `img/${proj.folder}/${startFolderName}/${sFiles[0]}`;
                }
            }
            
            return { ...proj, cover, images: sortedImages };
        }).filter(p => p);
        
        res.json(fullData);
    } catch (err) {
        console.error("Fehler beim Lesen der Projekte:", err);
        res.status(500).send("Server Fehler");
    }
});

// API: Projekt-Reihenfolge speichern
app.post('/api/projects/save', async (req, res) => {
    try {
        fs.writeJsonSync(PROJECTS_FILE, req.body, { spaces: 2 });
        res.json({ success: true });
        await syncToGitHub("Update projects.json order");
    } catch (err) {
        res.status(500).send("Fehler beim Speichern");
    }
});

// API: Bild Upload
app.post('/api/upload', upload.single('file'), async (req, res) => {
    res.json({ success: true });
    await syncToGitHub(`Upload image to ${req.body.folder}`);
});

app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));