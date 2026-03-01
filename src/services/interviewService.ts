import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

export type InterviewPersona = 'Friendly' | 'Strict' | 'Technical';

export interface InterviewSessionConfig {
  name: string;
  role: string;
  company: string;
  difficulty: 'Junior' | 'Mid-level' | 'Senior';
  persona: InterviewPersona;
}

export class InterviewService {
  private ai: GoogleGenAI;
  private session: any = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  }

  private transcript: { role: 'user' | 'model', text: string }[] = [];

  async startInterview(
    config: InterviewSessionConfig,
    onMessage: (text: string) => void,
    onAudioData: (data: Int16Array) => void,
    onInterrupted: () => void,
    onTranscriptUpdate: (transcript: { role: 'user' | 'model', text: string }[]) => void
  ) {
    this.transcript = [];

    const personaInstructions = {
      Friendly: "You are warm, encouraging, and approachable. Use positive reinforcement and make the candidate feel at ease while still being professional.",
      Strict: "You are formal, direct, and no-nonsense. You focus strictly on the candidate's answers and precision. You don't use much small talk or positive reinforcement.",
      Technical: "You are highly analytical and focus deeply on technical details, architecture, and edge cases. You like to ask 'why' and 'how' things work under the hood."
    };

    const systemInstruction = `You are a professional, native English-speaking interviewer conducting a ${config.difficulty} level interview for a ${config.role} position at ${config.company}. The candidate's name is ${config.name}.

    Persona: ${personaInstructions[config.persona]}

    Your goal is to conduct a realistic, conversational, and professional job interview entirely in English.

    CRITICAL: AS SOON AS THE CONNECTION IS ESTABLISHED, YOU MUST SPEAK FIRST. DO NOT WAIT FOR THE CANDIDATE TO SAY ANYTHING.

    Your Mandatory Opening Script (Adapt based on persona):
    1. Greet the candidate by name (${config.name}).
    2. Add a brief, friendly remark (e.g., "I hope you're having an amazing day" or "I hope you're doing well").
    3. Welcome them to the interview for the ${config.role} position at ${config.company}.
    4. Briefly explain the significance of this interview: "This session is designed to understand your technical approach and cultural fit, helping us see how you'd contribute to our team at ${config.company}."
    5. Ask the first question: "To get us started, could you please tell me a bit about yourself and your background?"

    Interview Flow:
    - After their introduction, proceed to ask one question at a time based on the role and their background.
    - Listen carefully to their answers and ask relevant follow-up questions.
    - Don't just stick to a script; probe deeper into their technical or soft skills.
    - Maintain a professional pace.

    Constraints:
    - Keep your responses concise (usually 1-3 sentences) to keep the conversation flowing.
    - Do not provide feedback until the very end of the session if requested.
    - Focus on assessing their fit for the ${config.role} role.`;

    this.session = await this.ai.live.connect({
      model: "gemini-2.5-flash-native-audio-preview-09-2025",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
        },
        systemInstruction,
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
      callbacks: {
        onopen: () => {
          console.log("Live session opened");
          this.setupAudioCapture();
        },
        onmessage: async (message: LiveServerMessage) => {
          if (message.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
            const base64Audio = message.serverContent.modelTurn.parts[0].inlineData.data;
            const binaryString = atob(base64Audio);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const pcmData = new Int16Array(bytes.buffer);
            onAudioData(pcmData);
          }

          if (message.serverContent?.interrupted) {
            onInterrupted();
          }

          // Track transcriptions
          if (message.serverContent?.modelTurn?.parts[0]?.text) {
            const text = message.serverContent.modelTurn.parts[0].text;
            this.transcript.push({ role: 'model', text });
            onTranscriptUpdate([...this.transcript]);
            onMessage(text);
          }

          const userTranscription = (message as any).serverContent?.userTurn?.parts?.[0]?.text;
          if (userTranscription) {
            this.transcript.push({ role: 'user', text: userTranscription });
            onTranscriptUpdate([...this.transcript]);
          }
        },
        onclose: () => console.log("Live session closed"),
        onerror: (err) => console.error("Live session error", err),
      },
    });
  }

  async getFeedback(): Promise<string> {
    if (this.transcript.length === 0) return "No conversation data available to provide feedback.";

    const conversationText = this.transcript
      .map(t => `${t.role === 'user' ? 'Candidate' : 'Interviewer'}: ${t.text}`)
      .join('\n');

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Based on the following interview transcript, provide a brief summary of the candidate's performance and suggest 3 specific areas for improvement. Be constructive and professional.
        
        Transcript:
        ${conversationText}`,
      });
      return response.text || "Could not generate feedback.";
    } catch (error) {
      console.error("Error generating feedback:", error);
      return "An error occurred while generating feedback.";
    }
  }

  private async setupAudioCapture() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      this.source = this.audioContext.createMediaStreamSource(stream);
      
      // Using ScriptProcessor for simplicity in this environment, 
      // though AudioWorklet is preferred for production.
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        // Convert Float32 to Int16 PCM
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
        }
        
        // Convert to Base64
        const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
        
        if (this.session) {
          this.session.sendRealtimeInput({
            media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
          });
        }
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
    } catch (err) {
      console.error("Error capturing audio:", err);
    }
  }

  stopInterview() {
    if (this.session) {
      this.session.close();
      this.session = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
