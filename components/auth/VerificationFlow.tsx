
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, UserRole } from '../../types';

enum VerifyStep {
  PHONE,
  OTP,
  DETAILS,
  KYC,
  SUCCESS
}

const VerificationFlow: React.FC = () => {
  const [step, setStep] = useState<VerifyStep>(VerifyStep.PHONE);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const router = useRouter();
  const role = (localStorage.getItem('temp_role') as UserRole) || 'buyer';

  const handleNext = () => {
    if (step === VerifyStep.PHONE) setStep(VerifyStep.OTP);
    else if (step === VerifyStep.OTP) setStep(VerifyStep.DETAILS);
    else if (step === VerifyStep.DETAILS) setStep(VerifyStep.KYC);
    else if (step === VerifyStep.KYC) setStep(VerifyStep.SUCCESS);
  };

  const handleFinish = async () => {
    // NOTE: This component appears to be legacy/unused.
    // In a real implementation, this should call the actual auth API to complete verification
    // For now, redirect to login to ensure users go through proper authentication
    console.warn('VerificationFlow: This component uses mock data and should be updated to use real auth APIs');
    router.push('/login');
  };

  const renderPhone = () => (
    <div className="p-8 animate-fadeIn">
      <h2 className="text-2xl font-bold text-reach-navy mt-4">Enter your phone Number</h2>
      <p className="text-gray-500 mt-2 mb-8">We&apos;ll send you a quick verification code</p>
      
      <div className="space-y-4">
         <div className="border border-gray-200 rounded-xl p-4 flex items-center bg-white">
            <span className="font-semibold text-gray-700 mr-2">Nigeria</span>
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
      <button onClick={handleNext} disabled={!phone} className={`w-full py-4 mt-12 rounded-2xl font-semibold transition-colors ${phone ? 'bg-reach-navy text-white hover:bg-reach-navy/90' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
        Continue
      </button>
    </div>
  );

  const renderOtp = () => (
    <div className="p-8 animate-fadeIn">
      <h2 className="text-2xl font-bold text-reach-navy mt-4">Verify Your Identity</h2>
      <p className="text-gray-500 mt-2 mb-8">Type in the 6-digit code sent to your phone</p>
      
      <div className="flex gap-3 justify-center mb-8">
        {otp.map((digit, i) => (
          <input 
            key={i}
            type="text"
            maxLength={1}
            className="w-12 h-14 border-2 border-gray-100 rounded-xl text-center text-xl font-bold bg-white focus:border-reach-red focus:outline-none"
            value={digit}
            onChange={(e) => {
               const newOtp = [...otp];
               newOtp[i] = e.target.value;
               setOtp(newOtp);
            }}
          />
        ))}
      </div>
      <p className="text-center text-sm text-gray-400">Didn&apos;t get code? <span className="text-reach-red font-semibold">Resend in 33s</span></p>
      <button onClick={handleNext} className="w-full py-4 mt-12 bg-reach-navy text-white rounded-2xl font-semibold hover:bg-reach-navy/90 transition-colors">
        Continue
      </button>
    </div>
  );

  const renderDetails = () => (
    <div className="p-8 animate-fadeIn h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1">
             {[1,2,3,4,5].map(i => <div key={i} className={`h-1.5 w-8 rounded-full ${i <= 1 ? 'bg-reach-red' : 'bg-gray-200'}`} />)}
          </div>
          <span className="text-xs font-bold text-gray-400">Step 1</span>
      </div>
      <h2 className="text-2xl font-bold text-reach-navy">Company Details</h2>
      <p className="text-gray-500 mt-2 mb-8">Almost Done! Fill in your company details</p>
      
      <div className="space-y-4">
         <input type="text" placeholder="Enter company name here" className="w-full border border-reach-red rounded-xl p-4 outline-none" />
         <input type="text" placeholder="Enter RC Number here" className="w-full border border-gray-100 rounded-xl p-4 outline-none" />
         <input type="text" placeholder="Enter name of administrator here" className="w-full border border-gray-100 rounded-xl p-4 outline-none" />
         <select className="w-full border border-gray-100 rounded-xl p-4 outline-none bg-white">
            <option>Select position/Role here</option>
            <option>CEO</option>
            <option>Agent</option>
         </select>
         <input type="email" placeholder="Enter business email address" className="w-full border border-gray-100 rounded-xl p-4 outline-none" />
         <textarea placeholder="Enter company registered address" className="w-full border border-gray-100 rounded-xl p-4 outline-none h-24" />
      </div>
      <button onClick={handleNext} className="w-full py-4 mt-8 bg-reach-navy text-white rounded-2xl font-semibold hover:bg-reach-navy/90 transition-colors mb-8">
        Continue
      </button>
    </div>
  );

  const renderKYC = () => (
    <div className="p-8 animate-fadeIn">
      <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1">
             {[1,2,3,4,5].map(i => <div key={i} className={`h-1.5 w-8 rounded-full ${i <= 2 ? 'bg-reach-red' : 'bg-gray-200'}`} />)}
          </div>
          <span className="text-xs font-bold text-gray-400">Step 2</span>
      </div>
      <h2 className="text-2xl font-bold text-reach-navy">Upload certificate</h2>
      <p className="text-gray-500 mt-2 mb-8">Please upload one of the selected official documents to verify your business</p>
      
      <div className="space-y-4 mb-8">
         <div className="p-4 bg-white border border-gray-100 rounded-xl flex items-center justify-between">
            <span>Certificate of Incorporation</span>
            <div className="w-5 h-5 rounded-full border-2 border-reach-navy flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-reach-navy rounded-full" />
            </div>
         </div>
      </div>

      <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 flex flex-col items-center justify-center bg-gray-50 mb-12">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
          </div>
          <p className="text-gray-600 font-medium">Upload your certificate here</p>
          <p className="text-xs text-gray-400 mt-1">2MB Max · PDF, PNG, JPG</p>
          <input type="file" className="hidden" id="kyc-upload" />
          <label htmlFor="kyc-upload" className="mt-4 text-reach-navy font-bold cursor-pointer underline">Browse files</label>
      </div>

      <button onClick={handleNext} className="w-full py-4 bg-reach-navy text-white rounded-2xl font-semibold hover:bg-reach-navy/90 transition-colors">
        Submit & Continue
      </button>
    </div>
  );

  const renderSuccess = () => (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-reach-navy">
        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-8 shadow-xl">
           <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
        </div>
        <h2 className="text-3xl font-bold text-white text-center">Verification in progress</h2>
        <p className="text-blue-100 text-center mt-4 mb-12 max-w-xs break-words">
          Your company documents are being reviewed. We&apos;ll update your status as soon as possible.
        </p>
        <button 
          onClick={handleFinish}
          className="w-full py-4 bg-reach-navy text-white rounded-2xl font-semibold hover:bg-reach-navy/90 transition-colors"
        >
          Let&apos;s go
        </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[320px] h-[320px] sm:w-[420px] sm:h-[420px] bg-[linear-gradient(180deg,#C1272D_0%,#D17A39_100%)] rounded-full opacity-20 blur-3xl" />
      </div>
      <div className="relative z-10 min-h-screen flex flex-col">
        <div className="p-6">
          <button onClick={() => router.back()} className="bg-white p-2 rounded-full shadow-sm">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
        </div>
        {step === VerifyStep.PHONE && renderPhone()}
        {step === VerifyStep.OTP && renderOtp()}
        {step === VerifyStep.DETAILS && renderDetails()}
        {step === VerifyStep.KYC && renderKYC()}
        {step === VerifyStep.SUCCESS && renderSuccess()}
      </div>
    </div>
  );
};

export default VerificationFlow;
