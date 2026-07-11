/**
 * PlayerControls module
 * Bridges the custom UI buttons directly to YouTube's active <video> and navigation controls.
 */
export class PlayerControls {
  constructor(overlayRoot) {
    this.root = overlayRoot;
    this.video = null;
    
    // UI Elements inside Shadow Root
    this.btnPlay = this.root.querySelector('#lumina-btn-play');
    this.btnPrev = this.root.querySelector('#lumina-btn-prev');
    this.btnNext = this.root.querySelector('#lumina-btn-next');
    this.btnMute = this.root.querySelector('#lumina-btn-mute');
    this.btnLoop = this.root.querySelector('#lumina-btn-loop');
    
    this.btnBack5 = this.root.querySelector('#lumina-btn-back5');
    this.btnFwd5 = this.root.querySelector('#lumina-btn-fwd5');
    this.progressSlider = this.root.querySelector('#lumina-progress-slider');
    
    this.svgPlay = this.root.querySelector('#lumina-svg-play');
    this.svgPause = this.root.querySelector('#lumina-svg-pause');
    this.svgMuteOn = this.root.querySelector('#lumina-svg-volume-on');
    this.svgMuteOff = this.root.querySelector('#lumina-svg-volume-off');

    this.init();
  }

  init() {
    this.locateVideoElement();
    this.setupEventListeners();
    
    // Periodically re-locate the video element in case YouTube refreshes/re-creates it
    this.timer = setInterval(() => this.locateVideoElement(), 2000);
  }

  locateVideoElement() {
    const video = document.querySelector('ytd-watch-flexy video.html5-main-video, video');
    if (video && video !== this.video) {
      this.video = video;
      this.syncUIState();
      this.hookNativeVideoEvents();
    }
  }

  setupEventListeners() {
    // Play/Pause Action
    this.btnPlay.addEventListener('click', () => {
      if (!this.video) return;
      if (this.video.paused) {
        this.video.play().catch(err => console.error("Lumina: Play failed", err));
      } else {
        this.video.pause();
      }
    });

    // Next Track Action (Clicks YouTube's Native Next Button)
    this.btnNext.addEventListener('click', () => {
      const ytpNext = document.querySelector('.ytp-next-button');
      if (ytpNext && ytpNext.style.display !== 'none') {
        ytpNext.click();
      } else {
        console.warn("Lumina: Native Next button not found or invisible.");
      }
    });

    // Previous Track Action (Goes Back in Browser History)
    this.btnPrev.addEventListener('click', () => {
      window.history.back();
    });

    // Mute/Unmute Action
    this.btnMute.addEventListener('click', () => {
      if (!this.video) return;
      this.video.muted = !this.video.muted;
      this.syncMuteState();
    });

    // Seek Backward 5 Seconds
    this.btnBack5.addEventListener('click', () => {
      if (!this.video) return;
      this.video.currentTime = Math.max(0, this.video.currentTime - 5);
      this.updateTimerDisplay();
    });

    // Seek Forward 5 Seconds
    this.btnFwd5.addEventListener('click', () => {
      if (!this.video) return;
      const duration = this.video.duration || 0;
      this.video.currentTime = Math.min(duration, this.video.currentTime + 5);
      this.updateTimerDisplay();
    });

    // Drag Seek Bar
    this.progressSlider.addEventListener('input', () => {
      if (!this.video || !this.video.duration) return;
      const pct = parseFloat(this.progressSlider.value);
      const targetTime = (pct / 100) * this.video.duration;
      this.video.currentTime = targetTime;
      this.updateTimerDisplay();
    });

    // Toggle Video Loop
    this.btnLoop.addEventListener('click', () => {
      if (!this.video) return;
      this.video.loop = !this.video.loop;
      this.syncLoopState();
    });
  }

  hookNativeVideoEvents() {
    if (!this.video) return;

    this.video.addEventListener('play', () => this.syncPlayState(true));
    this.video.addEventListener('pause', () => this.syncPlayState(false));
    this.video.addEventListener('volumechange', () => this.syncMuteState());
    this.video.addEventListener('timeupdate', () => this.updateTimerDisplay());
  }

  syncUIState() {
    if (!this.video) return;
    this.syncPlayState(!this.video.paused);
    this.syncMuteState();
    this.syncLoopState();
    this.updateTimerDisplay();
  }

  updateTimerDisplay() {
    if (!this.video) return;
    const timerElement = this.root.querySelector('#lumina-timer');
    if (!timerElement) return;

    const formatTime = (time) => {
      if (isNaN(time) || time === Infinity) return '0:00';
      const mins = Math.floor(time / 60);
      const secs = Math.floor(time % 60);
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    timerElement.textContent = `${formatTime(this.video.currentTime)} / ${formatTime(this.video.duration)}`;

    // Sync progress slider position
    if (this.video.duration && !this.progressSlider.matches(':focus')) {
      const pct = (this.video.currentTime / this.video.duration) * 100;
      this.progressSlider.value = pct;
    }
  }

  syncPlayState(isPlaying) {
    if (isPlaying) {
      this.svgPlay.classList.add('lumina-hidden');
      this.svgPause.classList.remove('lumina-hidden');
    } else {
      this.svgPlay.classList.remove('lumina-hidden');
      this.svgPause.classList.add('lumina-hidden');
    }
  }

  syncMuteState() {
    if (!this.video) return;
    if (this.video.muted || this.video.volume === 0) {
      this.svgMuteOn.classList.add('lumina-hidden');
      this.svgMuteOff.classList.remove('lumina-hidden');
    } else {
      this.svgMuteOn.classList.remove('lumina-hidden');
      this.svgMuteOff.classList.add('lumina-hidden');
    }
  }

  syncLoopState() {
    if (!this.video) return;
    if (this.video.loop) {
      this.btnLoop.classList.add('active-neon-text');
    } else {
      this.btnLoop.classList.remove('active-neon-text');
    }
  }

  destroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
