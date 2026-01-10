import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  InviteHero,
  InvitePlanCard,
  InviteActions,
  SuggestChangeSheet,
  InviteStatus,
  PoweredByFooter,
} from '@/components/invite';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { getStoredFingerprint } from '@/lib/fingerprint';

interface InviteData {
  id: string;
  hostName: string;
  intent?: string;
  message?: string;
  planJson: {
    restaurant?: {
      id: string;
      name: string;
      address?: string;
      cuisine?: string;
      rating?: number;
      priceLevel?: string;
      photoUrl?: string;
      website?: string;
    };
    activity?: {
      id: string;
      name: string;
      address?: string;
      category?: string;
      rating?: number;
      photoUrl?: string;
      website?: string;
    };
    scheduledDate?: string;
    scheduledTime?: string;
    distanceBetween?: string;
  };
  inviteeCount: number;
  createdAt: string;
  expiresAt?: string;
}

interface ResponseCounts {
  in?: number;
  maybe?: number;
  out?: number;
  suggest_change?: number;
}

const InvitePage: React.FC = () => {
  const { inviteId } = useParams<{ inviteId: string }>();
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [responseCounts, setResponseCounts] = useState<ResponseCounts>({});
  const [totalResponses, setTotalResponses] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responderName, setResponderName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasResponded, setHasResponded] = useState(false);
  const [showSuggestSheet, setShowSuggestSheet] = useState(false);
  const [fingerprint, setFingerprint] = useState<string | null>(null);

  // Generate fingerprint on mount
  useEffect(() => {
    getStoredFingerprint().then(setFingerprint);
  }, []);

  useEffect(() => {
    const fetchInvite = async () => {
      if (!inviteId) {
        setError('Invalid invite link');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-invite?inviteId=${inviteId}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to load invite');
        }

        const result = await response.json();
        setInvite(result.invite);
        setResponseCounts(result.responseCounts || {});
        setTotalResponses(result.totalResponses || 0);
      } catch (err: any) {
        console.error('Error fetching invite:', err);
        setError(err.message || 'Failed to load invite');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvite();
  }, [inviteId]);

  const handleResponse = async (response: 'in' | 'maybe' | 'out') => {
    if (!inviteId || !fingerprint) return;
    
    if (!responderName.trim()) {
      const name = prompt('Please enter your name:');
      if (!name) return;
      setResponderName(name);
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('respond-invite', {
        body: {
          inviteId,
          responderName: responderName.trim() || 'Guest',
          response,
          fingerprint,
        },
      });

      if (error) throw error;
      if (data?.alreadyResponded) {
        setHasResponded(true);
        alert('You have already responded to this invite.');
        return;
      }
      setHasResponded(true);
    } catch (err: any) {
      console.error('Error responding:', err);
      if (err.message?.includes('already responded')) {
        setHasResponded(true);
        alert('You have already responded to this invite.');
      } else {
        alert('Failed to send response. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuggestChange = async (suggestion: {
    type: string;
    note: string;
    responderName: string;
  }) => {
    if (!inviteId || !fingerprint) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('respond-invite', {
        body: {
          inviteId,
          responderName: suggestion.responderName || 'Guest',
          response: 'suggest_change',
          suggestionJson: {
            type: suggestion.type,
            note: suggestion.note,
          },
          fingerprint,
        },
      });

      if (error) throw error;
      if (data?.alreadyResponded) {
        setHasResponded(true);
        alert('You have already responded to this invite.');
        setShowSuggestSheet(false);
        return;
      }
      setHasResponded(true);
      setShowSuggestSheet(false);
    } catch (err: any) {
      console.error('Error suggesting change:', err);
      if (err.message?.includes('already responded')) {
        setHasResponded(true);
        setShowSuggestSheet(false);
      } else {
        alert('Failed to send suggestion. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your invitation...</p>
        </motion.div>
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/20 mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">
            {error === 'This invite has expired' ? 'Invite Expired' : 'Invite Not Found'}
          </h1>
          <p className="text-muted-foreground">
            {error || "This invitation doesn't exist or has been removed."}
          </p>
        </motion.div>
      </div>
    );
  }

  const { planJson } = invite;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background gradient */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-lg mx-auto px-4">
        {/* Hero section */}
        <InviteHero
          hostName={invite.hostName}
          intent={invite.intent}
          message={invite.message}
          scheduledDate={planJson.scheduledDate}
          scheduledTime={planJson.scheduledTime}
        />

        {/* Plan cards */}
        <div className="space-y-4 mb-8">
          {planJson.restaurant && (
            <InvitePlanCard
              type="restaurant"
              place={{
                id: planJson.restaurant.id,
                name: planJson.restaurant.name,
                address: planJson.restaurant.address,
                cuisine: planJson.restaurant.cuisine,
                rating: planJson.restaurant.rating,
                priceLevel: planJson.restaurant.priceLevel,
                photoUrl: planJson.restaurant.photoUrl,
                website: planJson.restaurant.website,
              }}
              delay={0.5}
            />
          )}

          {planJson.activity && (
            <InvitePlanCard
              type="activity"
              place={{
                id: planJson.activity.id,
                name: planJson.activity.name,
                address: planJson.activity.address,
                category: planJson.activity.category,
                rating: planJson.activity.rating,
                photoUrl: planJson.activity.photoUrl,
                website: planJson.activity.website,
              }}
              delay={0.6}
            />
          )}

          {/* Distance between */}
          {planJson.distanceBetween && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-center text-sm text-muted-foreground"
            >
              {planJson.distanceBetween} apart
            </motion.p>
          )}
        </div>

        {/* Name input if not responded yet */}
        {!hasResponded && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
            className="mb-6"
          >
            <Label htmlFor="responderName" className="text-sm text-foreground mb-2 block">
              Your Name
            </Label>
            <Input
              id="responderName"
              value={responderName}
              onChange={(e) => setResponderName(e.target.value)}
              placeholder="Enter your name"
              className="bg-card/50"
            />
          </motion.div>
        )}

        {/* Action buttons */}
        <InviteActions
          onResponse={handleResponse}
          onSuggestChange={() => setShowSuggestSheet(true)}
          isSubmitting={isSubmitting}
          hasResponded={hasResponded}
        />

        {/* Response status */}
        <InviteStatus
          responseCounts={responseCounts}
          totalResponses={totalResponses}
          inviteeCount={invite.inviteeCount}
        />

        {/* Footer */}
        <PoweredByFooter />
      </div>

      {/* Suggest change sheet */}
      <SuggestChangeSheet
        open={showSuggestSheet}
        onOpenChange={setShowSuggestSheet}
        onSubmit={handleSuggestChange}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default InvitePage;
