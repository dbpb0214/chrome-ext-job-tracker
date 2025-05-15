export const applicants = {
    async get() {
      chrome.storage.local.get('applicant', (data) => {
        const emptyApplicant = {
          firstName: '',
          lastName: '',
          email: '',
          linkedin: '',
          phone: '',
          resume: []
        }

        let applicant = emptyApplicant
        if (Object.keys(data.applicant).length > 0) {
          applicant = data.applicant
        }

        const firstNameElement = document.getElementById('first-name');
        const lastNameElement = document.getElementById('last-name');
        const emailElement = document.getElementById('email');
        const phoneElement = document.getElementById('phone');
        const linkedInElement = document.getElementById('linkedin')
        const resumeFileInputLabel = document.getElementById('resumeLabel');
        const resumeFileInputElement = document.getElementById('resumeFile')

        firstNameElement.value = applicant.firstName; 
        lastNameElement.value = applicant.lastName;
        emailElement.value = applicant.email;
        phoneElement.value = applicant.phone;
        linkedInElement.value = applicant.linkedin;

        if (applicant['resume'] && applicant['resume'].length > 0) {
          const resumeData = applicant['resume'][0];
          if (resumeData.name) {
            resumeFileInputLabel.textContent = resumeData.name;
            resumeFileInputElement.value = ''
          }
        } else {
          resumeFileInputLabel.textContent = 'None'
        }
      })
    },
    async save(e) {
      e.preventDefault();
      const firstName = e.target.form[0].value
      const lastName = e.target.form[1].value
      const email = e.target.form[2].value
      const phone = e.target.form[3].value
      const linkedin = e.target.form[4].value
      const resumeFile = e.target.form[5].files[0]

      chrome.storage.local.get('applicant', async (result) => {
        const existingData = result.applicant || {};
        
        // Handles clearing all fields except resume on file
        const hasUserClearedFields = (
          firstName === '' && lastName === '' && email === '' && phone === '' && linkedin === ''
        )

        const hasExistingDataToClear = (
          existingData['firstName'].length > 0 && existingData['lastName'].length > 0 && existingData['email'].length > 0 && existingData['phone'].length > 0 && existingData['linkedin'].length > 0
        )

        
        if (hasUserClearedFields && hasExistingDataToClear) {
          if (confirm('Are you sure you want to clear all fields?')) {
            const applicantWithOnlyResume = {
              firstName: '',
              lastName: '',
              email: '',
              linkedin: '',
              phone: '',
              resume: existingData['resume'] || []
            }
            chrome.storage.local.set({ applicant: applicantWithOnlyResume }, async () => {
              alert('All applicant details cleared except resume!');
              await this.get();
            });
          }
          // If user cancels clearing reload applicant details
          await this.get();
          return;
        }

        // Handles users attempting to add a resume when there is already one on file
        if (resumeFile && (existingData['resume'] && existingData['resume'].length > 0)) {
          alert('A resume is already on file. Delete current resume before adding a new one!')
          await this.get()
          return;
        }

        const resume = []
        const applicant = {
          firstName,
          lastName,
          email,
          phone,
          linkedin,
          resume
        };

        // Handles keeping existing resume if available
        if (existingData['resume'] && existingData['resume'].length > 0 ) {
          applicant['resume'].push(existingData['resume'][0]);
        }

        // Handles user not submitting a resume
        if (!resumeFile) {
          await saveApplicantToLocalStorage(applicant, existingData);
          return;
        }

        // Handles user submitting resume when no resume on file
        const reader = new FileReader();
        reader.onload = async function(e) {
          const resumeData = {
            name: resumeFile.name.trim(),
            originalFileName: resumeFile.name,
            content: e.target.result,
            dateAdded: new Date().toISOString()
          };
          applicant['resume'].push(resumeData)
            await saveApplicantToLocalStorage(applicant, existingData)
        };
        
        reader.onerror = function() {
          alert('Error reading file');
        };
        reader.readAsDataURL(resumeFile);

      })
    },
    
    async deleteResume(e) {
      e.preventDefault()
      chrome.storage.local.get('applicant', (data) => {

        if (data.applicant['resume'].length === 0) {
          alert("No resume on file to delete")
          return
        }
        const resume_name = data.applicant['resume'][0]['name']
        data.applicant['resume'] = []
        const applicantWithoutResume = data.applicant

        chrome.storage.local.set({ applicant: applicantWithoutResume }, async () => {
          // Show success message
          alert(`${ resume_name } has been deleted successfully!`);
          await this.get()
        });
      })
      
    },

    async applyApplicantDetails() {
      chrome.storage.local.get('applicant', (data) => {

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const currentTab = tabs[0];

          const formData = {
            firstName: data.applicant.firstName,
            lastName: data.applicant.lastName,
            email: data.applicant.email,
            phone: data.applicant.phone,
            linkedin: data.applicant.linkedin,
          }
          chrome.tabs.sendMessage(
            currentTab.id,
            { action: "updateJobApplicationForm", formData: formData },
            (response) => {
              if (chrome.runtime.lastError) {
                console.error("Error:", chrome.runtime.lastError.message);
              } else {
                // Handle successful response
              }
            }
          )
        })
      })

    }
}

async function saveApplicantToLocalStorage(applicant, existingData) {
  const clearedFields = [];
  if (existingData.firstName && applicant.firstName === '') clearedFields.push('First Name');
  if (existingData.lastName && applicant.lastName === '') clearedFields.push('Last Name');
  if (existingData.email && applicant.email === '') clearedFields.push('Email');
  if (existingData.phone && applicant.phone === '') clearedFields.push('Phone');
  if (existingData.linkedin && applicant.linkedin === '') clearedFields.push('LinkedIn')

  const updatedFields = [];
  if (applicant.firstName && applicant.firstName !== existingData.firstName) updatedFields.push('First Name');
  if (applicant.lastName && applicant.lastName !== existingData.lastName) updatedFields.push('Last Name');
  if (applicant.email && applicant.email !== existingData.email) updatedFields.push('Email');
  if (applicant.phone && applicant.phone !== existingData.phone) updatedFields.push('Phone');
  if (applicant.linkedin && applicant.linkedin !== existingData.linkedin) updatedFields.push("LinkedIn");
  if (applicant.resumeFile && applicant.resumeFile !== existingData.resumeFile) updatedFields.push("Resume File");

  chrome.storage.local.set({ applicant }, () => {
    // Show which fields were saved/updated
    let message = '';

    if (updatedFields.length > 0) {
      message = 'Updated: ' + updatedFields.join(', ') + '. ';
    }

    if (clearedFields.length > 0) {
      message += 'Cleared: ' + clearedFields.join(', ') + '. ';
    }

    // If nothing was specifically updated or cleared, show generic message
    if (message === '') {
      message = 'Applicant details saved!';
    }
    alert(message);
    applicants.get();
  });
}