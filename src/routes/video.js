const express = require('express');
const router = express.Router();
const youtubeController = require('../controllers/youtube');

// Platform detection helper
const getPlatform = (url) => {
    if (!url) return null;
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('facebook.com') || url.includes('fb.watch')) return 'facebook';
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    return 'unknown';
};

// GET /api/video/info
router.get('/info', async (req, res) => {
    const { url } = req.query;
    const platform = getPlatform(url);

    switch (platform) {
        case 'youtube':
            return youtubeController.getVideoInfo(req, res);
        case 'tiktok':
        case 'facebook':
        case 'instagram':
        case 'twitter':
            return res.status(501).json({ error: "Platform not yet implemented" });
        default:
            return res.status(400).json({ error: "Unsupported platform or invalid URL" });
    }
});

// GET /api/video/download
router.get('/download', async (req, res) => {
    const { url } = req.query;
    const platform = getPlatform(url);

    switch (platform) {
        case 'youtube':
            return youtubeController.downloadVideo(req, res);
        case 'tiktok':
        case 'facebook':
        case 'instagram':
        case 'twitter':
            return res.status(501).json({ error: "Platform not yet implemented" });
        default:
            return res.status(400).json({ error: "Unsupported platform or invalid URL" });
    }
});

module.exports = router;
