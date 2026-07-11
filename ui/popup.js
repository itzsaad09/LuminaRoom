document.addEventListener('DOMContentLoaded', async () => {
  const checkbox = document.getElementById('popup-toggle-checkbox');
  const statusTitle = document.getElementById('status-title');
  const badge = document.getElementById('header-status-badge');

  // Query active tab safely
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || tab?.pendingUrl || '';
  
  if (!tab || !url.includes('youtube.com/watch')) {
    statusTitle.textContent = 'Not on Watch Page';
    statusTitle.style.color = 'rgba(255, 255, 255, 0.4)';
    badge.classList.remove('active');
    return;
  }

  // Check room state inside the active tab content script
  chrome.tabs.sendMessage(tab.id, { action: 'getLuminaState' }, (response) => {
    if (chrome.runtime.lastError || !response) {
      statusTitle.textContent = 'Extension Inactive';
      return;
    }

    checkbox.disabled = false;
    checkbox.checked = response.isActive;
    statusTitle.textContent = response.isActive ? 'LuminaRoom ON' : 'LuminaRoom OFF';
    badge.classList.add('active');
  });

  // Handle user toggle action
  checkbox.addEventListener('change', () => {
    statusTitle.textContent = checkbox.checked ? 'LuminaRoom ON' : 'LuminaRoom OFF';
    chrome.tabs.sendMessage(tab.id, { action: 'toggleLuminaRoom', state: checkbox.checked });
  });
});
