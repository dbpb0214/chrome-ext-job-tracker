document.addEventListener('DOMContentLoaded', () => {
    // Form elements
    const jobForm = document.getElementById('job-form');
    const companyInput = document.getElementById('company');
    const positionInput = document.getElementById('position');
    const urlInput = document.getElementById('url');
    const statusInput = document.getElementById('status');
    const notesInput = document.getElementById('notes');
    const dateInput = document.getElementById('date');
    
    // UI sections
    const currentJobSection = document.getElementById('current-job');
    const addManuallyBtn = document.getElementById('add-manually-btn');
    const addManuallyBtnContainer = document.getElementById("manual-entry")
    const applicationsList = document.getElementById('applications-list');
    
    // Export buttons
    const exportNotesBtn = document.getElementById('export-notes');

    // Delete applications button
    const deleteAppsBtn = document.getElementById('delete-apps');
    
    // Initialize date input with today's date
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    dateInput.value = formattedDate;
    
    // Get current tab data
    getCurrentTabInfo();
    
    // Load existing job applications
    loadApplications();
    
    // Event listeners
    addManuallyBtn.addEventListener('click', showManualEntryForm);
    jobForm.addEventListener('submit', saveApplication);
    exportNotesBtn.addEventListener('click', exportToNotes);
    deleteAppsBtn.addEventListener('click', deleteApps)
    
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
                  fillJobForm(response.data);
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
    
    function fillJobForm(jobData) {
      companyInput.value = jobData.company;
      positionInput.value = jobData.jobTitle
      urlInput.value = jobData.url
      // Other fields are either manually filled or have defaults
    }
    
    function showManualEntryForm() {
      
      // Clear form
      jobForm.reset();
      dateInput.value = formattedDate;
      
      // Get current URL
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        urlInput.value = tabs[0].url;
      });
      
      currentJobSection.classList.remove('hidden');
    }
    
    function saveApplication(e) {
      e.preventDefault();
      
      const application = {
        id: Date.now().toString(), // Unique ID
        company: companyInput.value,
        position: positionInput.value,
        url: urlInput.value,
        status: statusInput.value,
        notes: notesInput.value,
        date: dateInput.value,
        created: new Date().toISOString()
      };
      
      // Save to Chrome storage
      chrome.storage.local.get('applications', (data) => {
        const applications = data.applications || [];
        applications.push(application);
        
        chrome.storage.local.set({ applications }, () => {
          // Show success message
          alert('Application saved successfully!');
          
          // Reset form and refresh list
          jobForm.reset();
          dateInput.value = formattedDate;
          loadApplications();
        });
      });
    }
    
    function loadApplications() {
      chrome.storage.local.get('applications', (data) => {
        const applications = data.applications || [];
        
        // Clear existing list
        applicationsList.innerHTML = '';
        
        // Sort by date (newest first)
        applications
          .sort((a, b) => new Date(b.created) - new Date(a.created))
          .slice(0, 5) // Show only 5 most recent
          .forEach(app => {
            const item = document.createElement('div');
            item.className = 'application-item';
            item.innerHTML = `
              <strong>${app.position}</strong> at ${app.company}
              <div>Status: ${app.status}</div>
              <div>Applied: ${formatDate(app.date)}</div>
            `;
            
            applicationsList.appendChild(item);
          });
        
        if (applications.length === 0) {
          applicationsList.innerHTML = '<div>No applications yet.</div>';
        }
      });
    }
    
    function formatDate(dateString) {
      const [year, month, day] = dateString.split('-');
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString();
    }
    
    function exportToNotes() {
      chrome.storage.local.get('applications', (data) => {
        const applications = data.applications || [];
        
        if (applications.length === 0) {
          alert('No applications to export!');
          return;
        }
        
        // Create text content for notes app
        let textContent = '';
        
        applications.forEach(app => {
          textContent += `${app.position} at ${app.company}\n`;
          textContent += `Applied: ${formatDate(app.date)}\n`;
          textContent += `URL: ${app.url}\n`;
          textContent += `Notes: ${app.notes}\n\n`;
        });
        
        // Create download link
        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `job_applications_${formattedDate}.txt`);
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
    }

    function deleteApps() {
      chrome.storage.local.get('applications', (data) => {
        const applications = data.applications || []
        const emptyApplications = []
        if (applications.length > 0) {
          chrome.storage.local.set({ applications: emptyApplications }, () => {
            // Show success message
            alert(`${applications.length} applications deleted successfully!`);
            loadApplications();
          });
        } else {
          alert('There are no applications to delete!')
        }
      })
    }
  });