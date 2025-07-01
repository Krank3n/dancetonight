
import React from 'react';
import { DanceEvent, DanceStyle } from '../types';
import { formatTime, formatDate } from '../utils/dateUtils';
import { GENERIC_EVENT_IMAGE } from '../constants';
import { LocationPinIcon, ClockIcon, PriceTagIcon, InfoIcon, DanceStyleIcon, ExternalLinkIcon } from './IconComponents';

interface EventCardProps {
  event: DanceEvent;
}

const EventCard: React.FC<EventCardProps> = ({ event }) => {
  return (
    <div className="bg-gray-800 rounded-xl shadow-2xl overflow-hidden flex flex-col hover:shadow-pink-500/30 transition-shadow duration-300">
      <img 
        src={event.imageUrl || `${GENERIC_EVENT_IMAGE}?id=${event.id}`} 
        alt={event.title} 
        className="w-full h-48 object-cover" 
        onError={(e) => (e.currentTarget.src = `${GENERIC_EVENT_IMAGE}?fallback=${event.id}`)}
      />
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="text-xl font-semibold text-pink-400 mb-2">{event.title}</h3>
        
        <div className="flex items-center text-gray-400 text-sm mb-2">
          <ClockIcon className="w-4 h-4 mr-2 text-pink-500" />
          <span>{formatDate(event.startTime, { month: 'short', day: 'numeric' })}: {formatTime(event.startTime)} - {formatTime(event.endTime)}</span>
        </div>

        <div className="flex items-center text-gray-400 text-sm mb-2">
          <LocationPinIcon className="w-4 h-4 mr-2 text-pink-500" />
          <span>{event.location.venue} - {event.location.address}</span>
          {event.distance !== undefined && (
            <span className="ml-2 font-semibold text-pink-400">({event.distance.toFixed(1)} km)</span>
          )}
        </div>

        <div className="flex items-center text-gray-400 text-sm mb-3">
          <PriceTagIcon className="w-4 h-4 mr-2 text-pink-500" />
          <span>{event.cost} ({event.costCategory})</span>
          {event.level && <span className="ml-2 px-2 py-0.5 bg-pink-700 text-pink-200 text-xs rounded-full">{event.level}</span>}
        </div>
        
        <div className="mb-3">
          {event.genres.map(genre => (
            <span key={genre} className="inline-block bg-gray-700 text-gray-300 text-xs font-semibold mr-2 px-2.5 py-1 rounded-full mb-1">
              #{genre}
            </span>
          ))}
        </div>

        <p className="text-gray-300 text-sm mb-4 flex-grow leading-relaxed">{event.description.substring(0, 100)}{event.description.length > 100 ? '...' : ''}</p>

        <div className="mt-auto border-t border-gray-700 pt-3">
          {event.host && (
            <div className="flex items-center text-gray-400 text-xs mb-2">
              <InfoIcon className="w-4 h-4 mr-1 text-pink-500" /> Host: {event.host}
            </div>
          )}
          {event.website && (
            <a 
              href={event.website} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center text-pink-500 hover:text-pink-400 hover:underline text-sm transition-colors"
            >
              More Info <ExternalLinkIcon className="ml-1 w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventCard;
