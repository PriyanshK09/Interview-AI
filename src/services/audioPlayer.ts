export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private nextStartTime: number = 0;
  private sampleRate: number = 24000;
  private activeSources: Set<AudioBufferSourceNode> = new Set();

  constructor() {
    this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
    this.nextStartTime = this.audioContext.currentTime;
  }

  playChunk(pcmData: Int16Array) {
    if (!this.audioContext) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const floatData = new Float32Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
      floatData[i] = pcmData[i] / 32768.0;
    }

    const buffer = this.audioContext.createBuffer(1, floatData.length, this.sampleRate);
    buffer.getChannelData(0).set(floatData);

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);

    const startTime = Math.max(this.nextStartTime, this.audioContext.currentTime);
    source.start(startTime);
    
    this.activeSources.add(source);
    source.onended = () => {
      this.activeSources.delete(source);
    };

    this.nextStartTime = startTime + buffer.duration;
  }

  stop() {
    this.clearQueue();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  clearQueue() {
    this.activeSources.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // Source might have already stopped
      }
    });
    this.activeSources.clear();
    if (this.audioContext) {
      this.nextStartTime = this.audioContext.currentTime;
    }
  }

  get isSpeaking(): boolean {
    if (!this.audioContext) return false;
    return this.audioContext.currentTime < this.nextStartTime;
  }
}
