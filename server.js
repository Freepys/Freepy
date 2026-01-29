const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const multer = require('multer');
const app = express();

const PORT = process.env.PORT || 3000;

// Admin-Daten aus Render Environment Variables
const ADMIN_USER = process.env.ADMIN_USER || "Admin Freeperr";
const ADMIN_PASS = process.env.ADMIN_PASS || "dein-passwort";

// Speicher-Logik für Uploads
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
        const { type, folder } = req.body;
        if (type === 'start') {
            cb(null, `start_${folder.toLowerCase()}.png`);
        } else {
            cb(null, `image_${Date.now()}_${file.originalname.toLowerCase()}`);
        }
    }
});
const upload = multer({ storage });

app.use(express.json());
app.use(express.static('./'));

// API: Login
app.post('/api/login', (req, res) => {
    const { user, pass } = req.body;
    if (user === ADMIN_USER && pass === ADMIN_PASS) res.json({ success: true });
    else res.status(401).json({ success: false });
});

// API: Projekte scannen
app.get('/api/projects', (req, res) => {
    const imgDir = path.join(__dirname, 'img');
    if (!fs.existsSync(imgDir)) return res.json([]);
    
    const folders = fs.readdirSync(imgDir);
    const projects = folders.map(folder => {
        const folderPath = path.join(imgDir, folder);
        if (fs.lstatSync(folderPath).isDirectory()) {
            // Cover im "start"-Ordner suchen
            const startDir = path.join(folderPath, 'start');
            let cover = "";
            if (fs.existsSync(startDir)) {
                const files = fs.readdirSync(startDir).filter(f => /\.(png|jpg|jpeg)$/i.test(f));
                if (files.length > 0) cover = `img/${folder}/start/${files[0]}`;
            }
            // Galerie-Bilder (direkt im Projektordner)
            const images = fs.readdirSync(folderPath)
                .filter(f => /\.(png|jpg|jpeg)$/i.test(f))
                .sort((a, b) => (parseInt(a.replace(/\D/g, '')) || 0) - (parseInt(b.replace(/\D/g, '')) || 0))
                .map(f => `img/${folder}/${f}`);
            
            return { name: folder.replace(/_/g, ' '), folder, cover, images };
        }
    }).filter(p => p);
    res.json(projects);
});

// API: Projekt erstellen
app.post('/api/projects/create', (req, res) => {
    const folderName = req.body.name.trim().replace(/\s+/g, '_').toLowerCase();
    const dir = path.join(__dirname, 'img', folderName);
    if (!fs.existsSync(dir)) {
        fs.ensureDirSync(path.join(dir, 'start'));
        res.json({ success: true, folder: folderName });
    } else res.status(400).json({ error: "Projekt existiert bereits" });
});

// API: Upload
app.post('/api/upload', upload.single('image'), (req, res) => {
    res.json({ success: true });
});

// API: Löschen
app.delete('/api/projects/:folder', (req, res) => {
    fs.removeSync(path.join(__dirname, 'img', req.params.folder));
    res.json({ success: true });
});

app.listen(PORT, () => console.log(`Server auf Port ${PORT} gestartet`));