'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { creatorApi, ApiError } from '@/lib/api/client';
import { Loader2, AlertCircle, CheckCircle, ExternalLink, TrendingUp, Users, Heart, Star } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface SocialAccount {
  platform: string;
  handle: string;
  followers?: number;
  engagement_rate?: number;
  verified_at?: string;
}

interface AnalyticsData {
  followers: number;
  engagementRate: number;
  qualityScore: number;
  fakeFollowerPercent?: number;
}

export default function CreatorSocialPage() {
  const router = useRouter();
  const { user } = useUser();
  const [socialLinks, setSocialLinks] = useState({
    instagram: '',
    tiktok: '',
    twitter: '',
  });
  const [linkedAccounts, setLinkedAccounts] = useState<SocialAccount[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<{
    tier?: number;
    analytics?: Record<string, AnalyticsData>;
    message?: string;
  } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const tierLabels: Record<number, { name: string; commission: string; color: string }> = {
    1: { name: 'Elite Creator', commission: '3%', color: 'bg-gradient-to-r from-yellow-400 to-yellow-600' },
    2: { name: 'Professional Creator', commission: '2.5%', color: 'bg-gradient-to-r from-gray-300 to-gray-500' },
    3: { name: 'Rising Creator', commission: '2%', color: 'bg-gradient-to-r from-blue-400 to-blue-600' },
    4: { name: 'Micro Creator', commission: '1.5%', color: 'bg-gradient-to-r from-green-400 to-green-600' },
  };

  const loadSocialAccounts = useCallback(async () => {
    if (!user?.id) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      setIsLoading(true);
      // TODO: Add API endpoint to fetch linked social accounts
      // For now, we'll just show the form
    } catch (err) {
      if (!abortController.signal.aborted) {
        console.error('Failed to load social accounts:', err);
      }
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [user?.id]);

  useEffect(() => {
    loadSocialAccounts();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadSocialAccounts]);

  const handleVerify = async () => {
    setIsVerifying(true);
    setError(null);
    setSuccess(null);
    setVerificationResult(null);

    try {
      // Build social links object (only include non-empty links)
      const links: { instagram?: string; tiktok?: string; twitter?: string } = {};
      if (socialLinks.instagram.trim()) links.instagram = socialLinks.instagram.trim();
      if (socialLinks.tiktok.trim()) links.tiktok = socialLinks.tiktok.trim();
      if (socialLinks.twitter.trim()) links.twitter = socialLinks.twitter.trim();

      if (Object.keys(links).length === 0) {
        setError('Please provide at least one social media link');
        setIsVerifying(false);
        return;
      }

      const result = await creatorApi.verifySocialAccounts(links);

      if (result.success && result.tier) {
        setVerificationResult({
          tier: result.tier,
          analytics: result.analytics,
          message: result.message,
        });
        setSuccess(result.message || 'Social accounts verified successfully!');
        // Reload user data to get updated tier
        window.location.reload();
      } else {
        setError(result.error || 'Failed to verify social accounts');
        if (result.details) {
          setError(`${result.error}\n${result.details.join('\n')}`);
        }
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to verify social accounts';
      setError(message);
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-white" size={32} />
      </div>
    );
  }

  const currentTier = user?.tier || 4;
  const tierInfo = tierLabels[currentTier] || tierLabels[4];

  return (
    <div className="p-6 pb-24 lg:pb-6 space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.back()}
          className="mb-4 text-white/60 hover:text-white transition-colors"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-white">Social Accounts</h1>
        <p className="text-white/60 text-sm mt-1">
          Link your social media accounts to verify your creator tier
        </p>
      </div>

      {/* Current Tier Display */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/60 text-sm mb-1">Current Tier</p>
            <h3 className={`text-2xl font-bold ${tierInfo.color} bg-clip-text text-transparent`}>
              Tier {currentTier} - {tierInfo.name}
            </h3>
            <p className="text-white/60 text-sm mt-1">Commission: {tierInfo.commission} of sale</p>
          </div>
          <div className={`w-20 h-20 rounded-full ${tierInfo.color} flex items-center justify-center text-white text-2xl font-bold`}>
            {currentTier}
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <p className="text-red-400 font-medium">Verification Failed</p>
            <p className="text-red-300 text-sm mt-1 whitespace-pre-line">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle className="text-green-400 flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <p className="text-green-400 font-medium">Success!</p>
            <p className="text-green-300 text-sm mt-1">{success}</p>
          </div>
        </div>
      )}

      {/* Verification Result */}
      {verificationResult && verificationResult.tier && (
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4">Verification Results</h3>
          <div className="space-y-4">
            <div>
              <p className="text-white/60 text-sm mb-2">New Tier</p>
              <div className="flex items-center gap-3">
                <div className={`w-16 h-16 rounded-full ${tierLabels[verificationResult.tier].color} flex items-center justify-center text-white text-xl font-bold`}>
                  {verificationResult.tier}
                </div>
                <div>
                  <p className="text-white font-semibold">{tierLabels[verificationResult.tier].name}</p>
                  <p className="text-white/60 text-sm">Commission: {tierLabels[verificationResult.tier].commission}</p>
                </div>
              </div>
            </div>

            {verificationResult.analytics && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-white/60 text-sm mb-3">Analytics</p>
                <div className="space-y-3">
                  {Object.entries(verificationResult.analytics).map(([platform, data]) => (
                    <div key={platform} className="bg-white/5 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-white font-medium capitalize">{platform}</p>
                        {data.qualityScore > 0 && (
                          <div className="flex items-center gap-1">
                            <Star className="text-yellow-400" size={16} />
                            <span className="text-white text-sm">{data.qualityScore}</span>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-4 mt-3">
                        <div>
                          <p className="text-white/60 text-xs">Followers</p>
                          <p className="text-white font-semibold">{data.followers.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-white/60 text-xs">Engagement</p>
                          <p className="text-white font-semibold">{data.engagementRate.toFixed(1)}%</p>
                        </div>
                        {data.fakeFollowerPercent !== undefined && (
                          <div>
                            <p className="text-white/60 text-xs">Fake Followers</p>
                            <p className="text-white font-semibold">{data.fakeFollowerPercent.toFixed(1)}%</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Social Links Form */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">Add Social Media Links</h3>
        <p className="text-white/60 text-sm mb-6">
          Paste your profile URLs to verify your accounts and recalculate your tier
        </p>

        <div className="space-y-4">
          {[
            { 
              name: 'Instagram', 
              key: 'instagram' as const,
              placeholder: 'https://instagram.com/username',
              icon: '📷',
              color: 'from-purple-600 via-pink-500 to-yellow-400'
            },
            { 
              name: 'TikTok', 
              key: 'tiktok' as const,
              placeholder: 'https://tiktok.com/@username',
              icon: '🎵',
              color: 'bg-black'
            },
            { 
              name: 'Twitter/X', 
              key: 'twitter' as const,
              placeholder: 'https://twitter.com/username',
              icon: '🐦',
              color: 'bg-black'
            },
          ].map((social) => (
            <div key={social.key} className="bg-white/5 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  social.color.includes('from') 
                    ? `bg-gradient-to-br ${social.color}` 
                    : social.color
                }`}>
                  <span className="text-white text-lg">{social.icon}</span>
                </div>
                <span className="font-medium text-white">{social.name}</span>
              </div>
              <input
                type="text"
                placeholder={social.placeholder}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                value={socialLinks[social.key]}
                onChange={(e) => setSocialLinks({ ...socialLinks, [social.key]: e.target.value })}
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleVerify}
          disabled={isVerifying || (!socialLinks.instagram && !socialLinks.tiktok && !socialLinks.twitter)}
          className="w-full mt-6 py-4 bg-white text-reach-navy rounded-xl font-bold hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isVerifying ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Verifying Accounts...
            </>
          ) : (
            <>
              <TrendingUp size={20} />
              Verify & Update Tier
            </>
          )}
        </button>
      </div>

      {/* Tier Requirements Info */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">Tier Requirements</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-yellow-400 font-bold text-xs">1</span>
            </div>
            <div>
              <p className="text-white font-medium">Elite Creator (3% commission)</p>
              <p className="text-white/60">100K+ followers, 3%+ engagement, Quality score 85+</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-gray-400/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-gray-300 font-bold text-xs">2</span>
            </div>
            <div>
              <p className="text-white font-medium">Professional Creator (2.5% commission)</p>
              <p className="text-white/60">50K-100K followers, 2-3% engagement, Quality score 70+</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-400 font-bold text-xs">3</span>
            </div>
            <div>
              <p className="text-white font-medium">Rising Creator (2% commission)</p>
              <p className="text-white/60">10K-50K followers, 1.5-2% engagement, Quality score 60+</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-green-400 font-bold text-xs">4</span>
            </div>
            <div>
              <p className="text-white font-medium">Micro Creator (1.5% commission)</p>
              <p className="text-white/60">5K-10K followers, 1%+ engagement, Quality score 50+</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

