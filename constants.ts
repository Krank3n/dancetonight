
import { DanceStyle, EventType, SkillLevel, CostCategory, Filters } from './types';

export const APP_NAME = "Dance2nite";
export const DEFAULT_RADIUS_KM = 25;
export const MAX_FUTURE_DAYS_PICKER = 14;

export const INITIAL_FILTERS: Filters = {
  danceStyle: DanceStyle.All,
  eventType: EventType.All,
  skillLevel: SkillLevel.All,
  costCategory: CostCategory.All,
  date: 'tonight',
  radius: DEFAULT_RADIUS_KM,
  manualLocationQuery: '', // Initialize manual location query
};

export const DANCE_STYLE_OPTIONS: DanceStyle[] = [
  DanceStyle.All, DanceStyle.Salsa, DanceStyle.Bachata, DanceStyle.Kizomba, DanceStyle.Zouk, DanceStyle.Tango, DanceStyle.Swing, DanceStyle.WestCoastSwing, DanceStyle.HipHop, DanceStyle.Contemporary, DanceStyle.Ballroom, DanceStyle.GeneralDance
];

export const EVENT_TYPE_OPTIONS: EventType[] = [
  EventType.All, EventType.Social, EventType.Lesson, EventType.Workshop, EventType.Festival, EventType.Free
];

export const SKILL_LEVEL_OPTIONS: SkillLevel[] = [
  SkillLevel.All, SkillLevel.Open, SkillLevel.Beginner, SkillLevel.Intermediate, SkillLevel.Advanced
];

export const COST_CATEGORY_OPTIONS: CostCategory[] = [
  CostCategory.All, CostCategory.Free, CostCategory.Low, CostCategory.Medium, CostCategory.High
];

export const RADIUS_OPTIONS: number[] = [5, 10, 25, 50, 100]; // in km

// Default location if geolocation fails (San Francisco)
export const DEFAULT_LOCATION = {
  latitude: 37.7749,
  longitude: -122.4194,
};

export const GENERIC_EVENT_IMAGE = 'https://picsum.photos/seed/danceevent/400/200';