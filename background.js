// Background script for the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getStatus") {
    // Handle status requests if needed
  }
});