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

// Execute code in the page's main world (bypasses CSP on inline scripts).
// Content scripts cannot call chrome.scripting directly, so they message here.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'setCountryMainWorld') {
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      world: 'MAIN',
      func: () => {
        const countryContainer =
          document.querySelector('.phone-input__country [class*="-container"]') ||
          document.querySelector('label[for="country"]')?.closest('.select')?.querySelector('[class*="-container"]');
        if (!countryContainer) return;
        const fiberKey = Object.keys(countryContainer).find(k => k.startsWith('__reactFiber'));
        let fiber = fiberKey ? countryContainer[fiberKey] : null;
        while (fiber) {
          if (typeof fiber.memoizedProps?.onChange === 'function' && Array.isArray(fiber.memoizedProps?.options)) {
            const usOption = fiber.memoizedProps.options.find(o =>
              o.label?.includes('United States') || o.value?.includes('US')
            );
            if (usOption) fiber.memoizedProps.onChange(usOption);
            break;
          }
          fiber = fiber.return;
        }
      }
    });
  }
});
  