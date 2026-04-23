const axios = require('axios');
const cheerio = require('cheerio');

exports.getVideoInfo = async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ error: "Missing URL" });
        }

        // Use a bot user-agent to encourage SSR/OG tags
        const headers = {
            'User-Agent': 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)'
        };

        const response = await axios.get(url, { headers });
        const html = response.data;
        const $ = cheerio.load(html);

        const title = $('meta[property="og:title"]').attr('content') || 
                      $('meta[name="twitter:title"]').attr('content') || 
                      "Twitter Video";
                      
        const thumbnail = $('meta[property="og:image"]').attr('content') || 
                          $('meta[name="twitter:image"]').attr('content');
                          
        const videoUrl = $('meta[property="og:video"]').attr('content') || 
                         $('meta[property="og:video:secure_url"]').attr('content') ||
                         $('meta[name="twitter:player:stream"]').attr('content');

        if (!videoUrl) {
            // Fallback: X.com is strictly dynamic often.
            // If we can't find it via OG, we might inform the user.
            // Some specific "guest token" API calls are often used by downloaders
            // but that adds significant complexity and fragility.
            return res.status(404).json({ error: "Could not find video URL. Twitter/X often protects content from simple scraping." });
        }

        res.json({
            title: title,
            thumbnail: thumbnail,
            author: "Twitter User", // Harder to parse reliably without API
            formats: [
                {
                    itag: 'twitter-default',
                    quality: 'Default',
                    container: 'mp4',
                    type: 'video',
                    hasAudio: true, // assumption
                    url: videoUrl // Pass internal URL for downloader to use
                }
            ]
        });

    } catch (error) {
        console.error("Twitter Info Error:", error.message);
        res.status(500).json({ error: "Failed to fetch Twitter info" });
    }
};

exports.downloadVideo = async (req, res) => {
    try {
        const { url, itag } = req.query; // original url not needed if we had source, but here we re-scrape or pass source? 
        // passing source URL in query is messy. 
        // ideally we re-fetch info or trust the frontend to pass the Source URL?
        // Frontend doesn't know the source URL usually, it just knows the page URL.
        // So we re-scrape.
        
        // Optimization: We could pass the direct video URL as a query param if we trust it, 
        // BUT the frontend "Download" button logic in VideoDownloader just calls /download?url=PAGE_URL
        
        // So we re-scrape the direct link.
        
        const headers = {
            'User-Agent': 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)'
        };
        
        const response = await axios.get(url, { headers });
        const html = response.data;
        const $ = cheerio.load(html);
        
        const videoUrl = $('meta[property="og:video"]').attr('content') || 
                         $('meta[property="og:video:secure_url"]').attr('content') ||
                         $('meta[name="twitter:player:stream"]').attr('content');

        if (!videoUrl) {
            return res.status(404).json({ error: "Video source not found" });
        }
        
        // Stream the file
        const videoStream = await axios({
            url: videoUrl,
            method: 'GET',
            responseType: 'stream'
        });
        
        const title = "Twitter Video";
        res.header('Content-Disposition', `attachment; filename="${title}.mp4"`);
        videoStream.data.pipe(res);

    } catch (error) {
         console.error("Twitter Download Error:", error.message);
         if (!res.headersSent) {
             res.status(500).json({ error: "Failed to download video" });
         }
    }
};
