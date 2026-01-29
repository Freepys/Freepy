const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const multer = require('multer');
const app = express();

const PORT = process.env.PORT || 3000;

// Konfiguration für Datei-Uploads (temporär auf Render)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const { folder, type } = req.body;
        const dest = type === 'start' 
            ? path.join(__dirname, 'img', folder, 'start') 
            : path.join(__dirname, 'img', folder);
        fs.ensureDirSync(dest);
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        const { type, index } = req.body;
        if (type === 'start') {
            cb(null, `start${req.body.folder}.png`);
        } else {
            cb(null, `image${index || Date.now()}.png`);
        }
    }
});
const upload = multer({ storage });

app.use(express.json());
app.use(express.static('./'));

const ADMIN_USER = process.env.ADMIN_USER || "Admin Freeperr";
const ADMIN_PASS = process.env.ADMIN_PASS || "dein-passwort";

// Login API
app.post('/api/login', (req, res) => {
    const { user, pass } = req.body;
    if (user === ADMIN_USER && pass === ADMIN_PASS) res.json({ success: true });
    else res.status(401).json({ success: false });
});

// Projekte laden (Scannt den img-Ordner)
app.get('/api/projects', (req, res) => {
    const imgDir = path.join(__dirname, 'img');
    if (!fs.existsSync(imgDir)) return res.json([]);
    
    const folders = fs.readdirSync(imgDir);
    const projects = folders.map(folder => {
        const folderPath = path.join(imgDir, folder);
        if (fs.lstatSync(folderPath).isDirectory()) {
            // Cover Suche (Case Insensitive)
            const startDir = path.join(folderPath, 'start');
            let cover = "";
            if (fs.existsSync(startDir)) {
                const files = fs.readdirSync(startDir).filter(f => f.toLowerCase().endsWith('.png') || f.toLowerCase().endsWith('.jpg'));
                if (files.length > 0) cover = `img/${folder}/start/${files[0]}`;
            }
            // Galerie Bilder
            const images = fs.readdirSync(folderPath)
                .filter(f => f.toLowerCase().endsWith('.png') || f.toLowerCase().endsWith('.jpg'))
                .sort((a, b) => (parseInt(a.replace(/\D/g, '')) || 0) - (parseInt(b.replace(/\D/g, '')) || 0))
                .map(f => `img/${folder}/${f}`);
            
            return { name: folder.replace(/_/g, ' '), folder, cover, images };
        }
    }).filter(p => p);
    res.json(projects);
});

// Projekt erstellen
app.post('/api/projects/create', (req, res) => {
    const { name } = req.body;
    const folderName = name.replace(/\s+/g, '_'); // Behält Groß/Kleinschreibung des Ordners bei Bedarf
    const dir = path.join(__dirname, 'img', folderName);
    if (!fs.existsSync(dir)) {
        fs.ensureDirSync(path.join(dir, 'start'));
        res.json({ success: true, folder: folderName });
    } else {
        res.status(400).json({ error: "Existiert bereits" });
    }
});

// Bilder hochladen
app.post('/api/upload', upload.single('image'), (req, res) => {
    res.json({ success: true, path: req.file.path });
});

// Projekt löschen
app.delete('/api/projects/:folder', (req, res) => {
    const dir = path.join(__dirname, 'img', req.params.folder);
    if (fs.existsSync(dir)) {
        fs.removeSync(dir);
        res.json({ success: true });
    } else res.status(404).json({ error: "Nicht gefunden" });
});

app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));