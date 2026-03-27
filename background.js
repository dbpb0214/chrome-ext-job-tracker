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
  if (request.action === 'setLocationMainWorld') {
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      world: 'MAIN',
      args: [request.location],
      func: (locationText) => {
        const container = document.getElementById('candidate-location')?.closest('.select-shell');
        if (!container) return;

        const fiberKey = Object.keys(container).find(k => k.startsWith('__reactFiber'));
        if (!fiberKey) return;

        // Step 1: open the menu via Level 7's menuIsOpen state (state hook #7)
        let f = container[fiberKey];
        for (let i = 0; i < 7; i++) f = f.return;
        let state = f.memoizedState;
        for (let i = 0; i < 7; i++) state = state.next;
        state.queue.dispatch(true);

        // Step 2: trigger the async search via Level 3's onInputChange
        f = container[fiberKey];
        for (let i = 0; i < 3; i++) f = f.return;
        f.memoizedProps.onInputChange(locationText, { action: 'input-change' });

        // Step 3: click the first matching option once it appears
        const observer = new MutationObserver(() => {
          const option = Array.from(container.querySelectorAll('.select__option'))
            .find(o => o.textContent.includes(locationText)) || container.querySelector('.select__option');
          if (option) {
            observer.disconnect();
            option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            option.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            option.click();
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => observer.disconnect(), 5000);
      }
    });
  }

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
  