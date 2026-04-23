# Video Downloader API Documentation

This backend service provides endpoints to fetch video metadata and stream downloads from supported platforms (currently YouTube).

**Base URL**: `http://localhost:4000/api/video`

---

## 1. Get Video Information

Fetches metadata, thumbnail, and available formats for a given video URL.

- **Endpoint**: `GET /info`
- **Query Parameters**:
  - `url` (required): The URL of the video (e.g., YouTube link).

### Example Request

```http
GET /api/video/info?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

### Example Response (200 OK)

```json
{
  "title": "Rick Astley - Never Gonna Give You Up (Official Music Video)",
  "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
  "duration": "213",
  "author": "Rick Astley",
  "formats": [
    {
      "itag": 22,
      "quality": "720p",
      "container": "mp4",
      "type": "video",
      "hasAudio": true
    },
    {
      "itag": 18,
      "quality": "360p",
      "container": "mp4",
      "type": "video",
      "hasAudio": true
    },
    {
      "itag": 140,
      "quality": "MP3 (Audio)",
      "container": "mp3",
      "type": "audio",
      "hasAudio": true
    }
  ]
}
```

### Error Response (400 Bad Request)

```json
{
  "error": "Invalid YouTube URL"
}
```

---

## 2. Download Video

Streams the video (or audio) file directly to the client with the correct `Content-Disposition` header to trigger a download.

- **Endpoint**: `GET /download`
- **Query Parameters**:
  - `url` (required): The URL of the video.
  - `itag` (required): The specific format ID selected from the `/info` response.

### Example Request

```http
GET /api/video/download?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ&itag=22
```

### Behavior

- The server will respond with a stream.
- Headers will include:
  - `Content-Disposition: attachment; filename="Video Title.mp4"`
  - `Content-Type`: `video/mp4` (or `audio/mpeg` etc.)

---

## Supported Platforms

| Platform        | Status           | Notes                                        |
| :-------------- | :--------------- | :------------------------------------------- |
| **YouTube**     | ✅ Active        | Support for 1080p\*, 720p, 360p, MP3         |
| **Twitter / X** | ✅ Active (Beta) | Supports scraping public videos via OG tags. |
| **TikTok**      | 🚧 Planned       |                                              |
| **Facebook**    | 🚧 Planned       |                                              |

_\*Note: 1080p downloads on YouTube often lack audio in the raw stream. The backend currently filters for formats that contain BOTH video and audio, which typically maxes out at 720p. Audio-only downloads are supported._
