'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, UserRole } from '../../types';
import { useUser } from '../../contexts/UserContext';
import { authApi, ApiError } from '../../lib/api/client';
import { Loader2, AlertCircle } from 'lucide-react';

enum VerifyStep {
  PERSONAL_DETAILS,  // Collect email/password/name first
  PHONE,
  OTP,
  SUCCESS
}

const BuyerRegistration: React.FC = () => {
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
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const { setUser, login } = useUser();
  const role: UserRole = 'buyer';

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
    const normalized = phone.startsWith('+') ? phone : `+234${phone.replace(/^0/, '')}`;
    return /^\+?[1-9]\d{1,14}$/.test(normalized.replace(/\s/g, ''));
  };

  // API call to signup
  const handleSignup = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+234${phone.replace(/^0/, '')}`;
      
      const response = await authApi.signupBuyer({
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
      const formattedPhone = phone.startsWith('+') ? phone : `+234${phone.replace(/^0/, '')}`;
      const otpString = otp.join('');
      
      await authApi.verifyOtp(formattedPhone, otpString);
      setStep(VerifyStep.SUCCESS);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'OTP verification failed.';
      setError(message);
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
        <h2 className="text-2xl font-bold text-reach-navy mt-4">Tell us About You</h2>
        <p className="text-gray-500 mt-2 mb-8">This helps us personalize your experience</p>
        
        {renderError()}
        
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Enter first name here"
            className="w-full border border-gray-100 rounded-xl p-4 outline-none focus:border-reach-red"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
          />
          <div>
            <input
              type="text"
              placeholder="Enter last name here"
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
            className="w-full border border-gray-100 rounded-xl p-4 outline-none focus:border-reach-red"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <div>
            <input
              type="password"
              placeholder="Enter password here"
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
          <input
            type="password"
            placeholder="Confirm password"
            className="w-full border border-gray-100 rounded-xl p-4 outline-none focus:border-reach-red"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
          />
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
              By selecting Submit, I agree to Reach&apos;s{' '}
              <span className="text-reach-red underline">Terms & Services</span>,{' '}
              <span className="text-reach-red underline">payment terms and service</span> and{' '}
              <span className="text-reach-red underline">privacy policy</span>.
            </p>
          </label>
        </div>
        <button
          onClick={handleNext}
          disabled={!isValidPersonalDetails()}
          className={`w-full py-4 rounded-2xl font-bold shadow-lg mb-8 ${
            isValidPersonalDetails() ? 'bg-reach-navy text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continue
        </button>
      </div>
    );
  };

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
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">Your account is ready!</h2>
          <p className="text-gray-600 text-center mb-8">
            You can now browse properties, save favorites, and contact developers.
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
        <button onClick={() => router.back()} className="bg-white p-2 rounded-full shadow-sm">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
      </div>
      {step === VerifyStep.PERSONAL_DETAILS && renderPersonalDetails()}
      {step === VerifyStep.PHONE && renderPhone()}
      {step === VerifyStep.OTP && renderOtp()}
      {step === VerifyStep.SUCCESS && renderSuccess()}
    </div>
  );
};

export default BuyerRegistration;
