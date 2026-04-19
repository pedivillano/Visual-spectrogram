export class Calculator {
    /**
     * 计算FFT段的持续时间（毫秒）
     * @param {number} fftSize - FFT大小 (例如: 256, 512, 1024, 2048)
     * @param {number} sampleRate - 音频采样率 (默认: 44100 Hz)
     * @returns {number} 持续时间（毫秒）
     */
    static calculateDuration(fftSize, sampleRate = 44100) {
        return (fftSize / sampleRate) * 1000;
    }

    /**
     * 计算可视化帧率（每秒帧数）
     * @param {number} fftSize - FFT大小
     * @param {number} sampleRate - 音频采样率 (默认: 44100 Hz)
     * @returns {number} 帧率值
     */
    static calculateFPS(fftSize, sampleRate = 44100) {
        return sampleRate / fftSize;
    }
}