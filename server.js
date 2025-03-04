const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const highlightsFile = path.join(__dirname, 'highlights.json');

// Hardcoded users (replace with a database or secure storage in production)
const validUsers = {
    'admin1': 'PwrAFG@2025!',
    'admin2': 'PwrAFG@2025@'
};

if (!fs.existsSync(highlightsFile)) {
    fs.writeFileSync(highlightsFile, JSON.stringify({ highlights: {}, removedHighlights: {} }));
}

app.get('/api/highlights', (req, res) => {
    const data = JSON.parse(fs.readFileSync(highlightsFile, 'utf8'));
    res.json(data);
});

app.post('/api/highlights', (req, res) => {
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

// New login endpoint
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (validUsers[username] && validUsers[username] === password) {
        // Simple token (for simplicity; use JWT in production)
        const token = `${username}-${Date.now()}`;
        res.json({ status: 'success', token });
    } else {
        res.status(401).json({ status: 'error', message: 'Invalid credentials' });
    }
});

// Token validation endpoint
app.post('/api/validate-token', (req, res) => {
    const { token } = req.body;
    // For this simple example, just check if token exists and is in format username-timestamp
    if (token && token.split('-').length === 2) {
        res.json({ status: 'success' });
    } else {
        res.status(401).json({ status: 'error', message: 'Invalid token' });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});