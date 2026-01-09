
import React, { useState, useRef, useCallback } from 'react';
import { ArrowRight, Loader2, FileText, Upload, Link as LinkIcon, X, FileType, CheckCircle2, AlertCircle, Video, Film, Headphones, Mic } from 'lucide-react';

interface InputFormProps {
  onGenerate: (text: string, attachments?: Array<{ mimeType: string; data: string }>) => void;
  isGenerating: boolean;
}

type InputMode = 'text' | 'file' | 'url';

interface FileItem {
  id: string;
  name: string;
  type: string;
  data?: string; // base64 for binary
  keyframes?: string[]; // Array of base64 keyframes for video
  text?: string; // extracted text for docx/txt
  status: 'processing' | 'completed' | 'error';
  progress: number;
  isMedia?: boolean;
}

export const InputForm: React.FC<InputFormProps> = ({ onGenerate, isGenerating }) => {
  const [mode, setMode] = useState<InputMode>('text');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  
  // Multiple Files State
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractKeyframes = async (file: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      video.src = URL.createObjectURL(file);

      video.onloadedmetadata = async () => {
        const duration = video.duration;
        const frames: string[] = [];
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Grab frames at 10%, 50%, 90%
        const timestamps = [duration * 0.1, duration * 0.5, duration * 0.9];
        
        try {
          for (const time of timestamps) {
            video.currentTime = time;
            await new Promise((res) => {
              const onSeeked = () => {
                video.removeEventListener('seeked', onSeeked);
                canvas.width = video.videoWidth / 2; // scale down for payload efficiency
                canvas.height = video.videoHeight / 2;
                ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
                frames.push(canvas.toDataURL('image/jpeg', 0.7).split(',')[1]);
                res(null);
              };
              video.addEventListener('seeked', onSeeked);
            });
          }
          URL.revokeObjectURL(video.src);
          resolve(frames);
        } catch (err) {
          reject(err);
        }
      };

      video.onerror = () => reject(new Error("Video could not be loaded"));
    });
  };

  const processFile = async (selectedFile: File) => {
    const id = Math.random().toString(36).substr(2, 9);
    const fileName = selectedFile.name.toLowerCase();
    const isVideo = selectedFile.type.startsWith('video/') || fileName.endsWith('.mp4') || fileName.endsWith('.mov') || fileName.endsWith('.webm');
    const isAudio = selectedFile.type.startsWith('audio/') || fileName.endsWith('.mp3') || fileName.endsWith('.wav') || fileName.endsWith('.ogg') || fileName.endsWith('.m4a');
    const isImage = selectedFile.type.startsWith('image/');

    const newItem: FileItem = {
      id,
      name: selectedFile.name,
      type: selectedFile.type || 'application/octet-stream',
      status: 'processing',
      progress: 0,
      isMedia: isVideo || isImage || isAudio
    };

    setFiles(prev => [...prev, newItem]);

    const updateFile = (updates: Partial<FileItem>) => {
      setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    };

    try {
      // Simulate progress for UX
      let p = 0;
      const interval = setInterval(() => {
        p += 15;
        if (p <= 90) updateFile({ progress: p });
      }, 100);

      // Handle Video (Keyframe Extraction)
      if (isVideo) {
        try {
          const frames = await extractKeyframes(selectedFile);
          clearInterval(interval);
          updateFile({ keyframes: frames, status: 'completed', progress: 100 });
        } catch (err) {
          console.error("Video processing error:", err);
          clearInterval(interval);
          updateFile({ status: 'error' });
        }
      }
      // Handle DOCX
      else if (fileName.endsWith('.docx')) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          if ((window as any).mammoth) {
            try {
              const result = await (window as any).mammoth.extractRawText({ arrayBuffer: arrayBuffer });
              clearInterval(interval);
              updateFile({ text: result.value, status: 'completed', progress: 100 });
            } catch (err) {
              clearInterval(interval);
              updateFile({ status: 'error' });
            }
          }
        };
        reader.readAsArrayBuffer(selectedFile);
      }
      // Handle TXT
      else if (fileName.endsWith('.txt') || selectedFile.type === 'text/plain') {
        const reader = new FileReader();
        reader.onload = (event) => {
          clearInterval(interval);
          updateFile({ text: event.target?.result as string, status: 'completed', progress: 100 });
        };
        reader.readAsText(selectedFile);
      }
      // Handle PDF, Images & Audio (Read as Base64 for API)
      else {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            const base64String = (event.target.result as string).split(',')[1];
            clearInterval(interval);
            updateFile({ data: base64String, status: 'completed', progress: 100 });
          }
        };
        reader.readAsDataURL(selectedFile);
      }
    } catch (error) {
      updateFile({ status: 'error' });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach(processFile);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      Array.from(e.dataTransfer.files).forEach(processFile);
    }
  }, []);

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalPrompt = text.trim();
    const attachments: Array<{ mimeType: string; data: string }> = [];

    if (mode === 'url') {
      if (!url.trim()) return;
      finalPrompt = `Analyze this link: ${url}\n\nUser Instructions: ${finalPrompt || "Transform this into a full ESL lesson."}`;
    } else if (mode === 'file') {
      if (files.length === 0) return;
      
      const fileTexts: string[] = [];
      files.forEach(file => {
        if (file.status === 'completed') {
          if (file.text) {
            fileTexts.push(`--- CONTENT FROM ${file.name} ---\n${file.text}`);
          } else if (file.keyframes) {
            file.keyframes.forEach((frame, idx) => {
              attachments.push({
                mimeType: 'image/jpeg',
                data: frame
              });
            });
            fileTexts.push(`--- VIDEO CONTEXT: ${file.name} (analyzing ${file.keyframes.length} keyframes) ---`);
          } else if (file.data) {
            attachments.push({
              mimeType: file.type,
              data: file.data
            });
            if (file.type.startsWith('audio/')) {
              fileTexts.push(`--- AUDIO CONTEXT: ${file.name} (analyzing audio for transcription and lesson content) ---`);
            }
          }
        }
      });

      if (fileTexts.length > 0) {
        finalPrompt = `${finalPrompt || "Analyze the following content to create an ESL lesson plan."}\n\n${fileTexts.join('\n\n')}`;
      } else if (!finalPrompt) {
        finalPrompt = "Analyze the attached media to create a full ESL lesson plan.";
      }
    }

    if (finalPrompt || attachments.length > 0) {
      onGenerate(finalPrompt, attachments.length > 0 ? attachments : undefined);
    }
  };

  const isSubmitDisabled = () => {
    if (isGenerating) return true;
    if (mode === 'text' && !text.trim()) return true;
    if (mode === 'url' && !url.trim()) return true;
    if (mode === 'file' && (files.length === 0 || files.some(f => f.status === 'processing'))) return true;
    return false;
  };

  const getFileIcon = (file: FileItem) => {
    if (file.keyframes) return <Video size={20} />;
    if (file.type.startsWith('audio/')) return <Headphones size={20} />;
    if (file.type.startsWith('image/')) return <Film size={20} />;
    return <FileType size={20} />;
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto justify-center p-6 animate-fade-in overflow-y-auto">
      <div className="text-center mb-8 shrink-0">
        <h2 className="text-3xl font-bold text-gray-900 font-serif mb-3">Design Your Lesson</h2>
        <p className="text-gray-600">
          Transform text, documents, **audio**, or videos into interactive "Sway-style" learning objects.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50/50 shrink-0">
          {(['text', 'file', 'url'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                mode === m ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {m === 'text' && <FileText size={18} />}
              {m === 'file' && <Upload size={18} />}
              {m === 'url' && <LinkIcon size={18} />}
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          {/* Mode: URL */}
          {mode === 'url' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Link URL</label>
              <input
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          )}

          {/* Mode: File */}
          {mode === 'file' && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">Documents, Audio, Images, or Videos (Multiple)</label>
              
              <div 
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                  isDragging ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex justify-center gap-4 mb-3">
                  <Upload className={`${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
                  <Headphones className={`${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
                  <Film className={`${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
                </div>
                <p className="text-sm text-gray-600 font-medium">Drag and drop files here, or click to browse</p>
                <p className="text-xs text-gray-400 mt-1">Supports PDF, DOCX, TXT, MP3, WAV, MP4, MOV</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept=".pdf,.docx,.txt,image/*,video/mp4,video/quicktime,video/webm,audio/mpeg,audio/wav,audio/ogg,audio/mp4"
                  onChange={handleFileChange}
                />
              </div>

              {files.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                  {files.map((file) => (
                    <div key={file.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-200 hover:border-blue-200 transition-colors">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`p-2 rounded-lg ${file.status === 'error' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                          {getFileIcon(file)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                          <div className="flex items-center gap-2">
                            {file.status === 'processing' && (
                              <div className="w-full h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                                <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${file.progress}%` }}></div>
                              </div>
                            )}
                            {file.status === 'completed' && (
                              <span className="text-[10px] text-green-600 font-bold flex items-center gap-1 uppercase tracking-wider">
                                <CheckCircle2 size={10} /> 
                                {file.keyframes ? `READY (${file.keyframes.length} Frames)` : 'READY'}
                              </span>
                            )}
                            {file.status === 'error' && <span className="text-[10px] text-red-600 font-bold flex items-center gap-1 uppercase tracking-wider"><AlertCircle size={10} /> FAILED</span>}
                          </div>
                        </div>
                      </div>
                      <button type="button" onClick={() => removeFile(file.id)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors shrink-0">
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Common: Description/Instruction */}
          <div className="space-y-2 shrink-0">
            <label className="block text-sm font-medium text-gray-700">
              {mode === 'text' ? 'Lesson Plan / Content' : 'Instructions (Optional)'}
            </label>
            <textarea
              className="w-full h-32 p-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none resize-none text-base"
              placeholder={
                mode === 'text' 
                  ? "Paste your lesson text here (e.g. 'Topic: Ordering Coffee. Level: A2...')" 
                  : "E.g., 'Extract transcript and vocabulary from this audio clip'..."
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitDisabled()}
            className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-lg shrink-0 ${
              isSubmitDisabled()
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700'
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="animate-spin" />
                Processing Multimodal Input...
              </>
            ) : (
              <>
                Generate Interactive Lesson
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-4 text-sm text-gray-500 text-center shrink-0">
        <div className="flex flex-col items-center">
          <span className="font-semibold text-gray-700">Multimodal</span>
          <span>Audio, Video & Docs</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="font-semibold text-gray-700">AI Transcription</span>
          <span>Native Audio Analysis</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="font-semibold text-gray-700">SRS Ready</span>
          <span>JSON Structured Output</span>
        </div>
      </div>
    </div>
  );
};
