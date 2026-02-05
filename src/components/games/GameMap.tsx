'use client';

import { useCallback, useState } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { Game } from '@/lib/types';
import { format } from 'date-fns';
import Link from 'next/link';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: 40.7128,
  lng: -74.006,
};

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
};

interface GameMapProps {
  games: Game[];
  center?: { lat: number; lng: number };
  onMapClick?: (lat: number, lng: number) => void;
  selectedLocation?: { lat: number; lng: number } | null;
}

export default function GameMap({ games, center, onMapClick, selectedLocation }: GameMapProps) {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places'],
  });

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (onMapClick && e.latLng) {
        onMapClick(e.latLng.lat(), e.latLng.lng());
      }
    },
    [onMapClick]
  );

  const getMarkerIcon = (sport: string): string => {
    const colors: Record<string, string> = {
      basketball: '#F97316',
      soccer: '#22C55E',
    };
    return `data:image/svg+xml,${encodeURIComponent(`
      <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.16 0 0 7.16 0 16C0 28 16 40 16 40C16 40 32 28 32 16C32 7.16 24.84 0 16 0Z" fill="${colors[sport] || '#6B7280'}"/>
        <circle cx="16" cy="14" r="8" fill="white"/>
      </svg>
    `)}`;
  };

  if (loadError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
        <p className="text-gray-500">Error loading maps. Please check your API key.</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center || defaultCenter}
      zoom={13}
      options={mapOptions}
      onClick={handleMapClick}
    >
      {games.map((game) => (
        <Marker
          key={game.gameId}
          position={{ lat: game.location.lat, lng: game.location.lng }}
          icon={{
            url: getMarkerIcon(game.sport),
            scaledSize: new google.maps.Size(32, 40),
          }}
          onClick={() => setSelectedGame(game)}
        />
      ))}

      {selectedLocation && (
        <Marker
          position={selectedLocation}
          icon={{
            url: `data:image/svg+xml,${encodeURIComponent(`
              <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 0C7.16 0 0 7.16 0 16C0 28 16 40 16 40C16 40 32 28 32 16C32 7.16 24.84 0 16 0Z" fill="#3B82F6"/>
                <circle cx="16" cy="14" r="8" fill="white"/>
              </svg>
            `)}`,
            scaledSize: new google.maps.Size(32, 40),
          }}
        />
      )}

      {selectedGame && (
        <InfoWindow
          position={{ lat: selectedGame.location.lat, lng: selectedGame.location.lng }}
          onCloseClick={() => setSelectedGame(null)}
        >
          <div className="p-2 max-w-xs">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">
                {selectedGame.sport === 'basketball' ? '🏀' : '⚽'}
              </span>
              <div>
                <h3 className="font-semibold text-gray-900">{selectedGame.location.name}</h3>
                <p className="text-sm text-gray-500">{selectedGame.location.address}</p>
              </div>
            </div>
            <div className="text-sm text-gray-600 mb-2">
              <p>
                {format(selectedGame.startTime.toDate(), 'MMM d, h:mm a')}
              </p>
              <p>
                {selectedGame.players.length}/{selectedGame.maxPlayers} players •{' '}
                {selectedGame.skillLevel}
              </p>
            </div>
            <Link
              href={`/games/${selectedGame.gameId}`}
              className="inline-block w-full text-center py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
            >
              View Details
            </Link>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}
