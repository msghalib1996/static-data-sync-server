const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY || 'your-secret-key'; // Use env var in production
const HIGHLIGHTS_FILE = path.join(__dirname, 'highlights.json');

app.use(cors());
app.use(bodyParser.json());

// Mock user database (replace with a real DB in production)
const users = [
    { username: 'admin1', password: bcryptjs.hashSync('PwrAFG@2025!', 10) },
    { username: 'admin2', password: bcryptjs.hashSync('PwrAFG@2025@', 10) }
];

// Initialize highlights file if it doesn’t exist
if (!fs.existsSync(HIGHLIGHTS_FILE)) {
    fs.writeFileSync(HIGHLIGHTS_FILE, JSON.stringify({ highlights: {}, removedHighlights: {} }));
}

// Login endpoint
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username);
    if (user && await bcryptjs.compare(password, user.password)) {
        const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ token });
    } else {
        res.status(401).json({ message: 'Invalid credentials' });
    }
});

// Highlights endpoints (unchanged from your previous setup)
app.get('/api/highlights', (req, res) => {
    const data = JSON.parse(fs.readFileSync(HIGHLIGHTS_FILE, 'utf8'));
    res.json(data);
});

app.post('/api/highlights', (req, res) => {
    const { highlights: newHighlights, removedHighlights: newRemovals } = req.body;
    try {
        const currentData = JSON.parse(fs.readFileSync(HIGHLIGHTS_FILE, 'utf8'));
        const currentHighlights = currentData.highlights || {};
        const currentRemovals = currentData.removedHighlights || {};

        for (const location in newHighlights) {
            if (!currentHighlights[location]) currentHighlights[location] = [];
            newHighlights[location].forEach(newH => {
                const existing = currentHighlights[location].find(h => h.index === newH.index);
                if (!existing || (newH.timestamp && newH.timestamp > existing.timestamp)) {
                    currentHighlights[location] = currentHighlights[location].filter(h => h.index !== newH.index);
                    currentHighlights[location].push(newH);
                }
            });
        }

        for (const location in newRemovals) {
            if (!currentRemovals[location]) currentRemovals[location] = {};
            for (const index in newRemovals[location]) {
                const newTimestamp = newRemovals[location][index];
                const currentTimestamp = currentRemovals[location][index];
                if (!currentTimestamp || newTimestamp > currentTimestamp) {
                    currentRemovals[location][index] = newTimestamp;
                    if (currentHighlights[location]) {
                        currentHighlights[location] = currentHighlights[location].filter(h => h.index !== parseInt(index));
                    }
                }
            }
        }

        for (const location in currentHighlights) {
            if (currentHighlights[location].length === 0) delete currentHighlights[location];
        }
        for (const location in currentRemovals) {
            if (Object.keys(currentRemovals[location]).length === 0) delete currentRemovals[location];
        }

        const updatedData = { highlights: currentHighlights, removedHighlights: currentRemovals };
        fs.writeFileSync(HIGHLIGHTS_FILE, JSON.stringify(updatedData, null, 2));
        res.json({ status: 'success' });
    } catch (error) {
        console.error('Error writing highlights:', error);
        res.status(500).json({ status: 'error', message: 'Failed to save highlights' });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));