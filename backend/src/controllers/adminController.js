const EmployerProfile = require('../models/EmployerProfile');
const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const { NotFoundError, ValidationError } = require('../utils/errors');

async function getPendingEmployers(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.page_size) || 20;

    const result = await EmployerProfile.findPending(page, pageSize);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function updateEmployerStatus(req, res, next) {
  try {
    const employerId = parseInt(req.params.id);
    const { status, reason } = req.body;
    const adminId = req.user.id;

    // Validate status
    if (!['approved', 'rejected'].includes(status)) {
      throw new ValidationError('Status must be either "approved" or "rejected"');
    }

    // Validate reason for rejection
    if (status === 'rejected' && !reason) {
      throw new ValidationError('Reason is required when rejecting an employer');
    }

    // Check if employer exists
    const employer = await User.findById(employerId);
    if (!employer || employer.user_type !== 'employer') {
      throw new NotFoundError('Employer not found');
    }

    // Update status
    await EmployerProfile.updateStatus(employerId, status, reason, adminId);

    res.status(200).json({
      message: 'Employer status updated successfully'
    });
  } catch (error) {
    next(error);
  }
}

async function getPlatformStats(req, res, next) {
  try {
    const [
      totalProfessionals,
      totalApprovedEmployers,
      totalActiveJobs,
      totalApplications
    ] = await Promise.all([
      User.count('professional'),
      EmployerProfile.countByStatus('approved'),
      Job.countByStatus('active'),
      Application.countAll()
    ]);

    res.status(200).json({
      total_professionals: totalProfessionals,
      total_approved_employers: totalApprovedEmployers,
      total_active_jobs: totalActiveJobs,
      total_applications: totalApplications
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getPendingEmployers,
  updateEmployerStatus,
  getPlatformStats
};
