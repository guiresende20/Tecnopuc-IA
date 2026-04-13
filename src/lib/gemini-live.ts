// src/lib/gemini-live.ts
// Gerencia a conexão WebSocket com a Gemini Multimodal Live API.
// Portado do portfólio (guilherme_portifolio/src/lib/gemini-live.ts) e adaptado
// para receber o systemInstruction dinamicamente via /api/voice-context.

export type LiveChatStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'speaking'
  | 'error';

export interface LiveChatCallbacks {
  onStatusChange: (status: LiveChatStatus) => void;
  onTextAction?: (text: string) => void;
  onTurnComplete?: (aiText: string, userText: string) => void;
  onError?: (error: string) => void;
}

export class GeminiLiveChat {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;

  private nextPlayTime = 0;
  private currentAiText = '';
  private currentUserText = '';
  private activeSources: AudioBufferSourceNode[] = [];

  constructor(
    private apiKey: string,
    private callbacks: LiveChatCallbacks,
    private systemInstruction: string
  ) {}

  public async start() {
    this.callbacks.onStatusChange('connecting');

    try {
      // AudioContext precisa de interação do usuário antes de ser criado
      this.audioContext = new (
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      )({
        sampleRate: 16000, // Gemini Live espera 16kHz para input
      });

      const wssUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;
      this.ws = new WebSocket(wssUrl);

      this.ws.onopen = () => {
        const setup = {
          setup: {
            model: 'models/gemini-2.5-flash-native-audio-latest',
            generationConfig: {
              responseModalities: ['AUDIO'],
              thinkingConfig: { thinkingLevel: 'low' },
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: 'Puck',
                  },
                },
              },
            },
            systemInstruction: {
              parts: [{ text: this.systemInstruction }],
            },
          },
        };
        console.log('[TecnoPUC Live] Setup enviado:', setup.setup.model);
        this.ws?.send(JSON.stringify(setup));
      };

      this.ws.onmessage = async (event) => {
        let msg;
        try {
          if (event.data instanceof Blob) {
            const text = await event.data.text();
            msg = JSON.parse(text);
          } else {
            msg = JSON.parse(event.data);
          }
        } catch (e) {
          console.error('[TecnoPUC Live] Erro no parse do WebSocket:', e);
          return;
        }

        if (msg.error) {
          this.callbacks.onError?.(
            `API Error: ${msg.error.message || JSON.stringify(msg.error)}`
          );
          this.stop();
          return;
        }

        if (msg.setupComplete) {
          this.callbacks.onStatusChange('connected');
          await this.startRecording();
          return;
        }

        // Interrupção (Barge-in): quando o usuário começa a falar e a IA ainda está respondendo
        if (msg.serverContent?.interrupted) {
          console.log('[TecnoPUC Live] IA interrompida pelo usuário.');
          this.clearAudioQueue();
          this.currentAiText = ''; // Reseta o texto
          this.callbacks.onStatusChange('listening');
          return;
        }

        // Transcrição do áudio do usuário
        if (msg.serverContent?.inputTranscription?.text) {
          this.currentUserText += msg.serverContent.inputTranscription.text;
        }

        if (msg.serverContent?.modelTurn) {
          this.callbacks.onStatusChange('speaking');
          const parts = msg.serverContent.modelTurn.parts;
          for (const part of parts) {
            if (part.text && this.callbacks.onTextAction) {
              this.callbacks.onTextAction(part.text);
              this.currentAiText += part.text;
            }
            if (part.inlineData?.data) {
              this.playAudioChunk(part.inlineData.data);
            }
          }
        }

        if (msg.serverContent?.turnComplete) {
          this.callbacks.onStatusChange('listening');
          if (this.currentAiText && this.callbacks.onTurnComplete) {
            this.callbacks.onTurnComplete(this.currentAiText, this.currentUserText);
          }
          this.currentAiText = '';
          this.currentUserText = '';
        }
      };

      this.ws.onerror = (e) => {
        console.error('[TecnoPUC Live] WebSocket Error:', e);
        this.callbacks.onError?.('Erro de conexão com a API de voz.');
        this.stop();
      };

      this.ws.onclose = (event) => {
        console.log(
          `[TecnoPUC Live] WS Closed: Code=${event.code}, Reason=${event.reason || 'vazio'}`
        );
        this.callbacks.onStatusChange('disconnected');
        this.stop();
      };
    } catch (e) {
      console.error(e);
      this.callbacks.onError?.('Não foi possível acessar o microfone ou conectar à API.');
      this.stop();
    }
  }

  private async startRecording() {
    if (!this.audioContext) return;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      // ScriptProcessorNode: obsoleto mas com amplo suporte (inclusive Safari/Mobile)
      this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
      source.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);

      this.scriptProcessor.onaudioprocess = (e) => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);

        // Converter Float32 → PCM Int16
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        const base64Chunk = this.bufferToBase64(pcm16.buffer);
        const msg = {
          realtimeInput: {
            audio: {
              mimeType: 'audio/pcm;rate=16000',
              data: base64Chunk,
            },
          },
        };
        this.ws.send(JSON.stringify(msg));
      };

      this.callbacks.onStatusChange('listening');
    } catch (err) {
      console.error('[TecnoPUC Live] Permissão de microfone negada.', err);
      this.callbacks.onError?.('Permissão de microfone negada.');
      this.stop();
    }
  }

  private clearAudioQueue() {
    this.activeSources.forEach((source) => {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {}
    });
    this.activeSources = [];
    if (this.audioContext) {
      this.nextPlayTime = this.audioContext.currentTime;
    }
  }

  private async playAudioChunk(base64Data: string) {
    if (!this.audioContext) return;

    const binaryString = window.atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Saída da API Live: PCM 24kHz 16-bit
    const int16Data = new Int16Array(bytes.buffer);
    const float32Data = new Float32Array(int16Data.length);
    for (let i = 0; i < int16Data.length; i++) {
      float32Data[i] = int16Data[i] / 32768.0;
    }

    const audioBuffer = this.audioContext.createBuffer(1, float32Data.length, 24000);
    audioBuffer.copyToChannel(float32Data, 0);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    source.onended = () => {
      this.activeSources = this.activeSources.filter((s) => s !== source);
    };
    this.activeSources.push(source);

    const currentTime = this.audioContext.currentTime;
    if (this.nextPlayTime < currentTime) {
      this.nextPlayTime = currentTime;
    }
    source.start(this.nextPlayTime);
    this.nextPlayTime += audioBuffer.duration;
  }

  private bufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  public stop() {
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close();
      }
      this.ws = null;
    }

    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.clearAudioQueue();
      this.audioContext.close();
      this.audioContext = null;
    }

    this.nextPlayTime = 0;
    this.callbacks.onStatusChange('disconnected');
  }
}
