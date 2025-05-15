
// Event listeners
addManuallyBtn.addEventListener('click', () => apps.showForm());
jobForm.addEventListener('submit', (e) => apps.save(e));
exportNotesBtn.addEventListener('click', () => apps.export());
deleteAppsBtn.addEventListener('click', () => apps.delete())
saveApplicantDetailsBtn.addEventListener('click', (e) => aplcnts.save(e))
applyApplicantDetailsBtn.addEventListener('click', () => aplcnts.applyApplicantDetails())
deleteResumeBtn.addEventListener('click', (e) => aplcnts.deleteResume(e))