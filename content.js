// This script runs on job sites to extract job information
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getJobDetails") {
      const jobDetails = extractJobDetails();
      sendResponse({ success: true, data: jobDetails });
    }

    if (request.action === "updateJobApplicationForm") {
      const formData = request.formData;
      updateJobApplicationForm(formData);
      sendResponse({ success: true });
    }
    
    return true; // Keep the message channel open for async response
  });
  
  function extractJobDetails() {
    const url = window.location.href;
    let company = '';
    let jobTitle = '';
    
    if (url.includes('job-boards.greenhouse.io')) {
      const companyElements = document.querySelectorAll('title')

      if (companyElements.length > 0) {
        title = companyElements[0].textContent.trim();
        company = extractCompanyName(title)
      } else {
        company = "N/A"
      }
      // Try to find job title / position
      const jobTitleElements  = document.querySelectorAll(".job__title > h1")
      if (jobTitleElements.length > 0) {
          jobTitle = jobTitleElements[0].textContent.trim();
      }
    } else if (url.includes('?ashby_jid') || url.includes('jobs.ashbyhq.com')) {
      const companyElements = document.querySelectorAll('title');
      if (companyElements.length > 0) {
        title = companyElements[0].textContent.trim();
        company = extractCompanyName(title)
      }

      const jobTitleElement = document.querySelector("h1.ashby-job-posting-heading");
      if (jobTitleElement) {
        jobTitle = jobTitleElement.textContent.trim();
      } else {
        jobTitle = "N/A"
      }
    }
    
    return {
      url,
      company,
      jobTitle
    };
  }

  function extractCompanyName(fullTitle) {
    const titleAsList = fullTitle.split(" ")
    let indexOfAt = null
    const companyList = []
    // Finds index of 'at' in title (assumpting it will always be available) and
    // uses that as our point of reference to extract company name
    for (let x = 0; x < titleAsList.length; x++) {
      hasAtCharacter = titleAsList[x] === 'at' || titleAsList[x] == '@'
      if (hasAtCharacter) {
        if (indexOfAt === null) {
          indexOfAt = x
        }
      }

      if (indexOfAt !== null && x + 1 < titleAsList.length) {
        companyList.push(titleAsList[x + 1])
      }
    }
    companyName = companyList.join(" ")
    return companyName
  }

  function updateJobApplicationForm(formData) {
    const url = window.location.href;
    const jobBoardEmailInput = document.querySelectorAll('#email').length === 1 ? document.querySelectorAll('#email') : document.querySelectorAll('input[name="email"]');
    const jobBoardPhoneInput = document.querySelectorAll('#phone').length > 0 ? document.querySelectorAll('#phone') : document.querySelectorAll('input[name="phone"]');

    const jobBoardLinkedInInput = document.querySelector('[aria-label="LinkedIn Profile"]')
      || document.querySelector('input[name="linkedin_profile"]')
      || (() => {
        const label = Array.from(document.querySelectorAll('label')).find(l =>
          l.textContent.trim().includes('LinkedIn Profile')
        );
        return label ? document.getElementById(label.getAttribute('for')) : null;
      })();

    if (url.includes('jobs.ashbyhq.com') || url.includes('?ashby_jid')) {
      const ashbyLabels = Array.from(document.querySelectorAll('label'));

      // Ashby uses React controlled inputs. Setting .value directly updates the DOM
      // visually but React's internal state stays empty, causing validation errors.
      // Using the native prototype setter forces React to sync its internal state.
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      const fillReactInput = (input, value) => {
        nativeSetter.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      };

      const ashbyNameLabel = ashbyLabels.find(label => label.textContent.trim() === 'Name');
      const ashbyNameInput = ashbyNameLabel
        ? document.getElementById(ashbyNameLabel.getAttribute('for'))
        : null;
      if (ashbyNameInput) {
        fillReactInput(ashbyNameInput, `${formData.firstName} ${formData.lastName}`);
      }

      const ashbyEmailLabel = ashbyLabels.find(label => label.textContent.trim() === 'Email');
      const ashbyEmailInput = ashbyEmailLabel
        ? document.getElementById(ashbyEmailLabel.getAttribute('for'))
        : null;
      if (ashbyEmailInput) {
        fillReactInput(ashbyEmailInput, formData.email);
      }

      if (formData.resume) {
        const ashbyResumeLabel = ashbyLabels.find(label => label.textContent.trim() === 'Resume');
        let ashbyResumeInput = ashbyResumeLabel
          ? document.getElementById(ashbyResumeLabel.getAttribute('for'))
          : null;
        // Fallback: search within the label's parent container
        if (!ashbyResumeInput && ashbyResumeLabel) {
          ashbyResumeInput = ashbyResumeLabel.closest('div')?.querySelector('input[type="file"]') || null;
        }
        if (ashbyResumeInput) {
          const { content, originalFileName } = formData.resume;
          const mimeType = content.split(';')[0].split(':')[1];
          const base64Data = content.split(',')[1];
          const byteString = atob(base64Data);
          const byteArray = new Uint8Array(byteString.length);
          for (let i = 0; i < byteString.length; i++) {
            byteArray[i] = byteString.charCodeAt(i);
          }
          const blob = new Blob([byteArray], { type: mimeType });
          const file = new File([blob], originalFileName, { type: mimeType });
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          ashbyResumeInput.files = dataTransfer.files;
          ashbyResumeInput.dispatchEvent(new Event('change', { bubbles: true }));
          ashbyResumeInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    } else {
      const jobBoardFirstNameInput = document.querySelectorAll('#first_name').length > 0 ? document.querySelectorAll('#first_name') :  document.querySelectorAll('input[name="first_name"]');
      const jobBoardLastNameInput = document.querySelectorAll('#last_name').length > 0 ? document.querySelectorAll('#last_name') : document.querySelectorAll('input[name="last_name"]');

      if (jobBoardFirstNameInput.length > 0) {
        jobBoardFirstNameInput[0].value = formData.firstName
        jobBoardFirstNameInput[0].dispatchEvent(new Event('input', { bubbles: true }))
        jobBoardFirstNameInput[0].dispatchEvent(new Event('change', { bubbles: true }));
      }

      if (jobBoardLastNameInput.length > 0) {
        jobBoardLastNameInput[0].value = formData.lastName;
        jobBoardLastNameInput[0].dispatchEvent(new Event('input', { bubbles: true }));
        jobBoardLastNameInput[0].dispatchEvent(new Event('change', { bubbles: true }));
      }

      if (url.includes('greenhouse.io')) {
        // Try native <select> first (some Greenhouse pages include a hidden one)
        const nativeCountrySelect = Array.from(document.querySelectorAll('select')).find(select =>
          Array.from(select.options).some(opt => opt.textContent.includes('United States'))
        );

        if (nativeCountrySelect) {
          const usOption = Array.from(nativeCountrySelect.options).find(opt =>
            opt.textContent.includes('United States')
          );
          if (usOption) {
            const nativeSelectSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
            nativeSelectSetter.call(nativeCountrySelect, usOption.value);
            nativeCountrySelect.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }

        if (formData.resume) {
          const resumeInput = document.querySelector('input[name="resume"]')
            || document.querySelector('input[type="file"]');
          if (resumeInput) {
            const { content, originalFileName } = formData.resume;
            const mimeType = content.split(';')[0].split(':')[1];
            const base64Data = content.split(',')[1];
            const byteString = atob(base64Data);
            const byteArray = new Uint8Array(byteString.length);
            for (let i = 0; i < byteString.length; i++) {
              byteArray[i] = byteString.charCodeAt(i);
            }
            const blob = new Blob([byteArray], { type: mimeType });
            const file = new File([blob], originalFileName, { type: mimeType });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            resumeInput.files = dataTransfer.files;
            resumeInput.dispatchEvent(new Event('change', { bubbles: true }));
            resumeInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      }
    }

    const inputNativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

    if (jobBoardEmailInput.length > 0) {
      inputNativeSetter.call(jobBoardEmailInput[0], formData.email);
      jobBoardEmailInput[0].dispatchEvent(new Event('input', { bubbles: true }));
      jobBoardEmailInput[0].dispatchEvent(new Event('change', { bubbles: true }));
    }

    if (jobBoardPhoneInput.length > 0) {
      inputNativeSetter.call(jobBoardPhoneInput[0], formData.phone);
      jobBoardPhoneInput[0].dispatchEvent(new Event('input', { bubbles: true }));
      jobBoardPhoneInput[0].dispatchEvent(new Event('change', { bubbles: true }));
    }

    if (jobBoardLinkedInInput) {
      const linkedInNativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      linkedInNativeSetter.call(jobBoardLinkedInInput, formData.linkedin);
      jobBoardLinkedInInput.dispatchEvent(new Event('input', { bubbles: true }));
      jobBoardLinkedInInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
