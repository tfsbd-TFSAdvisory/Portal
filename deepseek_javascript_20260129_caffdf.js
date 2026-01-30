const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    unique: true
  },
  registrationNumber: {
    type: String,
    required: [true, 'Registration number is required'],
    unique: true
  },
  taxId: {
    type: String,
    required: true
  },
  legalForm: {
    type: String,
    enum: ['LLC', 'Corporation', 'Partnership', 'Sole Proprietorship', 'Other']
  },
  incorporationDate: {
    type: Date
  },
  address: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: {
      type: String,
      required: true
    }
  },
  contactInfo: {
    phone: String,
    fax: String,
    website: String
  },
  industry: {
    type: String,
    trim: true
  },
  businessType: {
    type: String,
    enum: ['Importer', 'Exporter', 'Trader', 'Manufacturer', 'Service Provider']
  },
  annualRevenue: {
    type: Number
  },
  numberOfEmployees: {
    type: Number
  },
  bankAccounts: [{
    bankName: String,
    accountNumber: String,
    accountType: String,
    currency: String,
    iban: String,
    swiftCode: String,
    isPrimary: { type: Boolean, default: false }
  }],
  authorizedSignatories: [{
    name: String,
    position: String,
    email: String,
    phone: String,
    signatureImage: String
  }],
  documents: [{
    type: { type: String, enum: ['certificate', 'license', 'tax', 'other'] },
    name: String,
    fileUrl: String,
    uploadedAt: Date,
    expiresAt: Date
  }],
  complianceStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended'],
    default: 'pending'
  },
  kycStatus: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed', 'failed'],
    default: 'not_started'
  },
  riskRating: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Company', companySchema);