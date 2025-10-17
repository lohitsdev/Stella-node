# 🎯 Personalization Webhook Implementation Guide

## 📋 **Overview**

This guide covers the implementation of the personalization webhook endpoint that processes onboarding data using OpenAI to provide personalized mental health insights, including percentages, weekly frequency, coping tools, emotional scores, and reflection prompts.

---

## 🚀 **NEW ENDPOINT**

### **POST /api/onboarding/personalize**

**Purpose**: Process user onboarding data and return personalized mental health insights using OpenAI analysis.

---

## 📊 **REQUEST FORMAT**

### **Request Body**
```json
{
  "userId": null,
  "sessionId": "temp_session_1705312200000",
  "timestamp": "2024-01-15T10:55:00.000Z",
  "isPreAuth": true,
  "step2": {
    "selectedHelpAreas": ["anxiety", "confidence", "relationships"],
    "timestamp": "2024-01-15T10:30:00.000Z"
  },
  "step3": {
    "anxietyFrequencyIndex": 2,
    "anxietyFrequencyLabel": "Weekly",
    "anxietyFrequencyDescription": "Multiple times a week",
    "anxietyFrequencyEmoji": "😰",
    "timestamp": "2024-01-15T10:35:00.000Z"
  },
  "step5": {
    "smartCheckInsEnabled": true,
    "voiceConversationEnabled": true,
    "timestamp": "2024-01-15T10:40:00.000Z"
  },
  "step6": {
    "improveWithDataEnabled": false,
    "timestamp": "2024-01-15T10:45:00.000Z"
  },
  "step7": {
    "userName": "Sarah",
    "personalizedResultsRequested": true,
    "timestamp": "2024-01-15T10:50:00.000Z"
  }
}
```

### **Required Fields**
- `sessionId` - Session identifier
- `step7.userName` - User's name
- `step7.personalizedResultsRequested` - Boolean flag

---

## 📈 **RESPONSE FORMAT**

### **Success Response (200)**
```json
{
  "success": true,
  "data": {
    "userId": "user_123",
    "sessionId": "temp_session_1705312200000",
    "timestamp": "2024-01-15T10:55:00.000Z",
    "personalizedInsights": {
      "anxietyLevel": {
        "percentage": 75,
        "level": "High",
        "description": "Based on your weekly anxiety frequency and selected help areas, you're experiencing high anxiety levels that would benefit from regular support."
      },
      "weeklyFrequency": {
        "sessionsPerWeek": 3,
        "recommendedFrequency": 4,
        "description": "We recommend 4 sessions per week to effectively manage your anxiety and build confidence."
      },
      "copingTools": {
        "primary": [
          "Deep breathing exercises",
          "Progressive muscle relaxation",
          "Mindfulness meditation"
        ],
        "secondary": [
          "Journaling",
          "Positive affirmations",
          "Grounding techniques"
        ],
        "personalized": [
          "Sarah's confidence building routine",
          "Anxiety management toolkit",
          "Relationship communication practice"
        ],
        "description": "Personalized coping tools based on your selected help areas and preferences."
      },
      "emotionalScore": {
        "current": 65,
        "baseline": 70,
        "trend": "improving",
        "description": "Your emotional score shows improvement from baseline, indicating positive progress in your mental health journey."
      },
      "reflectionPrompt": {
        "daily": "What's one thing that made you feel confident today?",
        "weekly": "How did you handle anxiety this week, and what would you do differently?",
        "personalized": "Sarah, what relationship challenge did you face this week, and how did you respond?",
        "description": "Personalized reflection prompts to support your mental health journey."
      },
      "personalGoal": {
        "shortTerm": "Sarah, practice one confidence-building technique daily for the next 2 weeks",
        "longTerm": "Develop healthy communication patterns in relationships and manage anxiety effectively",
        "milestones": [
          "Week 1: Establish daily breathing practice",
          "Week 2: Complete first confidence exercise",
          "Week 4: Have one successful difficult conversation",
          "Week 8: Notice reduced anxiety in social situations"
        ],
        "description": "Personalized goals aligned with your help areas and preferences."
      },
      "recommendations": {
        "immediate": [
          "Start with 5-minute daily breathing exercises",
          "Set up your first check-in reminder",
          "Try the confidence affirmation practice"
        ],
        "weekly": [
          "Schedule 4 wellness sessions this week",
          "Practice one new coping technique",
          "Reflect on your progress in your journal"
        ],
        "monthly": [
          "Review and adjust your goals",
          "Try a new relationship communication technique",
          "Assess your anxiety management progress"
        ],
        "description": "Actionable recommendations to support your mental health journey."
      }
    },
    "aiAnalysis": {
      "insights": [
        "Sarah shows high motivation for mental health improvement",
        "Anxiety patterns suggest benefit from regular structured support",
        "Confidence and relationship goals indicate strong self-awareness"
      ],
      "patterns": [
        "Weekly anxiety frequency suggests need for consistent intervention",
        "Preference for voice conversations indicates comfort with verbal processing",
        "Data improvement opt-out suggests privacy-conscious approach"
      ],
      "recommendations": [
        "Focus on building daily confidence practices",
        "Integrate anxiety management with relationship skills",
        "Use voice features for deeper emotional processing"
      ],
      "confidence": 87
    }
  },
  "timestamp": "2024-01-15T10:55:00.000Z"
}
```

---

## 🔧 **IMPLEMENTATION DETAILS**

### **Files Created**

#### **DTOs**
- ✅ `src/onboarding/dto/personalize.dto.ts` - Request and response DTOs

#### **Services**
- ✅ `src/onboarding/services/personalize.service.ts` - OpenAI processing service

#### **Controllers**
- ✅ `src/onboarding/controllers/personalize.controller.ts` - Webhook controller

#### **Routes**
- ✅ `src/onboarding/routes/personalize.routes.ts` - API routes with Swagger docs

#### **Module**
- ✅ `src/onboarding/index.ts` - Module exports

### **Key Features**

#### **1. OpenAI Integration**
- ✅ **GPT-4 Analysis** - Uses GPT-4 for comprehensive mental health analysis
- ✅ **Structured Prompts** - Carefully crafted prompts for consistent results
- ✅ **JSON Response Parsing** - Validates and enhances AI responses
- ✅ **Error Handling** - Graceful fallbacks for AI processing failures

#### **2. Personalized Insights**
- ✅ **Anxiety Level Percentage** - 0-100 scale based on frequency and help areas
- ✅ **Weekly Frequency** - Recommended session frequency
- ✅ **Coping Tools** - Primary, secondary, and personalized tools
- ✅ **Emotional Score** - Current, baseline, and trend analysis
- ✅ **Reflection Prompts** - Daily, weekly, and personalized prompts
- ✅ **Personal Goals** - Short-term, long-term, and milestone tracking
- ✅ **Recommendations** - Immediate, weekly, and monthly actions

#### **3. Data Validation**
- ✅ **Required Field Validation** - Ensures sessionId and userName are present
- ✅ **Range Validation** - Percentages and scores within valid ranges
- ✅ **Type Safety** - Full TypeScript type checking
- ✅ **Error Responses** - Detailed error messages for debugging

---

## 🧠 **AI ANALYSIS PROCESS**

### **Step 1: Data Processing**
1. **Input Validation** - Validates required fields and data types
2. **Prompt Generation** - Creates comprehensive analysis prompt
3. **OpenAI Request** - Sends structured prompt to GPT-4
4. **Response Parsing** - Extracts and validates JSON response

### **Step 2: Analysis Enhancement**
1. **Range Validation** - Ensures percentages are 0-100
2. **Personalization** - Adds user name to goals and prompts
3. **Help Area Integration** - Customizes coping tools based on selections
4. **Frequency Optimization** - Ensures reasonable session recommendations

### **Step 3: AI Insights Generation**
1. **Pattern Analysis** - Identifies behavioral patterns
2. **Insight Generation** - Creates personalized insights
3. **Recommendation Synthesis** - Combines analysis with recommendations
4. **Confidence Scoring** - Provides confidence level for analysis

---

## 📊 **ANALYSIS COMPONENTS**

### **1. Anxiety Level Analysis**
- **Percentage Calculation** - Based on frequency index and help areas
- **Level Classification** - Low, Moderate, High, Very High
- **Description** - Personalized explanation of anxiety level

### **2. Weekly Frequency Recommendations**
- **Current Sessions** - Based on user input
- **Recommended Frequency** - AI-optimized recommendation
- **Description** - Rationale for frequency recommendation

### **3. Coping Tools Categorization**
- **Primary Tools** - Most effective for user's needs
- **Secondary Tools** - Additional support options
- **Personalized Tools** - Custom tools based on user data
- **Description** - Explanation of tool selection

### **4. Emotional Score Analysis**
- **Current Score** - Present emotional state (0-100)
- **Baseline Score** - Reference point for comparison
- **Trend Analysis** - Improving, stable, or declining
- **Description** - Interpretation of emotional state

### **5. Reflection Prompts**
- **Daily Prompt** - Short-term reflection question
- **Weekly Prompt** - Medium-term reflection question
- **Personalized Prompt** - Custom prompt with user name
- **Description** - Purpose and usage guidance

### **6. Personal Goal Setting**
- **Short-term Goal** - Immediate actionable goal
- **Long-term Goal** - Broader mental health objective
- **Milestones** - Specific checkpoints for progress
- **Description** - Goal rationale and tracking guidance

### **7. Recommendation Framework**
- **Immediate Actions** - Things to do right now
- **Weekly Actions** - Short-term commitments
- **Monthly Actions** - Longer-term objectives
- **Description** - Implementation guidance

---

## 🔍 **TESTING**

### **Test Request**
```bash
curl -X POST http://localhost:3000/api/onboarding/personalize \
  -H "Content-Type: application/json" \
  -d '{
    "userId": null,
    "sessionId": "test_session_123",
    "timestamp": "2024-01-15T10:55:00.000Z",
    "isPreAuth": true,
    "step2": {
      "selectedHelpAreas": ["anxiety", "confidence"],
      "timestamp": "2024-01-15T10:30:00.000Z"
    },
    "step3": {
      "anxietyFrequencyIndex": 2,
      "anxietyFrequencyLabel": "Weekly",
      "anxietyFrequencyDescription": "Multiple times a week",
      "anxietyFrequencyEmoji": "😰",
      "timestamp": "2024-01-15T10:35:00.000Z"
    },
    "step5": {
      "smartCheckInsEnabled": true,
      "voiceConversationEnabled": true,
      "timestamp": "2024-01-15T10:40:00.000Z"
    },
    "step6": {
      "improveWithDataEnabled": false,
      "timestamp": "2024-01-15T10:45:00.000Z"
    },
    "step7": {
      "userName": "TestUser",
      "personalizedResultsRequested": true,
      "timestamp": "2024-01-15T10:50:00.000Z"
    }
  }'
```

### **Health Check**
```bash
curl http://localhost:3000/api/onboarding/personalize/health
```

---

## 🚀 **DEPLOYMENT**

### **Environment Variables Required**
```env
OPENAI_API_KEY=your_openai_api_key_here
```

### **Dependencies**
- ✅ **OpenAI SDK** - Already included in package.json
- ✅ **Express** - For HTTP handling
- ✅ **TypeScript** - For type safety

---

## 📈 **MONITORING**

### **Metrics Tracked**
- ✅ **Request Count** - Total personalization requests
- ✅ **Processing Time** - AI analysis duration
- ✅ **Error Rate** - Failed processing attempts
- ✅ **Confidence Scores** - AI analysis confidence levels

### **Logging**
- ✅ **Request Logging** - All incoming requests logged
- ✅ **Error Logging** - Detailed error information
- ✅ **Performance Logging** - Processing time tracking
- ✅ **AI Response Logging** - OpenAI response analysis

---

## ✅ **VERIFICATION CHECKLIST**

- [x] Personalization webhook endpoint created
- [x] OpenAI integration implemented
- [x] Request/response DTOs defined
- [x] Data validation added
- [x] Error handling implemented
- [x] Swagger documentation added
- [x] Health check endpoint created
- [x] TypeScript types defined
- [x] Routes integrated with main app
- [x] Comprehensive testing ready

---

## 🎉 **IMPLEMENTATION COMPLETE!**

Your personalization webhook is now ready to:

- ✅ **Process onboarding data** with OpenAI analysis
- ✅ **Generate personalized insights** including percentages and scores
- ✅ **Provide coping tools** based on user selections
- ✅ **Create reflection prompts** for daily and weekly use
- ✅ **Set personal goals** with milestones and tracking
- ✅ **Offer recommendations** for immediate, weekly, and monthly actions
- ✅ **Deliver AI analysis** with confidence scores and patterns

**The webhook is now live at `POST /api/onboarding/personalize` and ready for production use! 🚀**
