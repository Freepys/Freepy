const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const multer = require('multer');
const simpleGit = require('simple-git');
const app = express();

const PORT = process.env.PORT || 3000;
const PROJECTS_FILE = path.join(__dirname, 'projects.json');

// Use the GitHub Token for authentication
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
// Get repo URL from environment or detect it
const remote = `https://x-access-token:${GITHUB_TOKEN}@github.com/YourUsername/YourRepoName.git`;

const git = simpleGit();

app.use(express.json());
app.use(express.static('./'));

const ADMIN_USER = "Admin Freeperr";
const ADMIN_PASS = process.env.ADMIN_PASS || "your-password";

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dest = path.join(__dirname, 'img', req.body.folder);
        fs.ensureDirSync(dest);
        cb(null, dest);
    },
    filename: (req, file, cb) => { cb(null, file.originalname); }
});
const upload = multer({ storage });

async function syncToGitHub(message) {
    if (!GITHUB_TOKEN) {
        console.log("No GitHub token found. Skipping sync.");
        return;
    }
    try {
        // Configure git user so the commit has a name
        await git.addConfig('user.email', 'portfolio-bot@render.com');
        await git.addConfig('user.name', 'Portfolio Sync Bot');
        
        await git.add('./*');
        await git.commit(message);
        await git.push(remote, 'main'); // Ensure your branch is 'main'
        console.log("Successfully pushed to GitHub: " + message);
    } catch (err) {
        console.error("Git Sync Error:", err);
    }
}

app.post('/api/login', (req, res) => {
    const { user, pass } = req.body;
    if (user === ADMIN_USER && pass === ADMIN_PASS) res.json({ success: true });
    else res.status(401).json({ success: false });
});

app.get('/api/projects', (req, res) => {
    if (!fs.existsSync(PROJECTS_FILE)) return res.json([]);
    let config = fs.readJsonSync(PROJECTS_FILE);
    const fullData = config.map(proj => {
        const dir = path.join(__dirname, 'img', proj.folder);
        if (!fs.existsSync(dir)) return null;
        const allFiles = fs.readdirSync(dir);
        
        const diskImages = allFiles
            .filter(f => f.toLowerCase().startsWith('image') && /\.(png|jpg|jpeg)$/i.test(f))
            .map(f => `img/${proj.folder}/${f}`);
        
        const sortedImages = proj.images && proj.images.length > 0 
            ? proj.images.filter(img => diskImages.includes(img)) 
            : diskImages;

        diskImages.forEach(img => { if(!sortedImages.includes(img)) sortedImages.push(img); });

        let cover = "";
        const startDir = allFiles.find(f => f.toLowerCase() === 'start');
        if (startDir) {
            const sPath = path.join(dir, startFolderName);
            if(fs.existsSync(sPath)) {
                const sFiles = fs.readdirSync(sPath).filter(f => /\.(png|jpg|jpeg)$/i.test(f));
                if (sFiles.length > 0) cover = `img/${proj.folder}/${startFolderName}/${sFiles[0]}`;
            }
        }
        return { ...proj, cover, images: sortedImages };
    }).filter(p => p);
    res.json(fullData);
});

app.post('/api/projects/save', async (req, res) => {
    fs.writeJsonSync(PROJECTS_FILE, req.body, { spaces: 2 });
    res.json({ success: true });
    await syncToGitHub("Update projects.json order");
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
    res.json({ success: true });
    await syncToGitHub(`Upload image to ${req.body.folder}`);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));