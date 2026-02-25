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
        if (data.applicant && Object.keys(data.applicant).length > 0) {
          applicant = data.applicant
        }

        const firstNameElement = document.getElementById('first-name');
        const lastNameElement = document.getElementById('last-name');
        const emailElement = document.getElementById('email');
        const phoneElement = document.getElementById('phone');
        const linkedInElement = document.getElementById('linkedin');
        const locationElement = document.getElementById('location');
        const resumeFileInputLabel = document.getElementById('resumeLabel');
        const resumeFileInputElement = document.getElementById('resumeFile')

        firstNameElement.value = applicant.firstName;
        lastNameElement.value = applicant.lastName;
        emailElement.value = applicant.email;
        phoneElement.value = applicant.phone;
        linkedInElement.value = applicant.linkedin;
        locationElement.value = applicant.location || '';

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
      const location = e.target.form[5].value
      const resumeFile = e.target.form[6].files[0]

      chrome.storage.local.get('applicant', async (result) => {
        const existingData = result.applicant || {};
        
        // Handles clearing all fields except resume on file
        const hasUserClearedFields = (
          firstName === '' && lastName === '' && email === '' && phone === '' && linkedin === '' && location === ''
        )

        const hasExistingDataToClear = (
          existingData['firstName'] && existingData['lastName'] && existingData['email'] && existingData['phone'] && existingData['linkedin']
        )

        
        if (hasUserClearedFields && hasExistingDataToClear) {
          if (confirm('Are you sure you want to clear all fields?')) {
            const applicantWithOnlyResume = {
              firstName: '',
              lastName: '',
              email: '',
              linkedin: '',
              phone: '',
              location: '',
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
          location,
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
            location: data.applicant.location || '',
            resume: data.applicant.resume && data.applicant.resume.length > 0
              ? data.applicant.resume[0]
              : null,
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


          if (currentTab.url && (currentTab.url.includes('jobs.ashbyhq.com') || currentTab.url.includes('?ashby_jid'))) {
            // Ashby's React state ignores DOM events dispatched from the content
            // script's isolated world. Running in world: 'MAIN' lets us walk the
            // React fiber tree and call onChange directly, which is the only
            // reliable way to commit values into Ashby's internal form state.
            chrome.scripting.executeScript({
              target: { tabId: currentTab.id },
              world: 'MAIN',
              func: (fullName, emailValue, linkedinValue) => {
                const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

                const fillViaFiber = (input, value) => {
                  nativeSetter.call(input, value);
                  const fiberKey = Object.keys(input).find(k => k.startsWith('__reactFiber'));
                  if (!fiberKey) return;
                  let fiber = input[fiberKey];
                  while (fiber) {
                    const props = fiber.memoizedProps;
                    if (props?.onChange) {
                      props.onChange({ target: input, currentTarget: input, type: 'change' });
                      break;
                    }
                    fiber = fiber.return;
                  }
                };

                const findInputByLabel = (labelText) => {
                  const label = Array.from(document.querySelectorAll('label'))
                    .find(l => l.textContent.trim() === labelText);
                  return label ? document.getElementById(label.getAttribute('for')) : null;
                };

                const nameInput = findInputByLabel('Name');
                if (nameInput && fullName) fillViaFiber(nameInput, fullName);

                const emailInput = document.querySelector('input[type="email"]') || findInputByLabel('Email');
                if (emailInput && emailValue) fillViaFiber(emailInput, emailValue);

                const linkedInInput = findInputByLabel('LinkedIn URL')
                  || findInputByLabel('LinkedIn')
                  || findInputByLabel('LinkedIn, Github or Website');
                if (linkedInInput && linkedinValue) fillViaFiber(linkedInInput, linkedinValue);
              },
              args: [`${formData.firstName} ${formData.lastName}`, formData.email, formData.linkedin]
            });
          }

          if (currentTab.url && currentTab.url.includes('greenhouse.io')) {
            // Greenhouse's country code dropdown is a React Select component.
            // The fiber (React internals) is only accessible in the main world,
            // not from a content script's isolated world. executeScript with
            // world: 'MAIN' runs directly in the page's JS context, bypassing
            // both the isolation issue and the page's CSP.
            chrome.scripting.executeScript({
              target: { tabId: currentTab.id },
              world: 'MAIN',
              func: (linkedinValue) => {
                // Country code: walk React fiber to call onChange directly
                const selectControl = document.querySelector('[class*="select__control"]');
                if (selectControl) {
                  const fiberKey = Object.keys(selectControl).find(k => k.startsWith('__reactFiber'));
                  if (fiberKey) {
                    let fiber = selectControl[fiberKey];
                    while (fiber) {
                      const props = fiber.memoizedProps;
                      if (props?.onChange && props?.options?.length > 0) {
                        const usOption = props.options.find(opt =>
                          (opt.label || '').includes('United States') || opt.value === 'US'
                        ) || props.options[0];
                        props.onChange(usOption, { action: 'select-option', option: usOption });
                        break;
                      }
                      fiber = fiber.return;
                    }
                  }
                }

                // LinkedIn: walk React fiber to call onChange directly,
                // same pattern as the country code select above
                if (linkedinValue) {
                  const linkedInInput = document.querySelector('[aria-label="LinkedIn Profile"]');
                  if (linkedInInput) {
                    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                    nativeSetter.call(linkedInInput, linkedinValue);
                    const fiberKey = Object.keys(linkedInInput).find(k => k.startsWith('__reactFiber'));
                    if (fiberKey) {
                      let fiber = linkedInInput[fiberKey];
                      while (fiber) {
                        const props = fiber.memoizedProps;
                        if (props?.onChange) {
                          props.onChange({ target: linkedInInput, currentTarget: linkedInInput, type: 'change' });
                          break;
                        }
                        fiber = fiber.return;
                      }
                    }
                  }
                }

              },
              args: [formData.linkedin]
            });
          }
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
  if (existingData.linkedin && applicant.linkedin === '') clearedFields.push('LinkedIn');
  if (existingData.location && applicant.location === '') clearedFields.push('Location');

  const updatedFields = [];
  if (applicant.firstName && applicant.firstName !== existingData.firstName) updatedFields.push('First Name');
  if (applicant.lastName && applicant.lastName !== existingData.lastName) updatedFields.push('Last Name');
  if (applicant.email && applicant.email !== existingData.email) updatedFields.push('Email');
  if (applicant.phone && applicant.phone !== existingData.phone) updatedFields.push('Phone');
  if (applicant.linkedin && applicant.linkedin !== existingData.linkedin) updatedFields.push("LinkedIn");
  if (applicant.location && applicant.location !== existingData.location) updatedFields.push("Location");
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