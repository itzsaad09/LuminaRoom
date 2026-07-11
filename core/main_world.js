import { Visualizer } from '../modules/visualizer.js';
import { PlayerControls } from '../modules/playerControls.js';

class LuminaRoomMain {
  constructor() {
    this.host = null;
    this.shadowRoot = null;
    this.visualizer = null;
    this.controls = null;
    this.isFullscreen = false;
    this._videoBgFrameId = null;
    // Cache last known bg settings so they can be re-applied on re-open
    this._savedBgSettings = { bgOn: false, bgOpacity: 60, bgBlur: 0 };
    
    this.init();
  }

  init() {
    // Locate the shadow host
    this.host = document.querySelector('#lumina-shadow-host');
    if (!this.host) {
      // Re-check shortly if DOM is building
      setTimeout(() => this.init(), 100);
      return;
    }

    this.shadowRoot = this.host.shadowRoot;
    
    // Core Modules
    this.visualizer = new Visualizer(this.shadowRoot);
    this.controls = new PlayerControls(this.shadowRoot);

    this.bindUIEvents();
    this.syncTrackMetadata();
    
    // Auto-start visualizer immediately upon entering the room
    this.visualizer.startAudioCapture();
    
    // Periodically sync metadata (for single page auto-play transitions)
    setInterval(() => this.syncTrackMetadata(), 3000);

  }

  syncTrackMetadata() {
    if (!this.shadowRoot) return;

    // Try finding YouTube metadata elements
    const titleEl = document.querySelector('ytd-watch-flexy #title h1.ytd-watch-flexy, h1.video-title, #container h1.title');
    const channelEl = document.querySelector('ytd-watch-flexy ytd-video-owner-renderer #channel-name a, ytd-video-owner-renderer #channel-name a, #owner #channel-name a');

    const titleText = titleEl ? titleEl.textContent.trim() : "AMARANTHINE WAVES";
    const channelText = channelEl ? channelEl.textContent.trim() : "YouTube Music Room";

    const uiTitle = this.shadowRoot.querySelector('#lumina-title');
    const uiArtist = this.shadowRoot.querySelector('#lumina-artist');

    if (uiTitle && uiTitle.textContent !== titleText) {
      uiTitle.textContent = titleText;
    }
    if (uiArtist && uiArtist.textContent !== channelText) {
      uiArtist.textContent = channelText;
    }
  }

  bindUIEvents() {
    // Footer button events
    const btnFullscreen = this.shadowRoot.querySelector('#lumina-link-fullscreen');
    const btnSettings = this.shadowRoot.querySelector('#lumina-link-settings');
    const btnExit = this.shadowRoot.querySelector('#lumina-link-exit');

    // Settings elements
    const settingsPanel = this.shadowRoot.querySelector('#lumina-settings-panel');
    const settingsClose = this.shadowRoot.querySelector('#lumina-settings-close');
    const blurInput = this.shadowRoot.querySelector('#lumina-settings-blur');
    const blurVal = this.shadowRoot.querySelector('#lumina-blur-val');
    const paletteSelect = this.shadowRoot.querySelector('#lumina-settings-palette');

    const bgOnInput = this.shadowRoot.querySelector('#lumina-settings-bg-on');
    const bgOpacityInput = this.shadowRoot.querySelector('#lumina-settings-bg-opacity');
    const bgOpacityVal = this.shadowRoot.querySelector('#lumina-bg-opacity-val');
    const bgBlurInput = this.shadowRoot.querySelector('#lumina-settings-bg-blur');
    const bgBlurVal = this.shadowRoot.querySelector('#lumina-bg-blur-val');

    const updateBgInputsVisibility = () => {
      const isBgOn = bgOnInput.checked;
      this.shadowRoot.querySelector('#lumina-bg-opacity-row').style.display = isBgOn ? 'flex' : 'none';
      this.shadowRoot.querySelector('#lumina-bg-blur-row').style.display = isBgOn ? 'flex' : 'none';
    };

    // Toggle Settings View
    btnSettings.addEventListener('click', () => {
      settingsPanel.classList.toggle('lumina-hidden');
    });

    settingsClose.addEventListener('click', () => {
      settingsPanel.classList.add('lumina-hidden');
    });

    // Handle Input sliders / selections (Glass Blur = card backdrop-filter only)
    const luminaCard = this.shadowRoot.querySelector('#lumina-card');
    blurInput.addEventListener('input', (e) => {
      const val = e.target.value;
      blurVal.textContent = `${val}px`;
      
      // Apply blur DIRECTLY to the card element for reliable effect
      if (luminaCard) {
        luminaCard.style.backdropFilter = `blur(${val}px)`;
        luminaCard.style.webkitBackdropFilter = `blur(${val}px)`;
      }
      
      const newSettings = { blur: parseInt(val) };
      this.dispatchSettingsChange(newSettings);
    });

    paletteSelect.addEventListener('change', (e) => {
      const newSettings = { palette: e.target.value };
      this.visualizer.updateSettings(newSettings);
      this.dispatchSettingsChange(newSettings);
    });

    bgOnInput.addEventListener('change', () => {
      updateBgInputsVisibility();
      const newSettings = { 
        bgOn: bgOnInput.checked,
        bgOpacity: parseInt(bgOpacityInput.value),
        bgBlur: parseInt(bgBlurInput.value)
      };
      this.applyBackgroundSettings(newSettings.bgOn, newSettings.bgOpacity, newSettings.bgBlur);
      this.dispatchSettingsChange(newSettings);
    });

    bgOpacityInput.addEventListener('input', () => {
      bgOpacityVal.textContent = `${bgOpacityInput.value}%`;
      const newSettings = {
        bgOn: bgOnInput.checked,
        bgOpacity: parseInt(bgOpacityInput.value),
        bgBlur: parseInt(bgBlurInput.value)
      };
      this.applyBackgroundSettings(newSettings.bgOn, newSettings.bgOpacity, newSettings.bgBlur);
      this.dispatchSettingsChange(newSettings);
    });

    bgBlurInput.addEventListener('input', () => {
      bgBlurVal.textContent = `${bgBlurInput.value}px`;
      const newSettings = {
        bgOn: bgOnInput.checked,
        bgOpacity: parseInt(bgOpacityInput.value),
        bgBlur: parseInt(bgBlurInput.value)
      };
      this.applyBackgroundSettings(newSettings.bgOn, newSettings.bgOpacity, newSettings.bgBlur);
      this.dispatchSettingsChange(newSettings);
    });

    // Fullscreen Toggle
    if (btnFullscreen) {
      btnFullscreen.addEventListener('click', () => {
        this.toggleFullscreen();
      });
    }

    // Exit Room Overlay
    btnExit.addEventListener('click', () => {
      this.exitRoom();
    });

    // Close on Escape keydown
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const overlay = this.shadowRoot.querySelector('#lumina-overlay');
        if (overlay && !overlay.classList.contains('lumina-hidden')) {
          this.exitRoom();
        }
      }
    });

    // Listen for Settings from the content.js extension bridge
    this.host.addEventListener('LuminaSettingsUpdated', (e) => {
      const settings = e.detail;
      if (!settings) return;

      // Sync form input settings
      if (settings.blur !== undefined) {
        blurInput.value = settings.blur;
        blurVal.textContent = `${settings.blur}px`;
        // Apply card blur DIRECTLY to element
        const luminaCard = this.shadowRoot.querySelector('#lumina-card');
        if (luminaCard) {
          luminaCard.style.backdropFilter = `blur(${settings.blur}px)`;
          luminaCard.style.webkitBackdropFilter = `blur(${settings.blur}px)`;
        }
      }
      if (settings.palette !== undefined) {
        paletteSelect.value = settings.palette;
      }
      if (settings.bgOn !== undefined) {
        bgOnInput.checked = settings.bgOn;
      }
      if (settings.bgOpacity !== undefined) {
        bgOpacityInput.value = settings.bgOpacity;
        bgOpacityVal.textContent = `${settings.bgOpacity}%`;
      }
      if (settings.bgBlur !== undefined) {
        bgBlurInput.value = settings.bgBlur;
        bgBlurVal.textContent = `${settings.bgBlur}px`;
      }
      
      updateBgInputsVisibility();
      
      const bgOn = settings.bgOn !== undefined ? settings.bgOn : false;
      const bgOpacity = settings.bgOpacity !== undefined ? settings.bgOpacity : 50;
      const bgBlur = settings.bgBlur !== undefined ? settings.bgBlur : 15;
      
      // Cache for re-apply on room re-open
      this._savedBgSettings = { bgOn, bgOpacity, bgBlur };
      
      this.applyBackgroundSettings(bgOn, bgOpacity, bgBlur);

      this.visualizer.updateSettings(settings);
    });

    // Listen for room open/reveal to restart visualizer rendering loop
    this.host.addEventListener('LuminaOpened', () => {
      this.visualizer.startAudioCapture();
      
      // Re-apply bg settings after a short delay so the visualizer has time
      // to locate the video element before we try to draw frames from it
      if (this._savedBgSettings.bgOn) {
        setTimeout(() => {
          const { bgOn, bgOpacity, bgBlur } = this._savedBgSettings;
          this.applyBackgroundSettings(bgOn, bgOpacity, bgBlur);
        }, 300);
      }
    });


    // Listen for Fullscreen State changes natively
    document.addEventListener('fullscreenchange', () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      if (isCurrentlyFullscreen !== this.isFullscreen) {
        this.isFullscreen = isCurrentlyFullscreen;
        btnFullscreen.classList.toggle('active-neon-text', this.isFullscreen);
        setTimeout(() => this.visualizer.resizeCanvases(), 250);
      }
    });
  }

  toggleFullscreen() {
    const overlay = this.shadowRoot.querySelector('#lumina-overlay');
    if (!document.fullscreenElement) {
      overlay.requestFullscreen()
        .then(() => {
          this.isFullscreen = true;
        })
        .catch(err => console.error("Lumina: Fullscreen failed", err));
    } else {
      document.exitFullscreen()
        .then(() => {
          this.isFullscreen = false;
        })
        .catch(err => console.error("Lumina: Exit fullscreen failed", err));
    }
  }

  dispatchSettingsChange(settings) {
    // Notify content.js (Isolated) to save to storage.local
    this.host.dispatchEvent(new CustomEvent('LuminaSaveSettings', { detail: settings }));
  }

  applyBackgroundSettings(bgOn, bgOpacity, bgBlur) {
    const overlay = this.shadowRoot.querySelector('#lumina-overlay');
    const videoBgCanvas = this.shadowRoot.querySelector('#lumina-video-bg-canvas');
    if (!overlay || !videoBgCanvas) return;

    if (bgOn && this.visualizer && this.visualizer.video) {
      const video = this.visualizer.video;
      const ctx = videoBgCanvas.getContext('2d');
      
      // Show the canvas
      videoBgCanvas.classList.add('lumina-bg-active');
      
      // Apply blur to the video canvas itself (not affecting card)
      videoBgCanvas.style.filter = bgBlur > 0 ? `blur(${bgBlur}px)` : 'none';
      // Opacity: bgOpacity 0-90 → canvas opacity 0-0.9
      videoBgCanvas.style.opacity = bgOpacity / 100;

      // Overlay background must be FULLY OPAQUE BLACK — the canvas inside will show the video
      // Never transparent to the page (that would show YouTube sidebar etc.)
      overlay.style.background = '#000';

      // Start drawing video frames
      if (this._videoBgFrameId) cancelAnimationFrame(this._videoBgFrameId);
      
      const drawFrame = () => {
        if (!video || !videoBgCanvas.classList.contains('lumina-bg-active')) return;
        
        // Resize canvas to fill overlay exactly (check once per few frames for perf)
        const ow = overlay.clientWidth;
        const oh = overlay.clientHeight;
        if (videoBgCanvas.width !== ow || videoBgCanvas.height !== oh) {
          videoBgCanvas.width = ow;
          videoBgCanvas.height = oh;
        }
        
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        
        if (vw > 0 && vh > 0) {
          const cw = videoBgCanvas.width;
          const ch = videoBgCanvas.height;
          
          // Cover-fit: scale to fill entire canvas, crop excess edges (no black bars)
          const scale = Math.max(cw / vw, ch / vh);
          const sw = vw * scale;
          const sh = vh * scale;
          const sx = (cw - sw) / 2;
          const sy = (ch - sh) / 2;
          
          ctx.drawImage(video, sx, sy, sw, sh);
        }
        
        this._videoBgFrameId = requestAnimationFrame(drawFrame);
      };
      
      this._videoBgFrameId = requestAnimationFrame(drawFrame);
      
    } else {
      // Turn off video background
      videoBgCanvas.classList.remove('lumina-bg-active');
      videoBgCanvas.style.filter = '';
      videoBgCanvas.style.opacity = '';
      overlay.style.background = '';
      
      if (this._videoBgFrameId) {
        cancelAnimationFrame(this._videoBgFrameId);
        this._videoBgFrameId = null;
        const ctx = videoBgCanvas.getContext('2d');
        ctx.clearRect(0, 0, videoBgCanvas.width, videoBgCanvas.height);
      }
    }
  }

  exitRoom() {
    this.visualizer.stopRenderLoop();
    
    // Stop video background canvas loop
    if (this._videoBgFrameId) {
      cancelAnimationFrame(this._videoBgFrameId);
      this._videoBgFrameId = null;
    }
    const videoBgCanvas = this.shadowRoot.querySelector('#lumina-video-bg-canvas');
    if (videoBgCanvas) {
      videoBgCanvas.classList.remove('lumina-bg-active');
      const ctx = videoBgCanvas.getContext('2d');
      ctx.clearRect(0, 0, videoBgCanvas.width, videoBgCanvas.height);
    }
    
    const overlay = this.shadowRoot.querySelector('#lumina-overlay');
    overlay.style.background = '';
    overlay.classList.add('lumina-hidden');
    this.host.dispatchEvent(new CustomEvent('LuminaClosed'));
  }
}

// Instantiate on script load
new LuminaRoomMain();
