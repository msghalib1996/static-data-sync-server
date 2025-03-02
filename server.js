const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const highlightsFile = path.join(__dirname, 'highlights.json');

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

        // Merge highlights
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

        // Merge removals
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

        // Clean up empty locations
        for (const location in currentHighlights) {
            if (currentHighlights[location].length === 0) delete currentHighlights[location];
        }
        for (const location in currentRemovals) {
            if (Object.keys(currentRemovals[location]).length === 0) delete currentRemovals[location];
        }

        const updatedData = { highlights: currentHighlights, removedHighlights: currentRemovals };
        fs.writeFileSync(highlightsFile, JSON.stringify(updatedData, null, 2));
        console.log('Updated server data:', updatedData);
        res.json({ status: 'success' });
    } catch (error) {
        console.error('Error writing highlights:', error);
        res.status(500).json({ status: 'error', message: 'Failed to save highlights' });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});