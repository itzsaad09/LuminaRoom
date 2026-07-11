/**
 * Visualizer Module
 * Handles Web Audio capture and renders neon waveforms/bars to both the card canvas and the fullscreen ambient canvas.
 */
export class Visualizer {
  constructor(overlayRoot) {
    this.root = overlayRoot;
    
    // Canvases
    this.cardCanvas = this.root.querySelector('#lumina-card-canvas');
    this.ambientCanvas = this.root.querySelector('#lumina-ambient-canvas');
    
    this.cardCtx = this.cardCanvas.getContext('2d');
    this.ambientCtx = this.ambientCanvas.getContext('2d');
    
    // Audio State
    this.audioContext = null;
    this.analyser = null;
    this.sourceNode = null;
    this.video = null;
    this.isProcedural = true; // Default fallback to procedural simulation
    
    // Visualizer Settings (Dynamic Configuration)
    this.blurIntensity = 25;
    this.visualizerMode = 'both'; // 'oscilloscope', 'bars', 'both'
    this.colorPalette = 'neon-pink-cyan'; // 'neon-pink-cyan', 'sunset-glow', 'emerald-aurora'
    
    // Animation Lifecycle
    this.animationFrameId = null;
    this.isRendering = false;
    this.proceduralPhase = 0;
    
    this.init();
  }

  init() {
    this.resizeCanvases();
    window.addEventListener('resize', () => this.resizeCanvases());
    this.locateVideo();
    setInterval(() => this.locateVideo(), 2000);
  }

  locateVideo() {
    const video = document.querySelector('ytd-watch-flexy video.html5-main-video, video');
    if (video && this.video !== video) {
      this.video = video;
      // If we already had source, reset it
      if (this.sourceNode) {
        this.sourceNode = null;
        this.audioContext = null;
        this.analyser = null;
        this.isProcedural = true;
      }
    }
  }

  resizeCanvases() {
    const cardRect = this.cardCanvas.parentElement.getBoundingClientRect();
    if (cardRect.width === 0) return; // Wait until visible

    const dpr = window.devicePixelRatio || 1;
    const targetCardW = Math.floor(cardRect.width);
    const targetCardH = Math.floor(cardRect.height);

    // Only resize if actual dimensions changed to prevent context reset loop
    if (this.cardCanvas.width !== targetCardW * dpr || this.cardCanvas.height !== targetCardH * dpr) {
      this.cardCanvas.width = targetCardW * dpr;
      this.cardCanvas.height = targetCardH * dpr;
      if (this.cardCtx.resetTransform) {
        this.cardCtx.resetTransform();
      } else {
        this.cardCtx.setTransform(1, 0, 0, 1, 0, 0);
      }
      this.cardCtx.scale(dpr, dpr);
    }
    
    const targetAmbientW = window.innerWidth;
    const targetAmbientH = window.innerHeight;
    if (this.ambientCanvas.width !== targetAmbientW * dpr || this.ambientCanvas.height !== targetAmbientH * dpr) {
      this.ambientCanvas.width = targetAmbientW * dpr;
      this.ambientCanvas.height = targetAmbientH * dpr;
      if (this.ambientCtx.resetTransform) {
        this.ambientCtx.resetTransform();
      } else {
        this.ambientCtx.setTransform(1, 0, 0, 1, 0, 0);
      }
      this.ambientCtx.scale(dpr, dpr);
    }
  }

  updateSettings(settings) {
    if (settings.blur !== undefined) {
      this.blurIntensity = settings.blur;
      const card = this.root.querySelector('#lumina-card');
      if (card) {
        card.style.backdropFilter = `blur(${this.blurIntensity}px)`;
        card.style.webkitBackdropFilter = `blur(${this.blurIntensity}px)`;
      }
    }
    if (settings.mode !== undefined) {
      this.visualizerMode = settings.mode;
    }
    if (settings.palette !== undefined) {
      this.colorPalette = settings.palette;
    }
  }

  async startAudioCapture() {
    if (!this.video) {
      console.warn("Lumina: Video element not ready yet.");
      this.isProcedural = true;
      this.startRenderLoop();
      return;
    }

    try {
      // Reuse global AudioContext to avoid "HTMLMediaElement already connected" errors
      if (!window.__LuminaAudioContext) {
        window.__LuminaAudioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      this.audioContext = window.__LuminaAudioContext;

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      if (!window.__LuminaSourceNode) {
        window.__LuminaAnalyser = this.audioContext.createAnalyser();
        window.__LuminaAnalyser.fftSize = 256;

        window.__LuminaSourceNode = this.audioContext.createMediaElementSource(this.video);
        window.__LuminaSourceNode.connect(window.__LuminaAnalyser);
        window.__LuminaAnalyser.connect(this.audioContext.destination);
      }

      this.analyser = window.__LuminaAnalyser;
      this.sourceNode = window.__LuminaSourceNode;
      this.isProcedural = false;
      console.log("Lumina: Web Audio source successfully captured/reused.");
    } catch (err) {
      console.warn("Lumina: Audio capture failed/blocked by CORS. Falling back to high-fidelity procedural simulation.", err);
      this.isProcedural = true;
    }

    this.startRenderLoop();
  }


  startRenderLoop() {
    if (this.isRendering) return;
    this.isRendering = true;
    const render = () => {
      this.draw();
      this.animationFrameId = requestAnimationFrame(render);
    };
    this.animationFrameId = requestAnimationFrame(render);
  }

  stopRenderLoop() {
    this.isRendering = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  getColors() {
    switch (this.colorPalette) {
      case 'sunset-glow':
        return {
          primary: '#ffd700',
          secondary: '#8a2be2',
          glow: 'rgba(138, 43, 226, 0.4)',
          ambient: 'rgba(255, 215, 0, 0.05)'
        };
      case 'emerald-aurora':
        return {
          primary: '#00ff88',
          secondary: '#0077ff',
          glow: 'rgba(0, 255, 136, 0.4)',
          ambient: 'rgba(0, 119, 255, 0.05)'
        };
      case 'neon-pink-cyan':
      default:
        return {
          primary: '#00f0ff', // Cyan
          secondary: '#ff0080', // Pink
          glow: 'rgba(255, 0, 128, 0.4)',
          ambient: 'rgba(0, 240, 255, 0.05)'
        };
    }
  }

  draw() {
    // Dynamic resolution alignment: detects if canvas sizes are at default (300x150) or out of sync with container
    const cardRect = this.cardCanvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const targetCardW = Math.floor(cardRect.width) * dpr;
    const targetAmbientW = window.innerWidth * dpr;

    if (this.cardCanvas.width !== targetCardW || this.ambientCanvas.width !== targetAmbientW) {
      this.resizeCanvases();
    }

    const isPlaying = this.video ? !this.video.paused : false;
    const bufferLength = this.analyser ? this.analyser.frequencyBinCount : 128;
    const dataArray = new Uint8Array(bufferLength);

    if (this.analyser && !this.isProcedural) {
      this.analyser.getByteFrequencyData(dataArray);
      
      // Safety check: if audio context is capturing zeros (CORS restriction), fallback
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
      if (sum === 0 && isPlaying) {
        this.generateProceduralData(dataArray, isPlaying);
      }
    } else {
      this.generateProceduralData(dataArray, isPlaying);
    }

    const colors = this.getColors();
    
    // Clear contexts
    const cardW = this.cardCanvas.width / window.devicePixelRatio;
    const cardH = this.cardCanvas.height / window.devicePixelRatio;
    const ambientW = this.ambientCanvas.width / window.devicePixelRatio;
    const ambientH = this.ambientCanvas.height / window.devicePixelRatio;
    
    this.cardCtx.clearRect(0, 0, cardW, cardH);
    this.ambientCtx.clearRect(0, 0, ambientW, ambientH);

    // Draw central card visualizer (Always the elegant smooth ribbon inside the box)
    this.drawWaveformRibbon(this.cardCtx, cardW, cardH, dataArray, colors, false);

    // Draw ambient background waves (4 overlapping visual lines across screen)
    this.drawWaveformRibbon(this.ambientCtx, ambientW, ambientH, dataArray, colors, true);
  }

  generateProceduralData(dataArray, isPlaying) {
    const bufferLength = dataArray.length;
    if (!isPlaying) {
      // Idle state: slow, low-amplitude wave
      this.proceduralPhase += 0.02;
      for (let i = 0; i < bufferLength; i++) {
        dataArray[i] = 10 + Math.sin(i * 0.15 + this.proceduralPhase) * 6;
      }
    } else {
      // Play state: faster, dynamic dancing waves
      this.proceduralPhase += 0.08;
      for (let i = 0; i < bufferLength; i++) {
        const wave1 = Math.sin(i * 0.12 + this.proceduralPhase) * 20;
        const wave2 = Math.cos(i * 0.25 - this.proceduralPhase * 0.7) * 15;
        const wave3 = Math.sin(i * 0.05 + this.proceduralPhase * 1.5) * 25;
        
        let val = 45 + wave1 + wave2 + wave3;
        if (val < 0) val = 0;
        dataArray[i] = val;
      }
    }
  }

  drawWaveformRibbon(ctx, width, height, dataArray, colors, isAmbient) {
    ctx.save();
    
    const sliceWidth = width / (dataArray.length - 1);
    
    if (isAmbient) {
      // Background visualizer with 4 overlapping visual lines:
      const speed = this.proceduralPhase * 25;
      const c1 = this.colorPalette === 'rgb-cycle' ? `hsl(${speed % 360}, 100%, 55%)` : colors.secondary;
      const c2 = this.colorPalette === 'rgb-cycle' ? `hsl(${(speed + 90) % 360}, 100%, 55%)` : colors.primary;
      const c3 = this.colorPalette === 'rgb-cycle' ? `hsl(${(speed + 180) % 360}, 100%, 55%)` : colors.secondary;
      const c4 = this.colorPalette === 'rgb-cycle' ? `hsl(${(speed + 270) % 360}, 100%, 55%)` : colors.primary;
      
      // Line 1: (Zig Zag)
      ctx.beginPath();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = c1;
      ctx.shadowBlur = 15;
      ctx.shadowColor = c1;
      for (let i = 0; i < dataArray.length; i++) {
        const val = dataArray[i] || 0;
        const percent = val / 255;
        const x = i * sliceWidth;
        const offset = Math.sin(i * 0.12 + this.proceduralPhase * 0.4) * 45;
        const y = height / 2 + offset + (percent - 0.2) * (height * 0.18);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
 
      // Line 2: (Zig Zag)
      ctx.beginPath();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = c2;
      ctx.shadowBlur = 15;
      ctx.shadowColor = c2;
      for (let i = 0; i < dataArray.length; i++) {
        const reverseIdx = dataArray.length - 1 - i;
        const val = dataArray[reverseIdx] || 0;
        const percent = val / 255;
        const x = i * sliceWidth;
        const offset = Math.cos(i * 0.09 - this.proceduralPhase * 0.3) * 35;
        const y = height / 2 + offset + (percent - 0.2) * (height * 0.2);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
 
      // Line 3: (Zig Zag Offset)
      ctx.beginPath();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = c3;
      ctx.shadowBlur = 12;
      ctx.shadowColor = c3;
      for (let i = 0; i < dataArray.length; i++) {
        const val = dataArray[(i + 15) % dataArray.length] || 0;
        const percent = val / 255;
        const x = i * sliceWidth;
        const offset = Math.sin(i * 0.1 + this.proceduralPhase * 0.35 + 1.8) * 35;
        const y = height / 2 + offset + (percent - 0.2) * (height * 0.15);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
 
      // Line 4: (Zig Zag Offset)
      ctx.beginPath();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = c4;
      ctx.shadowBlur = 12;
      ctx.shadowColor = c4;
      for (let i = 0; i < dataArray.length; i++) {
        const reverseIdx = (dataArray.length - 1 - i + 20) % dataArray.length;
        const val = dataArray[reverseIdx] || 0;
        const percent = val / 255;
        const x = i * sliceWidth;
        const offset = Math.cos(i * 0.11 - this.proceduralPhase * 0.25 + 3.2) * 40;
        const y = height / 2 + offset + (percent - 0.2) * (height * 0.22);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
 
    } else {
      // Draw smooth, glowing ribbon inside the card container
      ctx.beginPath();
      ctx.lineWidth = 3.5;
      
      let strokeStyle;
      let shadowColor;
      if (this.colorPalette === 'rgb-cycle') {
        const speed = this.proceduralPhase * 25;
        const rc1 = `hsl(${speed % 360}, 100%, 55%)`;
        const rc2 = `hsl(${(speed + 120) % 360}, 100%, 55%)`;
        const rc3 = `hsl(${(speed + 240) % 360}, 100%, 55%)`;
        
        const grad = ctx.createLinearGradient(0, 0, width, 0);
        grad.addColorStop(0, rc1);
        grad.addColorStop(0.5, rc2);
        grad.addColorStop(1, rc3);
        strokeStyle = grad;
        shadowColor = rc2;
      } else {
        const grad = ctx.createLinearGradient(0, 0, width, 0);
        grad.addColorStop(0, colors.primary);
        grad.addColorStop(0.5, colors.secondary);
        grad.addColorStop(1, colors.primary);
        strokeStyle = grad;
        shadowColor = colors.secondary;
      }
      
      ctx.strokeStyle = strokeStyle;
      ctx.shadowBlur = 15;
      ctx.shadowColor = shadowColor;
      
      for (let i = 0; i < dataArray.length; i++) {
        const value = dataArray[i] || 0;
        const percent = (value / 255);
        const x = i * sliceWidth;
        
        // Windowing/tapering factor (sine bell curve) to smooth out the ends to the exact center
        const factor = Math.sin((i / (dataArray.length - 1)) * Math.PI);
        const y = height / 2 + (percent - 0.25) * (height * 0.55) * factor;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          const prevX = (i - 1) * sliceWidth;
          const prevValue = dataArray[i - 1] || 0;
          const prevPercent = prevValue / 255;
          const prevFactor = Math.sin(((i - 1) / (dataArray.length - 1)) * Math.PI);
          const prevY = height / 2 + (prevPercent - 0.25) * (height * 0.55) * prevFactor;
          
          const xc = (x + prevX) / 2;
          const yc = (y + prevY) / 2;
          ctx.quadraticCurveTo(prevX, prevY, xc, yc);
          
          // Draw final line segment to the exact right edge of the card
          if (i === dataArray.length - 1) {
            ctx.lineTo(x, y);
          }
        }
      }
      ctx.stroke();
    }
    
    ctx.restore();
  }
}
