'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Loader2 } from 'lucide-react';
import { getFollowing, getFollowers } from '@/lib/firebase/firestore';
import { getUserProfile } from '@/lib/firebase/auth';
import { User } from '@/lib/types';

interface FriendsListProps {
  userId: string;
}

export default function FriendsList({ userId }: FriendsListProps) {
  const [tab, setTab] = useState<'following' | 'followers'>('following');
  const [followingUsers, setFollowingUsers] = useState<User[]>([]);
  const [followerUsers, setFollowerUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFriends() {
      setLoading(true);
      try {
        const [followingIds, followerIds] = await Promise.all([
          getFollowing(userId),
          getFollowers(userId),
        ]);

        const loadProfiles = async (ids: string[]) => {
          const profiles = await Promise.all(ids.map((id) => getUserProfile(id)));
          return profiles.filter((p): p is User => p !== null);
        };

        const [followingProfiles, followerProfiles] = await Promise.all([
          loadProfiles(followingIds),
          loadProfiles(followerIds),
        ]);

        setFollowingUsers(followingProfiles);
        setFollowerUsers(followerProfiles);
      } catch {
        // Non-critical
      } finally {
        setLoading(false);
      }
    }
    loadFriends();
  }, [userId]);

  const currentList = tab === 'following' ? followingUsers : followerUsers;

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="flex border-b">
        <button
          onClick={() => setTab('following')}
          className={`flex-1 py-3 text-center text-sm font-medium transition ${
            tab === 'following'
              ? 'text-green-600 border-b-2 border-green-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Following ({followingUsers.length})
        </button>
        <button
          onClick={() => setTab('followers')}
          className={`flex-1 py-3 text-center text-sm font-medium transition ${
            tab === 'followers'
              ? 'text-green-600 border-b-2 border-green-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Followers ({followerUsers.length})
        </button>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : currentList.length === 0 ? (
          <div className="text-center py-6">
            <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">
              {tab === 'following' ? 'Not following anyone yet' : 'No followers yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {currentList.map((person) => (
              <Link
                key={person.uid}
                href={`/profile/${person.uid}`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition"
              >
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-medium">
                  {person.displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{person.displayName}</p>
                  <p className="text-xs text-gray-500">
                    {person.gamesPlayed} games &middot; {person.reliabilityScore}% reliable
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
