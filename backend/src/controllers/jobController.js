const Job = require('../models/Job');
const JobEmbedding = require('../models/JobEmbedding');
const CandidateEmbedding = require('../models/CandidateEmbedding');
const ProfessionalProfile = require('../models/ProfessionalProfile');
const Education = require('../models/Education');
const WorkExperience = require('../models/WorkExperience');
const aiService = require('../services/aiService');
const { buildJobText, buildProfileText } = require('../utils/textBuilder');
const { NotFoundError, ForbiddenError, ValidationError } = require('../utils/errors');

async function createJob(req, res, next) {
  try {
    const employerId = req.user.id;
    const {
      title,
      description,
      location,
      salary_range,
      employment_type,
      years_of_experience_required,
      required_languages
    } = req.body;

    // Validate required fields
    if (!title || !description || !location) {
      throw new ValidationError('Title, description, and location are required');
    }

    const job = await Job.create({
      employerId,
      title,
      description,
      location,
      salaryRange: salary_range,
      employmentType: employment_type,
      yearsOfExperienceRequired: years_of_experience_required || 0,
      requiredLanguages: required_languages || []
    });

    // Generate and store embedding asynchronously (don't block response)
    setImmediate(async () => {
      try {
        const jobText = buildJobText(job);
        const embedding = await aiService.generateEmbedding(jobText);
        await JobEmbedding.upsert(job.id, embedding);
        console.log(`Generated embedding for job ${job.id}`);
      } catch (error) {
        console.error(`Failed to generate embedding for job ${job.id}:`, error.message);
      }
    });

    res.status(201).json(job);
  } catch (error) {
    next(error);
  }
}

async function getJobById(req, res, next) {
  try {
    const jobId = parseInt(req.params.id);
    const job = await Job.findById(jobId);

    if (!job) {
      throw new NotFoundError('Job not found');
    }

    // Format response
    res.status(200).json({
      id: job.id,
      title: job.title,
      description: job.description,
      company: {
        id: job.employer_user_id,
        name: job.company_name,
        logo_url: job.logo_url
      },
      location: job.location,
      salary_range: job.salary_range,
      employment_type: job.employment_type,
      years_of_experience_required: job.years_of_experience_required,
      required_languages: job.required_languages,
      status: job.status,
      created_at: job.created_at
    });
  } catch (error) {
    next(error);
  }
}

async function getMyJobs(req, res, next) {
  try {
    const employerId = req.user.id;
    const status = req.query.status;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || 20;

    const result = await Job.findByEmployerId(employerId, status, page, pageSize);
    
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function updateJobStatus(req, res, next) {
  try {
    const jobId = parseInt(req.params.id);
    const { status } = req.body;
    const employerId = req.user.id;

    // Validate status
    if (!['active', 'closed'].includes(status)) {
      throw new ValidationError('Status must be either "active" or "closed"');
    }

    // Check if job exists and belongs to employer
    const job = await Job.findById(jobId);
    if (!job) {
      throw new NotFoundError('Job not found');
    }

    if (job.employer_id !== employerId) {
      throw new ForbiddenError('You can only update your own jobs');
    }

    await Job.updateStatus(jobId, status);

    res.status(200).json({
      message: 'Job status updated successfully'
    });
  } catch (error) {
    next(error);
  }
}

async function getRecommendedJobs(req, res, next) {
  try {
    const userId = req.user.id;

    // Get candidate embedding
    const candidateEmbedding = await CandidateEmbedding.findByUserId(userId);
    
    if (!candidateEmbedding) {
      return res.status(200).json({
        items: [],
        message: 'Profile embedding not yet generated. Please update your profile to get recommendations.'
      });
    }

    // Get AI recommendations
    const recommendations = await aiService.recommendJobs(candidateEmbedding, 5);
    
    if (recommendations.length === 0) {
      return res.status(200).json({
        items: [],
        message: 'No matching jobs found at this time.'
      });
    }

    // Fetch job details for recommended jobs
    const jobIds = recommendations.map(r => r.id);
    const jobs = await Job.findByIds(jobIds);
    
    // Merge with scores and sort by score
    const items = recommendations.map(rec => {
      const job = jobs.find(j => j.id === rec.id);
      if (!job) return null;
      
      return {
        id: job.id,
        title: job.title,
        company_name: job.company_name,
        location: job.location,
        salary_range: job.salary_range,
        employment_type: job.employment_type,
        match_score: rec.score
      };
    }).filter(Boolean);

    res.status(200).json({ items });
  } catch (error) {
    next(error);
  }
}

async function getRecommendedCandidates(req, res, next) {
  try {
    const jobId = parseInt(req.params.id);
    const employerId = req.user.id;

    // Check if job exists and belongs to employer
    const job = await Job.findById(jobId);
    if (!job) {
      throw new NotFoundError('Job not found');
    }

    if (job.employer_id !== employerId) {
      throw new ForbiddenError('You can only view recommendations for your own jobs');
    }

    // Get job embedding
    const jobEmbedding = await JobEmbedding.findByJobId(jobId);
    
    if (!jobEmbedding) {
      return res.status(200).json({
        job_id: jobId,
        recommendations: [],
        message: 'Job embedding not yet generated. Please wait a moment and try again.'
      });
    }

    // Apply hard filters to get eligible candidate IDs
    const filters = {
      location: job.location,
      languages: job.required_languages,
      yearsOfExperience: job.years_of_experience_required
    };
    
    const candidateIds = await CandidateEmbedding.getCandidateIds(filters);
    
    if (candidateIds.length === 0) {
      return res.status(200).json({
        job_id: jobId,
        recommendations: [],
        message: 'No candidates match the required criteria for this job.'
      });
    }

    // Get AI recommendations
    const aiRecommendations = await aiService.recommendCandidates(jobEmbedding, candidateIds, 10);
    
    if (aiRecommendations.length === 0) {
      return res.status(200).json({
        job_id: jobId,
        recommendations: [],
        message: 'No matching candidates found at this time.'
      });
    }

    // Fetch candidate details
    const userIds = aiRecommendations.map(r => r.id);
    const profiles = await ProfessionalProfile.findByUserIds(userIds);
    
    // Build response
    const recommendations = aiRecommendations.map(rec => {
      const profile = profiles.find(p => p.user_id === rec.id);
      if (!profile) return null;
      
      return {
        candidate: {
          user_id: profile.user_id,
          full_name: profile.full_name,
          headline: profile.bio ? profile.bio.substring(0, 100) : 'Healthcare Professional',
          location: profile.location
        },
        match_score: rec.score
      };
    }).filter(Boolean);

    res.status(200).json({
      job_id: jobId,
      recommendations
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createJob,
  getJobById,
  getMyJobs,
  updateJobStatus,
  getRecommendedJobs,
  getRecommendedCandidates
};
