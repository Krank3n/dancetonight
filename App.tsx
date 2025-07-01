import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import FilterBar from './components/FilterBar';
import EventCard from './components/EventCard';
import { DanceEvent, Filters, UserLocation, GroundingSource, GetEventsResponse } from './types';
import { getEvents, LoadingState } from './services/eventService';
import useLocalStorage from './hooks/useLocalStorage';
import useGeolocation from './hooks/useGeolocation';
import { INITIAL_FILTERS, DEFAULT_LOCATION } from './constants';
import { getISODateString } from './utils/dateUtils';
import { ExternalLinkIcon } from './components/IconComponents';
import SynchronizedDanceLoadingSpinner from './components/SynchronizedDanceLoadingSpinner';

const App: React.FC = () => {
  const [events, setEvents] = useState<DanceEvent[]>([]);
  const [groundingSources, setGroundingSources] = useState<GroundingSource[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.DETECTING_LOCATION);
  const [currentError, setCurrentError] = useState<string | null>(null);
  const [filters, setFilters] = useLocalStorage<Filters>('danceTonightFilters', INITIAL_FILTERS);

  const { location: userLocation, error: geoError, loading: geoLoading } = useGeolocation();

  // Convert userLocation to the format expected by FilterBar
  const currentGPSLocation = userLocation ? {
    lat: userLocation.latitude,
    lng: userLocation.longitude
  } : null;

  useEffect(() => {
    if (geoError && !filters.manualLocationQuery) {
      setCurrentError(geoError);
    } else if (!geoError) {
      setCurrentError(null);
    }
  }, [geoError, filters.manualLocationQuery]);

  const fetchAndSetEvents = useCallback(async (currentFilters: Filters, locationForDistanceCalc: UserLocation | null) => {
    setIsLoading(true);
    setLoadingState(LoadingState.DETECTING_LOCATION);

    // Don't clear currentError if it's a geoError and no manual query, allow it to persist
    if (!(geoError && !currentFilters.manualLocationQuery)) {
      setCurrentError(null);
    }

    try {
      let finalFilters = { ...currentFilters };
      if (!currentFilters.date || !['tonight', 'tomorrow'].includes(currentFilters.date)) {
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
        if (!datePattern.test(currentFilters.date)) {
          finalFilters.date = 'tonight';
        }
      }

      if (!process.env.API_KEY) {
        setCurrentError("Gemini API Key is missing. Please configure it to fetch live events. Showing no events.");
        setEvents([]);
        setGroundingSources([]);
        setIsLoading(false);
        setLoadingState(LoadingState.COMPLETE);
        return;
      }

      // Pass the actual userLocation (or default if GPS fails) for distance calculation.
      // The 'filters' object (containing manualLocationQuery if any) guides Gemini's search context.
      const locationForAPIGuidance = geoLoading ? null : (userLocation || DEFAULT_LOCATION);

      const { events: fetchedEvents, sources: fetchedSources }: GetEventsResponse = await getEvents(
          finalFilters,
          locationForAPIGuidance,
          setLoadingState // Pass the state updater callback
      );

      setEvents(fetchedEvents);
      setGroundingSources(fetchedSources || []);

      if (fetchedEvents.length === 0 && !process.env.API_KEY) {
        setCurrentError("Could not fetch events. The API might be unavailable or no events match your criteria.");
      }

    } catch (error) {
      console.error("Error fetching events in App:", error);
      setCurrentError("Failed to fetch dance events. Please try again later.");
      setEvents([]);
      setGroundingSources([]);
      setLoadingState(LoadingState.COMPLETE);
    } finally {
      setIsLoading(false);
    }
  }, [geoLoading, userLocation, geoError]);

  useEffect(() => {
    if (!geoLoading) {
      fetchAndSetEvents(filters, userLocation);
    }
  }, [filters, userLocation, geoLoading, fetchAndSetEvents]);

  const handleFilterChange = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      [key]: value,
    }));

    // If manual location is being cleared or changed, clear geoError so it doesn't stick
    if (key === 'manualLocationQuery') {
      setCurrentError(null);
    }
  };

  const handleClearManualLocation = () => {
    handleFilterChange('manualLocationQuery', '');
  };

  const handleUpdateSearch = () => {
    // Trigger a new search with current filters
    if (!geoLoading) {
      fetchAndSetEvents(filters, userLocation);
    }
  };

  useEffect(() => {
    if(filters.date === 'tonight' || filters.date === 'tomorrow'){
      // Valid dynamic dates
    } else {
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if(!datePattern.test(filters.date)){
        setFilters(prev => ({...prev, date: getISODateString(new Date())}));
      }
    }
  }, []);

  let displayLoadingMessage = geoLoading && !filters.manualLocationQuery ? "Finding your location..." : "Searching the web for dance events with Gemini...";
  if (isLoading && filters.manualLocationQuery){
    displayLoadingMessage = `Searching for events near "${filters.manualLocationQuery}" with Gemini...`;
  }

  let locationStatusMessage = "";
  if (filters.manualLocationQuery) {
    locationStatusMessage = `Searching near: ${filters.manualLocationQuery}`;
  } else if (geoLoading) {
    locationStatusMessage = "Detecting your location...";
  } else if (userLocation) {
    locationStatusMessage = `Using your current location (Lat: ${userLocation.latitude.toFixed(2)}, Lon: ${userLocation.longitude.toFixed(2)})`;
  } else if (geoError) {
    locationStatusMessage = `${geoError} You can manually enter a location.`;
  } else {
    locationStatusMessage = "Location unknown. Using default search parameters. Enter a location manually.";
  }

  return (
      <div className="min-h-screen bg-gray-900 flex flex-col">
        <Header />
        <FilterBar
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearManualLocation={handleClearManualLocation}
            onUpdateSearch={handleUpdateSearch}
            locationStatusMessage={locationStatusMessage}
            currentLocation={currentGPSLocation} // Pass the properly formatted location
        />
        <main className="container mx-auto px-4 py-6 flex-grow min-h-screen">
          {currentError && (
              <div className="mb-4 p-3 bg-red-800 text-red-100 border border-red-600 rounded-md text-sm text-center">
                <p className="font-semibold">Error:</p>
                <p>{currentError}</p>
              </div>
          )}
          {isLoading ? (
              <SynchronizedDanceLoadingSpinner
                  message={displayLoadingMessage}
                  filters={filters}
                  userLocation={userLocation}
                  currentLoadingState={loadingState}
              />
          ) : events.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {events.map(event => (
                      <EventCard key={event.id} event={event} />
                  ))}
                </div>
                {groundingSources.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-gray-700">
                      <h3 className="text-lg font-semibold text-pink-400 mb-3">Data Sources (from Google Search via Gemini):</h3>
                      <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
                        {groundingSources.map((source) => (
                            <li key={source.id || source.uri}>
                              <a
                                  href={source.uri}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={source.uri}
                                  className="hover:text-pink-500 hover:underline inline-flex items-center"
                              >
                                {source.title || source.uri}
                                <ExternalLinkIcon className="ml-1 w-3 h-3" />
                              </a>
                            </li>
                        ))}
                      </ul>
                    </div>
                )}
              </>
          ) : (
              <div className="text-center py-10">
                <h2 className="text-2xl font-semibold text-pink-400 mb-3">No Dance Floors Found!</h2>
                <p className="text-gray-400">Try adjusting your filters or checking back later. Gemini couldn't find matching events with the current criteria.</p>
                {!process.env.API_KEY && <p className="text-yellow-500 mt-2">Note: API Key for Gemini is not configured. Live search is disabled.</p>}
              </div>
          )}
        </main>
        <footer className="bg-gray-800 text-center py-4 mt-auto">
          <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} DanceTonight. Keep dancing!</p>
          <p className="text-xs text-gray-600 mt-1">Event data powered by Google Gemini</p>
        </footer>
      </div>
  );
};

export default App;