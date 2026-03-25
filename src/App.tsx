import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, Shield, Layout, X, Download, RotateCcw, Loader2, ChevronRight, Info } from 'lucide-react';
// Temporarily removed framer-motion to resolve Vite resolution bug
// import { motion, AnimatePresence } from 'framer-motion';
import { extractTextFromPdf } from './lib/pdf';
import { generateHandbookWithAI, type HandbookContent } from './lib/ai';
import { ModernLayout, ClassicLayout, MinimalistLayout } from './components/Layouts';
// html2pdf removed — using native print window for full CSS compatibility

interface FileState {
  convention: File | null;
  logo: File | null;
  atas: File[];
}

const App: React.FC = () => {
  const [step, setStep] = useState<'upload' | 'layout' | 'generating' | 'result'>('upload');
  const [selectedLayout, setSelectedLayout] = useState<'modern' | 'classic' | 'minimalist'>('modern');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [files, setFiles] = useState<FileState>({
    convention: null,
    logo: null,
    atas: [],
  });

  const [handbookContent, setHandbookContent] = useState<HandbookContent | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const handbookRef = useRef<HTMLDivElement>(null);

  const handleFileUpload = (type: keyof FileState, file: File) => {
    if (type === 'atas') {
      setFiles(prev => ({ ...prev, atas: [...prev.atas, file].slice(0, 10) }));
    } else {
      setFiles(prev => ({ ...prev, [type]: file }));
      if (type === 'logo') {
        if (logoPreview) URL.revokeObjectURL(logoPreview);
        setLogoPreview(URL.createObjectURL(file));
      }
    }
  };

  const removeFile = (type: keyof FileState, index?: number) => {
    if (type === 'atas' && typeof index === 'number') {
      setFiles(prev => ({ ...prev, atas: prev.atas.filter((_, i) => i !== index) }));
    } else {
      setFiles(prev => ({ ...prev, [type]: null }));
      if (type === 'logo') {
        if (logoPreview) URL.revokeObjectURL(logoPreview);
        setLogoPreview(null);
      }
    }
  };

  const handleDownloadPDF = () => {
    if (!handbookRef.current) return;

    // Collect all stylesheets from the current document
    const styles = Array.from(document.styleSheets)
      .map(sheet => {
        try {
          return Array.from(sheet.cssRules)
            .map(rule => rule.cssText)
            .join('\n');
        } catch {
          // Cross-origin stylesheets can't be read — fetch them via <link> instead
          return sheet.href ? `@import url('${sheet.href}');` : '';
        }
      })
      .join('\n');

    const content = handbookRef.current.innerHTML;
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      setError('Popup bloqueado. Permita popups para este site e tente novamente.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Cartilha do Morador</title>
          <style>
            ${styles}
            @media print {
              body { margin: 0; }
              @page { size: A4; margin: 15mm; }
            }
          </style>
        </head>
        <body>
          <div>${content}</div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.onafterprint = function() { window.close(); };
              }, 500);
            };
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const processDocuments = async () => {
    if (!files.convention) {
      setError("Por favor, carregue a Convenção Condominial.");
      return;
    }

    setStep('generating');
    setIsProcessing(true);
    
    try {
      // 1. Extract text from all PDFs
      const conventionText = await extractTextFromPdf(files.convention);
      let atasText = "";
      for (const ata of files.atas) {
        atasText += `--- ARQUIVO ATA: ${ata.name} ---\n${await extractTextFromPdf(ata)}\n\n`;
      }

      const rawText = `NOME DO ARQUIVO CONVENÇÃO: ${files.convention.name}\n\nCONTEÚDO DA CONVENÇÃO:\n${conventionText}\n\nCONTEÚDO DAS ATAS:\n${atasText}`;
      console.log("DEBUG: rawText length:", rawText.length);
      console.log("DEBUG: rawText snippet:", rawText.substring(0, 500));
      
      if (rawText.trim().length < 100) {
        console.warn("DEBUG: Text extraction seems too short or empty.");
      }
      // 2. Generate content using Gemini AI
      const content = await generateHandbookWithAI(rawText, logoPreview || undefined);
      setHandbookContent(content);
      setStep('result');
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Erro ao processar PDFs com IA. Verifique sua conexão ou tente novamente.");
      setStep('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderSelectedLayout = () => {
    if (!handbookContent) return null;
    switch (selectedLayout) {
      case 'modern': return <ModernLayout content={handbookContent} logoUrl={logoPreview || undefined} />;
      case 'classic': return <ClassicLayout content={handbookContent} logoUrl={logoPreview || undefined} />;
      case 'minimalist': return <MinimalistLayout content={handbookContent} logoUrl={logoPreview || undefined} />;
    }
  };

  return (
    <div className="min-h-screen text-slate-100 p-8 flex flex-col items-center">
      {/* Header */}
      <header className="w-full max-w-5xl flex justify-between items-center mb-16">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            Prestare IA <span className="text-indigo-400 font-light">| Cartilha do Morador</span>
          </h1>
        </div>
      </header>

      <main className="w-full max-w-5xl flex flex-col items-center">
        {/* Progress Indicator */}
        <div className="flex justify-between w-full max-w-2xl mb-12 relative px-4">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-800 -translate-y-1/2 z-0"></div>
          <div 
            className="absolute top-1/2 left-0 h-0.5 bg-indigo-500 -translate-y-1/2 z-0 transition-all duration-500"
            style={{ width: `${(step === 'upload' ? 0 : step === 'layout' ? 50 : 100)}%` }}
          ></div>
          
          {[
            { id: 'upload', icon: Upload, label: 'Upload' },
            { id: 'layout', icon: Layout, label: 'Layout' },
            { id: 'result', icon: FileText, label: 'Resultado' }
          ].map((s, idx) => {
            const isActive = step === s.id;
            const isDone = (idx === 0 && (step === 'layout' || step === 'result' || step === 'generating')) || 
                           (idx === 1 && step === 'result');
            
            return (
              <div key={s.id} className="relative z-10 flex flex-col items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                  isActive ? 'bg-indigo-600 border-indigo-400 shadow-lg shadow-indigo-500/30' : 
                  isDone ? 'bg-indigo-900/50 border-indigo-500' : 'bg-slate-900 border-slate-800'
                }`}>
                  {isDone ? <CheckCircle2 className="w-5 h-5 text-indigo-400" /> : <s.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500'}`} />}
                </div>
                <span className={`text-xs font-medium ${isActive || isDone ? 'text-indigo-400' : 'text-slate-500'}`}>{s.label}</span>
              </div>
            );
          })}
        </div>

        <div className="w-full">
          {step === 'upload' && (
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
              <div className="glass-card p-10 flex flex-col gap-6">
                <div>
                  <h2 className="text-3xl font-bold mb-2">Carregue os Documentos</h2>
                  <p className="text-slate-400">Insira os arquivos base e o logotipo da empresa para personalizar a cartilha.</p>
                </div>

                <div className="space-y-4">
                  <div className="relative group">
                    <input 
                      type="file" 
                      accept="image/*"
                      disabled={isProcessing}
                      onChange={(e) => e.target.files?.[0] && handleFileUpload('logo', e.target.files[0])}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                    />
                    <div className={`p-4 rounded-xl border border-dashed transition-all ${
                      files.logo ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-slate-700 bg-slate-900/30'
                    }`}>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center overflow-hidden border border-indigo-500/20">
                          {logoPreview ? (
                            <img src={logoPreview} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <Layout className="text-indigo-400 w-6 h-6" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{files.logo ? files.logo.name : 'Logotipo da Empresa'}</p>
                          <p className="text-xs text-slate-500">Opcional • JPG, PNG ou SVG</p>
                        </div>
                        {files.logo && (
                          <button 
                            disabled={isProcessing}
                            onClick={(e) => { e.stopPropagation(); removeFile('logo'); }} 
                            className="z-20 p-1 hover:bg-slate-800 rounded-md"
                          >
                            <X className="w-4 h-4 text-slate-500" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {(['convention'] as const).map(id => {
                    const doc = { id, name: 'Convenção Condominial', sub: 'Obrigatório • PDF', icon: FileText };
                    
                    return (
                      <div key={doc.id} className="relative group">
                        <input 
                          type="file" 
                          accept="application/pdf"
                          disabled={isProcessing}
                          onChange={(e) => e.target.files?.[0] && handleFileUpload(doc.id, e.target.files[0])}
                          className="absolute inset-0 opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                        />
                        <div className={`p-4 rounded-xl border border-dashed transition-all ${
                          files[id] ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-700 bg-slate-900/30'
                        }`}>
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-transform ${
                              files[id] ? 'bg-emerald-500/10 text-emerald-400' : `bg-indigo-500/10 text-indigo-400`
                            }`}>
                              {files[id] ? <CheckCircle2 className="w-5 h-5" /> : <doc.icon className="w-5 h-5" />}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{files[id] ? (files[id] as File).name : doc.name}</p>
                              <p className="text-xs text-slate-500">{doc.sub}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div className="relative group">
                    <input 
                      type="file" 
                      accept="application/pdf"
                      multiple
                      disabled={isProcessing}
                      onChange={(e) => {
                        const fileList = Array.from(e.target.files || []);
                        fileList.forEach(f => handleFileUpload('atas', f));
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                    />
                    <div className="p-4 rounded-xl border border-dashed border-slate-700 bg-slate-900/30 hover:border-indigo-500/50 transition-all">
                      <div className="flex items-center gap-4 text-amber-400">
                        <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                          <RotateCcw className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-100">Atas de Reunião</p>
                          <p className="text-xs text-slate-500">{files.atas.length} arquivos • Máx 10</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {error && <p className="text-red-400 text-sm italic">{error}</p>}

                <button 
                  disabled={isProcessing}
                  onClick={() => files.convention ? setStep('layout') : setError("Carregue a Convenção Condominial.")}
                  className="mt-4 w-full py-4 bg-indigo-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  Continuar para Layout <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col gap-6">
                <div className="glass-card p-8 bg-indigo-500/5 border-indigo-500/20">
                  <h3 className="flex items-center gap-2 text-indigo-400 font-bold mb-4">
                    <Info className="w-5 h-5" /> Dica do Especialista
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    O Agente analisa os horários específicos de silêncio e regras de descarte de lixo para cada condomínio automaticamente.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 'layout' && (
            <div className="w-full flex flex-col items-center gap-8 animate-fade-in">
              <h2 className="text-3xl font-bold">Escolha seu Estilo</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                {[
                  { id: 'modern', name: 'Modern Premium', icon: Layout },
                  { id: 'classic', name: 'Executivo Classic', icon: Shield },
                  { id: 'minimalist', name: 'Minimalist Air', icon: FileText }
                ].map((l) => (
                  <div 
                    key={l.id} 
                    onClick={() => setSelectedLayout(l.id as any)}
                    className={`glass-card p-4 cursor-pointer transition-all ${
                      selectedLayout === l.id ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'hover:border-slate-600'
                    }`}
                  >
                    <div className="aspect-[3/4] bg-slate-900 rounded-lg mb-4 flex items-center justify-center">
                      <l.icon className="w-12 h-12 text-slate-700" />
                    </div>
                    <p className="font-bold text-center">{l.name}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 w-full max-w-sm mt-8">
                <button onClick={() => setStep('upload')} className="flex-1 py-4 rounded-xl border border-slate-700 font-bold">Voltar</button>
                <button onClick={processDocuments} className="flex-[2] py-4 bg-indigo-600 rounded-xl font-bold">Gerar Cartilha</button>
              </div>
            </div>
          )}

          {step === 'generating' && (
            <div className="flex flex-col items-center gap-8 py-20 animate-fade-in text-center">
              <Loader2 className="w-24 h-24 text-indigo-500 animate-spin" />
              <h2 className="text-2xl font-bold">Gerando sua cartilha...</h2>
            </div>
          )}

          {step === 'result' && (
            <div className="w-full flex flex-col gap-10 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr,450px] gap-12">
                <div className="space-y-6">
                  <h2 className="text-5xl font-extrabold leading-tight">Sua Cartilha <br /> <span className="text-indigo-500">ficou pronta.</span></h2>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                      <p className="text-indigo-500 text-3xl font-black">
                        {handbookContent?.sections.length.toString().padStart(2, '0') || '00'}
                      </p>
                      <p className="text-xs text-slate-500 uppercase font-bold">Seções</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                      <p className="text-indigo-500 text-3xl font-black">{files.atas.length}</p>
                      <p className="text-xs text-slate-500 uppercase font-bold">Atas</p>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-8">
                    <button 
                      onClick={handleDownloadPDF}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-4 px-8 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all hover:scale-[1.02] shadow-lg shadow-indigo-500/25"
                    >
                      Download PDF <Download className="w-5 h-5" />
                    </button>
                    <button onClick={() => setStep('upload')} className="px-8 py-4 rounded-2xl border border-slate-700 font-bold">Reiniciar</button>
                  </div>
                </div>

                <div className="glass-card overflow-hidden shadow-2xl h-[700px] overflow-y-auto custom-scrollbar">
                  <div ref={handbookRef} style={{ backgroundColor: '#ffffff' }}>
                    {renderSelectedLayout()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Background decoration */}
      <div className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-purple-600/10 blur-[100px] rounded-full"></div>
      </div>
    </div>
  );
};

export default App;
