import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Filters, DanceStyle, EventType, SkillLevel, CostCategory } from '../types';
import { DANCE_STYLE_OPTIONS, EVENT_TYPE_OPTIONS, SKILL_LEVEL_OPTIONS, COST_CATEGORY_OPTIONS, RADIUS_OPTIONS, MAX_FUTURE_DAYS_PICKER } from '../constants';
import { getISODateString, getTomorrowDate } from '../utils/dateUtils';
import { ChevronDownIcon, LocationPinIcon } from './IconComponents';
import LocationDisplay from './LocationDisplay';

interface FilterBarProps {
  filters: Filters;
  onFilterChange: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  onClearManualLocation: () => void;
  onUpdateSearch: () => void;
  locationStatusMessage: string;
  currentLocation?: { lat: number; lng: number } | null;
}

// Filter presets for quick selection
const FILTER_PRESETS = [
  { name: '🌃 Tonight\'s Social', filters: { date: 'tonight', eventType: 'social', danceStyle: 'any' } },
  { name: '📚 Beginner Classes', filters: { eventType: 'lesson', skillLevel: 'beginner', danceStyle: 'any' } },
  { name: '💃 Salsa Events', filters: { danceStyle: 'salsa', eventType: 'any' } },
  { name: '🆓 Free Events', filters: { costCategory: 'free', eventType: 'any' } },
];

// Enhanced select component with better styling
const SelectInput: React.FC<{
  label: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: readonly (string | number)[];
  id: string;
  icon?: string;
}> = ({ label, value, onChange, options, id, icon }) => (
    <div className="relative group">
      <label htmlFor={id} className="block text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
        {icon && <span className="text-lg">{icon}</span>}
        {label}
      </label>
      <div className="relative">
        <select
            id={id}
            value={value}
            onChange={onChange}
            className="w-full bg-white/10 backdrop-blur-sm border border-white/20 text-white py-3 px-4 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent appearance-none transition-all duration-200 hover:bg-white/15 cursor-pointer"
        >
          {options.map(opt => (
              <option key={opt} value={opt} className="bg-gray-800 text-white">
                {typeof opt === 'string' ? opt.charAt(0).toUpperCase() + opt.slice(1) : opt}
                {id.includes('radius') && typeof opt === 'number' ? ' km' : ''}
              </option>
          ))}
        </select>
        <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60 pointer-events-none group-hover:text-white/80 transition-colors" />
      </div>
    </div>
);

// Distance slider component
const DistanceSlider: React.FC<{
  value: number;
  onChange: (value: number) => void;
}> = ({ value, onChange }) => {
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseInt(e.target.value));
  };

  return (
      <div className="relative group">
        <label className="block text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
          📍 Distance: <span className="text-purple-400 font-bold">{value} km</span>
        </label>
        <div className="relative">
          <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={value}
              onChange={handleSliderChange}
              className="w-full h-3 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #a855f7 0%, #a855f7 ${(value-5)/95*100}%, rgba(255,255,255,0.1) ${(value-5)/95*100}%, rgba(255,255,255,0.1) 100%)`
              }}
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>5km</span>
            <span>100km</span>
          </div>
        </div>
      </div>
  );
};

// Active filter tags component
const ActiveFilterTags: React.FC<{
  filters: Filters;
  onRemoveFilter: (key: keyof Filters) => void;
}> = ({ filters, onRemoveFilter }) => {
  const activeTags = useMemo(() => {
    const tags = [];
    if (filters.danceStyle !== 'any') tags.push({ key: 'danceStyle', label: `💃 ${filters.danceStyle}`, value: filters.danceStyle });
    if (filters.eventType !== 'any') tags.push({ key: 'eventType', label: `🎭 ${filters.eventType}`, value: filters.eventType });
    if (filters.costCategory !== 'any') tags.push({ key: 'costCategory', label: `💰 ${filters.costCategory}`, value: filters.costCategory });
    if (filters.skillLevel !== 'any') tags.push({ key: 'skillLevel', label: `📊 ${filters.skillLevel}`, value: filters.skillLevel });
    if (filters.manualLocationQuery) tags.push({ key: 'manualLocationQuery', label: `📍 ${filters.manualLocationQuery}`, value: filters.manualLocationQuery });
    return tags;
  }, [filters]);

  if (activeTags.length === 0) return null;

  return (
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="text-sm font-medium text-gray-300">Active filters:</span>
        {activeTags.map(tag => (
            <button
                key={tag.key}
                onClick={() => onRemoveFilter(tag.key as keyof Filters)}
                className="inline-flex items-center gap-1 px-3 py-1 bg-purple-500/20 border border-purple-400/30 text-purple-300 rounded-full text-sm hover:bg-purple-500/30 transition-colors"
            >
              {tag.label}
              <span className="ml-1 hover:text-white">×</span>
            </button>
        ))}
      </div>
  );
};

const FilterBar: React.FC<FilterBarProps> = ({
                                               filters,
                                               onFilterChange,
                                               onClearManualLocation,
                                               onUpdateSearch,
                                               locationStatusMessage,
                                               currentLocation
                                             }) => {
  const [localLocationQuery, setLocalLocationQuery] = useState(filters.manualLocationQuery || '');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const today = new Date();
  const tomorrow = getTomorrowDate();
  const maxDate = new Date();
  maxDate.setDate(today.getDate() + MAX_FUTURE_DAYS_PICKER);

  // Debounced search update
  const debouncedUpdateSearch = useCallback(() => {
    setIsSearching(true);
    const timeoutId = setTimeout(() => {
      onUpdateSearch();
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [onUpdateSearch]);

  // Sync local state when filters change externally
  useEffect(() => {
    setLocalLocationQuery(filters.manualLocationQuery || '');
  }, [filters.manualLocationQuery]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    onFilterChange('date', e.target.value);
  };

  const handleLocationKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onFilterChange('manualLocationQuery', localLocationQuery);
      debouncedUpdateSearch();
    }
  };

  const handleUpdateSearch = () => {
    onFilterChange('manualLocationQuery', localLocationQuery);
    debouncedUpdateSearch();
  };

  const handlePresetClick = (preset: typeof FILTER_PRESETS[0]) => {
    Object.entries(preset.filters).forEach(([key, value]) => {
      onFilterChange(key as keyof Filters, value);
    });
    debouncedUpdateSearch();
  };

  const handleRemoveFilter = (key: keyof Filters) => {
    switch (key) {
      case 'danceStyle':
        onFilterChange('danceStyle', 'any' as DanceStyle);
        break;
      case 'eventType':
        onFilterChange('eventType', 'any' as EventType);
        break;
      case 'costCategory':
        onFilterChange('costCategory', 'any' as CostCategory);
        break;
      case 'skillLevel':
        onFilterChange('skillLevel', 'any' as SkillLevel);
        break;
      case 'manualLocationQuery':
        setLocalLocationQuery('');
        onFilterChange('manualLocationQuery', '');
        break;
    }
    debouncedUpdateSearch();
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
      <div className="relative mb-6">
        {/* Glassmorphism container */}
        <div className="bg-gradient-to-br from-purple-900/80 via-pink-800/70 to-indigo-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">

          {/* Mobile View */}
          <div className="p-6 lg:hidden">
            {/* Current Location Display */}
            {currentLocation && (
                <div className="mb-6">
                  <LocationDisplay
                      lat={currentLocation.lat}
                      lng={currentLocation.lng}
                      compact={true}
                      className="justify-center"
                  />
                </div>
            )}

            {/* Filter Presets */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Quick Filters</h3>
              <div className="grid grid-cols-2 gap-2">
                {FILTER_PRESETS.map((preset, index) => (
                    <button
                        key={index}
                        onClick={() => handlePresetClick(preset)}
                        className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-xl text-white text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95"
                    >
                      {preset.name}
                    </button>
                ))}
              </div>
            </div>

            {/* Active Filter Tags */}
            <ActiveFilterTags filters={filters} onRemoveFilter={handleRemoveFilter} />

            {/* Quick Date Selection */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                📅 When?
              </h3>
              <div className="flex gap-3">
                <button
                    onClick={() => onFilterChange('date', 'tonight')}
                    className={`flex-1 py-3 px-4 text-sm font-semibold rounded-xl transition-all duration-200 ${
                        filters.date === 'tonight'
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25 scale-105'
                            : 'bg-white/10 hover:bg-white/20 text-gray-200 border border-white/20'
                    }`}
                >
                  🌙 Tonight
                </button>
                <button
                    onClick={() => onFilterChange('date', 'tomorrow')}
                    className={`flex-1 py-3 px-4 text-sm font-semibold rounded-xl transition-all duration-200 ${
                        filters.date === 'tomorrow'
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25 scale-105'
                            : 'bg-white/10 hover:bg-white/20 text-gray-200 border border-white/20'
                    }`}
                >
                  🌅 Tomorrow
                </button>
              </div>
            </div>

            {/* More Filters Toggle */}
            <button
                onClick={toggleExpanded}
                className={`w-full py-3 px-4 text-sm font-semibold rounded-xl transition-all duration-200 mb-4 ${
                    isExpanded
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                        : 'bg-white/10 hover:bg-white/20 text-gray-200 border border-white/20'
                }`}
            >
              {isExpanded ? '🔼 Hide Advanced Filters' : '🔽 More Filters'}
            </button>

            {/* Collapsible Advanced Filters */}
            <div className={`transition-all duration-500 ease-in-out overflow-hidden ${
                isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
            }`}>
              <div className="space-y-6 pt-2">
                {/* Location Input */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                    📍 Search Location
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                        type="text"
                        placeholder="E.g., 'Cairns, AU' or 'Downtown Salsa Studio'"
                        value={localLocationQuery}
                        onChange={(e) => setLocalLocationQuery(e.target.value)}
                        onKeyPress={handleLocationKeyPress}
                        className="flex-grow bg-white/10 backdrop-blur-sm border border-white/20 text-white py-3 px-4 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent placeholder:text-gray-400"
                    />
                    <button
                        type="button"
                        onClick={onClearManualLocation}
                        title="Use current GPS location"
                        className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl transition-all duration-200 shadow-lg shadow-purple-500/25 hover:scale-105 active:scale-95"
                        aria-label="Use current location"
                    >
                      <LocationPinIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Custom Date Picker */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                    📅 Custom Date
                  </label>
                  <input
                      type="date"
                      value={filters.date !== 'tonight' && filters.date !== 'tomorrow' ? filters.date : getISODateString(today)}
                      min={getISODateString(today)}
                      max={getISODateString(maxDate)}
                      onChange={handleDateChange}
                      className={`w-full py-3 px-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent ${
                          (filters.date !== 'tonight' && filters.date !== 'tomorrow') ? 'ring-2 ring-purple-400 border-purple-400' : ''
                      }`}
                  />
                </div>

                {/* Filter Grid */}
                <div className="grid grid-cols-1 gap-6">
                  <SelectInput
                      id="danceStyle"
                      label="Dance Style"
                      value={filters.danceStyle}
                      onChange={(e) => onFilterChange('danceStyle', e.target.value as DanceStyle)}
                      options={DANCE_STYLE_OPTIONS}
                      icon="💃"
                  />
                  <SelectInput
                      id="eventType"
                      label="Event Type"
                      value={filters.eventType}
                      onChange={(e) => onFilterChange('eventType', e.target.value as EventType)}
                      options={EVENT_TYPE_OPTIONS}
                      icon="🎭"
                  />
                  <SelectInput
                      id="costCategory"
                      label="Cost"
                      value={filters.costCategory}
                      onChange={(e) => onFilterChange('costCategory', e.target.value as CostCategory)}
                      options={COST_CATEGORY_OPTIONS}
                      icon="💰"
                  />
                  <DistanceSlider
                      value={filters.radius}
                      onChange={(value) => onFilterChange('radius', value)}
                  />
                  {(filters.eventType === EventType.Lesson || filters.eventType === EventType.Workshop) && (
                      <SelectInput
                          id="skillLevel"
                          label="Skill Level"
                          value={filters.skillLevel}
                          onChange={(e) => onFilterChange('skillLevel', e.target.value as SkillLevel)}
                          options={SKILL_LEVEL_OPTIONS}
                          icon="📊"
                      />
                  )}
                </div>
              </div>
            </div>

            {/* Update Search Button */}
            <button
                onClick={handleUpdateSearch}
                disabled={isSearching}
                className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-700 hover:via-pink-700 hover:to-indigo-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-transparent shadow-xl shadow-purple-500/25 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {isSearching ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    Searching...
                  </div>
              ) : (
                  '🔍 Update Search'
              )}
            </button>

            {/* Status Message */}
            {locationStatusMessage && !currentLocation && (
                <p className="text-xs text-gray-400 mt-4 text-center bg-white/5 rounded-lg p-3">
                  {locationStatusMessage}
                </p>
            )}
          </div>

          {/* Desktop View */}
          <div className="hidden lg:block p-8">
            {/* Current Location Display for Desktop */}
            {currentLocation && (
                <div className="mb-6">
                  <LocationDisplay
                      lat={currentLocation.lat}
                      lng={currentLocation.lng}
                      showCoordinates={true}
                      className="max-w-md mx-auto"
                  />
                </div>
            )}

            {/* Filter Presets */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-white mb-4 text-center">🚀 Quick Filters</h3>
              <div className="flex justify-center gap-4 flex-wrap">
                {FILTER_PRESETS.map((preset, index) => (
                    <button
                        key={index}
                        onClick={() => handlePresetClick(preset)}
                        className="px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-xl text-white font-medium transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg"
                    >
                      {preset.name}
                    </button>
                ))}
              </div>
            </div>

            {/* Active Filter Tags */}
            <div className="mb-6">
              <ActiveFilterTags filters={filters} onRemoveFilter={handleRemoveFilter} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
              {/* Location and Date Section */}
              <div className="space-y-6">
                {/* Manual Location Input */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                    📍 Search Location
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                        type="text"
                        placeholder="E.g., 'Cairns, AU' or 'Downtown Salsa Studio'"
                        value={localLocationQuery}
                        onChange={(e) => setLocalLocationQuery(e.target.value)}
                        onKeyPress={handleLocationKeyPress}
                        className="flex-grow bg-white/10 backdrop-blur-sm border border-white/20 text-white py-3 px-4 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent placeholder:text-gray-400"
                    />
                    <button
                        type="button"
                        onClick={onClearManualLocation}
                        title="Use current GPS location"
                        className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl transition-all duration-200 shadow-lg shadow-purple-500/25 hover:scale-105 active:scale-95"
                        aria-label="Use current location"
                    >
                      <LocationPinIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Date Filter */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                    📅 When?
                  </label>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <button
                          onClick={() => onFilterChange('date', 'tonight')}
                          className={`flex-1 py-3 px-4 text-sm font-semibold rounded-xl transition-all duration-200 ${
                              filters.date === 'tonight'
                                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                                  : 'bg-white/10 hover:bg-white/20 text-gray-200 border border-white/20'
                          }`}
                      >
                        🌙 Tonight
                      </button>
                      <button
                          onClick={() => onFilterChange('date', 'tomorrow')}
                          className={`flex-1 py-3 px-4 text-sm font-semibold rounded-xl transition-all duration-200 ${
                              filters.date === 'tomorrow'
                                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                                  : 'bg-white/10 hover:bg-white/20 text-gray-200 border border-white/20'
                          }`}
                      >
                        🌅 Tomorrow
                      </button>
                    </div>
                    <input
                        type="date"
                        value={filters.date !== 'tonight' && filters.date !== 'tomorrow' ? filters.date : getISODateString(today)}
                        min={getISODateString(today)}
                        max={getISODateString(maxDate)}
                        onChange={handleDateChange}
                        className={`w-full py-3 px-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent ${
                            (filters.date !== 'tonight' && filters.date !== 'tomorrow') ? 'ring-2 ring-purple-400 border-purple-400' : ''
                        }`}
                    />
                  </div>
                </div>
              </div>

              {/* Filter Section */}
              <div className="grid grid-cols-1 gap-6">
                <SelectInput
                    id="desktop-danceStyle"
                    label="Dance Style"
                    value={filters.danceStyle}
                    onChange={(e) => onFilterChange('danceStyle', e.target.value as DanceStyle)}
                    options={DANCE_STYLE_OPTIONS}
                    icon="💃"
                />
                <SelectInput
                    id="desktop-eventType"
                    label="Event Type"
                    value={filters.eventType}
                    onChange={(e) => onFilterChange('eventType', e.target.value as EventType)}
                    options={EVENT_TYPE_OPTIONS}
                    icon="🎭"
                />
                <SelectInput
                    id="desktop-costCategory"
                    label="Cost"
                    value={filters.costCategory}
                    onChange={(e) => onFilterChange('costCategory', e.target.value as CostCategory)}
                    options={COST_CATEGORY_OPTIONS}
                    icon="💰"
                />
              </div>

              {/* Additional Filters Section */}
              <div className="space-y-6">
                {(filters.eventType === EventType.Lesson || filters.eventType === EventType.Workshop) && (
                    <SelectInput
                        id="desktop-skillLevel"
                        label="Skill Level"
                        value={filters.skillLevel}
                        onChange={(e) => onFilterChange('skillLevel', e.target.value as SkillLevel)}
                        options={SKILL_LEVEL_OPTIONS}
                        icon="📊"
                    />
                )}
                <DistanceSlider
                    value={filters.radius}
                    onChange={(value) => onFilterChange('radius', value)}
                />
              </div>
            </div>

            {/* Update Search Button */}
            <div className="mt-8 flex justify-center">
              <button
                  onClick={handleUpdateSearch}
                  disabled={isSearching}
                  className="bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-700 hover:via-pink-700 hover:to-indigo-700 text-white font-bold py-4 px-12 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-transparent shadow-xl shadow-purple-500/25 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSearching ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      Searching...
                    </div>
                ) : (
                    '🔍 Update Search'
                )}
              </button>
            </div>

            {/* Status Message for Desktop */}
            {locationStatusMessage && !currentLocation && (
                <p className="text-sm text-gray-400 mt-6 text-center bg-white/5 rounded-xl p-4">
                  {locationStatusMessage}
                </p>
            )}
          </div>
        </div>

        {/* Custom styles for the range slider */}
        <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(45deg, #a855f7, #ec4899);
          cursor: pointer;
          box-shadow: 0 4px 8px rgba(168, 85, 247, 0.3);
          border: 2px solid white;
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(45deg, #a855f7, #ec4899);
          cursor: pointer;
          box-shadow: 0 4px 8px rgba(168, 85, 247, 0.3);
          border: 2px solid white;
        }
      `}</style>
      </div>
  );
};

export default FilterBar;