const fs = require('fs');
const express = require('express');
const app = express();
app.use(express.json());
const highlightsFile = './highlights.json';

app.post('/api/highlights', (req, res) => {
    const newHighlights = req.body; // Could be empty if highlights are cleared
    try {
        fs.writeFileSync(highlightsFile, JSON.stringify(newHighlights, null, 2));
        console.log('Server updated highlights:', newHighlights);
        res.json({ status: 'success' });
    } catch (error) {
        console.error('Error saving highlights:', error);
        res.status(500).json({ status: 'error', message: 'Failed to save highlights' });
    }
});