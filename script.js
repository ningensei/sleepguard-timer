// --- CONFIGURATION ---
const CONFIG = {
    TARGET_FREQUENCY: 2179,
    FREQ_TOLERANCE: 5,
    SENSITIVITY: 75,
    MIN_BEEP_DURATION: 50,
    MAX_PAUSE_BETWEEN_BEEPS: 400,
    START_BEEP_COUNT: 2,
    STOP_BEEP_COUNT: 5,
    COOLDOWN_PERIOD: 5000,
};

// --- DOM Elements ---
const startButton = document.getElementById('startButton');
const manualStartButton = document.getElementById('manualStartButton');
const statusDiv = document.getElementById('status');
const timerDiv = document.getElementById('timer');
const startTimeDisplay = document.getElementById('startTimeDisplay');
const endTimeDisplay = document.getElementById('endTimeDisplay');
const frequencyCanvas = document.getElementById('frequencyCanvas');
const canvasCtx = frequencyCanvas.getContext('2d');
const peakFreqDisplay = document.getElementById('peakFreqDisplay');
const peakVolDisplay = document.getElementById('peakVolDisplay');

// --- State Variables ---
let audioContext;
let analyser;
let source;
let isListening = false;
let beepCount = 0;
let beepResetTimeout;
let isBeeping = false;
let isPaused = false;

let timerInterval;
let startTime;

// --- Timer Functions ---
function startTimer() {
    if (timerInterval) return;
    
    const now = new Date();
    startTime = now.getTime();
    startTimeDisplay.textContent = now.toLocaleString();
    endTimeDisplay.textContent = "--"; // Reset end time

    timerInterval = setInterval(updateTimerDisplay, 1000);
    beepCount = 0;
    
    isPaused = true;
    statusDiv.textContent = '🟢 Timer started. Detection paused for 5s...';
    
    setTimeout(() => {
        isPaused = false;
        statusDiv.textContent = '🟢 Timer active. Listening for stop sequence...';
    }, CONFIG.COOLDOWN_PERIOD);
}

function stopTimer() {
    if (!timerInterval) return;
    clearInterval(timerInterval);
    timerInterval = null;

    const now = new Date();
    endTimeDisplay.textContent = now.toLocaleString();
    
    // --- FINAL ACTIONS ---
    isListening = false; // Stop the detection loop permanently
    beepCount = 0;
    
    statusDiv.textContent = '✅ Session Complete. Press "Start Listening" for a new session.';
    
    // Re-enable the start button for the next session
    startButton.disabled = false;
    startButton.textContent = 'Start Listening';
}

function updateTimerDisplay() {
    const elapsed = new Date(Date.now() - startTime);
    const hours = String(elapsed.getUTCHours()).padStart(2, '0');
    const minutes = String(elapsed.getUTCMinutes()).padStart(2, '0');
    const seconds = String(elapsed.getUTCSeconds()).padStart(2, '0');
    timerDiv.textContent = `${hours}:${minutes}:${seconds}`;
}

// --- Audio Detection and Visualization Logic ---
async function startListening() {
    if (isListening) return;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        
        isListening = true; // Enable listening
        startButton.disabled = true;
        startButton.textContent = 'Listening...';
        statusDiv.textContent = 'Microphone active, waiting for beep...';
        
        detectAndVisualizeBeep();
    } catch (err) {
        console.error('Error accessing the microphone:', err);
        statusDiv.textContent = 'Error: Could not access the microphone.';
    }
}

function detectAndVisualizeBeep() {
    // The loop will now naturally stop when isListening becomes false
    if (!isListening) {
        // Optional: Clear the visualizer when not listening
        canvasCtx.clearRect(0, 0, frequencyCanvas.width, frequencyCanvas.height);
        canvasCtx.fillStyle = 'rgb(0, 0, 0)';
        canvasCtx.fillRect(0, 0, frequencyCanvas.width, frequencyCanvas.height);
        return;
    }

    if (isPaused) {
        requestAnimationFrame(detectAndVisualizeBeep);
        return;
    }
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    canvasCtx.clearRect(0, 0, frequencyCanvas.width, frequencyCanvas.height);
    canvasCtx.fillStyle = 'rgb(0, 0, 0)';
    canvasCtx.fillRect(0, 0, frequencyCanvas.width, frequencyCanvas.height);

    const barWidth = (frequencyCanvas.width / bufferLength) * 2.5;
    let x = 0;
    let maxVal = 0;
    let maxIndex = 0;

    for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i];
        if (barHeight > maxVal) {
            maxVal = barHeight;
            maxIndex = i;
        }
        const hue = i / bufferLength * 360;
        canvasCtx.fillStyle = 'hsl(' + hue + ', 100%, 50%)';
        canvasCtx.fillRect(x, frequencyCanvas.height - (barHeight / 255 * frequencyCanvas.height), barWidth, barHeight / 255 * frequencyCanvas.height);
        x += barWidth + 1;
    }

    const peakFrequency = maxIndex * audioContext.sampleRate / analyser.fftSize;
    peakFreqDisplay.textContent = peakFrequency.toFixed(2);
    peakVolDisplay.textContent = maxVal;

    if (
        maxVal > CONFIG.SENSITIVITY &&
        peakFrequency > CONFIG.TARGET_FREQUENCY - CONFIG.FREQ_TOLERANCE &&
        peakFrequency < CONFIG.TARGET_FREQUENCY + CONFIG.FREQ_TOLERANCE
    ) {
        if (!isBeeping) {
            isBeeping = true;
            beepCount++;
            
            clearTimeout(beepResetTimeout);
            beepResetTimeout = setTimeout(() => { beepCount = 0; }, CONFIG.MAX_PAUSE_BETWEEN_BEEPS);
            
            if (beepCount >= 2) {
                let statusText = `Beep detected (${beepCount})`;
                
                if (!timerInterval) {
                    statusText += ` of ${CONFIG.START_BEEP_COUNT} to start.`;
                    if (beepCount === CONFIG.START_BEEP_COUNT) {
                        startTimer();
                    }
                } else {
                    statusText += ` of ${CONFIG.STOP_BEEP_COUNT} to stop.`;
                    if (beepCount >= CONFIG.STOP_BEEP_COUNT) {
                        stopTimer();
                    }
                }
                 statusDiv.textContent = statusText;
            }
        }
    } else {
        setTimeout(() => { isBeeping = false; }, CONFIG.MIN_BEEP_DURATION);
    }

    requestAnimationFrame(detectAndVisualizeBeep);
}

// --- Event Listeners ---
startButton.addEventListener('click', startListening);
manualStartButton.addEventListener('click', () => {
    if (!isPaused) {
        if (timerInterval) { stopTimer(); } else { startTimer(); }
    } else {
        console.log("Cannot manually operate timer during cooldown.");
    }
});