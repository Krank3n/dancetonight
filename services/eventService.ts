import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { DanceEvent, Filters, UserLocation, DanceStyle, EventType, SkillLevel, CostCategory, RawGeminiEvent, GetEventsResponse, GroundingSource } from '../types';
import { calculateDistance } from '../utils/geoUtils';
import { getISODateString, getTomorrowDate, isSameDay } from '../utils/dateUtils';
import { DEFAULT_LOCATION, DANCE_STYLE_OPTIONS, EVENT_TYPE_OPTIONS, SKILL_LEVEL_OPTIONS } from "../constants";

// Loading states enum for synchronization
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

// Helper to map string values from Gemini to application enums
function mapStringToEnum<T extends string>(
    value: string | undefined | null,
    enumObject: Record<string, T>
): T | undefined {
    if (!value || typeof value !== 'string') {
        return undefined;
    }
    const lowerValue = value.toLowerCase();
    for (const enumKey in enumObject) {
        if (Object.prototype.hasOwnProperty.call(enumObject, enumKey)) {
            if (enumObject[enumKey].toLowerCase() === lowerValue) {
                return enumObject[enumKey];
            }
        }
    }
    if (Object.values(enumObject).map(val => val.toLowerCase()).includes(lowerValue)) {
        return lowerValue as T;
    }
    return undefined;
}

function deriveCostCategory(costString?: string): CostCategory {
    if (!costString) return CostCategory.Paid;

    const costLower = costString.toLowerCase();
    if (costLower === 'free' || costLower === '0' || costLower.includes('gratis')) {
        return CostCategory.Free;
    }

    const numericMatch = costString.match(/\$?(\d+)/);
    if (numericMatch && numericMatch[1]) {
        const amount = parseInt(numericMatch[1], 10);
        if (amount === 0) return CostCategory.Free;
        if (amount < 10) return CostCategory.Low;
        if (amount <= 25) return CostCategory.Medium;
        return CostCategory.High;
    }
    return CostCategory.Paid;
}

function transformRawEvent(raw: RawGeminiEvent, index: number): DanceEvent {
    const safeISO = (dateStr: string | undefined | null): string => {
        if (!dateStr || typeof dateStr !== 'string' || dateStr.trim() === "") {
            console.warn(`Invalid or missing date string for safeISO. Defaulting to current time.`);
            return new Date().toISOString();
        }

        try {
            const timeOnlyRegex = /^\d{1,2}:\d{2}(:\d{2})?\s*(am|pm)?$/i;
            if (timeOnlyRegex.test(dateStr)) {
                const todayWithTime = new Date();
                const timePartsMatch = dateStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?/i);
                if (timePartsMatch) {
                    let hours = parseInt(timePartsMatch[1]);
                    const minutes = parseInt(timePartsMatch[2]);
                    const seconds = timePartsMatch[3] ? parseInt(timePartsMatch[3]) : 0;
                    const ampm = timePartsMatch[4]?.toLowerCase();

                    if (ampm === 'pm' && hours < 12) hours += 12;
                    if (ampm === 'am' && hours === 12) hours = 0;

                    todayWithTime.setHours(hours, minutes, seconds, 0);
                    if (isNaN(todayWithTime.getTime())) {
                        console.warn(`Could not parse time string "${dateStr}" into valid date components. Defaulting to current time.`);
                        return new Date().toISOString();
                    }
                    return todayWithTime.toISOString();
                }
            }

            const parsedDate = new Date(dateStr);
            if (isNaN(parsedDate.getTime())) {
                const recheckDate = new Date(dateStr + "T00:00:00");
                if (isNaN(recheckDate.getTime())) {
                    console.warn(`Could not parse date string "${dateStr}" into valid date, even with T00:00:00. Defaulting to current time.`);
                    return new Date().toISOString();
                }
                return recheckDate.toISOString();
            }
            return parsedDate.toISOString();
        } catch (e) {
            console.error(`Error in safeISO parsing date string "${dateStr}":`, e, `Defaulting to current time.`);
            return new Date().toISOString();
        }
    };

    const mappedGenres = raw.genres
        ?.map(g => mapStringToEnum<DanceStyle>(g, DanceStyle))
        .filter(Boolean)
        .filter(style => style !== DanceStyle.All) as DanceStyle[];

    return {
        id: raw.id || `${raw.title?.replace(/\s+/g, '-') || 'event'}-${index}-${new Date(raw.startTime || Date.now()).getTime()}`,
        title: raw.title || 'Untitled Event',
        imageUrl: raw.imageUrl,
        startTime: safeISO(raw.startTime),
        endTime: safeISO(raw.endTime),
        city: raw.city,
        location: {
            venue: raw.location?.venue || 'Unknown Venue',
            address: raw.location?.address || 'No address provided',
            lat: raw.location?.lat,
            lng: raw.location?.lng,
        },
        genres: mappedGenres.length > 0 ? mappedGenres : [],
        type: mapStringToEnum<EventType>(raw.type, EventType) || EventType.Social,
        level: raw.level ? mapStringToEnum<SkillLevel>(raw.level, SkillLevel) : undefined,
        cost: raw.cost || 'Not specified',
        costCategory: deriveCostCategory(raw.cost),
        description: raw.description || 'No description available.',
        website: raw.website,
        host: raw.host,
    };
}

const generateGeminiPrompt = (filters: Filters, userLocation: UserLocation | null): string => {
    let locationInstruction = "";
    let searchFocusContext = "";

    if (filters.manualLocationQuery) {
        locationInstruction = `Use the following text as the primary search location: "${filters.manualLocationQuery}". This manually entered location should be the central point of your search and overrides any latitude/longitude for search focus.`;
        searchFocusContext = filters.manualLocationQuery;
    } else if (userLocation) {
        locationInstruction = `Use the geographical coordinates: latitude ${userLocation.latitude.toFixed(4)}, longitude ${userLocation.longitude.toFixed(4)}.`;
        if (userLocation.latitude > -17.0 && userLocation.latitude < -16.8 && userLocation.longitude > 145.6 && userLocation.longitude < 145.8) {
            searchFocusContext = "Cairns, Australia";
            locationInstruction += ` (This is in the ${searchFocusContext} area. Focus your search here.)`;
        } else {
            searchFocusContext = `the area around lat ${userLocation.latitude.toFixed(2)}, lon ${userLocation.longitude.toFixed(2)}`;
            locationInstruction += ` (Focus your search in this general area.)`;
        }
    } else if (DEFAULT_LOCATION) {
        locationInstruction = `Use the geographical coordinates: latitude ${DEFAULT_LOCATION.latitude.toFixed(4)}, longitude ${DEFAULT_LOCATION.longitude.toFixed(4)}.`;
        searchFocusContext = "San Francisco, CA (example, based on default coordinates)";
        locationInstruction += ` (This is a default location, e.g., ${searchFocusContext}. Focus your search here.)`;
    } else {
        locationInstruction = "Use the user's general current area, if discernible from other context, or perform a broad search.";
        searchFocusContext = "the user's general area";
    }

    const dateFilter = filters.date;
    let dateInstructions = `for ${dateFilter}.`;
    if (dateFilter === 'tonight' || dateFilter === 'tomorrow') {
        dateInstructions = `for ${dateFilter}. Calculate the actual date based on the current local date for the event's location (derived from ${searchFocusContext}). Assume '${dateFilter}' refers to the evening of that calculated date.`;
    }

    let styleInstructions = `for dance styles: ${filters.danceStyle === DanceStyle.All ? 'any popular dance styles' : `the specific style '${filters.danceStyle}'`}.`;
    if (filters.danceStyle !== DanceStyle.All) {
        styleInstructions = `You MUST find events specifically for the dance style: '${filters.danceStyle}'. Events returned MUST prominently feature this style. If an event covers multiple styles, '${filters.danceStyle}' must be one of them. Prioritize listings from official dance school websites or studios that explicitly offer '${filters.danceStyle}'. For example, if searching for 'Salsa' in '${searchFocusContext}', look for 'Salsa classes ${searchFocusContext}' or check websites of dance studios in '${searchFocusContext}'.`;
    }

    let typeInstructions = `Event type should be: ${filters.eventType === EventType.All ? 'any type' : `'${filters.eventType}'`}.`;
    if (filters.eventType !== EventType.All) {
        typeInstructions += ` Results MUST match this event type. For example, if 'Lesson' is requested, find actual classes or lessons, not just social dances.`;
    }

    let skillLevelInstruction = "";
    if ((filters.eventType === EventType.Lesson || filters.eventType === EventType.Workshop) && filters.skillLevel !== SkillLevel.All) {
        skillLevelInstruction = `The skill level should be '${filters.skillLevel}'.`;
    }

    const danceStyleExamples = DANCE_STYLE_OPTIONS.filter(s => s !== DanceStyle.All).join(", ");
    const eventTypeExamples = EVENT_TYPE_OPTIONS.filter(t => t !== EventType.All).join(", ");
    const skillLevelExamples = SKILL_LEVEL_OPTIONS.filter(sl => sl !== SkillLevel.All).join(", ");

    return `You are an expert dance event finder for the "DanceTonight" app. Your task is to find dance events based on the following criteria:
Location: ${locationInstruction}
Date: ${dateInstructions}
${styleInstructions}
${typeInstructions}
${skillLevelInstruction} 
Search Radius: approximately ${filters.radius} km from the specified location focus (if coordinates are used) or within the general area of the manually specified location.

CRITICAL SEARCH INSTRUCTIONS:
1.  Perform a thorough web search. Actively search websites of local dance studios (e.g., "dance studios in ${searchFocusContext}"), Facebook Events pages for ${searchFocusContext}, and local community event boards for ${searchFocusContext}.
2.  Prioritize official sources like dance school websites or direct event pages over general event aggregators if possible.
3.  If a specific dance style (e.g., 'Salsa') and event type (e.g., 'Lesson') are requested, the events you return MUST be explicitly for that style and type. Do not substitute with other styles or types.

OUTPUT FORMAT:
Your entire response MUST be a single, valid JSON array of event objects. Do NOT include any text, comments, backticks, or markdown formatting like \`\`\`json ... \`\`\` before or after the JSON array.
The response must start with '[' and end with ']'. If no events are found, return an empty JSON array: [].

Each event object in the JSON array should have the following fields:
- id: (Optional) A unique string identifier.
- title: The name of the event. (Example: "Salsa Beginners Class at a studio in ${searchFocusContext}")
- imageUrl: (Optional) A URL to an image for the event.
- startTime: The start date and time in UTC ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ). Ensure this corresponds to the requested date filter (e.g., "tonight" in the event's local time).
- endTime: The end date and time in UTC ISO 8601 format.
- city: (Optional) The city where the event is held. (Example: "${searchFocusContext.split(',')[0]}")
- location: An object with:
    - venue: The name of the venue. (Example: "Local Dance Studio")
    - address: The full street address.
    - lat: (Optional) Latitude as a number.
    - lng: (Optional) Longitude as a number.
- genres: An array of dance style strings. Choose from: ${danceStyleExamples}, or other clearly identifiable dance styles. If a specific style like '${filters.danceStyle}' was requested, this array MUST include its string representation (e.g., if 'salsa' was requested, include 'salsa' or 'Salsa'). If no specific styles are mentioned in the event details but it's a dance event, you can use ['general dance']. If multiple styles apply, include them all.
- type: A string for event type. Choose from: ${eventTypeExamples}. This MUST match the requested event type if one was specified (e.g., '${filters.eventType}').
- level: (Optional) Skill level string. Choose from: ${skillLevelExamples}. If not specified or not applicable, omit this field.
- cost: A string describing the cost (e.g., "Free", "$15", "$20 online", "Contact for price").
- description: A brief description of the event (max 200 characters). Highlight key details.
- website: (Optional) A URL to the event's website or more information page (e.g., Facebook event page, Eventbrite page, dance school's class schedule page).
- host: (Optional) The event organizer, school, or host. (Example: "Studio Name")

Be extremely thorough and accurate in matching ALL specified criteria.
`;
};

// Helper function to add delays between states for realistic timing
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getEvents = async (
    filters: Filters,
    userLocation: UserLocation | null,
    onStateChange?: (state: LoadingState) => void
): Promise<GetEventsResponse> => {
    try {
        // Step 1: Location detection
        if (!filters.manualLocationQuery && !userLocation) {
            onStateChange?.(LoadingState.DETECTING_LOCATION);
            await delay(800);
        }

        // Step 2: Initialize Gemini
        onStateChange?.(LoadingState.INITIALIZING_GEMINI);
        await delay(600);

        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            console.error("API_KEY is not set. Please ensure process.env.API_KEY is available.");
            onStateChange?.(LoadingState.COMPLETE);
            return { events: [], sources: [] };
        }

        const ai = new GoogleGenAI({ apiKey });
        const model = 'gemini-2.5-flash-preview-04-17';

        // Step 3: Set location context
        onStateChange?.(LoadingState.SETTING_LOCATION_CONTEXT);
        await delay(700);

        // Step 4: Filter dance style
        onStateChange?.(LoadingState.FILTERING_DANCE_STYLE);
        await delay(500);

        // Step 5: Filter date
        onStateChange?.(LoadingState.FILTERING_DATE);
        await delay(400);

        const prompt = generateGeminiPrompt(filters, userLocation);
        console.log("Generated Prompt for Gemini:", prompt);

        // Step 6: Search studios
        onStateChange?.(LoadingState.SEARCHING_STUDIOS);
        await delay(1200);

        // Step 7: Check social media
        onStateChange?.(LoadingState.CHECKING_SOCIAL_MEDIA);
        await delay(1000);

        // Step 8: Scan websites
        onStateChange?.(LoadingState.SCANNING_WEBSITES);
        await delay(800);

        // Make the actual API call during the "scanning websites" phase
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        // Step 9: Filter event type
        onStateChange?.(LoadingState.FILTERING_EVENT_TYPE);
        await delay(600);

        // Step 10: Process results
        onStateChange?.(LoadingState.PROCESSING_RESULTS);
        await delay(500);

        console.log("Raw Gemini Response object:", response);

        let textToParse = "";
        if (typeof response.text === 'string') {
            textToParse = response.text.trim();
        } else {
            console.warn("Gemini response.text was not a string or was undefined. Response object:", response);
            textToParse = "";
        }

        let jsonStr = "";

        const jsonBlockRegex = /```json\s*\n?(.*?)\n?\s*```/s;
        const jsonBlockMatch = textToParse.match(jsonBlockRegex);

        if (jsonBlockMatch && jsonBlockMatch[1]) {
            jsonStr = jsonBlockMatch[1].trim();
        } else {
            const genericFenceRegex = /```\s*\n?(.*?)\n?\s*```/s;
            const genericFenceMatch = textToParse.match(genericFenceRegex);
            if (genericFenceMatch && genericFenceMatch[1]) {
                jsonStr = genericFenceMatch[1].trim();
            } else {
                if ((textToParse.startsWith('[') && textToParse.endsWith(']')) ||
                    (textToParse.startsWith('{') && textToParse.endsWith('}'))) {
                    jsonStr = textToParse;
                } else {
                    const lastOpeningBracket = textToParse.lastIndexOf('[');
                    const lastClosingBracket = textToParse.lastIndexOf(']');
                    if (lastOpeningBracket !== -1 && lastClosingBracket > lastOpeningBracket) {
                        const potentialJson = textToParse.substring(lastOpeningBracket, lastClosingBracket + 1);
                        try {
                            JSON.parse(potentialJson);
                            jsonStr = potentialJson;
                        } catch (e) {
                            // Failed to parse, jsonStr remains empty or its previous value
                        }
                    }

                    if (!jsonStr) {
                        const lastOpeningBrace = textToParse.lastIndexOf('{');
                        const lastClosingBrace = textToParse.lastIndexOf('}');
                        if (lastOpeningBrace !== -1 && lastClosingBrace > lastOpeningBrace) {
                            const potentialJsonObj = textToParse.substring(lastOpeningBrace, lastClosingBrace + 1);
                            try {
                                JSON.parse(potentialJsonObj);
                                jsonStr = potentialJsonObj;
                            } catch (e) {
                                // Failed to parse
                            }
                        }
                    }
                }
            }
        }

        if (!jsonStr.trim()) {
            console.warn("Could not reliably extract JSON from Gemini response. Defaulting to empty array. Original text from Gemini:", textToParse);
            jsonStr = "[]";
        }

        console.log("Attempting to parse JSON string:", jsonStr);

        let rawEvents: RawGeminiEvent[] = [];
        try {
            rawEvents = JSON.parse(jsonStr);
            if (!Array.isArray(rawEvents)) {
                if (typeof rawEvents === 'object' && rawEvents !== null) {
                    console.warn("Gemini response was a single object, wrapping in array. Parsed object:", rawEvents);
                    rawEvents = [rawEvents as RawGeminiEvent];
                } else {
                    console.warn("Gemini response was parsable but not a JSON array or object. Raw extracted string:", jsonStr, "Parsed result:", rawEvents);
                    rawEvents = [];
                }
            }
        } catch (e) {
            console.error("Failed to parse JSON response from Gemini:", e, "Attempted to parse (final jsonStr):", jsonStr);
            rawEvents = [];
        }

        const transformedEvents: DanceEvent[] = rawEvents.map(transformRawEvent);

        // Step 11: Organize by distance
        onStateChange?.(LoadingState.ORGANIZING_BY_DISTANCE);
        await delay(400);

        let eventsWithDistance = transformedEvents;
        if (userLocation) {
            eventsWithDistance = transformedEvents
                .map(event => ({
                    ...event,
                    distance: event.location.lat && event.location.lng ? calculateDistance(userLocation, event.location) : undefined,
                }))
                .filter(event => event.distance === undefined || event.distance <= filters.radius);

            eventsWithDistance.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
        } else {
            eventsWithDistance = eventsWithDistance.map(event => ({ ...event, distance: undefined }));
        }

        const groundingData = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        const sources: GroundingSource[] = (groundingData?.map((chunk: any, index: number) => ({
            id: `source-${index}-${chunk.web?.uri || Math.random()}`,
            uri: chunk.web?.uri,
            title: chunk.web?.title,
        })).filter(source => source.uri) || []) as GroundingSource[];

        // Step 12: Finalize
        onStateChange?.(LoadingState.FINALIZING);
        await delay(300);

        console.log("Processed events:", eventsWithDistance);
        console.log("Grounding sources:", sources);

        // Step 13: Complete
        onStateChange?.(LoadingState.COMPLETE);

        return { events: eventsWithDistance, sources: sources };

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        // @ts-ignore
        if (error.message && error.message.includes('API key not valid')) {
            console.error("Gemini API Key is invalid or missing.");
        }
        // @ts-ignore
        if (error.response && error.response.promptFeedback) {
            // @ts-ignore
            console.error("Gemini API Error - Prompt Feedback:", error.response.promptFeedback);
        }

        onStateChange?.(LoadingState.COMPLETE);
        return { events: [], sources: [] };
    }
};