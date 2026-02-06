'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, UserRole } from '../../types';
import { useUser } from '../../contexts/UserContext';
import { authApi, setTokens, ApiError } from '../../lib/api/client';
import { Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';

enum VerifyStep {
  EMAIL_PASSWORD,  // New step: collect email/password first
  PHONE,
  OTP,
  COMPANY_DETAILS,
  UPLOAD_CERTIFICATE,
  PAYMENT_METHOD,
  CONFIGURE_PLAN,
  REVIEW_SUBMIT,
  SUCCESS
}

const DeveloperRegistration: React.FC = () => {
  const [step, setStep] = useState<VerifyStep>(VerifyStep.EMAIL_PASSWORD);
  
  // Authentication credentials (new)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Shared state for phone/OTP verification
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpFromApi, setOtpFromApi] = useState<string | null>(null); // For development testing
  
  // Company details (Step 1)
  const [companyName, setCompanyName] = useState('');
  const [rcNumber, setRcNumber] = useState('');
  const [administratorName, setAdministratorName] = useState('');
  const [position, setPosition] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  
  // Upload certificate (Step 2)
  const [selectedDocumentType, setSelectedDocumentType] = useState('Certificate of Incorporation');
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  
  // Payment method (Step 3)
  const [paymentStructure, setPaymentStructure] = useState<'subscription' | 'per-listing'>('subscription');
  
  // Configure plan (Step 4)
  const [cardNumber, setCardNumber] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const [billingFullName, setBillingFullName] = useState('');
  const [billingCountry, setBillingCountry] = useState('Nigeria');
  const [billingAddress, setBillingAddress] = useState('');
  
  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  const router = useRouter();
  const { login } = useUser();
  const role: UserRole = 'developer';

  // Validation functions
  const isValidEmail = () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPassword = () => password.length >= 8 && password === confirmPassword;
  const isValidPhone = () => {
    if (!phone.trim()) return false;
    try {
      const { validateNigerianPhone } = require('@/lib/utils/phone');
      return validateNigerianPhone(phone);
    } catch {
      return false;
    }
  };
  
  const isValidOtp = () => {
    return otp.every(digit => digit.trim() !== '') && otp.length === 6;
  };

  const isValidCompanyDetails = () => {
    return (
      companyName.trim() !== '' &&
      rcNumber.trim() !== '' &&
      administratorName.trim() !== '' &&
      position.trim() !== '' &&
      businessEmail.trim() !== '' &&
      companyAddress.trim() !== ''
    );
  };

  // API call to signup
  const handleSignup = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { normalizeNigerianPhone } = require('@/lib/utils/phone');
      const formattedPhone = normalizeNigerianPhone(phone);
      
      const response = await authApi.signupDeveloper({
        email,
        password,
        phone: formattedPhone,
        full_name: administratorName || email.split('@')[0],
      });
      
      const responseData = response as { otp?: string; user?: { id: string } };
      setUserId(responseData.user?.id || '');
      
      // Store OTP for development testing
      if (responseData.otp) {
        setOtpFromApi(responseData.otp);
        console.log('Development OTP:', responseData.otp);
      }
      
      setStep(VerifyStep.OTP);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Signup failed. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // API call to verify OTP
  const handleVerifyOtp = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { normalizeNigerianPhone } = require('@/lib/utils/phone');
      const formattedPhone = normalizeNigerianPhone(phone);
      const otpString = otp.join('');
      
      await authApi.verifyOtp(formattedPhone, otpString);
      setStep(VerifyStep.COMPANY_DETAILS);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'OTP verification failed.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = async () => {
    setError(null);
    
    if (step === VerifyStep.EMAIL_PASSWORD) {
      if (!isValidEmail()) {
        setError('Please enter a valid email address');
        return;
      }
      if (!isValidPassword()) {
        setError('Password must be at least 8 characters and match confirmation');
        return;
      }
      setStep(VerifyStep.PHONE);
    }
    else if (step === VerifyStep.PHONE) {
      if (!isValidPhone()) {
        setError('Please enter a valid phone number');
        return;
      }
      // Call signup API which will send OTP
      await handleSignup();
    }
    else if (step === VerifyStep.OTP) {
      if (isValidOtp()) {
        await handleVerifyOtp();
      }
    }
    else if (step === VerifyStep.COMPANY_DETAILS) {
      if (isValidCompanyDetails()) {
        setStep(VerifyStep.UPLOAD_CERTIFICATE);
      }
    }
    else if (step === VerifyStep.UPLOAD_CERTIFICATE) {
      if (certificateFile) {
        setStep(VerifyStep.PAYMENT_METHOD);
      }
    }
    else if (step === VerifyStep.PAYMENT_METHOD) setStep(VerifyStep.CONFIGURE_PLAN);
    else if (step === VerifyStep.CONFIGURE_PLAN) setStep(VerifyStep.REVIEW_SUBMIT);
    else if (step === VerifyStep.REVIEW_SUBMIT) setStep(VerifyStep.SUCCESS);
  };

  const handleFinish = async () => {
    setIsLoading(true);
    try {
      // Login with the credentials to get a session
      const loginResponse = await login(email, password);
      
      if (loginResponse.user) {
        // Redirect to developer dashboard
        router.push('/dashboard/developer');
      }
    } catch (err) {
      // Even if login fails, redirect to login page
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  };

  // Render error alert
  const renderError = () => error && (
    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 animate-fadeIn">
      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      <p className="text-red-600 text-sm">{error}</p>
    </div>
  );

  const renderEmailPassword = () => (
    <div className="p-8 animate-fadeIn">
      <h2 className="text-2xl font-bold text-reach-navy mt-4">Create Your Account</h2>
      <p className="text-gray-500 mt-2 mb-8">Enter your email and create a password</p>
      
      {renderError()}
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
          <input 
            type="email" 
            placeholder="Enter your email" 
            aria-label="Email address"
            className={`w-full border rounded-xl p-4 outline-none transition-colors ${
              email && isValidEmail() ? 'border-green-500' : 'border-gray-200 focus:border-reach-red'
            }`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
          <div className="relative">
            <input 
              type={showPassword ? 'text' : 'password'} 
              placeholder="Create a password (min 8 characters)" 
              aria-label="Password"
              className="w-full border border-gray-200 rounded-xl p-4 pr-12 outline-none focus:border-reach-red"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
          <div className="relative">
            <input 
              type={showConfirmPassword ? 'text' : 'password'} 
              placeholder="Confirm your password" 
              aria-label="Confirm password"
              className={`w-full border rounded-xl p-4 pr-12 outline-none transition-colors ${
                confirmPassword && password === confirmPassword ? 'border-green-500' : 'border-gray-200 focus:border-reach-red'
              }`}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>
      </div>
      <button 
        onClick={handleNext} 
        disabled={!email || !password || !confirmPassword || isLoading}
        className={`w-full py-4 mt-12 rounded-2xl font-bold shadow-lg transition-all ${
          email && password && confirmPassword ? 'bg-reach-navy text-white hover:bg-reach-navy/90' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        Continue
      </button>
    </div>
  );

  const renderPhone = () => (
    <div className="p-8 animate-fadeIn">
      <h2 className="text-2xl font-bold text-reach-navy mt-4">Enter your phone Number</h2>
      <p className="text-gray-500 mt-2 mb-8">We&apos;ll send you a quick verification code</p>
      
      {renderError()}
      
      <div className="space-y-4">
         <div className="border border-gray-200 rounded-xl p-4 flex items-center bg-white">
            <span className="font-semibold text-gray-700 mr-2">Nigeria +234</span>
            <svg className="w-4 h-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
         </div>
         <div className="border border-reach-red rounded-xl p-4 bg-white">
            <input 
               type="tel" 
               placeholder="Enter phone number here" 
               aria-label="Phone number"
               className="w-full outline-none text-lg"
               value={phone}
               onChange={(e) => setPhone(e.target.value)}
            />
         </div>
      </div>
      <button 
        onClick={handleNext} 
        disabled={!phone || isLoading}
        className={`w-full py-4 mt-12 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 ${
          phone ? 'bg-reach-navy text-white' : 'bg-gray-200 text-gray-400'
        }`}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Creating Account...
          </>
        ) : 'Continue'}
      </button>
    </div>
  );

  const renderOtp = () => (
    <div className="p-8 animate-fadeIn">
      <h2 className="text-2xl font-bold text-reach-navy mt-4">Verify Your Identity</h2>
      <p className="text-gray-500 mt-2 mb-8">Type in the 6-digit code sent to your phone</p>
      
      {renderError()}
      
      {/* Development helper - show OTP */}
      {otpFromApi && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-blue-600 text-sm">Development Mode - OTP: <strong>{otpFromApi}</strong></p>
        </div>
      )}
      
      <div className="flex gap-3 justify-center mb-8">
        {otp.map((digit, i) => (
          <input
            key={i}
            type="text"
            maxLength={1}
            aria-label={`OTP digit ${i + 1}`}
            className={`w-12 h-14 border-2 rounded-xl text-center text-xl font-bold bg-white focus:outline-none ${
              i === 0 ? 'border-reach-red' : 'border-gray-100 focus:border-reach-red'
            }`}
            value={digit}
            onChange={e => {
              const newOtp = [...otp];
              newOtp[i] = e.target.value;
              setOtp(newOtp);
              // Auto-focus next input
              if (e.target.value && i < 5) {
                const nextInput = document.querySelector(`input:nth-of-type(${i + 2})`) as HTMLInputElement;
                nextInput?.focus();
              }
            }}
          />
        ))}
      </div>
      <p className="text-center text-sm text-gray-400 mb-2">
        Didn&apos;t get code? <span className="text-reach-red font-semibold cursor-pointer">Resend</span>
      </p>
      <button
        onClick={handleNext}
        disabled={!isValidOtp() || isLoading}
        className={`w-full py-4 mt-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 ${
          isValidOtp() ? 'bg-reach-navy text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Verifying...
          </>
        ) : 'Continue'}
      </button>
    </div>
  );

  const renderCompanyDetails = () => (
    <div className="p-8 animate-fadeIn h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div
              key={i}
              className={`h-1.5 w-8 rounded-full ${i === 1 ? 'bg-reach-red' : 'bg-gray-200'}`}
            />
          ))}
        </div>
        <span className="text-xs font-bold text-gray-400">Step 1</span>
      </div>
      <h2 className="text-2xl font-bold text-reach-navy">Company Details</h2>
      <p className="text-gray-500 mt-2 mb-8">Almost Done! Fill in your company details</p>
      
      {renderError()}
      
      <div className="space-y-4">
        <div>
          <input 
            type="text" 
            placeholder="Enter company name here" 
            aria-label="Company name"
            className={`w-full border rounded-xl p-4 outline-none ${
              companyName ? 'border-reach-red' : 'border-gray-100'
            }`}
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1 ml-1">Make sure this matches the name on your ID</p>
        </div>
        <input 
          type="text" 
          placeholder="Enter RC Number here" 
          aria-label="RC Number"
          className="w-full border border-gray-100 rounded-xl p-4 outline-none" 
          value={rcNumber}
          onChange={(e) => setRcNumber(e.target.value)}
        />
        <input 
          type="text" 
          placeholder="Enter name of administrator here" 
          aria-label="Name of administrator"
          className="w-full border border-gray-100 rounded-xl p-4 outline-none" 
          value={administratorName}
          onChange={(e) => setAdministratorName(e.target.value)}
        />
        <div className="border border-gray-100 rounded-xl p-4 flex items-center justify-between bg-white">
          <select 
            className="w-full outline-none bg-transparent"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            aria-label="Select position or role"
          >
            <option value="">Select position/Role here</option>
            <option value="CEO">CEO</option>
            <option value="Agent">Agent</option>
            <option value="Manager">Manager</option>
            <option value="Director">Director</option>
          </select>
        </div>
        <input 
          type="email" 
          placeholder="Enter business email address" 
          aria-label="Business email address"
          className="w-full border border-gray-100 rounded-xl p-4 outline-none" 
          value={businessEmail}
          onChange={(e) => setBusinessEmail(e.target.value)}
        />
        <textarea 
          placeholder="Enter company registered address" 
          aria-label="Company registered address"
          className="w-full border border-gray-100 rounded-xl p-4 outline-none h-24" 
          value={companyAddress}
          onChange={(e) => setCompanyAddress(e.target.value)}
        />
      </div>
      <button 
        onClick={handleNext}
        disabled={!isValidCompanyDetails()}
        className={`w-full py-4 mt-8 rounded-2xl font-bold shadow-lg mb-8 ${
          isValidCompanyDetails() ? 'bg-reach-navy text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        Continue
      </button>
    </div>
  );

  const renderUploadCertificate = () => (
    <div className="p-8 animate-fadeIn h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div
              key={i}
              className={`h-1.5 w-8 rounded-full ${i <= 2 ? 'bg-reach-red' : 'bg-gray-200'}`}
            />
          ))}
        </div>
        <span className="text-xs font-bold text-gray-400">Step 2</span>
      </div>
      <h2 className="text-2xl font-bold text-reach-navy">Upload certificate</h2>
      <p className="text-gray-500 mt-2 mb-8">Please upload one of the selected official documents to verify your business registration</p>
      
      <div className="space-y-3 mb-8">
        {['Certificate of Incorporation', 'CAC / Govt registration document', 'National Identity Number (NIN)'].map(docType => (
          <div 
            key={docType}
            className="p-4 bg-white border border-gray-100 rounded-xl flex items-center justify-between cursor-pointer"
            onClick={() => setSelectedDocumentType(docType)}
          >
            <span>{docType}</span>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              selectedDocumentType === docType ? 'border-reach-navy' : 'border-gray-300'
            }`}>
              {selectedDocumentType === docType && (
                <div className="w-2.5 h-2.5 bg-reach-navy rounded-full" />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 flex flex-col items-center justify-center bg-gray-50 mb-8">
        {certificateFile ? (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded flex items-center justify-center">
                <span className="text-red-600 font-bold text-lg">📄</span>
              </div>
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <p className="text-gray-600 font-medium">{certificateFile.name}</p>
            <p className="text-gray-400 text-sm">Successfully uploaded</p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-gray-600 font-medium">Upload your certificate here</p>
            <p className="text-xs text-gray-400 mt-1">2MB Max · PDF, MS</p>
          </>
        )}
        <input 
          type="file" 
          className="hidden" 
          id="certificate-upload" 
          accept=".pdf,.doc,.docx"
          aria-label="Upload certificate"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) {
              if (file.size > 2 * 1024 * 1024) {
                alert('File size must be less than 2MB');
                return;
              }
              setCertificateFile(file);
            }
          }}
        />
        <label htmlFor="certificate-upload" className="mt-4 text-reach-navy font-bold cursor-pointer underline">
          Browse files
        </label>
      </div>

      <button 
        onClick={handleNext}
        disabled={!certificateFile}
        className={`w-full py-4 rounded-2xl font-bold shadow-lg ${
          certificateFile ? 'bg-reach-navy text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        {certificateFile ? 'Submit & Continue' : 'Continue'}
      </button>
    </div>
  );

  const renderPaymentMethod = () => (
    <div className="p-8 animate-fadeIn h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div
              key={i}
              className={`h-1.5 w-8 rounded-full ${i <= 3 ? 'bg-reach-red' : 'bg-gray-200'}`}
            />
          ))}
        </div>
        <span className="text-xs font-bold text-gray-400">Step 3</span>
      </div>
      <h2 className="text-2xl font-bold text-reach-navy">Payment method</h2>
      <p className="text-gray-500 mt-2 mb-8">Please choose a payment structure for your listing</p>
      
      <div className="bg-gray-50 rounded-xl p-4 space-y-4">
        {[
          { id: 'subscription', label: 'Subscription payment' },
          { id: 'per-listing', label: 'Per-listing payment' }
        ].map(option => (
          <div 
            key={option.id}
            className="p-4 bg-white border border-gray-200 rounded-xl flex items-center justify-between cursor-pointer"
            onClick={() => setPaymentStructure(option.id as 'subscription' | 'per-listing')}
          >
            <span className="font-medium">{option.label}</span>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              paymentStructure === option.id ? 'border-reach-navy' : 'border-gray-300'
            }`}>
              {paymentStructure === option.id && (
                <div className="w-2.5 h-2.5 bg-reach-navy rounded-full" />
              )}
            </div>
          </div>
        ))}
      </div>

      <button 
        onClick={handleNext}
        className="w-full py-4 mt-8 bg-reach-navy text-white rounded-2xl font-bold shadow-lg mb-8"
      >
        Continue
      </button>
    </div>
  );

  const renderConfigurePlan = () => {
    const monthlySubscription = 10000;
    const vat = Math.round(monthlySubscription * 0.075);
    const total = monthlySubscription + vat;
    
    return (
      <div className="p-8 animate-fadeIn h-full overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div
                key={i}
                className={`h-1.5 w-8 rounded-full ${i <= 4 ? 'bg-reach-red' : 'bg-gray-200'}`}
              />
            ))}
          </div>
          <span className="text-xs font-bold text-gray-400">Step 4</span>
        </div>
        <h2 className="text-2xl font-bold text-reach-navy">Configure your plan</h2>
        <p className="text-gray-500 mt-2 mb-8">Confirm your details and submit for verification</p>
        
        <div className="space-y-6">
          <div>
            <h3 className="font-bold text-reach-navy mb-4">Payment Method</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Card Number"
                aria-label="Card number"
                className="w-full border border-gray-100 rounded-xl p-4 outline-none"
                value={cardNumber}
                onChange={e => setCardNumber(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="MM/YY"
                  aria-label="Expiration date"
                  className="w-full border border-gray-100 rounded-xl p-4 outline-none"
                  value={expirationDate}
                  onChange={e => setExpirationDate(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="CVV"
                  aria-label="CVV"
                  className="w-full border border-gray-100 rounded-xl p-4 outline-none"
                  value={securityCode}
                  onChange={e => setSecurityCode(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-reach-navy mb-4">Billing Address</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Full name"
                aria-label="Billing full name"
                className="w-full border border-gray-100 rounded-xl p-4 outline-none"
                value={billingFullName}
                onChange={e => setBillingFullName(e.target.value)}
              />
              <input
                type="text"
                placeholder="Address"
                aria-label="Billing address"
                className="w-full border border-gray-100 rounded-xl p-4 outline-none"
                value={billingAddress}
                onChange={e => setBillingAddress(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-6">
            <div className="flex justify-between items-center mb-3">
              <span className="text-gray-600">Monthly Subscription</span>
              <span className="font-semibold">NGN {monthlySubscription.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-gray-600">VAT (7.5%)</span>
              <span className="font-semibold">NGN {vat.toLocaleString()}</span>
            </div>
            <div className="border-t border-gray-300 my-4"></div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-lg">TOTAL</span>
              <span className="font-bold text-lg">NGN {total.toLocaleString()}</span>
            </div>
            <button 
              onClick={handleNext}
              className="w-full py-4 mt-6 bg-reach-navy text-white rounded-2xl font-bold shadow-lg"
            >
              Subscribe
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderReviewSubmit = () => (
    <div className="p-8 animate-fadeIn h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div
              key={i}
              className={`h-1.5 w-8 rounded-full ${i <= 5 ? 'bg-reach-red' : 'bg-gray-200'}`}
            />
          ))}
        </div>
        <span className="text-xs font-bold text-gray-400">Step 5</span>
      </div>
      <h2 className="text-2xl font-bold text-reach-navy">Review & Submit</h2>
      <p className="text-gray-500 mt-2 mb-8">Confirm your details and submit for verification</p>
      
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
        <div className="space-y-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Email:</span>
            <span className="font-medium">{email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Company:</span>
            <span className="font-medium">{companyName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">RC Number:</span>
            <span className="font-medium">{rcNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Administrator:</span>
            <span className="font-medium">{administratorName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Position:</span>
            <span className="font-medium">{position}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Business Email:</span>
            <span className="font-medium">{businessEmail}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Payment:</span>
            <span className="font-medium capitalize">{paymentStructure.replace('-', ' ')}</span>
          </div>
        </div>
      </div>

      <button 
        onClick={handleNext}
        className="w-full py-4 bg-reach-navy text-white rounded-2xl font-bold shadow-lg mb-8"
      >
        Submit for Verification
      </button>
    </div>
  );

  const renderSuccess = () => (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-gray-100">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-lg">
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-lg">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">Account Created!</h2>
          <p className="text-gray-600 text-center mb-8">
            Your company documents are being reviewed. We&apos;ll update your status as soon as possible.
          </p>
          <button
            onClick={handleFinish}
            disabled={isLoading}
            className="w-full py-4 bg-reach-navy text-white rounded-2xl font-bold shadow-lg hover:bg-blue-900 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Setting up...
              </>
            ) : "Let&apos;s go"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-reach-light">
      <div className="p-6">
        <button type="button" onClick={() => router.back()} aria-label="Go back" className="bg-white p-2 rounded-full shadow-sm">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
      </div>
      {step === VerifyStep.EMAIL_PASSWORD && renderEmailPassword()}
      {step === VerifyStep.PHONE && renderPhone()}
      {step === VerifyStep.OTP && renderOtp()}
      {step === VerifyStep.COMPANY_DETAILS && renderCompanyDetails()}
      {step === VerifyStep.UPLOAD_CERTIFICATE && renderUploadCertificate()}
      {step === VerifyStep.PAYMENT_METHOD && renderPaymentMethod()}
      {step === VerifyStep.CONFIGURE_PLAN && renderConfigurePlan()}
      {step === VerifyStep.REVIEW_SUBMIT && renderReviewSubmit()}
      {step === VerifyStep.SUCCESS && renderSuccess()}
    </div>
  );
};

export default DeveloperRegistration;
