const User = require('../models/User');
const ProfessionalProfile = require('../models/ProfessionalProfile');
const EmployerProfile = require('../models/EmployerProfile');
const Education = require('../models/Education');
const WorkExperience = require('../models/WorkExperience');
const CandidateEmbedding = require('../models/CandidateEmbedding');
const aiService = require('../services/aiService');
const { buildProfileText } = require('../utils/textBuilder');
const { hashPassword, comparePassword, validatePasswordStrength } = require('../utils/password');
const { generateToken } = require('../utils/jwt');
const { ConflictError, UnauthorizedError, ValidationError } = require('../utils/errors');
const { getFileUrl } = require('../utils/fileUpload');

async function registerProfessional(req, res, next) {
  try {
    const data = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
    
    const {
      full_name,
      location,
      willing_to_travel,
      phone,
      email,
      password,
      bio,
      languages_spoken,
      education,
      experience
    } = data;

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw new ValidationError('Password does not meet requirements', 
        passwordValidation.errors.map(err => ({ field: 'password', message: err }))
      );
    }

    // Check if user exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await User.create({
      email,
      passwordHash,
      fullName: full_name,
      userType: 'professional',
      phone
    });

    // Handle resume upload
    const resumeUrl = req.file ? getFileUrl(req.file.filename, 'resume') : null;

    // Create professional profile
    await ProfessionalProfile.create({
      userId: user.id,
      bio,
      location,
      willingToTravel: willing_to_travel || false,
      languagesSpoken: languages_spoken || [],
      resumeUrl
    });

    // Create education records
    if (education && education.length > 0) {
      await Education.bulkCreate(user.id, education);
    }

    // Create work experience records
    if (experience && experience.length > 0) {
      await WorkExperience.bulkCreate(user.id, experience);
    }

    // Generate and store embedding asynchronously
    setImmediate(async () => {
      try {
        const profile = await ProfessionalProfile.getCompleteProfile(user.id);
        const edu = await Education.findByUserId(user.id);
        const exp = await WorkExperience.findByUserId(user.id);
        
        const profileText = buildProfileText({ ...profile, education: edu, experience: exp });
        const embedding = await aiService.generateEmbedding(profileText);
        await CandidateEmbedding.upsert(user.id, embedding);
        console.log(`Generated embedding for new candidate ${user.id}`);
      } catch (error) {
        console.error(`Failed to generate embedding for new candidate ${user.id}:`, error.message);
      }
    });

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      userType: user.user_type
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        user_type: user.user_type
      }
    });
  } catch (error) {
    next(error);
  }
}

async function registerEmployer(req, res, next) {
  try {
    const data = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
    
    const {
      company_name,
      company_description,
      full_name,
      position,
      phone,
      city,
      address,
      email,
      password
    } = data;

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw new ValidationError('Password does not meet requirements', 
        passwordValidation.errors.map(err => ({ field: 'password', message: err }))
      );
    }

    // Check if user exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await User.create({
      email,
      passwordHash,
      fullName: full_name,
      userType: 'employer',
      phone
    });

    // Handle logo upload
    const logoUrl = req.file ? getFileUrl(req.file.filename, 'logo') : null;

    // Create employer profile
    const profile = await EmployerProfile.create({
      userId: user.id,
      companyName: company_name,
      companyDescription: company_description,
      position,
      city,
      address,
      logoUrl
    });

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      userType: user.user_type
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        user_type: user.user_type,
        company_status: profile.company_status
      }
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Get company status if employer
    let companyStatus = null;
    if (user.user_type === 'employer') {
      const profile = await EmployerProfile.findByUserId(user.id);
      companyStatus = profile ? profile.company_status : null;
    }

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      userType: user.user_type
    });

    res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        user_type: user.user_type,
        company_status: companyStatus
      }
    });
  } catch (error) {
    next(error);
  }
}

async function getCurrentUser(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Get company status if employer
    let companyStatus = null;
    if (user.user_type === 'employer') {
      const profile = await EmployerProfile.findByUserId(user.id);
      companyStatus = profile ? profile.company_status : null;
    }

    res.status(200).json({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      user_type: user.user_type,
      phone: user.phone,
      company_status: companyStatus,
      created_at: user.created_at
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  registerProfessional,
  registerEmployer,
  login,
  getCurrentUser
};
