const homeScreen = document.getElementById('homeScreen');
const configScreen = document.getElementById('configScreen');
const cameraScreen = document.getElementById('cameraScreen');
const reviewScreen = document.getElementById('reviewScreen');
const downloadModal = document.getElementById('downloadModal');
const toast = document.getElementById('toast');

const webcam = document.getElementById('webcam');
const cameraCanvas = document.getElementById('cameraCanvas');
const camCtx = cameraCanvas.getContext('2d');
const reviewCanvas = document.getElementById('reviewCanvas');
const reviewCtx = reviewCanvas.getContext('2d');

const btnOpenReverse = document.getElementById('btnOpenReverse');
const btnOpenShadowClone = document.getElementById('btnOpenShadowClone');
const btnBackFromConfig = document.getElementById('btnBackFromConfig');
const btnLaunchCloneCam = document.getElementById('btnLaunchCloneCam');
const cloneTimeSelect = document.getElementById('cloneTimeSelect');
const cloneCountSelect = document.getElementById('cloneCountSelect');

const btnCloseCamera = document.getElementById('btnCloseCamera');
const btnFlipCamera = document.getElementById('btnFlipCamera');
const btnToggleFit = document.getElementById('btnToggleFit');
const btnShutter = document.getElementById('btnShutter');
const btnPauseRec = document.getElementById('btnPauseRec');
const pauseIcon = document.getElementById('pauseIcon');
const playIcon = document.getElementById('playIcon');
const recBadge = document.getElementById('recBadge');
const recTimer = document.getElementById('recTimer');

const btnBackToCam = document.getElementById('btnBackToCam');
const btnOpenDownload = document.getElementById('btnOpenDownload');
const btnCloseModal = document.getElementById('btnCloseModal');
const btnExportVideo = document.getElementById('btnExportVideo');
const btnAddMusic = document.getElementById('btnAddMusic');

let currentMode = 'reverse'; // 'reverse' | 'shadow'
let cloneTimeSeconds = 3;
let cloneCount = 3;

let mediaStream = null;
let mediaRecorder = null;
let rawChunks = [];
let originalBlob = null;
let leftCloneSnapshot = null;
let rightCloneSnapshot = null;

let recordedFrames = [];
let captureInterval = null;
let animationFrameId = null;
let isRecording = false;
let isPaused = false;
let currentFacingMode = 'environment';

let startTime = 0;
let accumulatedSeconds = 0;
let timerInterval = null;

// Particle Smoke System for Shadow Clone Animation
let particles = [];
function createSmokeParticles(cw, ch) {
    particles = [];
    for (let i = 0; i < 40; i++) {
        particles.push({
            x: cw / 2 + (Math.random() - 0.5) * 200,
            y: ch / 2 + (Math.random() - 0.5) * 200,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            radius: Math.random() * 30 + 20,
            alpha: 1
        });
    }
}

function updateAndDrawParticles(ctx, cw, ch) {
    particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.025;
        if (p.alpha > 0) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.alpha);
            ctx.fillStyle = '#cbd5e1';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    });
}

function showScreen(screen) {
    homeScreen.classList.add('hidden');
    configScreen.classList.add('hidden');
    cameraScreen.classList.add('hidden');
    reviewScreen.classList.add('hidden');
    screen.classList.remove('hidden');
}

function showToast(text) {
    toast.innerText = text;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2200);
}

async function initCamera() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(t => t.stop());
    }
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { 
                width: { ideal: 1280 }, 
                height: { ideal: 720 }, 
                frameRate: { ideal: 30, max: 60 },
                facingMode: currentFacingMode 
            },
            audio: false
        });
        webcam.srcObject = mediaStream;
        return true;
    } catch (err) {
        alert('Camera access error: ' + err.message);
        return false;
    }
}

btnOpenReverse.addEventListener('click', async () => {
    currentMode = 'reverse';
    const ok = await initCamera();
    if (ok) showScreen(cameraScreen);
});

btnOpenShadowClone.addEventListener('click', () => {
    currentMode = 'shadow';
    showScreen(configScreen);
});

btnBackFromConfig.addEventListener('click', () => {
    showScreen(homeScreen);
});

btnLaunchCloneCam.addEventListener('click', async () => {
    cloneTimeSeconds = parseInt(cloneTimeSelect.value, 10);
    cloneCount = parseInt(cloneCountSelect.value, 10);
    const ok = await initCamera();
    if (ok) showScreen(cameraScreen);
});

btnCloseCamera.addEventListener('click', () => {
    if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
    showScreen(homeScreen);
});

btnFlipCamera.addEventListener('click', async () => {
    currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    await initCamera();
});

btnToggleFit.addEventListener('click', () => {
    webcam.classList.toggle('fit-screen');
});

btnShutter.addEventListener('click', () => {
    if (!isRecording) {
        startRecording();
    } else {
        stopRecording();
    }
});

btnPauseRec.addEventListener('click', () => {
    if (!isRecording) return;
    if (!isPaused) {
        pauseRecording();
    } else {
        resumeRecording();
    }
});

function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(() => {
        const elapsed = accumulatedSeconds + Math.floor((Date.now() - startTime) / 1000);
        const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const s = String(elapsed % 60).padStart(2, '0');
        recTimer.innerText = `REC ${m}:${s}`;
    }, 1000);
}


function startRecording() {
    isRecording = true;
    isPaused = false;
    accumulatedSeconds = 0;

    btnShutter.classList.add('recording');
    recBadge.classList.remove('hidden', 'paused');
    btnPauseRec.classList.remove('hidden');
    pauseIcon.classList.remove('hidden');
    playIcon.classList.add('hidden');

    recordedFrames.forEach(f => f.close && f.close());
    recordedFrames = [];
    rawChunks = [];
    particles = [];

    startTimer();
    startFrameCapture();
}

function startFrameCapture() {
    captureInterval = setInterval(async () => {
        if (!isRecording || isPaused) return;
        if (webcam.readyState >= 2) {
            try {
                const w = webcam.videoWidth || 1280;
                const h = webcam.videoHeight || 720;

                cameraCanvas.width = w;
                cameraCanvas.height = h;

                const elapsed = accumulatedSeconds + ((Date.now() - startTime) / 1000);

                if (currentMode === 'shadow' && elapsed >= cloneTimeSeconds) {
                    if (particles.length === 0 && Math.abs(elapsed - cloneTimeSeconds) < 0.2) {
                        createSmokeParticles(w, h);
                    }

                    camCtx.clearRect(0, 0, w, h);

                    if (cloneCount >= 3) {
                        const colW = w / 3;

                        // 1. Left Separate Column (Solid Live Motion)
                        camCtx.save();
                        camCtx.beginPath();
                        camCtx.rect(0, 0, colW, h);
                        camCtx.clip();
                        camCtx.drawImage(webcam, -colW, 0, w, h);
                        camCtx.restore();

                        // 2. Center Separate Column (Solid Live Motion)
                        camCtx.save();
                        camCtx.beginPath();
                        camCtx.rect(colW, 0, colW, h);
                        camCtx.clip();
                        camCtx.drawImage(webcam, 0, 0, w, h);
                        camCtx.restore();

                        // 3. Right Separate Column (Solid Live Motion)
                        camCtx.save();
                        camCtx.beginPath();
                        camCtx.rect(colW * 2, 0, colW, h);
                        camCtx.clip();
                        camCtx.drawImage(webcam, colW, 0, w, h);
                        camCtx.restore();
                    } else {
                        const colW = w / 2;

                        // 1. Left Column (2 Clones Mode)
                        camCtx.save();
                        camCtx.beginPath();
                        camCtx.rect(0, 0, colW, h);
                        camCtx.clip();
                        camCtx.drawImage(webcam, -colW / 2, 0, w, h);
                        camCtx.restore();

                        // 2. Right Column (2 Clones Mode)
                        camCtx.save();
                        camCtx.beginPath();
                        camCtx.rect(colW, 0, colW, h);
                        camCtx.clip();
                        camCtx.drawImage(webcam, colW / 2, 0, w, h);
                        camCtx.restore();
                    }

                    // Render Smoke Burst Animation on top
                    updateAndDrawParticles(camCtx, w, h);

                    const bitmap = await createImageBitmap(cameraCanvas);
                    recordedFrames.push(bitmap);
                } else {
                    // Standard frame capture before clone activation
                    camCtx.drawImage(webcam, 0, 0, w, h);
                    const bitmap = await createImageBitmap(cameraCanvas);
                    recordedFrames.push(bitmap);
                }
            } catch (e) {
                console.error(e);
            }
        }
    }, 1000 / 30);
}

function pauseRecording() {
    isPaused = true;
    clearInterval(captureInterval);
    clearInterval(timerInterval);
    accumulatedSeconds += (Date.now() - startTime) / 1000;

    recBadge.classList.add('paused');
    pauseIcon.classList.add('hidden');
    playIcon.classList.remove('hidden');
}

function resumeRecording() {
    isPaused = false;
    startTime = Date.now();
    recBadge.classList.remove('paused');
    pauseIcon.classList.remove('hidden');
    playIcon.classList.add('hidden');

    startTimer();
    startFrameCapture();
}

async function stopRecording() {
    isRecording = false;
    isPaused = false;

    btnShutter.classList.remove('recording');
    recBadge.classList.add('hidden');
    btnPauseRec.classList.add('hidden');
    
    clearInterval(captureInterval);
    clearInterval(timerInterval);

    await new Promise(r => setTimeout(r, 100));

    if (recordedFrames.length === 0) return;

    if (currentMode === 'reverse') {
        recordedFrames.reverse();
    }

    reviewCanvas.width = recordedFrames[0].width;
    reviewCanvas.height = recordedFrames[0].height;

    showScreen(reviewScreen);
    startReviewPlayback();
}

let frameIdx = 0;
let lastTs = 0;

function startReviewPlayback() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    frameIdx = 0;
    lastTs = 0;

    function loop(ts) {
        animationFrameId = requestAnimationFrame(loop);
        if (ts - lastTs > (1000 / 30)) {
            lastTs = ts;
            if (recordedFrames.length > 0) {
                reviewCtx.drawImage(recordedFrames[frameIdx], 0, 0, reviewCanvas.width, reviewCanvas.height);
                frameIdx = (frameIdx + 1) % recordedFrames.length;
            }
        }
    }
    animationFrameId = requestAnimationFrame(loop);
}

btnBackToCam.addEventListener('click', () => {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    showScreen(cameraScreen);
});

btnAddMusic.addEventListener('click', () => {
    showToast('🎵 Add Music feature coming soon!');
});

btnOpenDownload.addEventListener('click', () => downloadModal.classList.add('active'));
btnCloseModal.addEventListener('click', () => downloadModal.classList.remove('active'));

// Export Processed HD WebM Video
btnExportVideo.addEventListener('click', async () => {
    if (recordedFrames.length === 0) return;

    showToast('Exporting HD Video...');
    
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    const stream = reviewCanvas.captureStream(0);
    const track = stream.getVideoTracks()[0];

    let mimeType = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8') ? 'video/webm;codecs=vp8' : 'video/webm';
    }

    const recorder = new MediaRecorder(stream, { 
        mimeType: mimeType,
        videoBitsPerSecond: 8000000 
    });
    const chunks = [];
    
    recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        triggerDownload(blob, `${currentMode}-hd-video.webm`);
        downloadModal.classList.remove('active');
        startReviewPlayback();
    };

    reviewCtx.drawImage(recordedFrames[0], 0, 0, reviewCanvas.width, reviewCanvas.height);
    if (track && track.requestFrame) track.requestFrame();

    recorder.start();
    await new Promise(r => setTimeout(r, 150));

    for (let idx = 0; idx < recordedFrames.length; idx++) {
        reviewCtx.drawImage(recordedFrames[idx], 0, 0, reviewCanvas.width, reviewCanvas.height);
        if (track && track.requestFrame) track.requestFrame();
        await new Promise(r => setTimeout(r, 1000 / 30));
    }

    if (recorder.state === 'recording') {
        recorder.requestData();
        await new Promise(r => setTimeout(r, 300));
        recorder.stop();
    }
});

function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
