const Application = require('../models/Application');
const Job = require('../models/Job');
const { NotFoundError, ForbiddenError, ConflictError, ValidationError } = require('../utils/errors');

async function applyToJob(req, res, next) {
  try {
    const jobId = parseInt(req.params.id);
    const candidateId = req.user.id;
    const { cover_letter } = req.body;

    // Check if job exists and is active
    const job = await Job.findById(jobId);
    if (!job) {
      throw new NotFoundError('Job not found');
    }

    if (job.status !== 'active') {
      throw new ValidationError('This job is no longer accepting applications');
    }

    // Check if already applied
    const alreadyApplied = await Application.exists(jobId, candidateId);
    if (alreadyApplied) {
      throw new ConflictError('You have already applied to this job');
    }

    // Create application
    const application = await Application.create({
      jobId,
      candidateId,
      coverLetter: cover_letter
    });

    res.status(201).json({
      message: 'Application submitted successfully',
      application_id: application.id,
      status: application.status
    });
  } catch (error) {
    next(error);
  }
}

async function getMyApplications(req, res, next) {
  try {
    const candidateId = req.user.id;
    const status = req.query.status;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || 20;

    const result = await Application.findByCandidateId(candidateId, status, page, pageSize);

    // Format response
    const formattedItems = result.items.map(app => ({
      application_id: app.id,
      job: {
        id: app.job_id,
        title: app.job_title,
        company_name: app.company_name,
        location: app.job_location
      },
      status: app.status,
      cover_letter: app.cover_letter,
      applied_at: app.applied_at,
      updated_at: app.updated_at
    }));

    res.status(200).json({
      items: formattedItems,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
}

async function getJobApplicants(req, res, next) {
  try {
    const jobId = parseInt(req.params.id);
    const employerId = req.user.id;
    const status = req.query.status;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || 20;

    // Check if job exists and belongs to employer
    const job = await Job.findById(jobId);
    if (!job) {
      throw new NotFoundError('Job not found');
    }

    if (job.employer_id !== employerId) {
      throw new ForbiddenError('You can only view applicants for your own jobs');
    }

    // Mark pending applications as viewed
    await Application.markAsViewed(jobId);

    // Get applicants
    const result = await Application.findByJobId(jobId, status, page, pageSize);

    // Format response
    const formattedItems = result.items.map(app => ({
      application_id: app.id,
      status: app.status,
      applied_at: app.applied_at,
      cover_letter: app.cover_letter,
      candidate: {
        user_id: app.candidate_user_id,
        full_name: app.candidate_name,
        headline: app.candidate_bio ? app.candidate_bio.substring(0, 100) : '',
        location: app.candidate_location,
        resume_url: app.candidate_resume
      }
    }));

    res.status(200).json({
      items: formattedItems,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
}

async function updateApplicationStatus(req, res, next) {
  try {
    const applicationId = parseInt(req.params.id);
    const { status } = req.body;
    const employerId = req.user.id;

    // Validate status
    const validStatuses = ['pending', 'viewed', 'shortlisted', 'rejected'];
    if (!validStatuses.includes(status)) {
      throw new ValidationError(`Status must be one of: ${validStatuses.join(', ')}`);
    }

    // Get application
    const application = await Application.findById(applicationId);
    if (!application) {
      throw new NotFoundError('Application not found');
    }

    // Check if job belongs to employer
    const job = await Job.findById(application.job_id);
    if (job.employer_id !== employerId) {
      throw new ForbiddenError('You can only update applications for your own jobs');
    }

    // Validate status transitions
    const currentStatus = application.status;
    const validTransitions = {
      'pending': ['viewed', 'rejected'],
      'viewed': ['shortlisted', 'rejected'],
      'shortlisted': ['viewed'],
      'rejected': []
    };

    if (!validTransitions[currentStatus].includes(status)) {
      throw new ValidationError(`Cannot transition from ${currentStatus} to ${status}`);
    }

    // Update status
    await Application.updateStatus(applicationId, status);

    res.status(200).json({
      message: 'Application status updated successfully',
      application_id: applicationId,
      status
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  applyToJob,
  getMyApplications,
  getJobApplicants,
  updateApplicationStatus
};
