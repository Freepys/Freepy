const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const multer = require('multer');
const app = express();

const PORT = process.env.PORT || 3000;
const PROJECTS_FILE = path.join(__dirname, 'projects.json');

app.use(express.json());
app.use(express.static('./'));

// Admin Credentials (Set these in Render Environment Variables)
const ADMIN_USER = process.env.ADMIN_USER || "Admin Freeperr";
const ADMIN_PASS = process.env.ADMIN_PASS || "your-password";

// Multer Setup for Drag & Drop Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dest = path.join(__dirname, 'img', req.body.folder);
        fs.ensureDirSync(dest);
        cb(null, dest);
    },
    filename: (req, file, cb) => { cb(null, file.originalname); }
});
const upload = multer({ storage });

// API: Login
app.post('/api/login', (req, res) => {
    const { user, pass } = req.body;
    if (user === ADMIN_USER && pass === ADMIN_PASS) res.json({ success: true });
    else res.status(401).json({ success: false });
});

// API: Load Projects & Auto-Scan Images
app.get('/api/projects', (req, res) => {
    if (!fs.existsSync(PROJECTS_FILE)) return res.json([]);
    let config = fs.readJsonSync(PROJECTS_FILE);

    const fullData = config.map(proj => {
        const dir = path.join(__dirname, 'img', proj.folder);
        if (!fs.existsSync(dir)) return null;

        const allFiles = fs.readdirSync(dir);
        
        // Auto-scan for files starting with "image"
        const images = allFiles
            .filter(f => f.toLowerCase().startsWith('image') && /\.(png|jpg|jpeg)$/i.test(f))
            .sort((a, b) => {
                const numA = parseInt(a.replace(/\D/g, '')) || 0;
                const numB = parseInt(b.replace(/\D/g, '')) || 0;
                return numA - numB;
            })
            .map(f => `img/${proj.folder}/${f}`);

        // Auto-find Cover in "start" folder (case insensitive)
        let cover = proj.cover || "";
        const startFolderName = allFiles.find(f => f.toLowerCase() === 'start');
        if (startFolderName) {
            const startPath = path.join(dir, startFolderName);
            const startFiles = fs.readdirSync(startPath).filter(f => /\.(png|jpg|jpeg)$/i.test(f));
            if (startFiles.length > 0) cover = `img/${proj.folder}/${startFolderName}/${startFiles[0]}`;
        }

        return { ...proj, cover, images };
    }).filter(p => p);

    res.json(fullData);
});

// API: Create New Project
app.post('/api/projects/create', (req, res) => {
    const { name } = req.body;
    const folder = name.toLowerCase().replace(/\s+/g, '_');
    if (!fs.existsSync(PROJECTS_FILE)) fs.writeJsonSync(PROJECTS_FILE, []);
    const config = fs.readJsonSync(PROJECTS_FILE);
    
    if (config.find(p => p.folder === folder)) return res.status(400).send("Folder already exists");
    
    config.push({ name, folder, cover: "" });
    fs.writeJsonSync(PROJECTS_FILE, config, { spaces: 2 });
    fs.ensureDirSync(path.join(__dirname, 'img', folder, 'start'));
    res.json({ success: true });
});

// API: Save Project Order
app.post('/api/projects/save', (req, res) => {
    fs.writeJsonSync(PROJECTS_FILE, req.body, { spaces: 2 });
    res.json({ success: true });
});

// API: Upload Image
app.post('/api/upload', upload.single('file'), (req, res) => res.json({ success: true }));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));