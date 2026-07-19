import { DayRecord, HistoryData, AIRecommendation } from '../types';

const CACHE_KEYS = {
  RECOMMENDATION: 'grindstreaks_ai_coach_cache_v1',
  DATE: 'grindstreaks_ai_coach_cache_date_v1',
};

export interface AICoachResponse {
  recommendations: string;
  highlights: string[];
  guideline: string;
}

export const getCachedAICoach = (): AICoachResponse | null => {
  const cachedDate = localStorage.getItem(CACHE_KEYS.DATE);
  const todayStr = new Date().toISOString().split('T')[0];
  
  if (cachedDate === todayStr) {
    const raw = localStorage.getItem(CACHE_KEYS.RECOMMENDATION);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.error('Failed to parse cached recommendation', e);
      }
    }
  }
  return null;
};

export const fetchAICoach = async (
  history: HistoryData,
  todayRecord: DayRecord,
  streak: number,
  maxStreak: number
): Promise<AICoachResponse> => {
  try {
    const response = await fetch('/api/ai/coach', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        history,
        todayRecord,
        streak,
        maxStreak,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error ${response.status}`);
    }

    const data: AICoachResponse = await response.json();
    
    // Save to cache
    const todayStr = new Date().toISOString().split('T')[0];
    localStorage.setItem(CACHE_KEYS.DATE, todayStr);
    localStorage.setItem(CACHE_KEYS.RECOMMENDATION, JSON.stringify(data));
    
    return data;
  } catch (error: any) {
    console.error('Failed to fetch AI coach recommendation:', error);
    throw error;
  }
};

export const fetchMorningQuote = async (name: string): Promise<string> => {
  try {
    const response = await fetch(`/api/ai/quote?name=${encodeURIComponent(name)}`);
    if (response.ok) {
      const data = await response.json();
      if (data.quote) {
        return data.quote;
      }
    }
  } catch (error) {
    console.error('Failed to fetch morning quote:', error);
  }

  const fallbacks = [
    "Your limitation—it's only your imagination. Make today count.",
    "Push yourself, because no one else is going to do it for you.",
    "Great things never come from comfort zones. Let's conquer the day.",
    "Success doesn't just find you. You have to go out and get it.",
    "The harder you work for something, the greater you'll feel when you achieve it.",
    "Dream bigger. Do bigger. Grind harder.",
    "Don't stop when you're tired. Stop when you're done."
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
};
