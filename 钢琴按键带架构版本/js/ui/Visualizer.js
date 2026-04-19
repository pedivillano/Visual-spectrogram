export class Visualizer {
    constructor(canvasId, analyser) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.analyser = analyser;
        this.bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);
        this.animationId = null;
        this.lastFrameData = null;
        
        // Initialize canvas size
        this.resize();
    }

    /**
     * Resize canvas to match display size
     */
    resize() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }

    /**
     * Start real-time visualization animation
     */
    draw() {
        // Clear previous animation to avoid memory leaks
        this.stopAnimation();
        
        // Start new animation loop
        this.animate();
    }
    
    /**
     * Animation loop for real-time visualization
     */
    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        
        // Get frequency data from analyzer
        this.analyser.getByteFrequencyData(this.dataArray);

        // Save current frame data for pause state
        this.lastFrameData = new Uint8Array(this.dataArray);

        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Calculate bar dimensions
        const barWidth = (this.canvas.width / this.bufferLength) * 2.5;
        let x = 0;

        // Draw frequency bars
        for (let i = 0; i < this.bufferLength; i++) {
            const barHeight = this.dataArray[i] * 0.7; // Adjust scaling factor
            // Create dynamic color based on height
            const hue = Math.max(0, 180 - barHeight); // Red to yellow gradient
            this.ctx.fillStyle = `hsl(${hue}, 100%, 40%)`;
            this.ctx.fillRect(x, this.canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    }

    /**
     * Stop the animation loop
     */
    stopAnimation() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    /**
     * Draw the last captured frame (used when paused)
     */
    drawStatic() {
        // Draw the last captured frame when paused
        if (!this.lastFrameData) return;
        
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Calculate bar dimensions
        const barWidth = (this.canvas.width / this.bufferLength) * 2.5;
        let x = 0;

        // Draw static frequency bars
        for (let i = 0; i < this.bufferLength; i++) {
            const barHeight = this.lastFrameData[i] * 0.7; // Use same scaling as animate()
            // Use consistent coloring with animation mode
            const hue = Math.max(0, 180 - barHeight);
            this.ctx.fillStyle = `hsl(${hue}, 100%, 40%)`;
            this.ctx.fillRect(x, this.canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    }
}