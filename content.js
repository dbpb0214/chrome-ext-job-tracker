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
          const titleAsList = title.split(" ")
          let indexOfAt = null
          const companyList = []
          
          // Finds index of 'at' in title (assumpting it will always be available) and
          // uses that as our point of reference to extract company name
          for (let x = 0; x < titleAsList.length; x++) {
            if (titleAsList[x] === 'at') {
              if (indexOfAt === null) {
                indexOfAt = x
              }
            }

            if (indexOfAt !== null && x + 1 < titleAsList.length) {
              companyList.push(titleAsList[x + 1])
            }
          }
          
          company = companyList.join(" ")
      }
      // Try to find job title / position
      const jobTitleElements  = document.querySelectorAll(".job__title > h1")
      if (jobTitleElements.length > 0) {
          jobTitle = jobTitleElements[0].textContent.trim();
      }
    }
    
    return {
      url,
      company,
      jobTitle
    };
  }