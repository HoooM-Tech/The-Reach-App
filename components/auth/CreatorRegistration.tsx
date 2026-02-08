'use client';

import { User, UserRole } from '../../types';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '../../contexts/UserContext';
import { authApi, creatorApi, ApiError } from '../../lib/api/client';
import { Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';

enum VerifyStep {
  PERSONAL_DETAILS,  // Collect email/password first
  PHONE,
  OTP,
  SOCIAL_LINKS,
  SUCCESS
}

const CreatorRegistration: React.FC = () => {
  const [step, setStep] = useState<VerifyStep>(VerifyStep.PERSONAL_DETAILS);
  
  // Personal details
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  // Phone/OTP verification
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpFromApi, setOtpFromApi] = useState<string | null>(null);
  
  // Social links
  const [instagramLink, setInstagramLink] = useState('');
  const [twitterLink, setTwitterLink] = useState('');
  const [facebookLink, setFacebookLink] = useState('');
  const [linkedinLink, setLinkedinLink] = useState('');
  const [emailLink, setEmailLink] = useState('');
  const [tiktokLink, setTiktokLink] = useState('');
  
  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatorTier, setCreatorTier] = useState<number>(1);
  const [verificationResult, setVerificationResult] = useState<{
    tier?: number;
    analytics?: Record<string, any>;
    message?: string;
  } | null>(null);
  
  const router = useRouter();
  const { login } = useUser();
  const role: UserRole = 'creator';

  const isValidOtp = () => {
    return otp.every(digit => digit.trim() !== '') && otp.length === 6;
  };

  const validatePassword = () => {
    const hasMinLength = password.length >= 8;
    const hasSymbolOrNumber = /[!@#$%^&*(),.?":{}|<>0-9]/.test(password);
    const doesntIncludeName = !firstName && !lastName ? true : 
      !password.toLowerCase().includes(firstName.toLowerCase()) && 
      !password.toLowerCase().includes(lastName.toLowerCase());
    const doesntIncludeEmail = !email ? true : !password.toLowerCase().includes(email.toLowerCase().split('@')[0]);
    
    return { hasMinLength, hasSymbolOrNumber, doesntIncludeName, doesntIncludeEmail };
  };

  const isValidPersonalDetails = () => {
    const passwordValidation = validatePassword();
    return (
      firstName.trim() !== '' &&
      lastName.trim() !== '' &&
      email.trim() !== '' &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
      password.trim() !== '' &&
      confirmPassword.trim() !== '' &&
      password === confirmPassword &&
      passwordValidation.hasMinLength &&
      passwordValidation.hasSymbolOrNumber &&
      passwordValidation.doesntIncludeName &&
      passwordValidation.doesntIncludeEmail &&
      agreedToTerms
    );
  };

  const isValidPhone = () => {
    if (!phone.trim()) return false;
    try {
      const { validateNigerianPhone } = require('@/lib/utils/phone');
      return validateNigerianPhone(phone);
    } catch {
      return false;
    }
  };

  // API call to signup
  const handleSignup = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { normalizeNigerianPhone } = require('@/lib/utils/phone');
      const formattedPhone = normalizeNigerianPhone(phone);
      
      const response = await authApi.signupCreator({
        email,
        password,
        phone: formattedPhone,
        full_name: `${firstName} ${lastName}`.trim(),
      });
      
      // Store OTP for development testing
      const responseData = response as { otp?: string; user?: any };
      if (responseData.otp) {
        setOtpFromApi(responseData.otp);
        console.log('Development OTP:', responseData.otp);
      }
      
      // Get creator tier from response
      if (responseData.user?.tier) {
        setCreatorTier(responseData.user.tier);
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
      setStep(VerifyStep.SOCIAL_LINKS);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'OTP verification failed.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // API call to verify social links
  const handleVerifySocialLinks = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Build social links object (only include non-empty links)
      const socialLinks: { instagram?: string; tiktok?: string; twitter?: string } = {};
      if (instagramLink.trim()) socialLinks.instagram = instagramLink.trim();
      if (tiktokLink.trim()) socialLinks.tiktok = tiktokLink.trim();
      if (twitterLink.trim()) socialLinks.twitter = twitterLink.trim();

      // If no social links provided, skip verification and go to success
      if (Object.keys(socialLinks).length === 0) {
        setStep(VerifyStep.SUCCESS);
        return;
      }

      // Ensure the creator is authenticated before verification
      try {
        await login(email, password);
      } catch {
        setError('Unable to start verification. Please log in to verify your social accounts.');
        setStep(VerifyStep.SUCCESS);
        return;
      }

      // Verify social accounts
      const result = await creatorApi.verifySocialAccounts(socialLinks);
      
      if (result.success && result.tier) {
        setCreatorTier(result.tier);
        setVerificationResult({
          tier: result.tier,
          analytics: result.analytics,
          message: result.message,
        });
        // Show warnings if some platforms failed but others succeeded
        if (result.warnings && result.warnings.length > 0) {
          setError(`Some accounts couldn't be verified: ${result.warnings.join(', ')}. Your tier was calculated based on verified accounts.`);
        }
        setStep(VerifyStep.SUCCESS);
      } else {
        // Show error but allow them to continue
        setError(result.error || 'Failed to verify social accounts. You can update your social accounts later in settings.');
        setVerificationResult({
          tier: 0, // Tier 0 means unverified/unqualified
          message: 'You can update your social accounts later in settings',
        });
        setStep(VerifyStep.SUCCESS);
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to verify social accounts.';
      setError(message);
      // Allow them to continue even if verification fails
      setVerificationResult({
        tier: 0, // Tier 0 means unverified/unqualified
        message: 'You can update your social accounts later in settings',
      });
      setStep(VerifyStep.SUCCESS);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = async () => {
    setError(null);
    
    if (step === VerifyStep.PERSONAL_DETAILS) {
      if (isValidPersonalDetails()) {
        setStep(VerifyStep.PHONE);
      }
    }
    else if (step === VerifyStep.PHONE) {
      if (!isValidPhone()) {
        setError('Please enter a valid phone number');
        return;
      }
      await handleSignup();
    }
    else if (step === VerifyStep.OTP) {
      if (isValidOtp()) {
        await handleVerifyOtp();
      }
    }
    else if (step === VerifyStep.SOCIAL_LINKS) {
      await handleVerifySocialLinks();
    }
  };

  const handleFinish = async () => {
    setIsLoading(true);
    try {
      // Login with the credentials to get a session
      await login(email, password);
      router.push('/dashboard');
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

  const renderPersonalDetails = () => {
    const passwordValidation = validatePassword();
    
    return (
      <div className="p-8 animate-fadeIn h-full overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className={`h-1.5 w-8 rounded-full ${i === 1 ? 'bg-reach-red' : 'bg-gray-200'}`}
              />
            ))}
          </div>
          <span className="text-xs font-bold text-gray-400">Step 1</span>
        </div>
        <h2 className="text-2xl font-bold text-reach-navy">Tell us About You</h2>
        <p className="text-gray-500 mt-2 mb-8">This helps us personalize your experience</p>
        
        {renderError()}
        
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Enter first name here"
            aria-label="First name"
            className="w-full border border-gray-100 rounded-xl p-4 outline-none focus:border-reach-red"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
          />
          <div>
            <input
              type="text"
              placeholder="Enter last name here"
              aria-label="Last name"
              className={`w-full border rounded-xl p-4 outline-none ${
                lastName ? 'border-reach-red' : 'border-gray-100'
              }`}
              value={lastName}
              onChange={e => setLastName(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1 ml-1">Make sure this matches the name on your ID</p>
          </div>
          <input
            type="email"
            placeholder="Enter email address"
            aria-label="Email address"
            className="w-full border border-gray-100 rounded-xl p-4 outline-none focus:border-reach-red"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <div>
            <input
              type="password"
              placeholder="Enter password here"
              aria-label="Password"
              className="w-full border border-gray-100 rounded-xl p-4 outline-none focus:border-reach-red"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2 text-xs">
                {passwordValidation.hasMinLength ? (
                  <span className="text-green-600">✓</span>
                ) : (
                  <span className="text-red-500">✗</span>
                )}
                <span className={passwordValidation.hasMinLength ? 'text-gray-600' : 'text-gray-400'}>
                  Use at least 8 characters for a strong, secure password.
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {passwordValidation.hasSymbolOrNumber ? (
                  <span className="text-green-600">✓</span>
                ) : (
                  <span className="text-red-500">✗</span>
                )}
                <span className={passwordValidation.hasSymbolOrNumber ? 'text-gray-600' : 'text-gray-400'}>
                  Must have at least one symbol or number.
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {passwordValidation.doesntIncludeName && passwordValidation.doesntIncludeEmail ? (
                  <span className="text-green-600">✓</span>
                ) : (
                  <span className="text-red-500">✗</span>
                )}
                <span className={passwordValidation.doesntIncludeName && passwordValidation.doesntIncludeEmail ? 'text-gray-600' : 'text-gray-400'}>
                  Can&apos;t include name or email address.
                </span>
              </div>
            </div>
          </div>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm password"
              aria-label="Confirm password"
              className="w-full border border-gray-100 rounded-xl p-4 pr-12 outline-none focus:border-reach-red"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
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
        <div className="mt-6 mb-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={e => setAgreedToTerms(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-gray-300 text-reach-red focus:ring-reach-red"
            />
            <p className="text-xs text-gray-600">
              By selecting Agree and continue, I agree to Reach&apos;s{' '}
              <span className="text-reach-red underline">Terms & Services</span>,{' '}
              <span className="text-reach-red underline">payment terms and service</span> and{' '}
              <span className="text-reach-red underline">privacy policy</span>.
            </p>
          </label>
        </div>
        <button
          onClick={handleNext}
          disabled={!isValidPersonalDetails()}
          className={`w-full py-4 rounded-2xl font-semibold transition-colors mb-8 ${
            isValidPersonalDetails() ? 'bg-reach-navy text-white hover:bg-reach-navy/90' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Agree and Continue
        </button>
      </div>
    );
  };

  const renderPhone = () => (
    <div className="p-8 animate-fadeIn">
      <h2 className="text-2xl font-bold text-reach-navy mt-4">Enter your phone number</h2>
      <p className="text-gray-500 mt-2 mb-8">We&apos;ll send you a quick verification code</p>
      
      {renderError()}
      
      <div className="space-y-4">
        <div className="border border-gray-200 rounded-xl p-4 flex items-center bg-white">
          <span className="font-semibold text-gray-700 mr-2">Nigeria +234</span>
          <svg className="w-4 h-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
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
        className={`w-full py-4 mt-12 rounded-2xl font-semibold transition-colors flex items-center justify-center gap-2 ${
          phone ? 'bg-reach-navy text-white hover:bg-reach-navy/90' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
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
              if (e.target.value && i < 5) {
                const inputs = document.querySelectorAll('input[maxlength="1"]');
                (inputs[i + 1] as HTMLInputElement)?.focus();
              }
            }}
          />
        ))}
      </div>
      <p className="text-center text-sm text-gray-400 mb-2">
        Didn&apos;t get code? <span className="text-reach-red font-semibold cursor-pointer">Resend</span>
      </p>
      <p className="text-center text-sm text-reach-red mb-8 cursor-pointer" onClick={() => setStep(VerifyStep.PHONE)}>
        Change phone number
      </p>
      <button
        onClick={handleNext}
        disabled={!isValidOtp() || isLoading}
        className={`w-full py-4 mt-4 rounded-2xl font-semibold transition-colors flex items-center justify-center gap-2 ${
          isValidOtp() ? 'bg-reach-navy text-white hover:bg-reach-navy/90' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
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

  const renderSocialLinks = () => (
    <div className="p-8 animate-fadeIn h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className={`h-1.5 w-8 rounded-full ${i <= 2 ? 'bg-reach-red' : 'bg-gray-200'}`}
            />
          ))}
        </div>
        <span className="text-xs font-bold text-gray-400">Step 2</span>
      </div>
      <h2 className="text-2xl font-bold text-reach-navy">Link your social account</h2>
      <p className="text-gray-500 mt-2 mb-8">Linking your social account helps determine your creator tier</p>
      
      <div className="space-y-4">
        {/* Social link inputs */}
        {[
          { name: 'Instagram', value: instagramLink, setValue: setInstagramLink, color: 'from-purple-600 via-pink-500 to-yellow-400' },
          { name: 'X (Twitter)', value: twitterLink, setValue: setTwitterLink, color: 'bg-black' },
          { name: 'Facebook', value: facebookLink, setValue: setFacebookLink, color: 'bg-blue-600' },
          { name: 'TikTok', value: tiktokLink, setValue: setTiktokLink, color: 'bg-black' },
        ].map((social) => (
          <div key={social.name} className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-8 h-8 rounded flex items-center justify-center ${social.color.includes('from') ? `bg-gradient-to-br ${social.color}` : social.color}`}>
                <span className="text-white font-bold text-sm">{social.name[0]}</span>
              </div>
              <span className="font-medium">{social.name}</span>
            </div>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg p-3">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <input
                type="text"
                placeholder="Paste your profile link"
                aria-label={`${social.name} profile link`}
                className="flex-1 outline-none"
                value={social.value}
                onChange={e => social.setValue(e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-sm text-gray-400 mt-6 mb-4">
        {instagramLink || tiktokLink || twitterLink 
          ? 'We&apos;ll verify your accounts and calculate your creator tier'
          : 'You can skip this step and add them later'}
      </p>

      <button
        onClick={handleNext}
        disabled={isLoading}
        className="w-full py-4 bg-reach-navy text-white rounded-2xl font-semibold hover:bg-reach-navy/90 transition-colors mb-8 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="animate-spin" size={20} />
            Verifying accounts...
          </>
        ) : (
          'Continue'
        )}
      </button>
    </div>
  );

  const renderSuccess = () => {
    const tierLabels: Record<number, { name: string; commission: string; color: string }> = {
      0: { name: 'Unverified', commission: '0%', color: 'bg-gray-200' },
      1: { name: 'Elite Creator', commission: '3%', color: 'bg-gradient-to-r from-yellow-400 to-yellow-600' },
      2: { name: 'Professional Creator', commission: '2.5%', color: 'bg-gradient-to-r from-gray-300 to-gray-500' },
      3: { name: 'Rising Creator', commission: '2%', color: 'bg-gradient-to-r from-blue-400 to-blue-600' },
      4: { name: 'Micro Creator', commission: '1.5%', color: 'bg-gradient-to-r from-green-400 to-green-600' },
    };
    
    const tierInfo = tierLabels[creatorTier] || tierLabels[0];
    
    return (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-gray-100 animate-fadeIn">
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
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">You&apos;re all set!</h2>
          {verificationResult?.tier ? (
            <div className="w-full mb-6">
              <div className={`${tierInfo.color} rounded-xl p-4 mb-4 text-center`}>
                <p className="text-white text-sm mb-1">Your Creator Tier</p>
                <p className="text-white text-2xl font-bold">{tierInfo.name}</p>
                <p className="text-white/90 text-sm mt-1">Commission: {tierInfo.commission} of sale</p>
              </div>
              {verificationResult.message && (
                <p className="text-green-600 text-sm text-center mb-4">{verificationResult.message}</p>
              )}
            </div>
          ) : (
            <p className="text-gray-600 text-center mb-8">
              Congratulations!!! You&apos;re a <span className="font-bold text-gray-900">Tier-{creatorTier}</span> Creator
            </p>
          )}
          <button
            onClick={handleFinish}
            disabled={isLoading}
            className="w-full py-4 bg-reach-navy text-white rounded-2xl font-semibold hover:bg-reach-navy/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Setting up...
              </>
            ) : "Let's go"}
          </button>
        </div>
      </div>
    </div>
    );
  };

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[320px] h-[320px] sm:w-[420px] sm:h-[420px] bg-[linear-gradient(180deg,#C1272D_0%,#D17A39_100%)] rounded-full opacity-20 blur-3xl" />
      </div>
      <div className="relative z-10 min-h-screen flex flex-col">
        <div className="p-6">
          <button type="button" onClick={() => router.back()} aria-label="Go back" className="bg-white p-2 rounded-full shadow-sm">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          </button>
        </div>
        {step === VerifyStep.PERSONAL_DETAILS && renderPersonalDetails()}
        {step === VerifyStep.PHONE && renderPhone()}
        {step === VerifyStep.OTP && renderOtp()}
        {step === VerifyStep.SOCIAL_LINKS && renderSocialLinks()}
        {step === VerifyStep.SUCCESS && renderSuccess()}
      </div>
    </div>
  );
};

export default CreatorRegistration;
