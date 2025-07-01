// components/EventsMap.tsx
import React, { useEffect, useRef, useState } from 'react';
import { DanceEvent } from '../types';

// Updated App.tsx to include the map
// Add this import to your App.tsx:
// import EventsMap from './components/EventsMap';

// Then add this component in your main content area after the error display:
/*
{!isLoading && events.length > 0 && (
  <div className="mb-6">
    <EventsMap
      events={events}
      userLocation={currentGPSLocation}
      height="500px"
      className="w-full"
    />
  </div>
)}
*/

// Leaflet types and imports
declare global {
    interface Window {
        L: any;
    }
}

interface EventsMapProps {
    events: DanceEvent[];
    userLocation?: { lat: number; lng: number } | null;
    className?: string;
    height?: string;
}

const EventsMap: React.FC<EventsMapProps> = ({
                                                 events,
                                                 userLocation,
                                                 className = '',
                                                 height = '400px'
                                             }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const userMarkerRef = useRef<any>(null);
    const eventMarkersRef = useRef<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load Leaflet dynamically
    useEffect(() => {
        const loadLeaflet = async () => {
            try {
                // Load Leaflet CSS
                if (!document.querySelector('link[href*="leaflet"]')) {
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                    document.head.appendChild(link);
                }

                // Load Leaflet JS
                if (!window.L) {
                    const script = document.createElement('script');
                    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                    script.onload = () => setIsLoading(false);
                    script.onerror = () => setError('Failed to load map library');
                    document.head.appendChild(script);
                } else {
                    setIsLoading(false);
                }
            } catch (err) {
                setError('Failed to initialize map');
                setIsLoading(false);
            }
        };

        loadLeaflet();
    }, []);

    // Initialize map
    useEffect(() => {
        if (isLoading || !window.L || !mapRef.current || mapInstanceRef.current) return;

        try {
            // Determine initial center and zoom
            let center = [0, 0];
            let zoom = 2;

            if (userLocation) {
                center = [userLocation.lat, userLocation.lng];
                zoom = 12;
            } else if (events.length > 0) {
                // Center on first event with coordinates
                const firstEventWithCoords = events.find(event =>
                    event.location.lat && event.location.lng
                );
                if (firstEventWithCoords) {
                    center = [firstEventWithCoords.location.lat!, firstEventWithCoords.location.lng!];
                    zoom = 10;
                }
            }

            // Create map
            mapInstanceRef.current = window.L.map(mapRef.current).setView(center, zoom);

            // Add OpenStreetMap tiles
            window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(mapInstanceRef.current);

        } catch (err) {
            console.error('Error initializing map:', err);
            setError('Failed to create map');
        }
    }, [isLoading, userLocation, events]);

    // Update user location marker
    useEffect(() => {
        if (!window.L || !mapInstanceRef.current || !userLocation) return;

        try {
            // Remove existing user marker
            if (userMarkerRef.current) {
                mapInstanceRef.current.removeLayer(userMarkerRef.current);
            }

            // Create custom user location icon
            const userIcon = window.L.divIcon({
                html: `
          <div style="
            width: 20px; 
            height: 20px; 
            background: #ec4899; 
            border: 3px solid white; 
            border-radius: 50%; 
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              width: 8px; 
              height: 8px; 
              background: white; 
              border-radius: 50%;
            "></div>
          </div>
        `,
                iconSize: [20, 20],
                iconAnchor: [10, 10],
                className: 'user-location-marker'
            });

            // Add user marker
            userMarkerRef.current = window.L.marker([userLocation.lat, userLocation.lng], {
                icon: userIcon
            }).addTo(mapInstanceRef.current);

            userMarkerRef.current.bindPopup(`
        <div style="font-family: system-ui; padding: 5px;">
          <strong style="color: #ec4899;">📍 Your Location</strong><br>
          <small>${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}</small>
        </div>
      `);

        } catch (err) {
            console.error('Error adding user marker:', err);
        }
    }, [userLocation]);

    // Update event markers
    useEffect(() => {
        if (!window.L || !mapInstanceRef.current) return;

        try {
            // Remove existing event markers
            eventMarkersRef.current.forEach(marker => {
                mapInstanceRef.current.removeLayer(marker);
            });
            eventMarkersRef.current = [];

            // Add event markers
            const validEvents = events.filter(event =>
                event.location.lat && event.location.lng
            );

            validEvents.forEach((event, index) => {
                // Create custom event icon based on dance style
                const getEventColor = (genres: string[]) => {
                    if (genres.includes('salsa') || genres.includes('Salsa')) return '#f59e0b';
                    if (genres.includes('bachata') || genres.includes('Bachata')) return '#8b5cf6';
                    if (genres.includes('swing') || genres.includes('Swing')) return '#10b981';
                    if (genres.includes('tango') || genres.includes('Tango')) return '#dc2626';
                    if (genres.includes('ballroom') || genres.includes('Ballroom')) return '#3b82f6';
                    return '#6b7280'; // Default gray
                };

                const eventColor = getEventColor(event.genres);

                const eventIcon = window.L.divIcon({
                    html: `
            <div style="
              width: 30px; 
              height: 30px; 
              background: ${eventColor}; 
              border: 2px solid white; 
              border-radius: 50%; 
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 14px;
            ">
              🕺
            </div>
          `,
                    iconSize: [30, 30],
                    iconAnchor: [15, 15],
                    className: 'event-marker'
                });

                const marker = window.L.marker([event.location.lat!, event.location.lng!], {
                    icon: eventIcon
                }).addTo(mapInstanceRef.current);

                // Create popup content
                const popupContent = `
          <div style="font-family: system-ui; max-width: 250px; padding: 5px;">
            <strong style="color: ${eventColor}; font-size: 14px;">${event.title}</strong><br>
            <div style="margin: 8px 0; color: #666; font-size: 12px;">
              📍 ${event.location.venue}<br>
              ${event.location.address}
            </div>
            <div style="margin: 5px 0; font-size: 12px;">
              🕒 ${new Date(event.startTime).toLocaleDateString()} ${new Date(event.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </div>
            ${event.genres.length > 0 ? `
              <div style="margin: 5px 0;">
                ${event.genres.map(genre => `<span style="
                  background: ${eventColor}; 
                  color: white; 
                  padding: 2px 6px; 
                  border-radius: 10px; 
                  font-size: 10px; 
                  margin-right: 4px;
                ">#${genre}</span>`).join('')}
              </div>
            ` : ''}
            <div style="margin-top: 8px; font-size: 12px;">
              💰 ${event.cost}
              ${event.distance !== undefined ? `<br>📏 ${event.distance.toFixed(1)} km away` : ''}
            </div>
            ${event.website ? `
              <div style="margin-top: 8px;">
                <a href="${event.website}" target="_blank" style="
                  color: ${eventColor}; 
                  text-decoration: none; 
                  font-size: 12px;
                  font-weight: bold;
                ">🔗 More Info</a>
              </div>
            ` : ''}
          </div>
        `;

                marker.bindPopup(popupContent);
                eventMarkersRef.current.push(marker);
            });

            // Fit map to show all markers if we have both user and events
            if (userLocation && validEvents.length > 0) {
                const group = new window.L.featureGroup([
                    userMarkerRef.current,
                    ...eventMarkersRef.current
                ]);
                mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));
            } else if (validEvents.length > 0) {
                const group = new window.L.featureGroup(eventMarkersRef.current);
                mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));
            }

        } catch (err) {
            console.error('Error adding event markers:', err);
        }
    }, [events, userLocation]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    if (isLoading) {
        return (
            <div className={`${className} bg-gray-800 rounded-lg flex items-center justify-center`} style={{ height }}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto mb-2"></div>
                    <p className="text-gray-400 text-sm">Loading map...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`${className} bg-gray-800 rounded-lg flex items-center justify-center border border-gray-700`} style={{ height }}>
                <div className="text-center p-4">
                    <p className="text-red-400 text-sm mb-2">⚠️ Map Error</p>
                    <p className="text-gray-400 text-xs">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`${className} bg-gray-800 rounded-lg overflow-hidden border border-gray-700`}>
            <div className="p-4 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-pink-400 mb-1">Event Locations</h3>
                <p className="text-sm text-gray-400">
                    {userLocation && <span>📍 Your location </span>}
                    {events.filter(e => e.location.lat && e.location.lng).length > 0 && (
                        <span>🕺 {events.filter(e => e.location.lat && e.location.lng).length} event location{events.filter(e => e.location.lat && e.location.lng).length !== 1 ? 's' : ''}</span>
                    )}
                </p>
            </div>
            <div
                ref={mapRef}
                style={{ height }}
                className="w-full"
            />
            <div className="p-2 bg-gray-750 border-t border-gray-700">
                <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Click markers for details</span>
                    <span>Powered by OpenStreetMap</span>
                </div>
            </div>
        </div>
    );
};

export default EventsMap;