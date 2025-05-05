// This script runs on job sites to extract job information
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getJobDetails") {
      const jobDetails = extractJobDetails();
      sendResponse({ success: true, data: jobDetails });
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
