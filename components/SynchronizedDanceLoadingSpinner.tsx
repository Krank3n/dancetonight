import React, { useState, useEffect, useRef } from 'react';
import snooped from './../public/assets/snooped.json';

import {
    DanceStyle,
    EventType,
    Filters,
    UserLocation
} from '../types'; // Adjust path as needed

// Loading state enum for synchronization
export enum LoadingState {
    DETECTING_LOCATION = 'detecting_location',
    INITIALIZING_GEMINI = 'initializing_gemini',
    SETTING_LOCATION_CONTEXT = 'setting_location_context',
    FILTERING_DANCE_STYLE = 'filtering_dance_style',
    FILTERING_DATE = 'filtering_date',
    SEARCHING_STUDIOS = 'searching_studios',
    CHECKING_SOCIAL_MEDIA = 'checking_social_media',
    SCANNING_WEBSITES = 'scanning_websites',
    FILTERING_EVENT_TYPE = 'filtering_event_type',
    PROCESSING_RESULTS = 'processing_results',
    ORGANIZING_BY_DISTANCE = 'organizing_by_distance',
    FINALIZING = 'finalizing',
    COMPLETE = 'complete'
}

interface SynchronizedDanceLoadingSpinnerProps {
    message?: string;
    filters?: Filters;
    userLocation?: UserLocation | null;
    currentLoadingState?: LoadingState;
}

// Fixed Lottie Player Component
const LottiePlayer: React.FC<{ animationData?: any; className?: string }> = ({ animationData, className }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const animationInstanceRef = useRef<any>(null);

    useEffect(() => {
        const loadLottie = async () => {
            try {
                // Import lottie-web dynamically
                const lottieModule = await import('lottie-web');
                const lottie = lottieModule.default;

                if (containerRef.current && animationData) {
                    // Clear any existing content
                    containerRef.current.innerHTML = '';

                    // Load the animation with the imported JSON data
                    animationInstanceRef.current = lottie.loadAnimation({
                        container: containerRef.current,
                        renderer: 'svg',
                        loop: true,
                        autoplay: true,
                        animationData: animationData // Use the passed animation data
                    });

                    animationInstanceRef.current.addEventListener('DOMLoaded', () => {
                        setIsLoaded(true);
                    });

                    animationInstanceRef.current.addEventListener('error', (error: any) => {
                        console.error('Lottie animation error:', error);
                        setHasError(true);
                    });

                    // Fallback timeout
                    setTimeout(() => {
                        if (!isLoaded) {
                            setHasError(true);
                        }
                    }, 3000);
                } else {
                    setHasError(true);
                }
            } catch (error) {
                console.error('Failed to load Lottie:', error);
                setHasError(true);
            }
        };

        loadLottie();

        return () => {
            if (animationInstanceRef.current) {
                animationInstanceRef.current.destroy();
                animationInstanceRef.current = null;
            }
        };
    }, [animationData]);

    // Fallback animation using CSS
    if (hasError || !animationData) {
        return (
            <div className={`${className} flex items-center justify-center`}>
                <div className="relative">
                    <div className="absolute -top-4 -left-4 text-2xl animate-ping text-pink-400">✨</div>
                    <div className="absolute -top-2 -right-4 text-xl animate-ping text-purple-400" style={{ animationDelay: '0.5s' }}>🎪</div>
                    <div className="absolute -bottom-2 -left-2 text-lg animate-ping text-blue-400" style={{ animationDelay: '1s' }}>🎨</div>
                    <div className="absolute -bottom-4 -right-2 text-xl animate-ping text-yellow-400" style={{ animationDelay: '1.5s' }}>🎭</div>

                    {/* Orbiting elements */}
                    <div className="absolute inset-0 animate-spin" style={{ animationDuration: '4s' }}>
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-lg">🌟</div>
                    </div>
                    <div className="absolute inset-0 animate-spin" style={{ animationDuration: '6s', animationDirection: 'reverse' }}>
                        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-lg">⭐</div>
                    </div>
                </div>
            </div>
        );
    }

    return <div ref={containerRef} className={className}></div>;
};

const SynchronizedDanceLoadingSpinner: React.FC<SynchronizedDanceLoadingSpinnerProps> = ({
                                                                                             message,
                                                                                             filters = {} as Filters,
                                                                                             userLocation = null,
                                                                                             currentLoadingState = LoadingState.DETECTING_LOCATION
                                                                                         }) => {
    const [progress, setProgress] = useState(0);
    const [displayedStepIndex, setDisplayedStepIndex] = useState(0);

    // Map loading states to display steps
    const getStepFromLoadingState = (state: LoadingState) => {
        const stateSteps = {
            [LoadingState.DETECTING_LOCATION]: { text: "📍 Detecting your location...", index: 0 },
            [LoadingState.INITIALIZING_GEMINI]: { text: "🧠 Initializing Gemini AI search...", index: 1 },
            [LoadingState.SETTING_LOCATION_CONTEXT]: {
                text: filters.manualLocationQuery
                    ? `🗺️ Searching near "${filters.manualLocationQuery}"...`
                    : "🌍 Using your location for local search...",
                index: 2
            },
            [LoadingState.FILTERING_DANCE_STYLE]: {
                text: filters.danceStyle && filters.danceStyle !== DanceStyle.All
                    ? `💃 Looking for ${filters.danceStyle} events...`
                    : "🕺 Scanning all dance styles...",
                index: 3
            },
            [LoadingState.FILTERING_DATE]: {
                text: `📅 Filtering events for ${
                    filters.date === 'tonight' ? 'tonight' :
                        filters.date === 'tomorrow' ? 'tomorrow' :
                            'your selected date'
                }...`,
                index: 4
            },
            [LoadingState.SEARCHING_STUDIOS]: { text: "🔍 Gemini is searching dance studios...", index: 5 },
            [LoadingState.CHECKING_SOCIAL_MEDIA]: { text: "📱 Checking Facebook events & social media...", index: 6 },
            [LoadingState.SCANNING_WEBSITES]: { text: "🌐 Scanning local event websites...", index: 7 },
            [LoadingState.FILTERING_EVENT_TYPE]: {
                text: filters.eventType && filters.eventType !== EventType.All
                    ? `🎯 Finding ${filters.eventType.toLowerCase()} events...`
                    : "🎯 Filtering event types...",
                index: 8
            },
            [LoadingState.PROCESSING_RESULTS]: { text: "⚡ Gemini is processing search results...", index: 9 },
            [LoadingState.ORGANIZING_BY_DISTANCE]: { text: "📋 Organizing events by distance...", index: 10 },
            [LoadingState.FINALIZING]: { text: "✨ Finalizing your perfect night out!", index: 11 },
            [LoadingState.COMPLETE]: { text: "🎉 Search complete!", index: 12 }
        };
        return stateSteps[state];
    };

    // Generate all possible steps for progress calculation
    const allSteps = Object.values(LoadingState).map(state => getStepFromLoadingState(state));
    const totalSteps = allSteps.length;

    // Update progress and step display when loading state changes
    useEffect(() => {
        const currentStep = getStepFromLoadingState(currentLoadingState);
        setDisplayedStepIndex(currentStep.index);

        // Calculate progress based on current step
        const newProgress = ((currentStep.index + 1) / totalSteps) * 100;
        setProgress(newProgress);
    }, [currentLoadingState, totalSteps]);

    const currentStepText = getStepFromLoadingState(currentLoadingState).text;

    return (
        <div className="flex flex-col items-center justify-center min-h-96 py-12 relative overflow-hidden">
            {/* Floating geometric shapes */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-20 left-1/4 w-32 h-32 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 opacity-10 animate-pulse"></div>
                <div className="absolute bottom-32 right-1/4 w-24 h-24 rounded-full bg-gradient-to-r from-blue-500 to-pink-500 opacity-15 animate-bounce" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-10 w-16 h-16 rotate-45 bg-gradient-to-r from-purple-500 to-pink-500 opacity-20 animate-spin" style={{ animationDuration: '8s' }}></div>
            </div>

            {/* Main content */}
            <div className="relative z-10">
                {/* Lottie Animation Container */}
                <div className="relative mb-8 flex justify-center">
                    <div className="relative w-64 h-64">
                        {/* Main Lottie Animation - now using the imported snooped JSON data */}
                        <LottiePlayer
                            animationData={snooped}
                            className="w-full h-full filter drop-shadow-2xl"
                        />

                        {/* Glowing background ring */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-blue-500/20 animate-pulse blur-lg"></div>

                        {/* Animated border ring */}
                        <div className="absolute inset-0 rounded-full border-2 border-gradient-to-r from-pink-500 via-purple-500 to-blue-500 animate-spin opacity-30" style={{ animationDuration: '3s' }}></div>
                    </div>

                    {/* Floating music notes with enhanced animations */}
                    <div className="absolute -top-6 -left-6 text-3xl animate-ping text-pink-400" style={{ filter: 'drop-shadow(0 0 10px rgba(255, 20, 147, 0.8))' }}>♪</div>
                    <div className="absolute -top-8 right-2 text-2xl animate-ping text-purple-400" style={{ animationDelay: '0.5s', filter: 'drop-shadow(0 0 10px rgba(157, 78, 221, 0.8))' }}>♫</div>
                    <div className="absolute -bottom-4 left-1/2 text-xl animate-ping text-blue-400" style={{ animationDelay: '1s', filter: 'drop-shadow(0 0 10px rgba(83, 82, 237, 0.8))' }}>♬</div>
                    <div className="absolute top-0 right-6 text-lg animate-ping text-yellow-400" style={{ animationDelay: '1.5s', filter: 'drop-shadow(0 0 10px rgba(255, 183, 64, 0.8))' }}>♩</div>
                    <div className="absolute bottom-1/4 -left-8 text-2xl animate-ping text-green-400" style={{ animationDelay: '2s', filter: 'drop-shadow(0 0 10px rgba(34, 197, 94, 0.8))' }}>♪</div>
                    <div className="absolute top-1/3 -right-4 text-xl animate-ping text-cyan-400" style={{ animationDelay: '2.5s', filter: 'drop-shadow(0 0 10px rgba(6, 182, 212, 0.8))' }}>♫</div>
                </div>

                {/* Enhanced progress bar with glassmorphism effect */}
                <div className="w-full max-w-lg mb-8">
                    <div className="relative bg-gray-700/50 backdrop-blur-sm rounded-full h-4 overflow-hidden border border-gray-600/30 shadow-lg">
                        <div
                            className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 transition-all duration-500 ease-out rounded-full relative overflow-hidden"
                            style={{ width: `${progress}%` }}
                        >
                            {/* Animated shimmer effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-40 animate-pulse"></div>
                            {/* Moving highlight */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-60 w-1/3 animate-shimmer"></div>
                        </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-2">
                        <span>Step {displayedStepIndex + 1} of {totalSteps}</span>
                        <span className="font-mono bg-gray-800/50 px-2 py-1 rounded text-pink-400">
                            {Math.round(progress)}%
                        </span>
                    </div>
                </div>

                {/* Current step message with enhanced styling */}
                <div className="text-center max-w-md">
                    <div className="text-2xl font-bold text-white mb-3 bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent transition-all duration-300">
                        {currentStepText || message}
                    </div>
                    <div className="text-sm text-gray-400">
                        {currentLoadingState === LoadingState.COMPLETE ? "Ready to dance!" : "Please wait..."}
                    </div>
                </div>

                {/* Enhanced disco ball with multiple layers */}
                <div className="mt-8 relative">
                    <div className="relative w-12 h-12">
                        {/* Main disco ball */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-300 via-pink-300 to-purple-300 animate-spin shadow-lg"
                             style={{ filter: 'drop-shadow(0 0 20px rgba(255, 20, 147, 0.6))' }}></div>
                        {/* Outer glow ring */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-tl from-blue-300 via-green-300 to-yellow-300 animate-ping opacity-60"></div>
                        {/* Inner sparkle */}
                        <div className="absolute inset-2 rounded-full bg-white opacity-80 animate-pulse"></div>
                    </div>
                </div>
            </div>

            {/* Enhanced background disco lights */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-10 left-10 w-6 h-6 rounded-full bg-pink-500 animate-ping opacity-20 shadow-lg"></div>
                <div className="absolute top-20 right-20 w-4 h-4 rounded-full bg-blue-500 animate-ping opacity-30 shadow-lg" style={{ animationDelay: '0.5s' }}></div>
                <div className="absolute bottom-20 left-20 w-8 h-8 rounded-full bg-purple-500 animate-ping opacity-25 shadow-lg" style={{ animationDelay: '1s' }}></div>
                <div className="absolute bottom-32 right-16 w-3 h-3 rounded-full bg-yellow-500 animate-ping opacity-40 shadow-lg" style={{ animationDelay: '1.5s' }}></div>
                <div className="absolute top-1/2 left-1/4 w-5 h-5 rounded-full bg-green-500 animate-ping opacity-20 shadow-lg" style={{ animationDelay: '2s' }}></div>
                <div className="absolute top-1/3 right-1/3 w-6 h-6 rounded-full bg-red-500 animate-ping opacity-30 shadow-lg" style={{ animationDelay: '0.8s' }}></div>
                <div className="absolute bottom-1/4 left-1/2 w-4 h-4 rounded-full bg-indigo-500 animate-ping opacity-35 shadow-lg" style={{ animationDelay: '2.5s' }}></div>
                <div className="absolute top-3/4 left-1/6 w-5 h-5 rounded-full bg-pink-400 animate-ping opacity-25 shadow-lg" style={{ animationDelay: '3s' }}></div>
            </div>

            <style jsx>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(400%); }
                }

                .animate-shimmer {
                    animation: shimmer 2s infinite;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
                }
            `}</style>
        </div>
    );
};

export default SynchronizedDanceLoadingSpinner;