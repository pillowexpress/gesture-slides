# GestureSlides DEVLOG

This devlog captures the full build journey of the GestureSlides project.

## 2025-10-28 19:35 - Project kickoff (Phase 1)
- Completed:
  - Created project root directory `GestureSlides`.
  - Initialized TODO with phase breakdown and tasks.
- Issues:
  - Node.js is not installed/detected on this system, so Vite setup cannot proceed yet.
  - Logged plan to install Node.js LTS.
- Current State:
  - Repo directory exists; no app files yet.
  - TODO list created.
- Next Steps:
  - Install Node.js (LTS 20.x or 22.x). After install, reopen terminal.
  - Initialize Vite project (React) and set up folder structure.
  - Create /logs and seed log files.

## 2025-10-28 19:36 - Phase 1 structure & logs
- Completed:
  - Created folder structure: /logs, /public, /src (components, utils, slides), /server.
  - Seeded logs: build-log.txt, gesture-debug.txt, error-log.txt.
  - Created basic static server with logging endpoint to append to logs.
  - Added basic index.html and src/main.js to render Hello World.
- Issues:
  - Still blocked on missing Node.js for Vite dev server and dependency installation.
- Current State:
  - Can run simple Node server (once Node is installed) to serve static files and receive logging calls.
- Next Steps:
  - Install Node.js and run `npm install` to fetch dependencies.
  - Start dev server and verify Hello World.

- Additional:
  - Added placeholders for GestureDetector and SlideController, and a safe() error wrapper.

## 2025-10-28 19:37 - Phase 1 Hello World
- Completed:
  - Created static index.html and main.js, linked correctly for static server.
- Test Plan:
  - After installing Node, run `npm run server` and open http://localhost:5173 to see Hello World.
- Next Steps:
  - Install Node.js and npm, then `npm install` to fetch dependencies and proceed with Vite setup.

## 2025-10-28 19:45 - Phase 2 scaffolding
- Completed:
  - Implemented GestureDetector with MediaPipe Hands, preview canvas, landmark drawing, thresholding, FPS calc, and auto-restart after 3 failures.
  - Hooked into simple UI with Start button; DebugPanel shows hands count and FPS.
- Issues:
  - None pending; requires runtime test in browser with camera permissions.
- Current State:
  - Ready to run dev server and test webcam + landmarks.
- Next Steps:
  - Start server, allow camera, verify landmarks and logs update.

## 2025-10-28 19:49 - Phase 1 Test Hello World
- Completed:
  - Vite dev server and Node static server both running (5173, 5174). Vite proxies /__log to Node for log persistence.
  - Verified dev server response.
- Test Result:
  - PASS: "Hello World" visible via Vite server.
- Next Steps:
  - Proceed to in-browser test of camera/landmarks.

## 2025-10-28 19:55 - Phase 2 issue: bare specifier import loop
- Issue:
  - Browser logs showed repeated restarts due to failing dynamic import of @mediapipe/hands (bare specifier not mapped) when not using bundler or offline.
- Resolution:
  - Added CDN fallback loader for Hands and Camera Utils if bare imports fail.
  - Added guard `_importFailed` to stop auto-restart loop on import-related failures and surface UI hint.
- Current State:
  - Should work under Vite dev server (bundler) or through online CDN fallback. Prevents freeze by halting restart loop for import errors.
- Next Steps:
  - Retest camera with Vite dev server running; ensure network available for CDN fallback if needed.

## 2025-10-28 20:05 - Phase 3: Gesture recognition implemented
- Completed:
  - Implemented GestureEngine with swipe left/right, open palm hold (2s), fist hold (1s), thumbs up quick gesture, and 500ms debounce.
  - Visual feedback overlay for each detected gesture.
  - SlideController integrated with reveal.js: next/prev/start, notes toggle, and laser pointer mode stub that tracks index tip.
  - Wired GestureDetector → GestureEngine → SlideController.
- Tests (initial):
  - Console and gesture-debug logs fire on detections (to be validated interactively).
- Next Steps:
  - Fine-tune thresholds based on your live testing feedback.
  - Begin PHASE 4 testing: navigating slides purely with gestures.

## 2025-10-28 20:12 - Phase 4 issue: reveal.js bare specifier
- Issue:
  - Errors when importing reveal.js by bare specifier under non-bundled contexts.
- Resolution:
  - Added dynamic import fallback to CDN ESM build and injected CSS when bundler resolution fails.
- Current State:
  - SlideController.init should work via Vite or via CDN fallback.
- Next Steps:
  - Retest starting presentation and navigations with gestures.

## 2025-10-28 20:25 - Phase 3 tuning: gestures revised
- Feedback Issues:
  - Swipes often not detected; thumbs up misfiring when index pointing/fist; pointer could not be turned off.
- Changes:
  - Rewrote GestureEngine to track INDEX TIP for swipes with vertical constraint and relative thresholds (fraction of preview width), making swipes more reliable.
  - Added pinch_toggle gesture (thumb-index pinch hold 250ms) to toggle pointer mode on/off.
  - Tightened thumbs_up: requires thumb extended and oriented upwards; fingers curled check simplified to reduce false positives.
  - Open palm now requires low-motion condition during hold to avoid accidental triggers while moving.
  - Added UI button "Toggle Pointer" as a manual fallback.
- Next Steps:
  - Validate new swipe reliability and reduced thumbs up false positives.
  - If needed, add per-user calibration to scale thresholds based on initial reach.

## 2025-10-28 20:31 - Phase 3 tuning: remove thumbs up
- Feedback:
  - Thumbs up still causing conflicts with pointer/index pointing.
- Change:
  - Removed thumbs_up detection entirely; removed mapping in main.js and updated slide hint.
- Current State:
  - Swipe left/right, open palm (2s), pinch toggle pointer are the active gestures.
- Next Steps:
  - Validate that no accidental triggers occur while using the pointer.

## 2025-10-28 20:40 - Phase 3 tuning: palm swipes, confirm thumbs up removed
- Feedback:
  - Thumbs up still displayed; index-based swipes conflicted with pointer usage.
- Changes:
  - Fully removed thumbs_up from the engine and mappings; added comment in main.js.
  - Reimplemented swipes based on PALM center trajectory (wrist+MCP barycenter) with same timing/vertical constraints; this avoids index-finger conflicts with pointer.
- Current State:
  - Active gestures: swipe left/right (palm), open palm hold (2s, low motion), pinch toggle pointer.
- Next Steps:
  - Validate that swipe detection no longer interferes with pointer moving.

## 2025-10-28 20:48 - Phase 3 tuning: gate swipes when pointer active
- Issue:
  - Palm swipes were triggering while moving hand for the pointer.
- Change:
  - GestureEngine now gates swipe detection entirely when pointer is enabled, and (optionally) requires open palm for swipes.
  - main.js passes pointerEnabled to the engine each frame.
- Current State:
  - Pointer movement should no longer trigger swipes. Swipes require pointer OFF (and open palm if enabled).

## 2025-10-28 21:00 - Phase 6: Debug panel and gesture history
- Completed:
  - Expanded DebugPanel with pointer state and last 5 gesture history.
  - Engine maintains a rolling history; main wires history to panel.
- Next Steps:
  - Implement calibration screen and finalize documentation.

## 2025-10-29 10:30 - Phase 4: Slide content from Markdown
- Completed:
  - Added /public/slides/deck.md sample deck.
  - SlideController now fetches /slides/deck.md and renders it into Reveal after init.
  - Minimal Markdown→HTML converter (headings, lists, paragraphs, notes).
- Test Plan:
  - Start app, then Start Presentation; confirm deck.md loads and sections appear as slides.

## 2025-10-29 10:38 - Phase 4: PPT image slides support
- Completed:
  - Server route /api/slides returns whether deck.md is present and lists images in /public/slides/images.
  - SlideController loads either markdown deck.md or image slides.
  - Instructions added to header for placing content.
- Usage:
  - Option A: Put deck.md into /public/slides to load markdown slides.
  - Option B: Export PowerPoint as images and drop into /public/slides/images (named in order, e.g., 001.png, 002.png...).

## 2025-10-29 11:00 - Phase 4: PPTX upload & auto-convert
- Completed:
  - Added /api/upload/ppt to accept .pptx uploads via Busboy.
  - Conversion uses LibreOffice (soffice --headless --convert-to png) to generate images.
  - Images are placed into /public/slides/images and the deck auto-reloads.
  - UI form in header to upload PPTX directly.
- Notes:
  - Requires LibreOffice installed and available on PATH as `soffice`.
  - If unavailable, endpoint returns conversion failed message; consider future fallback (python-pptx + wand/ImageMagick).

## 2025-10-29 11:05 - Phase 4: Python-based PPTX conversion
- Completed:
  - Replaced LibreOffice dependency with Python converter.
  - Server runs scripts/convert_pptx_to_images.py to extract slide text to images (basic rendering) using python-pptx + Pillow.
  - Auto-installs Python requirements if available.
- Notes:
  - This produces readable images from slide text, but not full-fidelity rendering (no complex graphics/layout). For pixel-perfect conversion, a headless office engine or external service is normally required.
  - If you want me to integrate a free online service API, share the service, and I’ll wire it up; otherwise, this Python converter is local and offline-friendly.
