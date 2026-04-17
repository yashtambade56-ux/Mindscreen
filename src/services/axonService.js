/**
 * Service to handle AXON (Groq LLM) interactions
 */

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

export const getAxonResponse = async (userMessage, bioData) => {
  if (!GROQ_API_KEY) {
    return "ERROR: AXON_CORELINK_OFFLINE. API_KEY_MISSING.";
  }

  try {
    const systemPrompt = `
      You are AXON v3, a futuristic Biometric Monitoring AI for the MindScreen HUD.
      Your personality: Professional, tactical, slightly robotic but empathetic to health. 
      Use short, uppercase-heavy responses (e.g., "ANALYSIS_COMPLETE", "WARNING: ELEVATED_STRESS").
      
      Current User Data:
      - Mood: ${bioData.mood || 'Unknown'}
      - Burnout Score: ${bioData.burnout}%
      - Heart Rate: ${bioData.bpm} BPM
      - Activity: ${bioData.steps} steps
      
      Keep responses under 60 words. Give tactical health advice based on this data.
    `;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 150
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Groq API Error Response:', data);
      return `AXON_LINK_ERROR: ${data.error?.message || 'UNKNOWN_PROTOCOL_FAILURE'}`;
    }

    if (!data.choices || data.choices.length === 0) {
      return "AXON_ERROR: EMPTY_ANALYSIS_RETURNED.";
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error('Axon Critical Failure:', error);
    return "CRITICAL_FAILURE: UNABLE_TO_REACH_MINDLINK. CHECK_CONNECTION.";
  }
};
