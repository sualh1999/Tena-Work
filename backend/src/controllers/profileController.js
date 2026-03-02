const User = require('../models/User');
const ProfessionalProfile = require('../models/ProfessionalProfile');
const EmployerProfile = require('../models/EmployerProfile');
const Education = require('../models/Education');
const WorkExperience = require('../models/WorkExperience');
const CandidateEmbedding = require('../models/CandidateEmbedding');
const aiService = require('../services/aiService');
const { buildProfileText } = require('../utils/textBuilder');
const { NotFoundError, ForbiddenError, ValidationError } = require('../utils/errors');
const { getFileUrl } = require('../utils/fileUpload');

async function getMyProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const userType = req.user.userType;

    if (userType === 'professional') {
      const profile = await ProfessionalProfile.getCompleteProfile(userId);
      const education = await Education.findByUserId(userId);
      const experience = await WorkExperience.findByUserId(userId);

      res.status(200).json({
        ...profile,
        education,
        experience
      });
    } else if (userType === 'employer') {
      const profile = await EmployerProfile.getCompleteProfile(userId);
      res.status(200).json(profile);
    } else {
      const user = await User.findById(userId);
      res.status(200).json(user);
    }
  } catch (error) {
    next(error);
  }
}

async function updateMyProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const userType = req.user.userType;

    // Parse data if it's multipart/form-data
    let data;
    if (typeof req.body.data === 'string') {
      try {
        data = JSON.parse(req.body.data);
      } catch (e) {
        throw new ValidationError('Invalid JSON in form data', [
          { field: 'data', message: 'Must be valid JSON' }
        ]);
      }
    } else {
      data = req.body;
    }

    if (userType === 'professional') {
      // Update user basic info
      if (data.full_name || data.phone) {
        await User.update(userId, {
          full_name: data.full_name,
          phone: data.phone
        });
      }

      // Handle resume upload
      const resumeUrl = req.files && req.files['resume'] 
        ? getFileUrl(req.files['resume'][0].filename, 'resume') 
        : undefined;

      // Update professional profile
      const profileData = {
        bio: data.bio,
        location: data.location,
        willing_to_travel: data.willing_to_travel,
        languages_spoken: data.languages_spoken,
        resume_url: resumeUrl
      };

      await ProfessionalProfile.update(userId, profileData);

      // Update education if provided
      if (data.education) {
        await Education.replaceAll(userId, data.education);
      }

      // Update experience if provided
      if (data.experience) {
        await WorkExperience.replaceAll(userId, data.experience);
      }

      // Return updated profile
      const profile = await ProfessionalProfile.getCompleteProfile(userId);
      const education = await Education.findByUserId(userId);
      const experience = await WorkExperience.findByUserId(userId);

      // Generate and store embedding asynchronously
      setImmediate(async () => {
        try {
          const profileText = buildProfileText({ ...profile, education, experience });
          const embedding = await aiService.generateEmbedding(profileText);
          await CandidateEmbedding.upsert(userId, embedding);
          console.log(`Generated embedding for candidate ${userId}`);
        } catch (error) {
          console.error(`Failed to generate embedding for candidate ${userId}:`, error.message);
        }
      });

      res.status(200).json({
        ...profile,
        education,
        experience
      });
    } else if (userType === 'employer') {
      // Update user basic info
      if (data.full_name || data.phone) {
        await User.update(userId, {
          full_name: data.full_name,
          phone: data.phone
        });
      }

      // Handle logo upload
      const logoUrl = req.files && req.files['logo'] 
        ? getFileUrl(req.files['logo'][0].filename, 'logo') 
        : undefined;

      // Update employer profile
      const profileData = {
        company_name: data.company_name,
        company_description: data.company_description,
        position: data.position,
        city: data.city,
        address: data.address,
        logo_url: logoUrl
      };

      await EmployerProfile.update(userId, profileData);

      // Return updated profile
      const profile = await EmployerProfile.getCompleteProfile(userId);
      res.status(200).json(profile);
    } else {
      throw new ForbiddenError('Profile update not available for this user type');
    }
  } catch (error) {
    next(error);
  }
}

async function getUserProfile(req, res, next) {
  try {
    const targetUserId = parseInt(req.params.user_id);
    const requestingUserType = req.user.userType;

    // Only employers and admins can view other profiles
    if (requestingUserType !== 'employer' && requestingUserType !== 'admin') {
      throw new ForbiddenError('Only employers and admins can view candidate profiles');
    }

    // Get professional profile
    const profile = await ProfessionalProfile.getCompleteProfile(targetUserId);
    
    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    const education = await Education.findByUserId(targetUserId);
    const experience = await WorkExperience.findByUserId(targetUserId);

    res.status(200).json({
      user_id: profile.user_id,
      full_name: profile.full_name,
      bio: profile.bio,
      location: profile.location,
      languages_spoken: profile.languages_spoken,
      resume_url: profile.resume_url,
      education,
      experience
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMyProfile,
  updateMyProfile,
  getUserProfile
};
