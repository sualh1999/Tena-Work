/**
 * Utility functions to build text representations for AI embeddings
 */

/**
 * Build text representation of a job for embedding generation
 * @param {object} job - Job object with all fields
 * @returns {string} - Formatted text for embedding
 */
function buildJobText(job) {
  const parts = [];
  
  if (job.title) parts.push(`Job Title: ${job.title}`);
  if (job.description) parts.push(`Description: ${job.description}`);
  if (job.location) parts.push(`Location: ${job.location}`);
  if (job.employment_type) parts.push(`Employment Type: ${job.employment_type}`);
  if (job.years_of_experience_required) {
    parts.push(`Required Experience: ${job.years_of_experience_required} years`);
  }
  if (job.required_languages && job.required_languages.length > 0) {
    parts.push(`Required Languages: ${job.required_languages.join(', ')}`);
  }
  if (job.salary_range) parts.push(`Salary Range: ${job.salary_range}`);
  
  return parts.join('. ');
}

/**
 * Build text representation of a professional profile for embedding generation
 * @param {object} profile - Complete profile with education and experience
 * @returns {string} - Formatted text for embedding
 */
function buildProfileText(profile) {
  const parts = [];
  
  if (profile.bio) parts.push(profile.bio);
  if (profile.location) parts.push(`Location: ${profile.location}`);
  
  if (profile.languages_spoken && profile.languages_spoken.length > 0) {
    parts.push(`Languages: ${profile.languages_spoken.join(', ')}`);
  }
  
  // Add education
  if (profile.education && profile.education.length > 0) {
    const eduText = profile.education.map(edu => 
      `${edu.degree} from ${edu.institution_name} (${edu.year})`
    ).join('. ');
    parts.push(`Education: ${eduText}`);
  }
  
  // Add work experience
  if (profile.experience && profile.experience.length > 0) {
    const expText = profile.experience.map(exp => {
      const duration = exp.end_date 
        ? `${exp.start_date} to ${exp.end_date}`
        : `${exp.start_date} to Present`;
      return `${exp.title} at ${exp.company_name} (${duration})`;
    }).join('. ');
    parts.push(`Experience: ${expText}`);
  }
  
  return parts.join('. ');
}

module.exports = {
  buildJobText,
  buildProfileText
};
