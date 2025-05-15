const applicationsList = document.getElementById('applications-list');
const currentJobSection = document.getElementById('current-job');

const jobForm = document.getElementById('job-form');
const companyInput = document.getElementById('company');
const positionInput = document.getElementById('position');
const urlInput = document.getElementById('url');
const statusInput = document.getElementById('status');
const notesInput = document.getElementById('notes');
const dateInput = document.getElementById('date');

// Initialize date input with today's date
const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');
const formattedDate = `${year}-${month}-${day}`;

export const applications = {
    async get() {
      chrome.storage.local.get('applications', (data) => {
        const applicationData = data.applications || [];
        
        // Clear existing list
        applicationsList.innerHTML = '';
        
        if (applicationData.length === 0) {
          applicationsList.innerHTML = '<div>No applications yet.</div>';
        } else {
            // Sort by date (newest first)
            applicationData
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
        }
      });
    },
    async delete() {
      chrome.storage.local.get('applications', (data) => {
        const applicationData = data.applications || []
        const emptyApplications = []
        if (applicationData.length > 0) {
          chrome.storage.local.set({ applications: emptyApplications }, async () => {
            // Show success message
            alert(`${applicationData.length} applications deleted successfully!`);
            await this.get();
          });
        } else {
          alert('There are no applications to delete!')
        }
      })
    },
    async save(e) {
      e.preventDefault();
      
      const newApplication = {
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
      chrome.storage.local.get('applications', async (data) => {
        const applications = data.applications || [];
        applications.push(newApplication);
        
        chrome.storage.local.set({ applications }, async () => {
          // Show success message
          alert('Application saved successfully!');
          
          // Reset form and refresh list
          jobForm.reset();
          dateInput.value = formattedDate;
          await this.get();
        });
      });
    },
    async export() {
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
    },
    showForm() {
      // Clear form
      jobForm.reset();
      dateInput.value = formattedDate;
      
      // Get current URL
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        urlInput.value = tabs[0].url;
      });
      
      currentJobSection.classList.remove('hidden');
    },
    fillForm(jobData) {
      companyInput.value = jobData.company;
      positionInput.value = jobData.jobTitle
      urlInput.value = jobData.url
      // Other fields are either manually filled or have defaults
    }
}

// Move this function to a utilities directory since we are using it elsewhere in popup.js too
function formatDate(dateString) {
  const [year, month, day] = dateString.split('-');
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString();
}