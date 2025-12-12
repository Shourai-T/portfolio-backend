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
        // we want video+audio formats or distinct video formats + audio only
        // Ideally we want 1080p, 720p, 480p, 360p with audio if possible.
        // ytdl formats usually separate video and audio for high quality.
        // For simplicity in a basic downloader, we might offer "video with audio" (often limited to 720p) OR
        // Stream both and merge? (Needs ffmpeg on server, expensive).
        // User prompt says: "Stream video directly, no server storage".
        // If we stream directly, we can only stream ONE resource.
        // If high quality 1080p is video-only, the user gets no audio.
        // Workaround: Suggest formats that have both (usually up to 720p).
        // OR stream "Audio Only" as mp3.
        
        // Let's list formats matching user request.
        
        const videoFormats = formats
            .filter(f => f.hasVideo && f.hasAudio) // formats with both (usually up to 720p)
            .sort((a, b) => b.height - a.height);
            
        // Also look for video-only formats if they want 1080p+ (warn user no audio?)
        // Or simply provide what's available combined.
        
        // Audio formats
        const audioFormats = formats.filter(f => f.hasAudio && !f.hasVideo);

        const availableFormats = [];
        
        // Helper to check uniqueness
        const seen = new Set();
        
        videoFormats.forEach(f => {
            if (!seen.has(f.qualityLabel)) {
                availableFormats.push({
                    itag: f.itag,
                    quality: f.qualityLabel,
                    container: f.container,
                    type: 'video',
                    hasAudio: true
                });
                seen.add(f.qualityLabel);
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
