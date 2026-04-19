import { AudioEngine } from './core/AudioEngine.js';
import { Visualizer } from './ui/Visualizer.js';
import { Calculator } from './utils/Calculator.js';

/**
 * Main Application Controller
 * Integrates all components and handles user interactions
 */
class App {
    constructor() {
        this.audio = new AudioEngine();
        this.visualizer = null;
        this.isAutoMode = false;
        this.isLoading = false;
        this.initListeners();
        this.updateInfo();
        this.bindAudioEvents();
    }

    /**
     * Bind audio engine events
     */
    bindAudioEvents() {
        // Handle playback completion
        this.audio.setOnEnd(() => {
            if (this.visualizer) {
                this.visualizer.stopAnimation();
                this.visualizer.drawStatic();
            }
        });

        // Handle audio processing updates
        this.audio.on('process', () => {
            if (this.visualizer && this.isAutoMode) {
                this.visualizer.draw();
            }
        });
    }

    /**
     * Initialize all event listeners
     */
    initListeners() {
        const fftSelect = document.getElementById('fftSize');
        const fileInput = document.getElementById('fileInput');
        const btnLoad = document.getElementById('btnLoad');
        const btnStep = document.getElementById('btnStep');
        const btnAuto = document.getElementById('btnAuto');
        const btnPause = document.getElementById('btnPause');
        const autoDelayInput = document.getElementById('autoDelay');

        // Update info when FFT size changes
        fftSelect.addEventListener('change', () => {
            this.updateInfo();
            // If in auto mode, update the playback settings
            if (this.isAutoMode && this.audio.buffer) {
                const fftSize = parseInt(fftSelect.value);
                const delay = parseFloat(autoDelayInput.value) * 1000;
                this.audio.setAutoPlay(true, delay, fftSize, () => {
                    if (this.visualizer) {
                        this.visualizer.draw();
                    }
                });
            }
        });

        // Trigger file input when load button is clicked
        btnLoad.addEventListener('click', () => {
            console.log('=== Load Audio button clicked ===');
            console.log('isLoading:', this.isLoading);
            console.log('fileInput element:', fileInput);
            console.log('fileInput disabled:', fileInput.disabled);
            
            if (!this.isLoading) {
                console.log('Triggering fileInput.click()...');
                fileInput.click();
            } else {
                console.log('Cannot click - currently loading');
            }
        });

        // Handle file selection
        fileInput.addEventListener('change', async (e) => {
            console.log('=== File input change event ===');
            const file = e.target.files[0];
            console.log('Selected file:', file);
            
            if (file) {
                try {
                    this.isLoading = true;
                    console.log('Loading file:', file.name, 'size:', file.size);
                    
                    // Clear previous visualization
                    if (this.visualizer) {
                        this.visualizer.clear();
                    }
                    
                    const arrayBuffer = await file.arrayBuffer();
                    console.log('File converted to ArrayBuffer, size:', arrayBuffer.byteLength);
                    
                    await this.audio.loadBuffer(arrayBuffer);
                    console.log('Audio buffer loaded successfully');
                    
                    // Initialize visualizer with new audio data
                    this.visualizer = new Visualizer('visualizer', this.audio.analyser);
                    this.visualizer.resize();
                    this.updateInfo();
                    
                    // Reset UI states
                    this.isAutoMode = false;
                    btnAuto.textContent = "Start Auto";
                    
                    // Reset file input to allow selecting the same file again
                    fileInput.value = '';
                    console.log('File loading complete');
                    
                } catch (error) {
                    console.error('Error loading audio file:', error);
                    alert('Failed to load audio file. Please try again.');
                } finally {
                    this.isLoading = false;
                }
            } else {
                console.log('No file selected');
            }
        });

        // Single step playback
        btnStep.addEventListener('click', () => {
            if (!this.audio.buffer) return;
            this.isAutoMode = false;
            this.audio.pause(); // Reset auto timers
            const fftSize = parseInt(fftSelect.value);
            const duration = this.audio.playSegment(fftSize, this.audio.currentTimeIndex);
            if (this.visualizer) {
                this.visualizer.draw();
            }
        });

        // Toggle automatic playback mode
        btnAuto.addEventListener('click', () => {
            if (!this.audio.buffer) return;
            this.isAutoMode = !this.isAutoMode;
            const fftSize = parseInt(fftSelect.value);
            const delay = parseFloat(autoDelayInput.value) * 1000;
            
            this.audio.setAutoPlay(this.isAutoMode, delay, fftSize, () => {
                // Callback when segment starts
                if (this.visualizer) {
                    this.visualizer.draw();
                }
            });
            
            if (this.isAutoMode && !this.audio.isPlaying) {
                const duration = this.audio.playSegment(fftSize, this.audio.currentTimeIndex);
            }
            btnAuto.textContent = this.isAutoMode ? "Stop Auto" : "Start Auto";
        });

        // Pause playback
        btnPause.addEventListener('click', () => {
            this.audio.pause();
            if (this.visualizer) {
                this.visualizer.stopAnimation();
                this.visualizer.drawStatic(); // Maintain last frame
            }
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            if (this.visualizer) this.visualizer.resize();
        });
    }

    /**
     * Update FFT duration and FPS display information
     */
    updateInfo() {
        const fftSize = parseInt(document.getElementById('fftSize').value);
        const duration = Calculator.calculateDuration(fftSize);
        const fps = Calculator.calculateFPS(fftSize);
        
        document.getElementById('durationDisplay').textContent = duration.toFixed(2);
        document.getElementById('fpsDisplay').textContent = fps.toFixed(2);
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new App();
});