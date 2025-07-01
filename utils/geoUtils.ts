
import { UserLocation, EventLocation } from '../types';

// Haversine formula to calculate distance between two points on Earth
export const calculateDistance = (loc1: UserLocation | EventLocation, loc2: EventLocation): number => {
  const R = 6371; // Radius of the Earth in km
  const lat1 = 'latitude' in loc1 ? loc1.latitude : loc1.lat;
  const lon1 = 'longitude' in loc1 ? loc1.longitude : loc1.lng;
  const { lat: lat2, lng: lon2 } = loc2;

  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance;
};

const deg2rad = (deg: number): number => {
  return deg * (Math.PI / 180);
};
