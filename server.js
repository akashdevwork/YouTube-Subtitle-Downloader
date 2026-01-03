const express = require('express');
const { getSubtitles } = require('youtube-captions-scraper');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Helper: Convert seconds to SRT timestamp
function formatTime(seconds) {
    const date = new Date(0);
    date.setMilliseconds(seconds * 1000);
    const timeStr = date.toISOString().substr(11, 12);
    return timeStr.replace('.', ',');
}

// Helper: Convert JSON to SRT
function jsonToSrt(captions) {
    return captions.map((cap, index) => {
        const start = parseFloat(cap.start);
        const end = start + parseFloat(cap.dur);
        return `${index + 1}\n${formatTime(start)} --> ${formatTime(end)}\n${cap.text}`;
    }).join('\n\n');
}

// Helper: Convert JSON to Plain Text (TXT)
function jsonToTxt(captions) {
    // Joins all text lines with a space or newline
    return captions.map(cap => cap.text).join(' '); 
}

// Helper: Extract Video ID
function getVideoId(url) {
    const regex = /(?:v=|\/)([0-9A-Za-z_-]{11}).*/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

app.post('/download', async (req, res) => {
    try {
        const { url, format } = req.body; // Get format (srt or txt)
        const videoId = getVideoId(url);

        if (!videoId) return res.status(400).json({ error: 'Invalid YouTube URL' });

        const captions = await getSubtitles({ videoID: videoId, lang: 'en' });

        let content = '';
        let filename = `${videoId}.srt`;

        if (format === 'txt') {
            content = jsonToTxt(captions);
            filename = `${videoId}.txt`;
        } else {
            content = jsonToSrt(captions);
        }

        res.setHeader('Content-disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-type', 'text/plain');
        res.send(content);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch subtitles.' });
    }
});

// Export the app for Vercel (Important for deployment!)
module.exports = app;

// Only listen if running locally (not on Vercel)
if (require.main === module) {
    app.listen(3000, () => console.log('Server running on port 3000'));
}
