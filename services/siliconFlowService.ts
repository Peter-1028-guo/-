import { TranscriptionResponse } from '../types';

const ASR_API_URL = 'https://api.siliconflow.cn/v1/audio/transcriptions';
const CHAT_API_URL = 'https://api.siliconflow.cn/v1/chat/completions';

// Models
const ASR_MODEL_NAME = 'TeleAI/TeleSpeechASR';
// Using Qwen2.5-72B-Instruct as a robust default for text generation on SiliconFlow
const TEXT_MODEL_NAME = 'Qwen/Qwen2.5-72B-Instruct'; 

export const transcribeAudio = async (
  audioBlob: Blob,
  token: string
): Promise<TranscriptionResponse> => {
  if (!token) {
    throw new Error("API Token is missing. Please configure it in settings.");
  }

  const formData = new FormData();
  // Ensure the file has a name and extension, as some APIs rely on it
  const file = new File([audioBlob], "recording.webm", { type: audioBlob.type });
  
  formData.append('file', file);
  formData.append('model', ASR_MODEL_NAME);

  try {
    const response = await fetch(ASR_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Note: Content-Type is set automatically by browser for FormData
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `ASR API Error: ${response.status}`);
    }

    const data: TranscriptionResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Transcription failed", error);
    throw error;
  }
};

export const rewriteText = async (
  text: string,
  style: string | null,
  language: string | null,
  token: string
): Promise<string> => {
  if (!token) {
    throw new Error("API Token is missing.");
  }

  if (!text || !text.trim()) {
    throw new Error("No text to rewrite.");
  }

  const styleInstruction = style 
    ? `- Style: Make the tone '${style}'. 
       ${style === 'Polished' ? 'Fix grammar and make the flow smoother.' : ''}
       ${style === 'Professional' ? 'Make it formal, objective, and suitable for business contexts.' : ''}
       ${style === 'Casual' ? 'Make it friendly, relaxed, and conversational.' : ''}
       ${style === 'Concise' ? 'Shorten it to the key points, removing fluff.' : ''}
       ${style === 'Email' ? 'Format it as a polite email draft.' : ''}`
    : '- Style: Maintain the original tone and intent.';

  const languageInstruction = (language && language !== 'Original')
    ? `- Language: Translate the result into ${language}.`
    : `- Language: Keep the text in its original language (or the language most appropriate for the context).`;

  const systemPrompt = `You are an expert editor and translator. 
  Your task is to rewrite the provided text according to the following rules:
  ${styleInstruction}
  ${languageInstruction}
  
  IMPORTANT: Return ONLY the rewritten text. Do not add conversational fillers like "Here is the text" or "Sure".`;

  try {
    const response = await fetch(CHAT_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: TEXT_MODEL_NAME,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
        stream: false,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `LLM API Error: ${response.status}`);
    }

    const data = await response.json();
    const rewrittenContent = data.choices?.[0]?.message?.content;

    if (!rewrittenContent) {
      throw new Error("Received empty response from the model.");
    }

    return rewrittenContent.trim();
  } catch (error) {
    console.error("Rewrite failed", error);
    throw error;
  }
};