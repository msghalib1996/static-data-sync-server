const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

app.use(express.json());

// Serve static files from 'public'
app.use(express.static('public'));

// File to store highlighted rows
const highlightsFile = path.join(__dirname, 'highlights.json');

// Initialize highlights file if it doesn’t exist
if (!fs.existsSync(highlightsFile)) {
    fs.writeFileSync(highlightsFile, JSON.stringify({}));
}

// Get highlighted rows
app.get('/api/highlights', (req, res) => {
    const highlights = JSON.parse(fs.readFileSync(highlightsFile, 'utf8'));
    res.json(highlights);
});

// Update highlighted rows
app.post('/api/highlights', (req, res) => {
    const newHighlights = req.body;
    fs.writeFileSync(highlightsFile, JSON.stringify(newHighlights, null, 2));
    console.log('Updated server highlights:', newHighlights);
    res.json({ status: 'success' });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${port}`);
});