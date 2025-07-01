export enum DanceStyle {
  Salsa = 'salsa',
  Bachata = 'bachata',
  Kizomba = 'kizomba',
  Zouk = 'zouk',
  Tango = 'tango',
  Swing = 'swing',
  WestCoastSwing = 'west coast swing',
  HipHop = 'hip hop',
  Contemporary = 'contemporary',
  Ballroom = 'ballroom',
  GeneralDance = 'general dance', // Added for Gemini's default
  All = 'all styles' // For filter
}

export enum EventType {
  Social = 'social',
  Lesson = 'lesson',
  Free = 'free', // Can be a type and also a cost aspect
  Workshop = 'workshop',
  Festival = 'festival',
  All = 'all types' // For filter
}

export enum SkillLevel {
  Beginner = 'beginner',
  Intermediate = 'intermediate',
  Advanced = 'advanced',
  Open = 'open level',
  All = 'all levels' // For filter
}

export enum CostCategory {
  Free = 'Free',
  Paid = '$', // Represents any paid event if not using granular $, $$, $$$
  Low = '$',
  Medium = '$$',
  High = '$$$',
  All = 'all costs' // For filter
}

export interface EventLocation {
  venue: string;
  address: string;
  lat?: number; // Optional as Gemini might not always provide it
  lng?: number; // Optional
}

export interface DanceEvent {
  id: string;
  title: string;
  imageUrl?: string;
  startTime: string; // ISO date string
  endTime: string; // ISO date string
  city?: string; // Optional as Gemini might infer or it might be part of address
  location: EventLocation;
  genres: DanceStyle[];
  type: EventType;
  level?: SkillLevel; // Optional, mainly for lessons/workshops
  cost: string; // For display, e.g. "Free", "$15", "$10-$20"
  costCategory: CostCategory; // For filtering
  description: string;
  website?: string;
  host?: string;
  distance?: number; // Calculated, in km
}

export interface Filters {
  danceStyle: DanceStyle;
  eventType: EventType;
  skillLevel: SkillLevel;
  costCategory: CostCategory;
  date: string; // 'tonight', 'tomorrow', or YYYY-MM-DD
  radius: number; // in km
  manualLocationQuery?: string; // User's manually entered location
}

export interface UserLocation {
  latitude: number;
  longitude: number;
}

export interface GroundingSource {
  uri: string;
  title?: string;
  id?: string; // for react key
}

export interface GetEventsResponse {
  events: DanceEvent[];
  sources: GroundingSource[];
}

// Raw event structure expected from Gemini
export interface RawGeminiEvent {
  id?: string;
  title: string;
  imageUrl?: string;
  startTime: string;
  endTime: string;
  city?: string;
  location: {
    venue: string;
    address: string;
    lat?: number;
    lng?: number;
  };
  genres: string[];
  type: string;
  level?: string;
  cost: string;
  description: string;
  website?: string;
  host?: string;
}