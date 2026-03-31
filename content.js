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
    } else if (url.includes('jobs.lever.co')) {
      const titleEl = document.querySelector('title');
      if (titleEl) {
        const titleText = titleEl.textContent.trim();
        // Lever titles are typically "Company Name - Job Title"
        const dashIndex = titleText.lastIndexOf(' - ');
        if (dashIndex !== -1) {
          company = titleText.substring(0, dashIndex).trim();
          jobTitle = titleText.substring(dashIndex + 3).trim();
        } else {
          company = extractCompanyName(titleText);
        }
      }
      const jobTitleEl = document.querySelector('.posting-headline h2');
      if (jobTitleEl) {
        jobTitle = jobTitleEl.textContent.trim();
      }
    } else if (url.includes('builtinnyc.com')) {
      const companyEl = document.querySelector('[data-id="company-title"]');
      if (companyEl) {
        company = companyEl.textContent.trim();
      }
      const h1El = document.querySelector('h1');
      if (h1El) {
        jobTitle = h1El.textContent.trim();
      }
    } else if (url.includes('gh_jid=')) {
      const titleEl = document.querySelector('title');
      if (titleEl) {
        company = extractCompanyName(titleEl.textContent.trim());
      }
      const jobTitleEl = document.querySelector('.job__title h1, h1.app-title');
      if (jobTitleEl) {
        jobTitle = jobTitleEl.textContent.trim();
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

    if (url.includes('jobs.lever.co')) {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      const fillReactInput = (input, value) => {
        nativeSetter.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      };

      // Lever wraps inputs directly inside <label> with no `for` attribute.
      // The label text lives in a nested <div class="application-label">.
      const findLeverInput = (labelText) => {
        const labelDiv = Array.from(document.querySelectorAll('div.application-label'))
          .find(div => div.textContent.trim() === labelText);
        return labelDiv ? labelDiv.closest('label')?.querySelector('input') : null;
      };

      const fullNameInput = findLeverInput('Full name') || document.querySelector('input[name="name"]');
      if (fullNameInput) {
        fillReactInput(fullNameInput, `${formData.firstName} ${formData.lastName}`);
      }

      if (formData.location) {
        const locationInput = findLeverInput('Current location') || document.querySelector('input[name="location"]');
        if (locationInput) {
          fillReactInput(locationInput, formData.location);
        }
      }

      if (formData.linkedin) {
        const linkedInInput = findLeverInput('LinkedIn URL') || document.querySelector('input[name="urls[LinkedIn]"]');
        if (linkedInInput) {
          fillReactInput(linkedInInput, formData.linkedin);
        }
      }

      if (formData.resume) {
        const resumeInput = document.getElementById('resume-upload-input')
          || document.querySelector('input[data-qa="input-resume"]')
          || document.querySelector('input[name="resume"]');
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
    } else if (url.includes('jobs.ashbyhq.com') || url.includes('?ashby_jid')) {
      const ashbyLabels = Array.from(document.querySelectorAll('label'));

      // Ashby uses React controlled inputs. Ashby also requires focus + blur to
      // mark fields as "touched" for validation. Plain input/change events are not
      // enough — we must simulate the full interaction cycle the same way a real
      // user would interact with the field.
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      const fillReactInput = (input, value) => {
        nativeSetter.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      };

      const ashbyNameLabel = ashbyLabels.find(label => {
        const text = label.textContent.trim();
        return text === 'Name' || text === 'Full Name';
      });
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

      const ashbyPhoneLabel = ashbyLabels.find(label => {
        const text = label.textContent.trim();
        return text === 'Phone Number' || text === 'Phone';
      });
      const ashbyPhoneInput = ashbyPhoneLabel
        ? document.getElementById(ashbyPhoneLabel.getAttribute('for'))
        : null;
      if (ashbyPhoneInput) {
        fillReactInput(ashbyPhoneInput, formData.phone);
      }

      const ashbyLinkedInLabel = ashbyLabels.find(label => {
        const text = label.textContent.trim();
        return text === 'LinkedIn, Github or Website' || text === 'LinkedIn' || text === 'LinkedIn URL';
      });
      const ashbyLinkedInInput = ashbyLinkedInLabel
        ? document.getElementById(ashbyLinkedInLabel.getAttribute('for'))
        : null;
      if (ashbyLinkedInInput) {
        fillReactInput(ashbyLinkedInInput, formData.linkedin);
      }

      if (formData.location) {
        const ashbyLocationLabel = ashbyLabels.find(label => label.textContent.trim() === 'Location');
        let ashbyLocationInput = ashbyLocationLabel
          ? document.getElementById(ashbyLocationLabel.getAttribute('for'))
          : null;
        if (!ashbyLocationInput && ashbyLocationLabel) {
          ashbyLocationInput = ashbyLocationLabel.closest('div')?.querySelector('input[role="combobox"]') || null;
        }
        if (ashbyLocationInput) {
          fillReactInput(ashbyLocationInput, formData.location);
          const observer = new MutationObserver(() => {
            const firstOption = document.querySelector('[role="listbox"] [role="option"]');
            if (firstOption) {
              observer.disconnect();
              firstOption.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
              firstOption.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
              firstOption.click();
            }
          });
          observer.observe(document.body, { childList: true, subtree: true });
          setTimeout(() => observer.disconnect(), 3000);
        }
      }

      if (formData.resume) {
        // Delay resume upload so all text fields and the email executeScript
        // (which dispatches blur) settle first. Ashby shows a warning if the
        // form is interacted with while a file upload is already in progress.
        setTimeout(() => {
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
        }, 1000);
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
        if (formData.location) {
          chrome.runtime.sendMessage({ action: 'setLocationMainWorld', location: formData.location });
        }

        // Country uses a React Select whose onChange closure lives in the page's
        // main world. Message the background to run the fiber-walking code via
        // chrome.scripting.executeScript({ world: 'MAIN' }), which bypasses CSP.
        chrome.runtime.sendMessage({ action: 'setCountryMainWorld' });

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
      inputNativeSetter.call(jobBoardLinkedInInput, formData.linkedin);
      jobBoardLinkedInInput.dispatchEvent(new Event('input', { bubbles: true }));
      jobBoardLinkedInInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
