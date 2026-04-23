const ytdl = require('@distube/ytdl-core');

// Get Video Info
exports.getVideoInfo = async (req, res) => {
    try {
        const { url } = req.query;

        if (!url || !ytdl.validateURL(url)) {
            return res.status(400).json({ error: "Invalid YouTube URL" });
        }

        const info = await ytdl.getInfo(url);
        const { videoDetails, formats } = info;
        
        // Filter and Map formats
        // 1. Get Mixed Formats (Video + Audio) - usually capped at 720p
        const mixedFormats = formats.filter(f => f.hasVideo && f.hasAudio);
        
        // 2. Get Video Only Formats (High Qual) - usually 1080p, 2K, 4K
        // Sort by resolution descending
        const videoOnlyFormats = formats
            .filter(f => f.hasVideo && !f.hasAudio && f.height > 720) // Only show video-only if better than 720p
            .sort((a, b) => b.height - a.height);
            
        // Combine them: Best video-only first (if any), then mixed formats
        // This gives user option to download 1080p (silent) or 720p (sound)
        const allVideoFormats = [...videoOnlyFormats, ...mixedFormats]
             .sort((a, b) => b.height - a.height);

        // Audio formats
        const audioFormats = formats.filter(f => f.hasAudio && !f.hasVideo);

        const availableFormats = [];
        
        // Helper to check uniqueness
        const seen = new Set();
        
        allVideoFormats.forEach(f => {
            // Uniqueness key: Quality Label + Container
            const key = `${f.qualityLabel}-${f.container}`;
            if (!seen.has(key)) {
                availableFormats.push({
                    itag: f.itag,
                    quality: f.qualityLabel,
                    container: f.container,
                    type: 'video',
                    hasAudio: !!f.hasAudio
                });
                seen.add(key);
            }
        });
        
        // Add Audio Option
        if (audioFormats.length > 0) {
            const bestAudio = audioFormats[0]; // usually best quality first
            availableFormats.push({
                itag: bestAudio.itag,
                quality: 'MP3 (Audio)', // Label for frontend
                container: 'mp3',
                type: 'audio',
                hasAudio: true
            });
        }

        const thumbnail = videoDetails.thumbnails.length > 0 
            ? videoDetails.thumbnails[videoDetails.thumbnails.length - 1].url // Highest res usually last
            : null;

        res.json({
            title: videoDetails.title,
            thumbnail: thumbnail,
            duration: videoDetails.lengthSeconds,
            author: videoDetails.author.name,
            formats: availableFormats
        });

    } catch (error) {
        console.error("YouTube Info Error:", error);
        res.status(500).json({ error: "Failed to fetch video info" });
    }
};

// Download Video
exports.downloadVideo = async (req, res) => {
    try {
        const { url, itag } = req.query;

        if (!url || !itag) {
            return res.status(400).json({ error: "Missing url or itag" });
        }

        if (!ytdl.validateURL(url)) {
            return res.status(400).json({ error: "Invalid YouTube URL" });
        }

        // Set Headers for Download
        const info = await ytdl.getBasicInfo(url);
        const title = info.videoDetails.title.replace(/[^\w\s]/gi, ''); // Sanitize
        
        // Determine container/extension (simplified)
        // Ideally look up format by itag
        const format = info.formats.find(f => f.itag == itag);
        const ext = format ? format.container : 'mp4';
        const isAudio = format && !format.hasVideo;

        res.header('Content-Disposition', `attachment; filename="${title}.${isAudio ? 'mp3' : ext}"`);
        
        ytdl(url, { quality: itag })
            .on('error', (err) => {
                console.error("Stream Error:", err);
                if (!res.headersSent) {
                    res.status(500).json({ error: "Stream error" });
                }
            })
            .pipe(res);

    } catch (error) {
        console.error("Download Error:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: "Failed to download video" });
        }
    }
};
