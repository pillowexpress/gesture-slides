A gesture-controlled presentation app that lets you navigate slides using hand gestures detected via webcam. Built with MediaPipe Hands, Reveal.js, and Vite.

## Features

- **Gesture Navigation**: Control presentations with natural hand movements
  - Swipe right: Next slide
  - Swipe left: Previous slide
  - Open palm (hold 2s): Toggle speaker notes
  - Pinch (hold 250ms): Toggle laser pointer mode
- **Multiple Slide Formats**: 
  - Markdown files (deck.md)
  - Image-based slides (PNG/JPG)
  - PowerPoint upload with auto-conversion
- **Real-time Hand Tracking**: MediaPipe Hands integration with visual feedback
- **Debug Panel**: Press 'D' to view gesture history, FPS, and detection metrics
- **Laser Pointer Mode**: Point with your index finger when enabled

## Requirements

### Node.js
- Node.js 20.x or 22.x LTS
- npm (comes with Node.js)

### Python (for PowerPoint conversion)
- Python 3.7+
- pip

## Installation

1. Clone the repository:
```

git clone git@github.com:KutashiMA/GestureSlides.git
cd GestureSlides

```

2. Install Node.js dependencies:
```

npm install

```

3. Install Python dependencies (for PPTX conversion):
```

pip install -r scripts/requirements.txt

```

## Running the App

### Development Mode (Recommended)

Run both the Vite dev server and Node backend:
```

npm run devall

```

This starts:
- Vite dev server on `http://localhost:5173`
- Node logging server on `http://localhost:5174`

Open `http://localhost:5173` in your browser.

### Alternative: Run Separately

Terminal 1 - Backend server:
```

npm run server

```

Terminal 2 - Vite dev server:
```

npm run dev

```

### Production Build

```

npm run build
npm run preview

```

## Usage

### Starting a Presentation

1. Click **"Start Presentation & Camera"**
2. Allow webcam access when prompted
3. Show your hand to the camera
4. Use gestures to control slides

### Loading Slide Content

**Option A: Markdown**
- Place your markdown file as `public/slides/deck.md`
- Slides are separated by `---`

**Option B: Images**
- Export slides as images (PNG/JPG)
- Place in `public/slides/images/` named sequentially: `01.png`, `02.png`, etc.

**Option C: PowerPoint Upload**
- Click "Upload PPTX" in the header
- Select your `.pptx` file
- Automatic conversion to images (requires Python dependencies)

### Gesture Controls

- **Swipe Right** (palm motion): Navigate to next slide
- **Swipe Left** (palm motion): Navigate to previous slide
- **Open Palm Hold (2s)**: Toggle speaker notes panel
- **Pinch Hold (250ms)**: Toggle laser pointer on/off
- **Move Index Finger**: Control pointer position (when pointer mode is on)

### Debug Tools

- Press **'D'** on keyboard: Toggle debug panel
- Shows: Gesture history, hand detection confidence, FPS, pointer state

## Project Structure

```

GestureSlides/
├── public/
│   └── slides/
│       ├── deck.md              \# Markdown slide deck
│       └── images/              \# Image-based slides
├── scripts/
│   ├── convert_pptx_to_images.py  \# PPTX converter
│   └── requirements.txt         \# Python dependencies
├── server/
│   ├── index.js                 \# Main server
│   ├── logger.js                \# Log handling
│   ├── slides.js                \# Slide content routes
│   └── upload.js                \# PPTX upload handler
├── src/
│   ├── components/
│   │   ├── DebugPanel.js       \# Debug UI
│   │   ├── GestureDetector.js  \# MediaPipe integration
│   │   └── SlideController.js  \# Reveal.js wrapper
│   ├── utils/
│   │   ├── gestureEngine.js    \# Gesture recognition logic
│   │   ├── logger.js           \# Client-side logging
│   │   └── safe.js             \# Error wrapper
│   └── main.js                 \# Entry point
├── logs/                        \# Runtime logs (auto-created)
├── uploads/                     \# Uploaded PPTX temp storage
├── index.html
├── package.json
├── vite.config.js
└── README.md

```

## Troubleshooting

### Camera Not Working
- Ensure browser has camera permissions
- Use HTTPS or localhost (required for webcam access)
- Check browser console for errors

### Gestures Not Detecting
- Ensure adequate lighting
- Keep hand within camera frame
- Check debug panel (press 'D') for hand detection status
- Adjust `confidenceThreshold` in `src/main.js` if needed

### PPTX Conversion Fails
- Verify Python and pip are installed: `python --version` and `pip --version`
- Install dependencies: `pip install -r scripts/requirements.txt`
- Check `logs/error-log.txt` for detailed errors

### Module Import Errors
- Run the app through Vite dev server (`npm run dev` or `npm run devall`)
- Ensure internet connection for CDN fallback
- Check browser console for specific module errors

## Dependencies

### Node.js Packages
- `vite` - Dev server and build tool
- `reveal.js` - Presentation framework
- `@mediapipe/hands` - Hand tracking
- `@mediapipe/camera_utils` - Camera utilities
- `busboy` - File upload handling
- `concurrently` - Run multiple commands

### Python Packages
- `python-pptx` - PowerPoint file parsing
- `Pillow` - Image processing

## Browser Support

- Chrome 90+ (recommended)
- Edge 90+
- Firefox 88+
- Safari 14+

Requires WebRTC and WebGL support for camera and MediaPipe.

## Performance Tips

- Close unnecessary browser tabs
- Use adequate lighting for better hand detection
- Reduce `maxNumHands` in `GestureDetector` if experiencing lag

## Development

Built with Goose and documented in `DEVLOG.md`. See the devlog for complete build journey and implementation details.

## License

MIT

## Credits

- MediaPipe Hands by Google
- Reveal.js presentation framework
- Built during October 2025
