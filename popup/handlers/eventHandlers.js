import { applicants as aplcnts } from '../modules/applicants.js';
import { applications as apps } from '../modules/applications.js';

export function setupEventHandlers() {
    const addManuallyBtn = document.getElementById('add-manually-btn');
    const jobForm = document.getElementById('job-form');
    const exportNotesBtn = document.getElementById('export-notes');
    const deleteAppsBtn = document.getElementById('delete-apps');
    const saveApplicantDetailsBtn = document.getElementById('save-applicant-details')
    const applyApplicantDetailsBtn = document.getElementById('apply-applicant-details')
    const deleteResumeBtn = document.getElementById('delete-resume');

    // Event listeners
    addManuallyBtn.addEventListener('click', () => apps.showForm());
    jobForm.addEventListener('submit', (e) => apps.save(e));
    exportNotesBtn.addEventListener('click', () => apps.export());
    deleteAppsBtn.addEventListener('click', () => apps.delete())
    saveApplicantDetailsBtn.addEventListener('click', (e) => aplcnts.save(e))
    applyApplicantDetailsBtn.addEventListener('click', () => aplcnts.applyApplicantDetails())
    deleteResumeBtn.addEventListener('click', (e) => aplcnts.deleteResume(e))
}