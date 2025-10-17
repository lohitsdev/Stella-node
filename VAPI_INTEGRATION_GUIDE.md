# VAPI Integration Guide

## Overview

This integration allows **VAPI voice conversations** to be automatically saved to MongoDB and vectorized in Pinecone for semantic search. The system captures conversations in real-time as users talk with the VAPI assistant.

## How It Works

```
User talks with VAPI → VAPI sends webhooks → API saves to MongoDB → Chunks saved to Pinecone
```

### Flow:

1. **Frontend starts VAPI call** with user's email/userId
2. **VAPI sends real-time transcripts** via webhooks to your API
3. **API saves messages** to MongoDB under the user's account  
4. **Conversation is chunked** and stored in Pinecone for semantic search
5. **End of call report** triggers final summary generation

---

## API Endpoints

### 1. **POST `/api/vapi/session/start`**

Start tracking a new VAPI session before the call begins.

**Request:**
```json
{
  "sessionId": "call_abc123",  // VAPI call ID
  "email": "user@example.com",
  "userId": "user_123",         // optional
  "phoneNumber": "+1234567890", // optional
  "metadata": {                 // optional
    "customField": "value"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "call_abc123",
    "status": "active",
    "message": "Session started successfully"
  },
  "timestamp": "2025-10-17T10:00:00.000Z"
}
```

---

### 2. **POST `/api/vapi/webhook?email=user@example.com`**

Main webhook endpoint for VAPI to send real-time updates. Configure this in your VAPI dashboard.

**VAPI Configuration:**
- Webhook URL: `https://your-api.com/api/vapi/webhook?email={{user.email}}`
- Events: `transcript`, `end-of-call-report`, `status-update`

**Webhook Types:**

#### **Transcript Message** (Real-time conversation)
```json
{
  "type": "transcript",
  "call": {
    "id": "call_abc123"
  },
  "transcript": {
    "role": "user",
    "transcriptType": "final",
    "transcript": "Hello, how are you?"
  }
}
```

#### **End of Call Report** (When call ends)
```json
{
  "type": "end-of-call-report",
  "call": {
    "id": "call_abc123",
    "cost": 0.15
  },
  "endedReason": "hangup",
  "summary": "User asked about pricing...",
  "messages": [
    {
      "role": "user",
      "message": "Hello",
      "secondsFromStart": 0
    },
    {
      "role": "assistant",
      "message": "Hi there!",
      "secondsFromStart": 1
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "call_abc123",
    "messagesSaved": 1
  },
  "timestamp": "2025-10-17T10:00:00.000Z"
}
```

---

### 3. **GET `/api/vapi/session/:sessionId`**

Get a specific session with all messages.

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "call_abc123",
    "email": "user@example.com",
    "userId": "user_123",
    "status": "completed",
    "startedAt": "2025-10-17T10:00:00.000Z",
    "endedAt": "2025-10-17T10:05:30.000Z",
    "duration": 330,
    "messages": [
      {
        "role": "user",
        "content": "Hello, how are you?",
        "timestamp": "2025-10-17T10:00:05.000Z",
        "transcriptType": "final"
      },
      {
        "role": "assistant",
        "content": "I'm doing great! How can I help you today?",
        "timestamp": "2025-10-17T10:00:08.000Z",
        "transcriptType": "final"
      }
    ],
    "summary": "User inquired about services...",
    "vectorStored": true,
    "metadata": {
      "cost": 0.15,
      "recordingUrl": "https://..."
    }
  },
  "timestamp": "2025-10-17T10:06:00.000Z"
}
```

---

### 4. **GET `/api/vapi/sessions/:email`**

Get all sessions for a specific user.

**Query Parameters:**
- `limit` (optional, default: 50) - Number of sessions to return

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "sessionId": "call_abc123",
      "email": "user@example.com",
      "status": "completed",
      "startedAt": "2025-10-17T10:00:00.000Z",
      "endedAt": "2025-10-17T10:05:30.000Z",
      "duration": 330,
      "messages": [...],
      "summary": "..."
    }
  ],
  "message": "Found 1 sessions",
  "timestamp": "2025-10-17T10:06:00.000Z"
}
```

---

### 5. **GET `/api/vapi/health`**

Health check for VAPI integration.

**Response:**
```json
{
  "success": true,
  "data": {
    "service": "VAPI Integration",
    "status": "healthy",
    "timestamp": "2025-10-17T10:00:00.000Z"
  },
  "timestamp": "2025-10-17T10:00:00.000Z"
}
```

---

## Frontend Integration

### Starting a VAPI Call

```javascript
import Vapi from '@vapi-ai/web';

// Initialize VAPI client
const vapi = new Vapi('your_vapi_public_key');

// Start a call
async function startCall(userEmail, userId) {
  try {
    // 1. Notify your API about the new session
    const sessionResponse = await fetch('https://your-api.com/api/vapi/session/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'will_be_replaced_by_vapi',
        email: userEmail,
        userId: userId
      })
    });

    // 2. Start VAPI call
    const call = await vapi.start({
      assistantId: 'your_assistant_id',
      // Pass user info that will be available in webhooks
      metadata: {
        email: userEmail,
        userId: userId
      }
    });

    console.log('Call started:', call.id);

    // 3. Listen for events
    vapi.on('call-start', () => {
      console.log('Call started');
    });

    vapi.on('call-end', () => {
      console.log('Call ended');
    });

    vapi.on('speech-start', () => {
      console.log('User started speaking');
    });

    vapi.on('speech-end', () => {
      console.log('User stopped speaking');
    });

  } catch (error) {
    console.error('Error starting call:', error);
  }
}

// Usage
startCall('user@example.com', 'user_123');
```

---

## VAPI Dashboard Configuration

### 1. **Set Webhook URL**

Go to your VAPI dashboard → Assistant Settings → Webhooks:

```
Webhook URL: https://your-api.com/api/vapi/webhook?email={{user.email}}
```

### 2. **Enable Events**

Check these boxes:
- ✅ `transcript` - Real-time conversation transcripts
- ✅ `end-of-call-report` - Final summary when call ends
- ✅ `status-update` - Call status changes

### 3. **Pass User Data**

In your assistant configuration, ensure user metadata is passed:

```json
{
  "metadata": {
    "email": "{{user.email}}",
    "userId": "{{user.userId}}"
  }
}
```

---

## MongoDB Storage

### Collection: `vapi_sessions`

**Schema:**
```javascript
{
  sessionId: "call_abc123",        // VAPI call ID
  userId: "user_123",              // Your user ID
  email: "user@example.com",       // User email
  phoneNumber: "+1234567890",      // Optional
  status: "completed",             // active | completed | failed
  startedAt: "2025-10-17T10:00:00Z",
  endedAt: "2025-10-17T10:05:30Z",
  duration: 330,                   // seconds
  messages: [
    {
      role: "user",
      content: "Hello",
      timestamp: "2025-10-17T10:00:05Z",
      transcriptType: "final"
    }
  ],
  metadata: {
    cost: 0.15,
    recordingUrl: "https://..."
  },
  summary: "AI-generated summary...",
  vectorStored: true,              // Stored in Pinecone?
  createdAt: "2025-10-17T10:00:00Z",
  updatedAt: "2025-10-17T10:05:30Z"
}
```

---

## Pinecone Vector Storage

### Namespace: `vapi-conversations`

Conversations are automatically chunked and stored in Pinecone every 5 messages and at the end of the call.

**Vector Metadata:**
```javascript
{
  type: "vapi_conversation",
  sessionId: "call_abc123",
  email: "user@example.com",
  userId: "user_123",
  messageCount: 10,
  conversationText: "user: Hello\nassistant: Hi there!\n...",
  startedAt: "2025-10-17T10:00:00Z",
  status: "completed",
  createdAt: "2025-10-17T10:05:30Z"
}
```

### Searching Conversations

You can search through voice conversations using semantic search:

```javascript
// Example: Search for specific topics in user's voice calls
const embedding = await openaiService.generateEmbedding("anxiety coping strategies");
const results = await pinecone.query({
  namespace: 'vapi-conversations',
  vector: embedding,
  filter: {
    email: { $eq: "user@example.com" }
  },
  topK: 5
});
```

---

## Features

✅ **Real-time conversation storage** - Messages saved as they happen  
✅ **Automatic chunking** - Every 5 messages stored in Pinecone  
✅ **AI summary generation** - OpenAI generates summary at end of call  
✅ **Vector search** - Find conversations by semantic meaning  
✅ **User-specific queries** - Get all calls for a specific user  
✅ **Cost tracking** - VAPI call costs stored in metadata  
✅ **Recording URLs** - Links to call recordings stored  

---

## Environment Variables

Add these to your `.env` file:

```bash
# VAPI Configuration
VAPI_API_KEY=your_vapi_api_key_here
VAPI_PHONE_NUMBER_ID=your_vapi_phone_number_id_here  # optional
VAPI_ASSISTANT_ID=your_vapi_assistant_id_here        # optional
```

---

## Testing

### Test Session Start

```bash
curl -X POST https://your-api.com/api/vapi/session/start \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test_call_123",
    "email": "test@example.com",
    "userId": "test_user"
  }'
```

### Test Webhook (Transcript)

```bash
curl -X POST "https://your-api.com/api/vapi/webhook?email=test@example.com" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "transcript",
    "call": { "id": "test_call_123" },
    "transcript": {
      "role": "user",
      "transcriptType": "final",
      "transcript": "Hello, this is a test message"
    }
  }'
```

### Get Session

```bash
curl https://your-api.com/api/vapi/session/test_call_123
```

### Get User Sessions

```bash
curl https://your-api.com/api/vapi/sessions/test@example.com
```

---

## Troubleshooting

### Webhook not receiving data

1. Check VAPI dashboard webhook configuration
2. Ensure URL is publicly accessible (not localhost)
3. Check webhook logs in VAPI dashboard
4. Verify email parameter is being passed

### Messages not saving

1. Check MongoDB connection
2. Verify `vapi_sessions` collection exists
3. Check server logs for errors
4. Ensure transcript type is "final" (partials are ignored)

### Pinecone not storing vectors

1. Check `vectorStored` field in MongoDB
2. Verify Pinecone connection and namespace
3. Check that messages reached the chunk size (5 messages)
4. Look for embedding generation errors in logs

---

## Next Steps

1. **Configure VAPI webhook** in your dashboard
2. **Test with a real call** to verify everything works
3. **Monitor MongoDB** to see conversations being saved
4. **Query Pinecone** to search through voice conversations
5. **Build UI** to display conversation history

---

## Support

For issues or questions:
- Check server logs for detailed error messages
- Verify all environment variables are set
- Test endpoints using the curl commands above
- Ensure VAPI webhook URL is correct

Happy coding! 🚀

