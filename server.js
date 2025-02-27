const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors'); // Added
const app = express();
const port = process.env.PORT || 3000;

app.use(cors()); // Enable CORS
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
    fs.writeFileSync(highlightsFile, JSON.stringify(newHighlights, null, 2));
    res.json({ status: 'success' });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});