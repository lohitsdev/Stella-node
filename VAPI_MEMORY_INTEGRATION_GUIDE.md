# VAPI Memory Integration Guide

## 🧠 Overview

This guide shows how to give VAPI access to **conversation memory** stored in Pinecone, allowing it to recall past discussions and provide personalized responses.

---

## 🎯 How It Works

```
User: "What did we discuss last time?"
  ↓
VAPI calls memory-recall tool
  ↓
Backend searches Pinecone
  ↓
Returns past conversation context
  ↓
VAPI: "Last time we talked about your anxiety coping strategies..."
```

---

## 📋 **Step 1: Configure VAPI Assistant with Memory Tool**

### Go to VAPI Dashboard → Your Assistant → Model Configuration

Add this **Function/Tool** to your assistant:

```json
{
  "type": "function",
  "function": {
    "name": "memory-recall",
    "description": "Searches the user's past conversations to recall previous discussions, topics, or information shared. Use this when the user asks about past conversations or when context from previous sessions would be helpful.",
    "parameters": {
      "type": "object",
      "properties": {
        "query": {
          "type": "string",
          "description": "What to search for in past conversations. Examples: 'anxiety coping strategies', 'work stress', 'last therapy session'"
        },
        "limit": {
          "type": "number",
          "description": "Maximum number of past conversations to retrieve (default: 3)",
          "default": 3
        }
      },
      "required": ["query"]
    }
  },
  "server": {
    "url": "https://stella-node.onrender.com/api/vapi/tools/memory-recall",
    "timeoutSeconds": 20
  }
}
```

### Configuration Steps in VAPI Dashboard:

1. Go to **Assistants** → Select your assistant
2. Scroll to **Model** section
3. Click **+ Add Function**
4. Fill in:
   - **Name**: `memory-recall`
   - **Description**: (Use description from above)
   - **Parameters**: (Copy JSON schema from above)
5. Set **Server URL**: `https://stella-node.onrender.com/api/vapi/tools/memory-recall`
6. Set **Timeout**: `20` seconds
7. Click **Save**

---

## 📋 **Step 2: Update Assistant System Prompt**

Add this to your assistant's system prompt to teach it when to use memory:

```
You are Stella, an empathetic AI mental health companion.

MEMORY USAGE:
- You have access to the user's past conversations through the memory-recall function
- Use memory-recall when:
  1. User asks "what did we talk about before?"
  2. User references past discussions
  3. You need context from previous sessions
  4. User asks about their progress over time

EXAMPLES:
User: "What did we discuss last time?"
→ Call memory-recall with query: "last session topics"

User: "How have my anxiety levels changed?"
→ Call memory-recall with query: "anxiety levels progress"

User: "Tell me about my coping strategies"
→ Call memory-recall with query: "coping strategies techniques"

When you retrieve memories, integrate them naturally into the conversation.
Reference specific past discussions to show continuity and personalization.
```

---

## 📋 **Step 3: No Changes Needed in Flutter!**

✅ **Your current Flutter implementation already works!**

The memory tool is **automatically called by VAPI** when needed. You don't need to change anything in your Flutter app.

Your existing code:
```dart
await vapi.start(
  assistant: AssistantOptions(
    assistantId: 'c29598a5-744f-42ff-a710-ab22bc6eeaa1',
    metadata: {
      'email': userEmail,  // ✅ This is all you need!
      'userId': userId,
    },
  ),
);
```

---

## 🔄 **How the Flow Works**

### 1. **User Starts Conversation**
```dart
// Flutter sends
{
  "assistantId": "c29598a5-744f-42ff-a710-ab22bc6eeaa1",
  "metadata": {
    "email": "user@example.com",
    "userId": "user_123"
  }
}
```

### 2. **VAPI Recognizes Memory Query**
```
User: "What did we talk about last time?"
↓
VAPI recognizes this needs memory
↓
Calls memory-recall function
```

### 3. **Backend Receives Tool Call**
```json
POST /api/vapi/tools/memory-recall
{
  "message": {
    "type": "tool-calls",
    "call": {
      "metadata": {
        "email": "user@example.com"
      }
    },
    "toolCallList": [
      {
        "id": "call_abc123",
        "name": "memory-recall",
        "parameters": {
          "query": "last session topics",
          "limit": 3
        }
      }
    ]
  }
}
```

### 4. **Backend Searches Pinecone**
```typescript
// Generates embedding for query
const embedding = await openai.generateEmbedding("last session topics");

// Searches Pinecone
const results = await pinecone.query({
  vector: embedding,
  filter: { email: "user@example.com" },
  topK: 3
});
```

### 5. **Backend Returns Memory**
```json
{
  "results": [
    {
      "name": "memory-recall",
      "toolCallId": "call_abc123",
      "result": "{
        \"success\": true,
        \"memories\": [
          {
            \"conversationText\": \"user: I've been struggling with anxiety\\nassistant: Tell me more about your anxiety triggers...\",
            \"sessionId\": \"call_previous_123\",
            \"timestamp\": \"2025-10-15T10:00:00Z\",
            \"relevanceScore\": 0.89
          }
        ],
        \"contextText\": \"Previous Conversation #1 (Oct 15, 2025):\\nuser: I've been struggling with anxiety...\\n---\",
        \"message\": \"Found 1 relevant past conversations\"
      }"
    }
  ]
}
```

### 6. **VAPI Uses Memory in Response**
```
VAPI: "Last time we talked about your anxiety triggers. 
You mentioned work stress and social situations. 
How have you been managing those lately?"
```

---

## 🧪 **Testing the Memory System**

### **Test 1: Have a conversation**
```
User: "I'm feeling anxious about work"
VAPI: "Tell me more about your work anxiety..."
[Conversation continues and gets saved to MongoDB + Pinecone]
```

### **Test 2: Start new conversation and ask about memory**
```
User: "What did we discuss last time?"
VAPI: [Calls memory-recall tool]
VAPI: "Last time you mentioned feeling anxious about work..."
```

### **Test 3: Ask about specific topics**
```
User: "What coping strategies have we discussed?"
VAPI: [Searches memory for "coping strategies"]
VAPI: "We've discussed breathing exercises and mindfulness..."
```

---

## 🔧 **Manual Testing with API**

### Test Memory Search Directly:

```bash
curl -X POST https://stella-node.onrender.com/api/vapi/memory/search \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "query": "anxiety coping strategies",
    "limit": 3
  }'
```

### Get Recent Conversations:

```bash
curl -X POST https://stella-node.onrender.com/api/vapi/memory/recent \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "limit": 3
  }'
```

---

## 🎨 **Advanced: Pre-load Memory at Call Start (Optional)**

If you want to give VAPI context **before** the conversation starts, you can modify your Flutter app:

### Flutter Implementation:

```dart
class VapiService {
  Future<void> startCallWithMemory(String email, String userId) async {
    try {
      // 1. Fetch recent conversations
      final memoryResponse = await http.post(
        Uri.parse('https://stella-node.onrender.com/api/vapi/memory/recent'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email,
          'limit': 2  // Last 2 conversations
        }),
      );
      
      String memoryContext = '';
      if (memoryResponse.statusCode == 200) {
        final memoryData = jsonDecode(memoryResponse.body);
        memoryContext = memoryData['data']['contextText'] ?? '';
      }
      
      // 2. Start VAPI with memory context
      await vapi.start(
        assistant: AssistantOptions(
          assistantId: 'c29598a5-744f-42ff-a710-ab22bc6eeaa1',
          metadata: {
            'email': email,
            'userId': userId,
          },
          // Override first message to include context
          firstMessage: memoryContext.isEmpty 
            ? 'Hi! How can I help you today?'
            : 'Hi! I remember our previous conversations. How can I help you today?',
          model: ModelOptions(
            messages: [
              // Add memory as system context
              if (memoryContext.isNotEmpty)
                Message(
                  role: 'system',
                  content: memoryContext,
                ),
            ],
          ),
        ),
      );
      
    } catch (e) {
      print('Error: $e');
      // Fallback: start without memory
      await vapi.start(
        assistant: AssistantOptions(
          assistantId: 'c29598a5-744f-42ff-a710-ab22bc6eeaa1',
          metadata: {'email': email, 'userId': userId},
        ),
      );
    }
  }
}
```

---

## 📊 **How Data is Stored**

### MongoDB (`vapi_sessions` collection):
```json
{
  "sessionId": "call_abc123",
  "email": "user@example.com",
  "messages": [
    {
      "role": "user",
      "content": "I'm feeling anxious",
      "timestamp": "2025-10-17T10:00:00Z"
    },
    {
      "role": "assistant",
      "content": "Tell me more about that",
      "timestamp": "2025-10-17T10:00:05Z"
    }
  ],
  "vectorStored": true
}
```

### Pinecone (`vapi-conversations` namespace):
```json
{
  "id": "vapi_call_abc123_1697572845",
  "values": [0.123, 0.456, ...],  // 1536-dim embedding
  "metadata": {
    "type": "vapi_conversation",
    "email": "user@example.com",
    "sessionId": "call_abc123",
    "conversationText": "user: I'm feeling anxious\nassistant: Tell me more...",
    "startedAt": "2025-10-17T10:00:00Z",
    "messageCount": 2
  }
}
```

---

## ✅ **Checklist**

- [ ] **Backend deployed** to Render
- [ ] **Memory tool added** in VAPI dashboard
- [ ] **System prompt updated** to use memory
- [ ] **Server URL configured** in VAPI
- [ ] **Test conversation** saved successfully
- [ ] **Test memory recall** works in new conversation

---

## 🐛 **Troubleshooting**

### Memory not working?

1. **Check VAPI logs** in dashboard → Logs
2. **Verify tool is configured** in assistant settings
3. **Test endpoint directly**:
   ```bash
   curl https://stella-node.onrender.com/api/vapi/tools/memory-recall
   ```
4. **Check Pinecone** has conversations stored
5. **Verify email** is being passed in metadata

### No results from memory search?

1. **Confirm conversations are in Pinecone**:
   - Check `vectorStored: true` in MongoDB
   - Verify namespace is `vapi-conversations`
2. **Try broader search queries**
3. **Check relevance score threshold** (default: 0.7)

---

## 🚀 **Summary**

✅ **Backend**: Memory tool endpoints created and deployed  
✅ **VAPI**: Add memory-recall function to assistant  
✅ **Flutter**: No changes needed (works automatically!)  
✅ **Testing**: Have conversation, then ask about it in new call

The memory system is now ready! VAPI will automatically recall past conversations when appropriate. 🧠✨

