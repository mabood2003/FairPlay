'use client';

import Link from 'next/link';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { MapPin, Trophy, Shield, Users } from 'lucide-react';

export default function Home() {
  const { isAuthenticated, loading } = useAuthContext();

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Trophy className="h-8 w-8 text-green-600" />
          <span className="text-2xl font-bold text-gray-900">FairPlay</span>
        </div>
        <div className="flex gap-4">
          {loading ? (
            <div className="h-10 w-24 bg-gray-200 animate-pulse rounded-lg" />
          ) : isAuthenticated ? (
            <Link
              href="/games"
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              Find Games
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-6 py-2 text-gray-700 hover:text-gray-900 transition"
              >
                Log In
              </Link>
              <Link
                href="/login?signup=true"
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          Find Your
          <span className="text-green-600"> Perfect Game</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Discover local pickup games, compete with players at your skill level, and build your
          reputation in the community.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href={isAuthenticated ? '/games' : '/login?signup=true'}
            className="px-8 py-4 bg-green-600 text-white text-lg rounded-lg hover:bg-green-700 transition shadow-lg"
          >
            Get Started
          </Link>
          <Link
            href="/games"
            className="px-8 py-4 bg-white text-gray-700 text-lg rounded-lg hover:bg-gray-50 transition shadow-lg border"
          >
            Browse Games
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Why Choose FairPlay?
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<MapPin className="h-8 w-8" />}
            title="Find Games Nearby"
            description="Discover pickup games on an interactive map. Filter by sport, skill level, and distance."
          />
          <FeatureCard
            icon={<Trophy className="h-8 w-8" />}
            title="Elo-Based Matching"
            description="Our rating system ensures fair matchups. Compete with players at your skill level."
          />
          <FeatureCard
            icon={<Shield className="h-8 w-8" />}
            title="Reliability Scores"
            description="No more flakes. Our check-in system rewards players who show up."
          />
        </div>
      </section>

      {/* Sports Section */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Available Sports
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            <SportCard
              name="Basketball"
              emoji="🏀"
              color="bg-orange-500"
              description="5v5, 3v3, or pickup games"
            />
            <SportCard
              name="Soccer"
              emoji="⚽"
              color="bg-green-600"
              description="Full field or small-sided games"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Ready to Play?
        </h2>
        <p className="text-gray-600 mb-8">
          Join thousands of players finding their perfect game every day.
        </p>
        <Link
          href={isAuthenticated ? '/games/create' : '/login?signup=true'}
          className="inline-flex items-center gap-2 px-8 py-4 bg-green-600 text-white text-lg rounded-lg hover:bg-green-700 transition shadow-lg"
        >
          <Users className="h-5 w-5" />
          {isAuthenticated ? 'Host a Game' : 'Create Account'}
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-600">
          <p>&copy; 2024 FairPlay. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white p-8 rounded-xl shadow-lg text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 text-green-600 rounded-full mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function SportCard({
  name,
  emoji,
  color,
  description,
}: {
  name: string;
  emoji: string;
  color: string;
  description: string;
}) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-lg flex items-center gap-4">
      <div
        className={`w-16 h-16 ${color} rounded-xl flex items-center justify-center text-3xl`}
      >
        {emoji}
      </div>
      <div>
        <h3 className="text-xl font-semibold text-gray-900">{name}</h3>
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  );
}
