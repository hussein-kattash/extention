document.getElementById('open-options').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Add reset position functionality
document.getElementById('reset-position').addEventListener('click', () => {
  // Get the active tab
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0]) {
      // Send a message to the content script to reset the position
      chrome.tabs.sendMessage(tabs[0].id, {action: "resetPosition"}, (response) => {
        if (chrome.runtime.lastError) {
          // Content script might not be ready, try alternative approach
          console.log('Extension UI not ready yet, position will reset on next load');
        }
      });
    }
  });
  
  // Close the popup after clicking
  window.close();
});