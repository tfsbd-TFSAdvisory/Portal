const Application = require('../models/Application.model');
const Company = require('../models/Company.model');
const Notification = require('../models/Notification.model');
const logger = require('../utils/logger');

// @desc    Get all applications
// @route   GET /api/applications
// @access  Private
exports.getApplications = async (req, res, next) => {
  try {
    const {
      status,
      type,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    let query = {};

    // Filter by user role
    if (req.user.role === 'user') {
      query.createdBy = req.user._id;
    }

    if (status) {
      query.status = status;
    }

    if (type) {
      query.type = type;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    if (search) {
      query.$or = [
        { reference: { $regex: search, $options: 'i' } },
        { 'beneficiary.name': { $regex: search, $options: 'i' } }
      ];
    }

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Pagination
    const skip = (page - 1) * limit;

    const applications = await Application.find(query)
      .populate('applicant', 'name registrationNumber')
      .populate('createdBy', 'firstName lastName email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Application.countDocuments(query);

    res.status(200).json({
      success: true,
      count: applications.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: applications
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single application
// @route   GET /api/applications/:id
// @access  Private
exports.getApplication = async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('applicant')
      .populate('createdBy', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email');

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    // Check authorization
    if (req.user.role === 'user' && application.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this application'
      });
    }

    res.status(200).json({
      success: true,
      data: application
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new application
// @route   POST /api/applications
// @access  Private
exports.createApplication = async (req, res, next) => {
  try {
    // Check if user has company
    if (!req.user.company) {
      return res.status(400).json({
        success: false,
        error: 'Please complete company registration first'
      });
    }

    const applicationData = {
      ...req.body,
      applicant: req.user.company,
      createdBy: req.user._id
    };

    const application = await Application.create(applicationData);

    // Add to status history
    application.statusHistory.push({
      status: 'draft',
      changedBy: req.user._id,
      comments: 'Application created'
    });

    await application.save();

    // Create notification
    await Notification.create({
      user: req.user._id,
      type: 'application_update',
      title: 'New Application Created',
      message: `Application ${application.reference} has been created`,
      data: {
        applicationId: application._id
      }
    });

    logger.info(`Application created: ${application.reference} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      data: application
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update application
// @route   PUT /api/applications/:id
// @access  Private
exports.updateApplication = async (req, res, next) => {
  try {
    let application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    // Check authorization
    if (req.user.role === 'user' && application.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this application'
      });
    }

    // Only allow certain updates based on status
    if (application.status !== 'draft' && req.body.status === 'draft') {
      return res.status(400).json({
        success: false,
        error: 'Cannot revert to draft once submitted'
      });
    }

    // Track status change
    if (req.body.status && req.body.status !== application.status) {
      application.statusHistory.push({
        status: req.body.status,
        changedBy: req.user._id,
        comments: req.body.statusComments || 'Status updated'
      });

      // If submitting, update current step
      if (req.body.status === 'submitted') {
        application.currentStep = 'submission';
        
        // Notify compliance officers
        const complianceOfficers = await User.find({ role: 'compliance_officer' });
        for (const officer of complianceOfficers) {
          await Notification.create({
            user: officer._id,
            type: 'application_update',
            title: 'New Application Submitted',
            message: `Application ${application.reference} needs compliance review`,
            data: {
              applicationId: application._id
            },
            priority: 'high'
          });
        }
      }
    }

    // Update form data
    if (req.body.formData) {
      application.formData = {
        ...application.formData,
        ...req.body.formData
      };
    }

    // Update application
    application = await Application.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('applicant', 'name registrationNumber');

    res.status(200).json({
      success: true,
      data: application
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete application
// @route   DELETE /api/applications/:id
// @access  Private
exports.deleteApplication = async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    // Check authorization
    if (req.user.role === 'user' && application.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this application'
      });
    }

    // Only allow deletion of draft applications
    if (application.status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: 'Only draft applications can be deleted'
      });
    }

    await application.deleteOne();

    logger.info(`Application deleted: ${application.reference} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Application deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update application step
// @route   PUT /api/applications/:id/step
// @access  Private
exports.updateApplicationStep = async (req, res, next) => {
  try {
    const { step, formData } = req.body;

    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    // Check authorization
    if (req.user.role === 'user' && application.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this application'
      });
    }

    // Update current step
    application.currentStep = step;

    // Update form data
    if (formData) {
      application.formData = {
        ...application.formData,
        [step.split('_')[0]]: formData
      };
    }

    await application.save();

    res.status(200).json({
      success: true,
      data: application
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get application statistics
// @route   GET /api/applications/stats/dashboard
// @access  Private
exports.getDashboardStats = async (req, res, next) => {
  try {
    let query = {};

    if (req.user.role === 'user') {
      query.createdBy = req.user._id;
    }

    const totalApplications = await Application.countDocuments(query);
    const draftApplications = await Application.countDocuments({ ...query, status: 'draft' });
    const submittedApplications = await Application.countDocuments({ ...query, status: 'submitted' });
    const approvedApplications = await Application.countDocuments({ ...query, status: 'approved' });

    // Get applications by type
    const applicationsByType = await Application.aggregate([
      { $match: query },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    // Get monthly applications for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyApplications = await Application.aggregate([
      {
        $match: {
          ...query,
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        total: totalApplications,
        draft: draftApplications,
        submitted: submittedApplications,
        approved: approvedApplications,
        byType: applicationsByType,
        monthly: monthlyApplications
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit application for review
// @route   POST /api/applications/:id/submit
// @access  Private
exports.submitApplication = async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    // Check authorization
    if (req.user.role === 'user' && application.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to submit this application'
      });
    }

    // Check if all required steps are completed
    const requiredSteps = ['company_info', 'lc_details', 'parties_info', 'shipping_info', 'compliance'];
    if (!requiredSteps.every(step => application.formData[step.split('_')[0]])) {
      return res.status(400).json({
        success: false,
        error: 'Please complete all required forms before submission'
      });
    }

    // Update status
    application.status = 'submitted';
    application.currentStep = 'submission';
    
    application.statusHistory.push({
      status: 'submitted',
      changedBy: req.user._id,
      comments: 'Application submitted for review'
    });

    await application.save();

    // Notify compliance officers
    const complianceOfficers = await User.find({ role: 'compliance_officer' });
    for (const officer of complianceOfficers) {
      await Notification.create({
        user: officer._id,
        type: 'application_update',
        title: 'New Application Submitted',
        message: `Application ${application.reference} is ready for review`,
        data: {
          applicationId: application._id
        },
        priority: 'high'
      });
    }

    // Notify applicant
    await Notification.create({
      user: req.user._id,
      type: 'application_update',
      title: 'Application Submitted',
      message: `Your application ${application.reference} has been submitted for review`,
      data: {
        applicationId: application._id
      }
    });

    logger.info(`Application submitted: ${application.reference} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Application submitted successfully',
      data: application
    });
  } catch (error) {
    next(error);
  }
};