const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  reference: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['sight', 'usance', 'transferable', 'standby', 'revolving'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD',
    uppercase: true
  },
  applicant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  beneficiary: {
    name: String,
    address: String,
    country: String,
    bankDetails: {
      bankName: String,
      accountNumber: String,
      swiftCode: String,
      iban: String
    }
  },
  issuingBank: {
    bankId: mongoose.Schema.Types.ObjectId,
    name: String,
    branch: String,
    contactPerson: String
  },
  advisingBank: {
    bankId: mongoose.Schema.Types.ObjectId,
    name: String,
    branch: String
  },
  tenor: {
    type: Number, // days
    default: 90
  },
  shipmentDate: {
    type: Date
  },
  expiryDate: {
    type: Date,
    required: true
  },
  latestShipmentDate: {
    type: Date
  },
  presentationPeriod: {
    type: Number, // days after shipment
    default: 21
  },
  goodsDescription: {
    type: String
  },
  documentsRequired: [{
    document: String,
    copies: { type: Number, default: 1 },
    originalRequired: { type: Boolean, default: true }
  }],
  additionalConditions: {
    type: String
  },
  charges: {
    issuing: { type: Number, default: 0 },
    advising: { type: Number, default: 0 },
    confirmation: { type: Number, default: 0 },
    amendment: { type: Number, default: 0 }
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'issued', 'amended', 'expired', 'cancelled'],
    default: 'draft'
  },
  statusHistory: [{
    status: String,
    changedBy: mongoose.Schema.Types.ObjectId,
    comments: String,
    timestamp: { type: Date, default: Date.now }
  }],
  currentStep: {
    type: String,
    enum: ['company_info', 'lc_details', 'parties_info', 'shipping_info', 'compliance', 'review', 'submission'],
    default: 'company_info'
  },
  formData: {
    company: mongoose.Schema.Types.Mixed,
    lc: mongoose.Schema.Types.Mixed,
    parties: mongoose.Schema.Types.Mixed,
    shipping: mongoose.Schema.Types.Mixed,
    compliance: mongoose.Schema.Types.Mixed
  },
  complianceCheck: {
    amlCheck: { type: Boolean, default: false },
    kycCheck: { type: Boolean, default: false },
    sanctionsCheck: { type: Boolean, default: false },
    riskAssessment: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  }
}, {
  timestamps: true
});

// Generate reference number before saving
applicationSchema.pre('save', function(next) {
  if (!this.reference) {
    const year = new Date().getFullYear();
    const random = Math.floor(10000 + Math.random() * 90000);
    this.reference = `LC-${year}-${random}`;
  }
  next();
});

// Indexes for faster queries
applicationSchema.index({ reference: 1 });
applicationSchema.index({ applicant: 1 });
applicationSchema.index({ status: 1 });
applicationSchema.index({ createdBy: 1 });
applicationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Application', applicationSchema);