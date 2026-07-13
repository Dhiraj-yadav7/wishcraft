// PWA Navigation Handler (Service worker registration removed to bypass cache conflicts)
let deferredPrompt;

// Intercept PWA Install Prompt
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent Chrome 67 and earlier from automatically showing the prompt
  e.preventDefault();
  // Stash the event so it can be triggered later
  deferredPrompt = e;
  
  // Show install button in dashboard if exists
  const installBtn = document.getElementById('pwaInstallBtn');
  if (installBtn) {
    installBtn.style.display = 'inline-flex';
  }
});

// Trigger App Installation
async function installPwaApp() {
  if (!deferredPrompt) {
    showToast('App is already installed or PWA installation is not supported by your browser.', 'info');
    return;
  }
  // Show the prompt
  deferredPrompt.prompt();
  // Wait for the user to respond to the prompt
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`PWA Install user outcome: ${outcome}`);
  // We've used the prompt, and can't use it again
  deferredPrompt = null;
  
  const installBtn = document.getElementById('pwaInstallBtn');
  if (installBtn) installBtn.style.display = 'none';
}

// Request Notification Permission
async function requestPushPermissions() {
  if (!('Notification' in window)) {
    showToast('Desktop notifications are not supported in this browser.', 'warning');
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    showToast('Notifications enabled successfully! 🔔', 'success');
    // Simulate welcome push message
    simulateLocalPush();
  } else {
    showToast('Notification permission was denied.', 'info');
  }
}

function simulateLocalPush() {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification('Welcome to WishCraft! 🎈', {
        body: 'You will receive notifications for new guest wishes and comments here.',
        icon: 'https://api.qrserver.com/v1/create-qr-code/?size=192x192&data=SurpriseApp'
      });
    } catch (e) {
      console.warn('Fallback Notification failed:', e);
    }
  }
}
