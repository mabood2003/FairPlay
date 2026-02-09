'use client';

import { useState, useEffect } from 'react';
import { UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { followUser, unfollowUser, isFollowing } from '@/lib/firebase/firestore';
import { useAuthContext } from '@/components/auth/AuthProvider';

interface FriendButtonProps {
  targetUserId: string;
}

export default function FriendButton({ targetUserId }: FriendButtonProps) {
  const { user, isAuthenticated } = useAuthContext();
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function checkFollowStatus() {
      if (!user || user.uid === targetUserId) {
        setLoading(false);
        return;
      }
      try {
        const result = await isFollowing(user.uid, targetUserId);
        setFollowing(result);
      } catch {
        // Non-critical
      } finally {
        setLoading(false);
      }
    }
    checkFollowStatus();
  }, [user, targetUserId]);

  if (!isAuthenticated || !user || user.uid === targetUserId) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-2">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  const handleToggleFollow = async () => {
    setActionLoading(true);
    try {
      if (following) {
        await unfollowUser(user.uid, targetUserId);
        setFollowing(false);
      } else {
        await followUser(user.uid, targetUserId);
        setFollowing(true);
      }
    } catch {
      // Non-critical
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggleFollow}
      disabled={actionLoading}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition font-medium text-sm disabled:opacity-50 ${
        following
          ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
          : 'bg-green-600 text-white hover:bg-green-700'
      }`}
    >
      {actionLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : following ? (
        <>
          <UserMinus className="h-4 w-4" />
          Unfollow
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4" />
          Follow
        </>
      )}
    </button>
  );
}
