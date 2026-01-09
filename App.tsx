
import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { InputForm } from './components/InputForm';
import { ChatPanel } from './components/ChatPanel';
import { generateLessonPlan, refineLessonPlan } from './services/geminiService';

interface Message {
  role: 'user' | 'ai';
  content: string;
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'input' | 'workspace'>('input');
  const [generatedHtml, setGeneratedHtml] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Initializing...');
  const [chatMessages, setChatMessages] = useState<Message[]>([]);

  const handleGenerate = async (text: string, attachments?: Array<{ mimeType: string; data: string }>) => {
    setIsProcessing(true);
    setStatusMessage("Starting AI Pipeline...");
    try {
      const html = await generateLessonPlan(text, attachments, (status) => setStatusMessage(status));
      setGeneratedHtml(html);
      setChatMessages([
        { role: 'user', content: (attachments && attachments.length > 0) ? `Created lesson from ${attachments.length} file(s) with instructions: ${text}` : 'Draft this lesson plan.' },
        { role: 'ai', content: 'I have analyzed your input and built the initial interactive lesson using the 5-stage pipeline. Use this chat to request adjustments.' }
      ]);
      setCurrentView('workspace');
    } catch (error: any) {
      console.error(error);
      const isQuotaError = error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED');
      if (isQuotaError) {
        alert('The AI is currently receiving too many requests (Rate Limit). Please wait about 60 seconds and try again.');
      } else {
        alert('Failed to generate lesson. Please check your network connection and try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRefine = async (request: string) => {
    setIsProcessing(true);
    setStatusMessage("Refining your lesson...");
    setChatMessages(prev => [...prev, { role: 'user', content: request }]);
    
    try {
      const newHtml = await refineLessonPlan(generatedHtml, request);
      setGeneratedHtml(newHtml);
      setChatMessages(prev => [...prev, { role: 'ai', content: 'Code updated! The preview has been refreshed.' }]);
    } catch (error: any) {
      console.error(error);
      const isQuotaError = error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED');
      const errorMsg = isQuotaError 
        ? 'Sorry, the AI is at its limit. Please wait a moment and then try sending your request again.'
        : 'Sorry, I encountered an error while updating the code.';
      setChatMessages(prev => [...prev, { role: 'ai', content: errorMsg }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = useCallback(() => {
    if (!generatedHtml) return;

    const blob = new Blob([generatedHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const titleMatch = generatedHtml.match(/<title>(.*?)<\/title>/i);
    let filenameBase = titleMatch ? titleMatch[1] : 'Interactive_Lesson';
    filenameBase = filenameBase.replace(/[<>:"/\\|?*]/g, '-').trim();

    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    const dateStr = `${month}.${day}.${year}`;

    const fileName = `${filenameBase}-sway-${dateStr}.html`;

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [generatedHtml]);

  const handleReset = () => {
    if (window.confirm('Are you sure? All current progress will be lost.')) {
      setGeneratedHtml('');
      setChatMessages([]);
      setCurrentView('input');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header />
      
      <main className="flex-1 overflow-hidden relative">
        {currentView === 'input' ? (
          <InputForm onGenerate={handleGenerate} isGenerating={isProcessing} />
        ) : (
          <div className="flex h-full">
            <div className="w-96 shrink-0 h-full border-r border-gray-200 shadow-xl z-10 hidden md:block">
              <ChatPanel 
                messages={chatMessages}
                onSendMessage={handleRefine}
                isProcessing={isProcessing}
                onDownload={handleDownload}
                onReset={handleReset}
              />
            </div>

            <div className="flex-1 h-full bg-gray-100 relative">
              {isProcessing && (
                <div className="absolute inset-0 bg-white/50 z-50 flex items-center justify-center backdrop-blur-sm">
                  <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-6 border border-blue-100 max-w-sm text-center">
                     <div className="flex gap-2">
                        <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                        <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                     </div>
                     <div className="space-y-2">
                        <h3 className="font-bold text-gray-900 text-lg">Assembly Line Active</h3>
                        <p className="font-medium text-blue-600 animate-pulse">{statusMessage}</p>
                     </div>
                  </div>
                </div>
              )}
              
              <iframe
                title="Lesson Preview"
                srcDoc={generatedHtml}
                className="w-full h-full border-none block bg-white"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            </div>
            
            <div className="md:hidden absolute bottom-4 right-4">
                <button className="bg-blue-600 text-white p-3 rounded-full shadow-lg" onClick={() => alert("Switch to desktop for full chat experience")}>
                   💬
                </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
