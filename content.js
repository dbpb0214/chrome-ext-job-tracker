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
    const jobBoardFirstNameInput = document.querySelectorAll('#first_name');
    const jobBoardLastNameInput = document.querySelectorAll('#last_name');
    const jobBoardEmailInput = document.querySelectorAll('#email');
    const jobBoardPhoneInput = document.querySelectorAll('#phone');

    const linkedInLabel = Array.from(document.querySelectorAll('label')).find(label =>
      label.textContent.trim() === 'LinkedIn Profile'
    );
    const jobBoardLinkedInInput = document.getElementById(linkedInLabel.getAttribute('for'));

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

    if (jobBoardEmailInput.length > 0) {
      jobBoardEmailInput[0].value = formData.email;
      jobBoardEmailInput[0].dispatchEvent(new Event('input', { bubbles: true }));
      jobBoardEmailInput[0].dispatchEvent(new Event('change', { bubbles: true }));
    }

    if (jobBoardPhoneInput.length > 0) {
      jobBoardPhoneInput[0].value = formData.phone;
      jobBoardPhoneInput[0].dispatchEvent(new Event('input', { bubbles: true }))
      jobBoardPhoneInput[0].dispatchEvent(new Event('change', { bubbles: true }))
    }

    if (jobBoardLinkedInInput) {
      jobBoardLinkedInInput.value = formData.linkedin;
      jobBoardLinkedInInput.dispatchEvent(new Event('input', { bubbles: true}))
      jobBoardLinkedInInput.dispatchEvent(new Event('change', { bubbles: true}))
    }
  }
