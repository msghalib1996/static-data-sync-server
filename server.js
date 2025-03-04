const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY || 'your-secret-key123456'; // Use env var in production
const HIGHLIGHTS_FILE = path.join(__dirname, 'highlights.json');

app.use(cors({ origin: '*' })); // Allow all origins (restrict in production)
app.use(bodyParser.json());

// Mock user database
const users = [
    { username: 'user1', password: bcryptjs.hashSync('password1', 10) },
    { username: 'user2', password: bcryptjs.hashSync('password2', 10) },
    { username: 'admin1', password: bcryptjs.hashSync('adminpass', 10) }
];

// Initialize highlights file
if (!fs.existsSync(HIGHLIGHTS_FILE)) {
    console.log('Creating highlights.json');
    fs.writeFileSync(HIGHLIGHTS_FILE, JSON.stringify({ highlights: {}, removedHighlights: {} }));
}

// Health check
app.get('/health', (req, res) => {
    console.log('Health check requested');
    res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// Login endpoint
app.post('/login', async (req, res) => {
    console.log('Login request received:', req.body);
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            console.log('Missing username or password');
            return res.status(400).json({ message: 'Username and password are required' });
        }
        const user = users.find(u => u.username === username);
        if (!user) {
            console.log(`User ${username} not found`);
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const isMatch = await bcryptjs.compare(password, user.password);
        if (isMatch) {
            const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '1h' });
            console.log(`Login successful for ${username}`);
            res.json({ token });
        } else {
            console.log(`Invalid password for ${username}`);
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Login error:', error.message);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// Highlights endpoints
app.get('/api/highlights', (req, res) => {
    try {
        console.log('GET /api/highlights requested');
        const data = JSON.parse(fs.readFileSync(HIGHLIGHTS_FILE, 'utf8'));
        res.json(data);
    } catch (error) {
        console.error('Error reading highlights:', error.message);
        res.status(500).json({ message: 'Failed to read highlights', error: error.message });
    }
});

app.post('/api/highlights', (req, res) => {
    try {
        console.log('POST /api/highlights received:', req.body);
        const { highlights: newHighlights, removedHighlights: newRemovals } = req.body;
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
        console.log('Highlights updated successfully');
        res.json({ status: 'success' });
    } catch (error) {
        console.error('Error writing highlights:', error.message);
        res.status(500).json({ message: 'Failed to save highlights', error: error.message });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));