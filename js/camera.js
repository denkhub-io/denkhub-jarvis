/*
 * Webcam capture and the MediaPipe Hands pipeline. Draws the mirrored webcam
 * to the background canvas, overlays the hand skeleton, tracks FPS, and lets
 * the user pick a camera when more than one is available.
 */
const CameraModule = (() => {
  let videoElement = null;
  let cameraCanvas = null;
  let cameraCtx = null;
  let overlayCanvas = null;
  let overlayCtx = null;
  let mpHands = null;
  let mpCamera = null;
  let onResultsCallback = null;
  let fpsCounter = { frames: 0, lastTime: performance.now(), value: 0 };

  let coverDrawW = 0;
  let coverDrawH = 0;
  let coverOffsetX = 0;
  let coverOffsetY = 0;

  async function init(onResults) {
    onResultsCallback = onResults;

    cameraCanvas = document.getElementById('camera-canvas');
    cameraCtx = cameraCanvas.getContext('2d');
    overlayCanvas = document.getElementById('overlay-canvas');
    overlayCtx = overlayCanvas.getContext('2d');

    videoElement = document.createElement('video');
    videoElement.setAttribute('playsinline', '');
    videoElement.style.display = 'none';
    document.body.appendChild(videoElement);

    _resize();
    window.addEventListener('resize', _resize);

    const statusEl = document.getElementById('loading-status');
    if (statusEl) statusEl.textContent = 'Caricamento hand tracking...';

    mpHands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`
    });

    mpHands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.5
    });

    mpHands.onResults(_processResults);

    if (statusEl) statusEl.textContent = 'Accesso alla webcam...';

    // Start with MediaPipe Camera utility (proven stable)
    mpCamera = new Camera(videoElement, {
      onFrame: async () => {
        await mpHands.send({ image: videoElement });
      },
      width: 1280,
      height: 720
    });

    await mpCamera.start();

    // Build camera selector after we have permission
    _buildCameraSelector();

    if (statusEl) statusEl.textContent = 'Sistemi pronti.';
  }

  async function _buildCameraSelector() {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(d => d.kind === 'videoinput');

      if (videoDevices.length <= 1) return; // no point showing selector with 1 camera

      let selector = document.getElementById('camera-selector');
      if (!selector) {
        selector = document.createElement('select');
        selector.id = 'camera-selector';
        selector.title = 'Sorgente video';
        const taskbar = document.getElementById('taskbar');
        if (taskbar) taskbar.insertBefore(selector, taskbar.firstChild);
      }

      selector.innerHTML = '';
      for (let i = 0; i < videoDevices.length; i++) {
        const opt = document.createElement('option');
        opt.value = videoDevices[i].deviceId;
        opt.textContent = videoDevices[i].label || `Camera ${i + 1}`;
        selector.appendChild(opt);
      }

      selector.addEventListener('change', async () => {
        await switchCamera(selector.value);
      });
    } catch (e) {
      console.warn('Could not build camera selector:', e);
    }
  }

  async function switchCamera(deviceId) {
    try {
      // Stop current camera
      if (mpCamera) mpCamera.stop();

      // Get new stream with specific device
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
      });

      videoElement.srcObject = stream;
      await videoElement.play();

      // Restart MediaPipe Camera with new video
      mpCamera = new Camera(videoElement, {
        onFrame: async () => {
          await mpHands.send({ image: videoElement });
        },
        width: 1280,
        height: 720
      });

      await mpCamera.start();
    } catch (e) {
      console.error('Switch camera failed:', e);
    }
  }

  function _resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    cameraCanvas.width = w;
    cameraCanvas.height = h;
    overlayCanvas.width = w;
    overlayCanvas.height = h;
  }

  function _processResults(results) {
    fpsCounter.frames++;
    const now = performance.now();
    if (now - fpsCounter.lastTime >= 1000) {
      fpsCounter.value = fpsCounter.frames;
      fpsCounter.frames = 0;
      fpsCounter.lastTime = now;
    }

    const w = cameraCanvas.width;
    const h = cameraCanvas.height;

    const srcW = results.image.width || results.image.videoWidth || 1280;
    const srcH = results.image.height || results.image.videoHeight || 720;
    const srcAspect = srcW / srcH;
    const dstAspect = w / h;

    if (dstAspect > srcAspect) {
      coverDrawW = w;
      coverDrawH = w / srcAspect;
      coverOffsetX = 0;
      coverOffsetY = (h - coverDrawH) / 2;
    } else {
      coverDrawH = h;
      coverDrawW = h * srcAspect;
      coverOffsetX = (w - coverDrawW) / 2;
      coverOffsetY = 0;
    }

    cameraCtx.save();
    cameraCtx.translate(w, 0);
    cameraCtx.scale(-1, 1);
    cameraCtx.drawImage(results.image, coverOffsetX, coverOffsetY, coverDrawW, coverDrawH);
    cameraCtx.restore();

    overlayCtx.clearRect(0, 0, w, h);

    if (results.multiHandLandmarks) {
      for (const landmarks of results.multiHandLandmarks) {
        _drawHand(landmarks, w, h);
      }
    }

    if (onResultsCallback) {
      onResultsCallback(results, w, h);
    }
  }

  function _drawHand(landmarks, w, h) {
    overlayCtx.save();

    const connections = [
      [0,1],[1,2],[2,3],[3,4],
      [0,5],[5,6],[6,7],[7,8],
      [0,9],[9,10],[10,11],[11,12],
      [0,13],[13,14],[14,15],[15,16],
      [0,17],[17,18],[18,19],[19,20],
      [5,9],[9,13],[13,17]
    ];

    overlayCtx.strokeStyle = 'rgba(41, 151, 255, 0.35)';
    overlayCtx.lineWidth = 1.5;

    for (const [i, j] of connections) {
      const a = _lmToScreen(landmarks[i]);
      const b = _lmToScreen(landmarks[j]);
      overlayCtx.beginPath();
      overlayCtx.moveTo(a.x, a.y);
      overlayCtx.lineTo(b.x, b.y);
      overlayCtx.stroke();
    }

    for (let i = 0; i < landmarks.length; i++) {
      const pos = _lmToScreen(landmarks[i]);
      const radius = (i === 4 || i === 8) ? 5 : 2.5;
      overlayCtx.beginPath();
      overlayCtx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      overlayCtx.fillStyle = (i === 4 || i === 8)
        ? 'rgba(255, 159, 10, 0.9)' : 'rgba(41, 151, 255, 0.7)';
      overlayCtx.fill();
    }

    overlayCtx.restore();
  }

  function _lmToScreen(lm) {
    return {
      x: cameraCanvas.width - (coverOffsetX + lm.x * coverDrawW),
      y: coverOffsetY + lm.y * coverDrawH
    };
  }

  function getFPS() { return fpsCounter.value; }
  function getCoverTransform() {
    return { drawW: coverDrawW, drawH: coverDrawH, offsetX: coverOffsetX, offsetY: coverOffsetY };
  }

  return { init, getFPS, getCoverTransform, switchCamera };
})();
