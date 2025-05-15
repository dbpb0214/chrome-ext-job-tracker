    import { applications as apps } from './modules/applications.js';
    import { setupEventHandlers } from './handlers/eventHandlers.js';
    import { applicants as aplcnts } from './modules/applicants.js';

  document.addEventListener('DOMContentLoaded', async () => {
    // Form elements
    // const urlInput = document.getElementById('url');
    const dateInput = document.getElementById('date');

    // UI sections
    const currentJobSection = document.getElementById('current-job');
    const addManuallyBtn = document.getElementById('add-manually-btn');
    const addManuallyBtnContainer = document.getElementById("manual-entry")
    
    // Initialize date input with today's date
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    dateInput.value = formattedDate;
    
    try {
      // Get applicant details + all applications
      await aplcnts.get()
      await apps.get();

      // Setup event handlers
      setupEventHandlers();

      // Get current tab info
      getCurrentTabInfo();
    } catch (error) {
      console.error('Error initializing popup:', error);
    }

    // Functions
    function getCurrentTabInfo() {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        
        // Check if current site is a job site
        const isJobSite = isKnownJobSite(currentTab.url);
        
        if (isJobSite) {
          // Send message to content script to extract job details
          chrome.tabs.sendMessage(currentTab.id, { action: "getJobDetails" }, (response) => {
            if (response && response.success) {
              chrome.storage.local.get('applications', (data) => {
                const applications = data.applications || [];
                const hasDuplicateUrl = applications.some(app => app.url === response.data.url);

                if (hasDuplicateUrl) {
                  addManuallyBtn.classList.add('hidden')
                  addManuallyBtnContainer.innerHTML = "<h2>⚠️ This job posting has already been saved ⚠️</h2>"
                } else {
                  apps.fillForm(response.data);
                  currentJobSection.classList.remove('hidden');
                }

              })
            }
          });
        }
        
      });
    }
    
    function isKnownJobSite(url) {
      const jobSites = [
        'job-boards.greenhouse.io',
        "jobs.ashbyhq.com"
        // Add more job sites as needed
      ];
      
      return jobSites.some(site => url.includes(site));
    }
    
  });