const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.DEMO_PORT || 3002;

// Serve static files from demo directory
app.use(express.static(path.join(__dirname, '.')));

// CORS middleware for extension access
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    next();
});

// Serve the demo page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`📺 Smart Form Filler Demo Server running at http://localhost:${PORT}`);
    console.log(`🚀 Open http://localhost:${PORT} in your browser to try the demo`);
    console.log(`🔧 Make sure the Smart Form Filler extension is installed and enabled`);
});
