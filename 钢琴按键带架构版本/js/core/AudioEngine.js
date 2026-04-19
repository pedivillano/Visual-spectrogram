export class AudioEngine {
    constructor() {
        this.ctx = null;
        this.buffer = null;
        this.source = null;
        this.analyser = null;
        this.gainNode = null;
        this.currentTimeIndex = 0; // Sample index
        this.isPlaying = false;
        this.isAuto = false;
        this.autoDelay = 1000; // ms
        this.autoTimer = null;
        this.onEndCallback = null;
        
        // Initialize audio context safely
        this.initAudioContext();
    }
    
    /**
     * Initialize audio context with user gesture requirement handling
     */
    initAudioContext() {
        // Create or resume audio context
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create audio nodes
        this.analyser = this.ctx.createAnalyser();
        this.gainNode = this.ctx.createGain();
        
        // Connect nodes: analyser -> gain -> destination
        this.analyser.connect(this.gainNode);
        this.gainNode.connect(this.ctx.destination);
        
        // Set default analyzer settings
        this.analyser.fftSize = 2048;
        this.analyser.smoothingTimeConstant = 0.8;
        
        // Resume context if it's in suspended state (browser requirement)
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    /**
     * Load and decode audio file into buffer
     * @param {ArrayBuffer} arrayBuffer - Audio file data
     * @returns {Promise<void>}
     */
    async loadBuffer(arrayBuffer) {
        if (!arrayBuffer) {
            throw new Error('No audio data provided');
        }
        
        try {
            this.buffer = await this.ctx.decodeAudioData(arrayBuffer);
            console.log(`Audio loaded: ${this.buffer.duration.toFixed(2)}s, ${this.buffer.sampleRate}Hz`);
        } catch (error) {
            console.error('Failed to decode audio data:', error);
            throw error;
        }
    }

    /**
     * Play a specific segment of audio corresponding to FFT size
     * @param {number} fftSize - FFT size for segment length
     * @param {number} offsetSamples - Starting sample position
     * @returns {number|undefined} Duration in milliseconds, undefined if failed
     */
    playSegment(fftSize, offsetSamples) {
        if (!this.buffer) {
            console.warn('No audio buffer loaded');
            return;
        }

        const sampleRate = this.buffer.sampleRate;
        const duration = fftSize / sampleRate;
        
        // Validate input parameters
        if (offsetSamples < 0 || offsetSamples >= this.buffer.length) {
            console.warn(`Invalid offset: ${offsetSamples}, buffer length: ${this.buffer.length}`);
            return;
        }
        
        // Calculate actual segment duration based on available samples
        const remainingSamples = this.buffer.length - offsetSamples;
        const playDuration = Math.min(duration, remainingSamples / sampleRate);
        
        // Clean up previous source if exists
        if (this.source) {
            try { 
                this.source.stop(); 
                this.source.disconnect();
            } catch (e) {}
        }

        // Create new source node
        this.source = this.ctx.createBufferSource();
        this.source.buffer = this.buffer;
        
        // Connect to processing graph
        this.source.connect(this.analyser);
        
        // Play specific segment
        try {
            this.source.start(0, offsetSamples / sampleRate, playDuration);
            
            // Update current time index
            this.currentTimeIndex = Math.min(
                offsetSamples + Math.round(playDuration * sampleRate),
                this.buffer.length
            );
            
            // Reset to beginning if we've reached the end
            if (this.currentTimeIndex >= this.buffer.length) {
                this.currentTimeIndex = 0;
                if (this.onEndCallback) {
                    this.onEndCallback();
                }
            }

            this.isPlaying = true;
            return playDuration * 1000; // Return duration in ms
        } catch (error) {
            if (error.name !== 'InvalidStateError') { // Ignore aborted errors
                console.error('Error playing audio segment:', error);
            }
            return;
        }
    }

    /**
     * Pause playback and clear auto timers
     */
    pause() {
        if (this.source) {
            try { 
                this.source.stop(); 
                this.source.disconnect();
            } catch (e) {}
            this.source = null;
        }
        this.isPlaying = false;
        
        if (this.autoTimer) {
            clearTimeout(this.autoTimer);
            this.autoTimer = null;
        }
    }
    
    /**
     * Stop playback completely and reset position
     */
    stop() {
        this.pause();
        this.currentTimeIndex = 0;
    }
    
    /**
     * Set volume level
     * @param {number} value - Volume level (0-1)
     */
    setVolume(value) {
        const clampedValue = Math.max(0, Math.min(1, value));
        if (this.gainNode) {
            this.gainNode.gain.setValueAtTime(clampedValue, this.ctx.currentTime);
        }
    }

    /**
     * Get current playback progress as percentage
     * @returns {number} Progress percentage (0-100)
     */
    getProgress() {
        if (!this.buffer) return 0;
        return (this.currentTimeIndex / this.buffer.length) * 100;
    }
    
    /**
     * Seek to specific time position in seconds
     * @param {number} timeInSeconds - Time position to seek to
     */
    seek(timeInSeconds) {
        if (!this.buffer) return;
        
        const sampleRate = this.buffer.sampleRate;
        const samplePosition = Math.floor(timeInSeconds * sampleRate);
        this.currentTimeIndex = Math.max(0, Math.min(samplePosition, this.buffer.length - 1));
    }

    /**
     * Configure auto-play mode
     * @param {boolean} enabled - Enable/disable auto-play
     * @param {number} delayMs - Delay between segments in milliseconds
     * @param {number} fftSize - FFT size for scheduling
     * @param {Function} callback - Callback when segment starts
     */
    setAutoPlay(enabled, delayMs, fftSize, callback) {
        this.isAuto = enabled;
        this.autoDelay = delayMs;
        
        if (!enabled && this.autoTimer) {
            clearTimeout(this.autoTimer);
            this.autoTimer = null;
        } else if (enabled && !this.isPlaying) {
            // Trigger next step if not currently playing
            this.scheduleNext(fftSize, callback);
        }
    }

    /**
     * Schedule next segment playback in auto mode
     * @param {number} fftSize - FFT size
     * @param {Function} callback - Callback function
     */
    scheduleNext(fftSize, callback) {
        if (!this.isAuto) return;
        
        this.autoTimer = setTimeout(() => {
            if (this.isAuto) {
                const duration = this.playSegment(fftSize, this.currentTimeIndex);
                
                // Only schedule next if playback was successful
                if (duration && this.currentTimeIndex > 0) {
                    // Schedule next after play duration + delay
                    this.scheduleNext(fftSize, callback); 
                } else {
                    // Stop auto-play if we reached the end
                    this.isAuto = false;
                }
            }
        }, this.autoDelay);
        
        if (callback) callback();
    }
    
    /**
     * Set callback function for when playback reaches end
     * @param {Function} callback - Function to call when playback ends
     */
    setOnEnd(callback) {
        this.onEndCallback = callback;
    }
    
    /**
     * Close audio context and release resources
     */
    dispose() {
        this.pause();
        
        if (this.ctx && this.ctx.state !== 'closed') {
            this.ctx.close();
        }
        
        this.buffer = null;
        this.source = null;
        this.analyser = null;
        this.gainNode = null;
    }
}