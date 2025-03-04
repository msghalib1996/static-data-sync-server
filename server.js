const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Secret key for JWT (replace with a secure key in production)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secure-secret-key';

// Hardcoded users (replace with a database in production)
const users = {
    'admin1': bcrypt.hashSync('PwrAFG@2025!', 10),
    'admin2': bcrypt.hashSync('PwrAFG@2025!', 10)
};

const highlightsFile = path.join(__dirname, 'highlights.json');

if (!fs.existsSync(highlightsFile)) {
    fs.writeFileSync(highlightsFile, JSON.stringify({ highlights: {}, removedHighlights: {} }));
}

// Login endpoint
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = users[username];

    if (!hashedPassword) {
        return res.status(401).json({ status: 'error', message: 'Invalid username or password' });
    }

    try {
        const match = await bcrypt.compare(password, hashedPassword);
        if (match) {
            const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
            res.json({ status: 'success', token });
        } else {
            res.status(401).json({ status: 'error', message: 'Invalid username or password' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

// Middleware to verify JWT token for protected routes
function verifyToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ status: 'error', message: 'No token provided' });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ status: 'error', message: 'Invalid token' });
        req.user = decoded;
        next();
    });
}

app.get('/api/highlights', verifyToken, (req, res) => {
    const data = JSON.parse(fs.readFileSync(highlightsFile, 'utf8'));
    res.json(data);
});

app.post('/api/highlights', verifyToken, (req, res) => {
    const { highlights: newHighlights, removedHighlights: newRemovals } = req.body;
    try {
        const currentData = JSON.parse(fs.readFileSync(highlightsFile, 'utf8'));
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
        fs.writeFileSync(highlightsFile, JSON.stringify(updatedData, null, 2));
        res.json({ status: 'success' });
    } catch (error) {
        console.error('Error writing highlights:', error);
        res.status(500).json({ status: 'error', message: 'Failed to save highlights' });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});