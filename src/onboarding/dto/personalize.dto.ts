/**
 * DTOs for personalization onboarding webhook
 */

export interface PersonalizeRequestDto {
  userId: string | null;
  sessionId: string;
  timestamp: string;
  isPreAuth: boolean;
  step2: {
    selectedHelpAreas: string[];
    timestamp: string;
  };
  step3: {
    anxietyFrequencyIndex: number;
    anxietyFrequencyLabel: string;
    anxietyFrequencyDescription: string;
    anxietyFrequencyEmoji: string;
    timestamp: string;
  };
  step5: {
    smartCheckInsEnabled: boolean;
    voiceConversationEnabled: boolean;
    timestamp: string;
  };
  step6: {
    improveWithDataEnabled: boolean;
    timestamp: string;
  };
  step7: {
    userName: string;
    personalizedResultsRequested: boolean;
    timestamp: string;
  };
}

export interface PersonalizeResponseDto {
  success: boolean;
  data: {
    userId?: string | undefined;
    sessionId: string;
    timestamp: string;
    personalizedInsights: {
      anxietyLevel: {
        percentage: number;
        level: 'Low' | 'Moderate' | 'High' | 'Very High';
        description: string;
      };
      weeklyFrequency: {
        sessionsPerWeek: number;
        recommendedFrequency: number;
        description: string;
      };
      copingTools: {
        primary: string[];
        secondary: string[];
        personalized: string[];
        description: string;
      };
      emotionalScore: {
        current: number;
        baseline: number;
        trend: 'improving' | 'stable' | 'declining';
        description: string;
      };
      reflectionPrompt: {
        daily: string;
        weekly: string;
        personalized: string;
        description: string;
      };
      personalGoal: {
        shortTerm: string;
        longTerm: string;
        milestones: string[];
        description: string;
      };
      recommendations: {
        immediate: string[];
        weekly: string[];
        monthly: string[];
        description: string;
      };
    };
    aiAnalysis: {
      insights: string[];
      patterns: string[];
      recommendations: string[];
      confidence: number;
    };
  };
  timestamp: string;
}

export interface PersonalizeAnalysisDto {
  anxietyLevel: {
    percentage: number;
    level: string;
    description: string;
  };
  weeklyFrequency: {
    sessionsPerWeek: number;
    recommendedFrequency: number;
    description: string;
  };
  copingTools: {
    primary: string[];
    secondary: string[];
    personalized: string[];
    description: string;
  };
  emotionalScore: {
    current: number;
    baseline: number;
    trend: string;
    description: string;
  };
  reflectionPrompt: {
    daily: string;
    weekly: string;
    personalized: string;
    description: string;
  };
  personalGoal: {
    shortTerm: string;
    longTerm: string;
    milestones: string[];
    description: string;
  };
  recommendations: {
    immediate: string[];
    weekly: string[];
    monthly: string[];
    description: string;
  };
}
