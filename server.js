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
    fs.writeFileSync(highlightsFile, JSON.stringify({}));
}

app.get('/api/highlights', (req, res) => {
    const highlights = JSON.parse(fs.readFileSync(highlightsFile, 'utf8'));
    res.json(highlights);
});

app.post('/api/highlights', (req, res) => {
    const newHighlights = req.body;
    try {
        fs.writeFileSync(highlightsFile, JSON.stringify(newHighlights, null, 2));
        console.log('Updated server highlights:', newHighlights);
        res.json({ status: 'success' });
    } catch (error) {
        console.error('Error writing highlights:', error);
        res.status(500).json({ status: 'error', message: 'Failed to save highlights' });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});