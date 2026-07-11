/**
 * LuminaRoom Content Script (Isolated World)
 * Manages DOM injection, handles YouTube page navigation states, and acts as the chrome.storage bridge.
 */

let injectionInterval = null;

function initContentScript() {
  // Use a reliable interval to ensure injection on cold load and SPA transitions
  if (!injectionInterval) {
    injectionInterval = setInterval(checkForInjectionTarget, 1000);
  }
}

function checkForInjectionTarget() {
  // Only inject on watch pages
  if (window.location.pathname !== '/watch') {
    // Hide overlay if user navigates away
    const host = document.querySelector('#lumina-shadow-host');
    if (host) {
      const overlay = host.shadowRoot?.querySelector('#lumina-overlay');
      if (overlay && !overlay.classList.contains('lumina-hidden')) {
        overlay.classList.add('lumina-hidden');
      }
    }
    return;
  }

  // Check if toggle container already exists
  if (document.querySelector('#lumina-launch-container')) return;

  const subscribeBtnContainer = document.querySelector('#subscribe-button, ytd-subscribe-button-renderer');
  if (subscribeBtnContainer && subscribeBtnContainer.parentElement) {
    injectLaunchToggle(subscribeBtnContainer);
  }
}


function injectLaunchToggle(anchorElement) {
  // Inject Cosmic Toggle Stylesheet once
  if (!document.querySelector('#lumina-toggle-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'lumina-toggle-styles';
    styleEl.textContent = `
      .cosmic-toggle {
        position: relative;
        width: 72px;
        height: 36px;
        transform-style: preserve-3d;
        perspective: 500px;
        display: inline-block;
        vertical-align: middle;
      }

      .cosmic-toggle .toggle {
        opacity: 0;
        width: 0;
        height: 0;
        position: absolute;
      }

      .cosmic-toggle .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(45deg, #101014, #1a1a24);
        border: 1px solid rgba(0, 240, 255, 0.25);
        border-radius: 18px;
        transition: 0.5s;
        transform-style: preserve-3d;
        box-shadow:
          0 0 10px rgba(0, 0, 0, 0.5),
          inset 0 0 8px rgba(255, 255, 255, 0.05);
        overflow: hidden;
      }

      .cosmic-toggle .cosmos {
        position: absolute;
        inset: 0;
        background: radial-gradient(1px 1px at 10% 10%, #fff 100%, transparent),
          radial-gradient(1px 1px at 30% 30%, #fff 100%, transparent),
          radial-gradient(1.5px 1.5px at 50% 50%, #fff 100%, transparent),
          radial-gradient(1px 1px at 70% 70%, #fff 100%, transparent),
          radial-gradient(1.5px 1.5px at 90% 90%, #fff 100%, transparent);
        background-size: 200% 200%;
        opacity: 0.2;
        transition: 0.5s;
      }

      .cosmic-toggle .toggle-orb {
        position: absolute;
        height: 28px;
        width: 28px;
        left: 3px;
        bottom: 3px;
        background: linear-gradient(145deg, #ff0080, #00f0ff);
        border-radius: 50%;
        transition: 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        transform-style: preserve-3d;
        z-index: 2;
      }

      .cosmic-toggle .inner-orb {
        position: absolute;
        inset: 2.5px;
        border-radius: 50%;
        background: linear-gradient(145deg, #ffffff, #dcdcdc);
        transition: 0.5s;
        overflow: hidden;
      }

      .cosmic-toggle .inner-orb::before {
        content: "";
        position: absolute;
        inset: 0;
        background: repeating-conic-gradient(
          from 0deg,
          transparent 0deg,
          rgba(0, 0, 0, 0.1) 15deg,
          transparent 30deg
        );
        animation: patternRotate 12s linear infinite;
      }

      .cosmic-toggle .ring {
        position: absolute;
        inset: -2px;
        border: 1.5px solid rgba(255, 255, 255, 0.25);
        border-radius: 50%;
        transition: 0.5s;
      }

      .cosmic-toggle .toggle:checked + .slider {
        background: linear-gradient(45deg, #181822, #101014);
        border-color: rgba(255, 0, 128, 0.35);
      }

      .cosmic-toggle .toggle:checked + .slider .toggle-orb {
        transform: translateX(36px) rotate(360deg);
        background: linear-gradient(145deg, #00f0ff, #ff0080);
      }

      .cosmic-toggle .toggle:checked + .slider .inner-orb {
        background: linear-gradient(145deg, #00f0ff, #ff0080);
        transform: scale(0.9);
      }

      .cosmic-toggle .toggle:checked + .slider .ring {
        border-color: rgba(0, 240, 255, 0.4);
        animation: ringPulse 2s infinite;
      }

      .cosmic-toggle .energy-line {
        position: absolute;
        width: 100%;
        height: 1px;
        background: linear-gradient(
          90deg,
          transparent,
          rgba(0, 240, 255, 0.4),
          transparent
        );
        transform-origin: left;
        opacity: 0;
        transition: 0.5s;
      }

      .cosmic-toggle .energy-line:nth-child(1) {
        top: 20%;
        transform: rotate(15deg);
      }
      .cosmic-toggle .energy-line:nth-child(2) {
        top: 50%;
        transform: rotate(0deg);
      }
      .cosmic-toggle .energy-line:nth-child(3) {
        top: 80%;
        transform: rotate(-15deg);
      }

      .cosmic-toggle .toggle:checked + .slider .energy-line {
        opacity: 1;
        animation: energyFlow 2s linear infinite;
      }

      .cosmic-toggle .particles {
        position: absolute;
        width: 100%;
        height: 100%;
      }

      .cosmic-toggle .particle {
        position: absolute;
        width: 2.5px;
        height: 2.5px;
        background: #00f0ff;
        border-radius: 50%;
        opacity: 0;
      }

      .cosmic-toggle .toggle:checked + .slider .particle {
        animation: particleBurst 1s ease-out infinite;
      }

      .cosmic-toggle .particle:nth-child(1) { left: 20%; animation-delay: 0s; }
      .cosmic-toggle .particle:nth-child(2) { left: 40%; animation-delay: 0.2s; }
      .cosmic-toggle .particle:nth-child(3) { left: 60%; animation-delay: 0.4s; }
      .cosmic-toggle .particle:nth-child(4) { left: 80%; animation-delay: 0.6s; }
      .cosmic-toggle .particle:nth-child(5) { left: 30%; animation-delay: 0.8s; }
      .cosmic-toggle .particle:nth-child(6) { left: 70%; animation-delay: 1s; }

      @keyframes ringPulse {
        0%, 100% { transform: scale(1); opacity: 0.3; }
        50% { transform: scale(1.1); opacity: 0.6; }
      }

      @keyframes patternRotate {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      @keyframes energyFlow {
        0% { transform: scaleX(0) translateX(0); opacity: 0; }
        50% { transform: scaleX(1) translateX(25%); opacity: 1; }
        100% { transform: scaleX(0) translateX(50%); opacity: 0; }
      }

      @keyframes particleBurst {
        0% { transform: translate(0, 0) scale(1); opacity: 1; }
        100% {
          transform: translate(
            calc(cos(var(--angle)) * 25px),
            calc(sin(var(--angle)) * 25px)
          ) scale(0);
          opacity: 0;
        }
      }

      .cosmic-toggle .slider:hover .toggle-orb {
        filter: brightness(1.2);
        box-shadow:
          0 0 10px rgba(0, 240, 255, 0.4),
          0 0 20px rgba(255, 0, 128, 0.25);
      }

      .cosmic-toggle .slider:hover {
        border-color: rgba(0, 240, 255, 0.5);
      }

      .cosmic-toggle .slider:hover .cosmos {
        opacity: 0.3;
        animation: cosmosPan 20s linear infinite;
      }

      @keyframes cosmosPan {
        0% { background-position: 0% 0%; }
        100% { background-position: 200% 200%; }
      }

      .cosmic-toggle .toggle:active + .slider .toggle-orb {
        transform: scale(0.95);
      }

      .cosmic-toggle:hover .slider {
        transform: rotateX(10deg) rotateY(10deg);
      }

      .cosmic-toggle:hover .toggle-orb {
        transform: translateZ(5px);
      }
    `;
    document.head.appendChild(styleEl);
  }

  // Create Toggle Container
  const container = document.createElement('div');
  container.id = 'lumina-launch-container';
  container.style.cssText = `
    display: inline-flex;
    align-items: center;
    margin-left: 16px;
    gap: 10px;
    vertical-align: middle;
    font-family: 'Outfit', 'Inter', sans-serif;
  `;

  // Custom User Icon
  const iconUrl = chrome.runtime.getURL('icons/icon48.png');
  const img = document.createElement('img');
  img.style.cssText = 'width: 18px; height: 18px; vertical-align: middle; border-radius: 4px; display: none;';
  
  fetch(iconUrl)
    .then(res => res.blob())
    .then(blob => {
      const reader = new FileReader();
      reader.onloadend = () => {
        img.src = reader.result;
        img.style.display = 'inline-block';
      };
      reader.readAsDataURL(blob);
    })
    .catch(err => console.error("Lumina: Failed to load toggle icon", err));

  const titleSpan = document.createElement('span');
  titleSpan.style.cssText = `
    font-size: 13px;
    font-weight: 700;
    color: #00f0ff;
    text-shadow: 0 0 8px rgba(0, 240, 255, 0.4);
    letter-spacing: 0.5px;
    text-transform: uppercase;
    vertical-align: middle;
  `;
  titleSpan.textContent = 'LuminaRoom';

  // Toggle switch structure
  const label = document.createElement('label');
  label.className = 'cosmic-toggle';
  
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'toggle';
  checkbox.id = 'lumina-toggle-checkbox';

  const slider = document.createElement('div');
  slider.className = 'slider';
  
  slider.innerHTML = `
    <div class="cosmos"></div>
    <div class="energy-line"></div>
    <div class="energy-line"></div>
    <div class="energy-line"></div>
    <div class="toggle-orb">
      <div class="inner-orb"></div>
      <div class="ring"></div>
    </div>
    <div class="particles">
      <div style="--angle: 30deg" class="particle"></div>
      <div style="--angle: 60deg" class="particle"></div>
      <div style="--angle: 90deg" class="particle"></div>
      <div style="--angle: 120deg" class="particle"></div>
      <div style="--angle: 150deg" class="particle"></div>
      <div style="--angle: 180deg" class="particle"></div>
    </div>
  `;

  label.appendChild(checkbox);
  label.appendChild(slider);

  container.appendChild(img);
  container.appendChild(titleSpan);
  container.appendChild(label);

  // Toggle Action Listener
  checkbox.addEventListener('change', () => {
    if (checkbox.checked) {
      openLuminaRoom();
    } else {
      closeLuminaRoom();
    }
  });

  // Insert right after the Subscribe button container
  anchorElement.parentElement.insertBefore(container, anchorElement.nextSibling);
}

function closeLuminaRoom() {
  const host = document.querySelector('#lumina-shadow-host');
  if (host) {
    const overlay = host.shadowRoot.querySelector('#lumina-overlay');
    if (overlay) {
      // Trigger main_world close hooks by dispatching click event to native EXIT link
      const exitLink = host.shadowRoot.querySelector('#lumina-link-exit');
      if (exitLink) exitLink.click();
    }
  }
}


async function openLuminaRoom() {
  let host = document.querySelector('#lumina-shadow-host');
  
  if (!host) {
    host = document.createElement('div');
    host.id = 'lumina-shadow-host';
    document.body.appendChild(host);

    const shadowRoot = host.attachShadow({ mode: 'open' });

    // Load overlay.html structure
    try {
      const response = await fetch(chrome.runtime.getURL('ui/overlay.html'));
      const htmlText = await response.text();

      // Load Stylesheet inside shadow root
      const cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.href = chrome.runtime.getURL('ui/styles.css');
      shadowRoot.appendChild(cssLink);

      // Append HTML layout container
      const container = document.createElement('div');
      container.innerHTML = htmlText;
      shadowRoot.appendChild(container.firstElementChild);

      // Inject Main World core script (to access page's AudioContext and native properties)
      const mainScript = document.createElement('script');
      mainScript.src = chrome.runtime.getURL('core/main_world.js');
      mainScript.type = 'module';
      shadowRoot.appendChild(mainScript);

      // Setup bridge for config storage synchronization
      setupSettingsBridge(host);
      
    } catch (e) {
      console.error("Lumina: Failed initializing overlay elements", e);
      return;
    }
  }

  // Fade-in/Reveal overlay
  setTimeout(() => {
    const overlay = host.shadowRoot.querySelector('#lumina-overlay');
    if (overlay) {
      overlay.classList.remove('lumina-hidden');
      // Dispatch event to notify the main world that the overlay was opened/revealed
      host.dispatchEvent(new CustomEvent('LuminaOpened'));
    }
  }, 100);
}



function setupSettingsBridge(host) {
  // Save Settings Event (From MAIN World -> Content -> Storage)
  host.addEventListener('LuminaSaveSettings', (e) => {
    const settings = e.detail;
    chrome.storage.local.set(settings, () => {
      if (chrome.runtime.lastError) {
        console.error("Lumina: Save settings failed", chrome.runtime.lastError);
      }
    });
  });

  // Listen for exit to reset the toggle switch state on the YouTube page
  host.addEventListener('LuminaClosed', () => {
    const checkbox = document.querySelector('#lumina-toggle-checkbox');
    if (checkbox) {
      checkbox.checked = false;
    }
  });


  // Pull existing preferences and sync them back to the MAIN World visualizer
  chrome.storage.local.get(['blur', 'mode', 'palette', 'bgOn', 'bgOpacity', 'bgBlur'], (res) => {
    const settings = {
      blur: res.blur !== undefined ? res.blur : 25,
      mode: res.mode || 'both',
      palette: res.palette || 'neon-pink-cyan',
      bgOn: res.bgOn !== undefined ? res.bgOn : false,
      bgOpacity: res.bgOpacity !== undefined ? res.bgOpacity : 50,
      bgBlur: res.bgBlur !== undefined ? res.bgBlur : 15
    };
    
    // Allow script loaded execution window to complete before dispatching initial state
    setTimeout(() => {
      host.dispatchEvent(new CustomEvent('LuminaSettingsUpdated', { detail: settings }));
    }, 500);
  });
}

// Start Content script routines
initContentScript();

// Listen for popup messages to control the state and report status
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleLuminaRoom") {
    const checkbox = document.querySelector('#lumina-toggle-checkbox');
    if (checkbox) {
      checkbox.checked = request.state;
      if (request.state) {
        openLuminaRoom();
      } else {
        closeLuminaRoom();
      }
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: "not_on_watch_page" });
    }
  } else if (request.action === "getLuminaState") {
    const host = document.querySelector('#lumina-shadow-host');
    const overlay = host?.shadowRoot?.querySelector('#lumina-overlay');
    const isActive = overlay ? !overlay.classList.contains('lumina-hidden') : false;
    sendResponse({ isActive: isActive });
  }
  return true; // Keep message channel open for async response
});

