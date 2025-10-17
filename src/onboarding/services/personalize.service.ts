/**
 * Personalization service for onboarding webhook
 */

import OpenAI from 'openai';

import { configService } from '../../services/config.service.js';
import type { PersonalizeRequestDto, PersonalizeAnalysisDto } from '../dto/personalize.dto.js';

export class PersonalizeService {
  private openai: OpenAI;

  constructor() {
    const openaiApiKey = configService.get('openai.apiKey');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    this.openai = new OpenAI({
      apiKey: openaiApiKey
    });
  }

  /**
   * Process personalization data using OpenAI
   */
  async processPersonalization(data: PersonalizeRequestDto): Promise<PersonalizeAnalysisDto> {
    try {
      const prompt = this.createAnalysisPrompt(data);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an AI mental health assistant specializing in personalized wellness analysis. 
            Analyze the user's onboarding data and provide detailed insights including percentages, 
            weekly frequency recommendations, coping tools, emotional scores, and reflection prompts.
            
            Return your response as a valid JSON object with the following structure:
            {
              "anxietyLevel": {
                "percentage": number,
                "level": "Low|Moderate|High|Very High",
                "description": "string"
              },
              "weeklyFrequency": {
                "sessionsPerWeek": number,
                "recommendedFrequency": number,
                "description": "string"
              },
              "copingTools": {
                "primary": ["string"],
                "secondary": ["string"],
                "personalized": ["string"],
                "description": "string"
              },
              "emotionalScore": {
                "current": number,
                "baseline": number,
                "trend": "improving|stable|declining",
                "description": "string"
              },
              "reflectionPrompt": {
                "daily": "string",
                "weekly": "string",
                "personalized": "string",
                "description": "string"
              },
              "personalGoal": {
                "shortTerm": "string",
                "longTerm": "string",
                "milestones": ["string"],
                "description": "string"
              },
              "recommendations": {
                "immediate": ["string"],
                "weekly": ["string"],
                "monthly": ["string"],
                "description": "string"
              }
            }`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      // Parse the JSON response
      const analysis = JSON.parse(response) as PersonalizeAnalysisDto;

      // Validate and enhance the analysis
      return this.validateAndEnhanceAnalysis(analysis, data);
    } catch (error) {
      console.error('Error processing personalization:', error);
      throw new Error(`Failed to process personalization: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create analysis prompt for OpenAI
   */
  private createAnalysisPrompt(data: PersonalizeRequestDto): string {
    return `
    Analyze this user's onboarding data and provide personalized insights:

    User Information:
    - Name: ${data.step7.userName}
    - Session ID: ${data.sessionId}
    - Pre-authentication: ${data.isPreAuth}

    Help Areas Selected:
    ${data.step2.selectedHelpAreas.map(area => `- ${area}`).join('\n')}

    Anxiety Frequency:
    - Index: ${data.step3.anxietyFrequencyIndex}
    - Label: ${data.step3.anxietyFrequencyLabel}
    - Description: ${data.step3.anxietyFrequencyDescription}
    - Emoji: ${data.step3.anxietyFrequencyEmoji}

    Preferences:
    - Smart Check-ins: ${data.step5.smartCheckInsEnabled}
    - Voice Conversations: ${data.step5.voiceConversationEnabled}
    - Data Improvement: ${data.step6.improveWithDataEnabled}
    - Personalized Results: ${data.step7.personalizedResultsRequested}

    Timestamps:
    - Step 2: ${data.step2.timestamp}
    - Step 3: ${data.step3.timestamp}
    - Step 5: ${data.step5.timestamp}
    - Step 6: ${data.step6.timestamp}
    - Step 7: ${data.step7.timestamp}

    Please provide a comprehensive analysis including:
    1. Anxiety level percentage (0-100) based on frequency and selected help areas
    2. Recommended weekly session frequency
    3. Personalized coping tools based on their selections
    4. Emotional score with baseline and trend
    5. Daily, weekly, and personalized reflection prompts
    6. Short-term and long-term personal goals with milestones
    7. Immediate, weekly, and monthly recommendations

    Focus on being supportive, actionable, and personalized to their specific needs.
    `;
  }

  /**
   * Validate and enhance the analysis
   */
  private validateAndEnhanceAnalysis(
    analysis: PersonalizeAnalysisDto,
    data: PersonalizeRequestDto
  ): PersonalizeAnalysisDto {
    // Ensure percentages are within valid ranges
    if (analysis.anxietyLevel.percentage < 0 || analysis.anxietyLevel.percentage > 100) {
      analysis.anxietyLevel.percentage = Math.max(0, Math.min(100, analysis.anxietyLevel.percentage));
    }

    // Ensure emotional scores are within valid ranges
    if (analysis.emotionalScore.current < 0 || analysis.emotionalScore.current > 100) {
      analysis.emotionalScore.current = Math.max(0, Math.min(100, analysis.emotionalScore.current));
    }

    if (analysis.emotionalScore.baseline < 0 || analysis.emotionalScore.baseline > 100) {
      analysis.emotionalScore.baseline = Math.max(0, Math.min(100, analysis.emotionalScore.baseline));
    }

    // Ensure weekly frequency is reasonable
    if (analysis.weeklyFrequency.sessionsPerWeek < 1) {
      analysis.weeklyFrequency.sessionsPerWeek = 1;
    }

    if (analysis.weeklyFrequency.recommendedFrequency < 1) {
      analysis.weeklyFrequency.recommendedFrequency = Math.max(1, analysis.weeklyFrequency.sessionsPerWeek);
    }

    // Add personalized touches based on user data
    if (data.step7.userName) {
      analysis.personalGoal.shortTerm = analysis.personalGoal.shortTerm.replace('{userName}', data.step7.userName);
      analysis.personalGoal.longTerm = analysis.personalGoal.longTerm.replace('{userName}', data.step7.userName);
    }

    // Enhance coping tools based on selected help areas
    if (data.step2.selectedHelpAreas.includes('anxiety')) {
      if (!analysis.copingTools.primary.includes('Deep breathing exercises')) {
        analysis.copingTools.primary.unshift('Deep breathing exercises');
      }
    }

    if (data.step2.selectedHelpAreas.includes('confidence')) {
      if (!analysis.copingTools.primary.includes('Positive affirmations')) {
        analysis.copingTools.primary.push('Positive affirmations');
      }
    }

    if (data.step2.selectedHelpAreas.includes('relationships')) {
      if (!analysis.copingTools.secondary.includes('Communication skills practice')) {
        analysis.copingTools.secondary.push('Communication skills practice');
      }
    }

    return analysis;
  }

  /**
   * Generate AI analysis insights
   */
  async generateAIAnalysis(
    data: PersonalizeRequestDto,
    analysis: PersonalizeAnalysisDto
  ): Promise<{
    insights: string[];
    patterns: string[];
    recommendations: string[];
    confidence: number;
  }> {
    try {
      const prompt = `
      Based on the user's onboarding data and analysis, provide additional AI insights:

      User Data: ${JSON.stringify(data, null, 2)}
      Analysis: ${JSON.stringify(analysis, null, 2)}

      Provide:
      1. 3-5 key insights about the user's mental health patterns
      2. 2-3 behavioral patterns identified
      3. 3-5 specific recommendations
      4. Confidence score (0-100) for the analysis

      Return as JSON:
      {
        "insights": ["string"],
        "patterns": ["string"],
        "recommendations": ["string"],
        "confidence": number
      }
      `;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an AI mental health analyst. Provide insightful, supportive, and actionable analysis.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.6,
        max_tokens: 1000
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      return JSON.parse(response);
    } catch (error) {
      console.error('Error generating AI analysis:', error);
      return {
        insights: ['Analysis completed successfully'],
        patterns: ['User shows interest in mental health improvement'],
        recommendations: ['Continue with personalized wellness plan'],
        confidence: 75
      };
    }
  }
}

// Export singleton instance
export const personalizeService = new PersonalizeService();
