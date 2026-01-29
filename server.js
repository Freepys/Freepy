const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('./'));

// ADMIN DATEN von Render
const ADMIN_USER = process.env.ADMIN_USER || "Admin Freeperr";
const ADMIN_PASS = process.env.ADMIN_PASS || "fallback-passwort"; 

app.post('/api/login', (req, res) => {
    const { user, pass } = req.body;
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: "Falsche Zugangsdaten!" });
    }
});

app.get('/api/projects', (req, res) => {
    const imgDir = path.join(__dirname, 'img');
    if (!fs.existsSync(imgDir)) return res.json([]);

    const projects = [];
    const folders = fs.readdirSync(imgDir);

    folders.forEach(folder => {
        const folderPath = path.join(imgDir, folder);
        if (fs.lstatSync(folderPath).isDirectory()) {
            const startDir = path.join(folderPath, 'start');
            let coverImg = "";
            if (fs.existsSync(startDir)) {
                const startFiles = fs.readdirSync(startDir)
                    .filter(f => f.toLowerCase().endsWith('.png') || f.toLowerCase().endsWith('.jpg'));
                if (startFiles.length > 0) coverImg = `img/${folder}/start/${startFiles[0]}`;
            }

            const images = fs.readdirSync(folderPath)
                .filter(file => file.toLowerCase().endsWith('.png') || file.toLowerCase().endsWith('.jpg'))
                .sort((a, b) => (parseInt(a.replace(/\D/g, '')) || 0) - (parseInt(b.replace(/\D/g, '')) || 0))
                .map(file => `img/${folder}/${file}`);

            projects.push({
                name: folder.replace(/_/g, ' '),
                cover: coverImg,
                images: images
            });
        }
    });
    res.json(projects);
});

app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});