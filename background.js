// This script runs in the background

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Job Application Tracker installed');
  // Initialize storage
  chrome.storage.local.get('applications', (data) => {
    if (!data.applications) {
      chrome.storage.local.set({ applications: [] });
    }
  });
});
  