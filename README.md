# SleepGuard Timer 🌙

A web-based tool that uses the microphone to automatically start and stop a timer by detecting the specific audio cues of a SleepGuard bruxism device.

![SleepGuard Timer Interface](httpsd://i.imgur.com/your-screenshot-url.png) 
*Note: You should take a screenshot of your app and replace the URL above.*

---

## ## What It Does

This application solves a specific problem for users of the SleepGuard bruxism device: the inability to measure the device's active time. The device tracks the number of clenches but doesn't provide a duration, making it difficult to calculate metrics like "clenches per hour" to track treatment progress.

This tool listens for the distinct sound patterns the SleepGuard emits:
* **Two beeps** to signify it has turned on.
* **A series of beeps** to signify it has turned off.

Upon detecting these patterns, the app automatically starts or stops a high-precision timer, recording the exact start and end times of the session.

---

## ## How It Works

The entire application runs in the browser using standard web technologies, with no server-side processing required.

* **Microphone Access:** It uses the `navigator.mediaDevices.getUserMedia()` API to request access to the user's microphone.
* **Real-time Audio Analysis:** The core of the project is the **Web Audio API**. A `AnalyserNode` processes the microphone input in real-time, performing a Fast Fourier Transform (FFT) to break the audio down into its constituent frequencies.
* **Pattern Recognition:** A JavaScript loop constantly checks the frequency data. It looks for a power spike at a specific target frequency. A state machine counts consecutive beeps within a given time window to differentiate between the "start" and "stop" signals.
* **Cooldown Period:** To prevent the long stop signal from accidentally re-triggering the timer, a 5-second "cooldown" period is initiated after any successful start or stop action, during which audio detection is paused.

---

## ## How to Use

1.  Host the `index.html` and `script.js` files on a web server that supports **HTTPS** (this is required for microphone access in modern browsers).
2.  Open the page in a mobile browser.
3.  Click **"Start Listening"**. Your browser will ask for permission to use the microphone.
4.  Place your phone near your SleepGuard device before you go to sleep.
5.  When the device turns on, the app will detect the beeps and start the timer. When the device turns off, the app will detect the final beeps, stop the timer, and display the total duration and timestamps.
6.  The session is then complete. To start a new session (e.g., the next night), simply press "Start Listening" again.

---

## ## Configuration & Calibration

All key detection parameters are located in the `CONFIG` object at the top of `script.js`. You will need to calibrate these for your specific device and environment.

```javascript
const CONFIG = {
    TARGET_FREQUENCY: 2179, // The exact frequency (in Hz) of the device's beep.
    FREQ_TOLERANCE: 5,      // The margin of error for the frequency detection.
    SENSITIVITY: 75,        // The volume threshold (0-255) a sound must exceed.
    START_BEEP_COUNT: 2,    // Number of beeps to start the timer.
    STOP_BEEP_COUNT: 5,     // Number of beeps to stop the timer.
    COOLDOWN_PERIOD: 5000,  // Cooldown in milliseconds after a successful action.
};