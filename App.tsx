
import React, { useState, useMemo, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { Plus, Trash2, Printer, Image as ImageIcon, User, FileText, Info, MessageCircle, Hash, Share2, Save, History, RotateCcw, Download, Phone, Search, X, LayoutDashboard } from 'lucide-react';
import { ClientData, QuoteItem, SavedQuote } from './types';
import { COMPANY_INFO, DEFAULT_OBSERVATIONS } from './constants';

const CompanyLogo = () => {
  return (
    <div className="relative shrink-0">
      <div className="relative w-16 h-16 md:w-24 md:h-24 rounded-full overflow-hidden shadow-xl border-2 border-white/20 bg-white flex items-center justify-center transition-transform hover:scale-105 duration-300">
        <img 
          src="https://i.postimg.cc/3JZGkGVs/Whats-App-Image-2026-02-20-at-13-13-16.jpg" 
          alt="Logo Casa dos Vidros" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const today = new Date().toLocaleDateString('pt-BR');

  // Estados de Navegação e Busca
  const [activeTab, setActiveTab] = useState<'editor' | 'database'>('editor');
  const [searchTerm, setSearchTerm] = useState('');

  // Estados de PWA, Instalação e Conexão Offline
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [showInstallModal, setShowInstallModal] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    setIsStandalone(!!checkStandalone);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerPwaInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`Resultado da escolha de instalação: ${outcome}`);
      setDeferredPrompt(null);
    } else {
      setShowInstallModal(true);
    }
  };

  // Estados principais
  const [clientData, setClientData] = useState<ClientData>({
    name: '',
    address: '',
    city: 'LIMEIRA',
    uf: 'SP',
    phone: '',
    cep: '',
    cpfCnpj: '',
    clientPhone: '',
    email: '',
    obs: '',
    date: today,
    quoteNumber: '',
  });

  const [budgetInfo, setBudgetInfo] = useState({
    color: 'Vidro incolor, alumínio branco',
    info: ''
  });

  const [items, setItems] = useState<QuoteItem[]>([
    { id: '1', description: '', quantity: 1, unitPrice: 0 }
  ]);

  const [observations, setObservations] = useState(DEFAULT_OBSERVATIONS);
  const [savedQuotes, setSavedQuotes] = useState<SavedQuote[]>([]);
  const [isSharing, setIsSharing] = useState(false);

  // Estado para toast de salvar com sucesso
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const triggerToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    const data = localStorage.getItem('casa_dos_vidros_db');
    if (data) setSavedQuotes(JSON.parse(data));
  }, []);

  const total = useMemo(() => items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0), [items]);

  // Busca filtrada
  const filteredQuotes = useMemo(() => {
    if (!searchTerm.trim()) return savedQuotes;
    const term = searchTerm.toLowerCase();
    return savedQuotes.filter(q => 
      q.clientData.name.toLowerCase().includes(term) ||
      q.clientData.clientPhone.toLowerCase().includes(term) ||
      q.clientData.quoteNumber.toLowerCase().includes(term)
    );
  }, [savedQuotes, searchTerm]);

  const handleClientChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setClientData(prev => ({ ...prev, [name]: value }));
  };

  const addItem = () => {
    setItems(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), description: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (id: string) => items.length > 1 && setItems(prev => prev.filter(item => item.id !== id));

  const updateItem = (id: string, field: keyof QuoteItem, value: any) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleImageUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => updateItem(id, 'image', reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  // Nova função unificada para salvamento com feedback e preenchimento inteligente em caso de salvamento automático
  const saveQuote = (isAutoSave: boolean = false) => {
    const rawName = clientData.name || '';
    const rawQuoteNumber = clientData.quoteNumber || '';
    let finalClientName = rawName.trim();
    let finalQuoteNumber = rawQuoteNumber.trim();
    
    if (!finalClientName) {
      if (isAutoSave) {
        finalClientName = "Cliente Avulso";
      } else {
        triggerToast("Por favor, preencha pelo menos o Nome do Cliente.", "error");
        return false;
      }
    }
    
    if (!finalQuoteNumber) {
      if (isAutoSave) {
        // Gera um número inteligente de contingência para salvar de qualquer jeito
        const now = new Date();
        const dateStr = now.toISOString().slice(2, 10).replace(/[-:]/g, '');
        const randStr = Math.floor(100 + Math.random() * 900);
        finalQuoteNumber = `AUTO-${dateStr}-${randStr}`;
      } else {
        triggerToast("Por favor, preencha o Número do Orçamento.", "error");
        return false;
      }
    }

    const updatedClientData = {
      ...clientData,
      name: finalClientName,
      quoteNumber: finalQuoteNumber
    };

    // Caso mudou, atualiza na tela para manter coerência visual
    if (clientData.name !== finalClientName || clientData.quoteNumber !== finalQuoteNumber) {
      setClientData(updatedClientData);
    }

    const newSavedQuote: SavedQuote = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      clientData: updatedClientData,
      items,
      budgetInfo,
      observations
    };

    const updated = [newSavedQuote, ...savedQuotes];
    setSavedQuotes(updated);

    try {
      localStorage.setItem('casa_dos_vidros_db', JSON.stringify(updated));
      if (isAutoSave) {
        triggerToast(`Orçamento Nº ${finalQuoteNumber} salvo automaticamente no Banco!`, "success");
      } else {
        triggerToast(`Orçamento Nº ${finalQuoteNumber} salvo no Banco de Dados!`, "success");
      }
    } catch (storageError) {
      console.warn("Storage quota exceeded! Executing automatic self-healing photo clean...", storageError);
      try {
        // Pruning method: keep images only for the 3 most recent quotes. Remove images for older ones to free up space, maintaining complete budget text data.
        const lighterQuotes = updated.map((q, index) => {
          if (index > 2) {
            return {
              ...q,
              items: q.items.map(i => ({ ...i, image: undefined }))
            };
          }
          return q;
        });
        localStorage.setItem('casa_dos_vidros_db', JSON.stringify(lighterQuotes));
        setSavedQuotes(lighterQuotes);
        triggerToast(`Otimizado! Orçamento Nº ${finalQuoteNumber} salvo (banco otimizado sem fotos antigas).`, "success");
      } catch (innerError) {
        console.error("Critical storage failure:", innerError);
        triggerToast("Memória do navegador cheia! Orçamento mantido nesta sessão.", "info");
      }
    }
    return true;
  };

  const handlePrintWithAutoSave = () => {
    // Salva automaticamente no banco de dados antes de abrir para impressão com barreira contra erros
    try {
      saveQuote(true);
    } catch (e) {
      console.error("Auto-save failed before print:", e);
    }
    setTimeout(() => {
      window.print();
    }, 250);
  };

  const loadQuote = (quote: SavedQuote) => {
    setClientData(quote.clientData || { name: '', address: '', city: 'LIMEIRA', uf: 'SP', phone: '', cep: '', cpfCnpj: '', clientPhone: '', email: '', obs: '', date: today, quoteNumber: '' });
    setItems(quote.items || [{ id: '1', description: '', quantity: 1, unitPrice: 0 }]);
    setBudgetInfo(quote.budgetInfo || { color: 'Vidro incolor, alumínio branco', info: '' });
    setObservations(quote.observations || DEFAULT_OBSERVATIONS);
    setActiveTab('editor');
    window.scrollTo(0, 0);
  };

  const deleteQuote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Excluir este orçamento permanentemente?")) {
      const updated = savedQuotes.filter(q => q.id !== id);
      setSavedQuotes(updated);
      try {
        localStorage.setItem('casa_dos_vidros_db', JSON.stringify(updated));
        triggerToast("Orçamento excluído.", "info");
      } catch (err) {
        console.error(err);
      }
    }
  };

  const newQuote = () => {
    if (confirm("Limpar tudo e iniciar um novo orçamento?")) {
      setClientData({ ...clientData, name: '', cpfCnpj: '', address: '', email: '', clientPhone: '', quoteNumber: '', date: today });
      setItems([{ id: '1', description: '', quantity: 1, unitPrice: 0 }]);
      setBudgetInfo({ color: 'Vidro incolor, alumínio branco', info: '' });
      setObservations(DEFAULT_OBSERVATIONS);
      setActiveTab('editor');
    }
  };

  const handleShareQuoteAsImage = async () => {
    // Salva automaticamente no banco com try-catch guard
    try {
      saveQuote(true);
    } catch (e) {
      console.error("Auto-save failed before image share:", e);
    }

    const element = containerRef.current;
    if (!element) return;
    setIsSharing(true);
    try {
      window.scrollTo(0, 0);
      const canvas = await html2canvas(element, {
        scale: 2.2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc: Document) => {
          const container = clonedDoc.getElementById('quote-container');
          if (container) {
            container.style.boxShadow = 'none';
            container.style.border = '1px solid #cbd5e1';
            container.style.borderRadius = '0';
            container.style.width = '960px'; 
            
            // Ativa cabeçalho escuro impecável no clone de imagem
            const header = container.querySelector('header') as HTMLElement;
            if (header) {
              header.style.backgroundColor = '#002137';
              header.style.color = '#ffffff';
              header.style.display = 'flex';
              header.style.flexDirection = 'row';
              header.style.alignItems = 'center';
              header.style.justifyContent = 'space-between';
              header.style.padding = '24px';
              
              const hRight = header.querySelector('.header-right-side') as HTMLElement;
              if (hRight) {
                hRight.style.borderLeft = '1px solid rgba(255,255,255,0.2)';
                hRight.style.paddingLeft = '20px';
                hRight.style.display = 'flex';
                hRight.style.flexDirection = 'column';
                hRight.style.alignItems = 'flex-end';
              }
            }

            // Ocultar botões ou elementos indesejáveis na exportação
            const noPrint = container.querySelectorAll('.no-print');
            noPrint.forEach(el => (el as HTMLElement).style.setProperty('display', 'none', 'important'));

            // Ocultar imagens vazias (que possuem ícone de placeholder) para o texto expandir majestosamente
            const emptyImgs = container.querySelectorAll('.item-row-img-col .lucide-image-icon, .item-row-img-col .lucide-image');
            emptyImgs.forEach(icon => {
              const wrapperImg = icon.closest('.item-row-img-col') as HTMLElement;
              if (wrapperImg) {
                wrapperImg.style.setProperty('display', 'none', 'important');
              }
            });

            // Strip styling para que todos os inputs de texto apareçam como texto plano perfeito, limpo e sem caixas de formulário na imagem
            const inputs = container.querySelectorAll('input, textarea');
            inputs.forEach(input => {
              const htmlInput = input as HTMLInputElement | HTMLTextAreaElement;
              htmlInput.style.backgroundColor = 'transparent';
              htmlInput.style.border = 'none';
              htmlInput.style.boxShadow = 'none';
              htmlInput.style.padding = '0';
              htmlInput.style.outline = 'none';
              
              // Se estiver no cabeçalho, a cor do texto permanece branca
              if (htmlInput.closest('header')) {
                htmlInput.style.color = '#ffffff';
                htmlInput.style.textAlign = 'right';
                htmlInput.style.fontWeight = '900';
              } else {
                htmlInput.style.color = '#1e293b';
                htmlInput.style.fontWeight = '700';
              }
            });
          }
        }
      });
      
      canvas.toBlob(async (blob: Blob | null) => {
        if (!blob) throw new Error("Falha ao gerar imagem blob");
        const clientNameNormalized = (clientData.name || '').trim() || 'Avulso';
        const fileName = `Orcamento_${clientData.quoteNumber || 'Novo'}.png`;
        const file = new File([blob], fileName, { type: 'image/png' });
        
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: `Orçamento Casa dos Vidros` });
        } else {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          link.click();
          URL.revokeObjectURL(url);
          triggerToast("Orçamento capturado e salvo na galeria!", "success");
        }
      }, 'image/png');
    } catch (err) {
      console.error(err);
      triggerToast("Erro ao capturar orçamento como imagem.", "error");
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="min-h-screen pt-4 pb-24 md:py-8 px-2 sm:px-4 bg-[#f1f5f9]">
      {/* TOAST NOTIFICATION PREMIUM DE ALTA VISIBILIDADE */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] w-[92%] max-w-md no-print shadow-[0_15px_45px_rgba(0,0,0,0.4)]">
          <div className={`p-4 rounded-2xl bg-[#002137] text-white border-2 flex items-center gap-3.5 ${
            toast.type === 'success' ? 'border-[#25D366]' :
            toast.type === 'error' ? 'border-red-500' :
            'border-blue-400'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              toast.type === 'success' ? 'bg-[#25D366]/15 text-[#25D366]' :
              toast.type === 'error' ? 'bg-red-500/15 text-red-400' :
              'bg-blue-500/15 text-blue-400'
            }`}>
              {toast.type === 'success' ? (
                <Save className="w-4 h-4 text-[#25D366]" />
              ) : toast.type === 'error' ? (
                <X className="w-4 h-4 text-red-500" />
              ) : (
                <Info className="w-4 h-4 text-blue-400" />
              )}
            </div>
            
            <div className="flex-1 text-left">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 leading-none mb-1">
                {toast.type === 'success' ? 'Confirmação' : toast.type === 'error' ? 'Atenção!' : 'Aviso'}
              </p>
              <p className="text-[11px] font-extrabold text-white leading-tight">{toast.message}</p>
            </div>
            
            <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10 shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* MODAL INSTRUTIVO DE INSTALAÇÃO NO ANDROID */}
      {showInstallModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden border border-slate-100 text-center animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowInstallModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full transition-all"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="w-16 h-16 rounded-3xl bg-slate-50 border border-slate-100 shadow-inner flex items-center justify-center mx-auto mb-4">
              <img 
                src="https://i.postimg.cc/3JZGkGVs/Whats-App-Image-2026-02-20-at-13-13-16.jpg" 
                alt="Logo Casa dos Vidros" 
                className="w-12 h-12 rounded-2xl object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            
            <h3 className="text-md font-black text-[#002137] uppercase tracking-tight mb-2">Instalar Casa dos Vidros</h3>
            <p className="text-slate-500 text-[11px] font-medium leading-relaxed mb-6">
              Instale o aplicativo no seu celular Android para criar e gerenciar orçamentos com total agilidade e sem precisar de internet!
            </p>
            
            <div className="space-y-3.5 text-left mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100 max-h-[220px] overflow-y-auto">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 shrink-0 rounded-full bg-blue-100 text-blue-600 text-[10px] font-black flex items-center justify-center">1</span>
                <p className="text-[11px] text-slate-600 font-bold leading-tight">
                  Toque nos <strong className="text-slate-800">Três Pontinhos (⁝)</strong> no canto superior direito do seu navegador Android (Chrome).
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 shrink-0 rounded-full bg-blue-100 text-blue-600 text-[10px] font-black flex items-center justify-center">2</span>
                <p className="text-[11px] text-slate-600 font-bold leading-tight">
                  Selecione <strong className="text-slate-800">"Instalar aplicativo"</strong> ou <strong className="text-slate-800">"Adicionar à Tela inicial"</strong>.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 shrink-0 rounded-full bg-blue-100 text-blue-600 text-[10px] font-black flex items-center justify-center">3</span>
                <p className="text-[11px] text-slate-600 font-bold leading-tight">
                  Clique em <strong className="text-slate-800">Instalar</strong>. O aplicativo estará pronto na sua tela inicial com o ícone oficial!
                </p>
              </div>
            </div>
            
            <button 
              onClick={() => setShowInstallModal(false)}
              className="w-full bg-[#002137] hover:bg-black text-white py-3 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-md transition-all active:scale-95"
            >
              Entendi, vou instalar!
            </button>
          </div>
        </div>
      )}

      {/* BANNER AVISO OFFLINE INTELIGENTE */}
      {!isOnline && (
        <div className="max-w-4xl mx-auto mb-4 px-2 sm:px-0 no-print animate-in slide-in-from-top-4 duration-300">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-slate-800">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-wider text-amber-700 leading-none mb-1">Modo Offline Ativo</p>
                <p className="text-[9px] text-slate-500 font-bold leading-tight">Sem rede. Seus orçamentos serão salvos de forma segura no banco de dados local.</p>
              </div>
            </div>
            <span className="bg-amber-100 text-amber-800 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0">Pronto</span>
          </div>
        </div>
      )}

      {/* MINI BANNER CONVITE DE INSTALAÇÃO MÓVEL */}
      {!isStandalone && (
        <div className="max-w-4xl mx-auto mb-4 px-2 sm:px-0 no-print">
          <div className="bg-gradient-to-r from-[#002137] to-slate-900 border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-white shadow-lg">
            <div className="flex items-center gap-4 text-left">
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center p-1 shadow-sm shrink-0">
                <img 
                  src="https://i.postimg.cc/3JZGkGVs/Whats-App-Image-2026-02-20-at-13-13-16.jpg" 
                  alt="App Icon" 
                  className="w-full h-full rounded-xl object-cover"
                />
              </div>
              <div>
                <h4 className="text-[12px] font-black uppercase tracking-tight leading-tight">Instale no seu Android</h4>
                <p className="text-[10px] text-slate-300 font-medium leading-tight mt-0.5">Acesse o sistema direto do celular, sem precisar de internet, idêntico a um aplicativo da Play Store.</p>
              </div>
            </div>
            <button 
              onClick={triggerPwaInstall}
              className="w-full sm:w-auto px-5 py-2.5 bg-blue-500 text-white hover:bg-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all whitespace-nowrap"
            >
              Baixar Aplicativo
            </button>
          </div>
        </div>
      )}

      {/* NAVEGAÇÃO SUPERIOR (SÓ EXIBE NO DESKTOP) */}
      <nav className="max-w-4xl mx-auto mb-8 no-print hidden md:flex justify-center p-1 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <button 
          onClick={() => setActiveTab('editor')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all ${activeTab === 'editor' ? 'bg-[#002137] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <LayoutDashboard className="w-4 h-4" /> Criar Orçamento
        </button>
        <button 
          onClick={() => setActiveTab('database')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all ${activeTab === 'database' ? 'bg-[#002137] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <History className="w-4 h-4" /> Banco de Dados
        </button>
      </nav>

      {/* BARRA DE NAVEGAÇÃO INFERIOR FLUIDA (SÓ EXIBE NO CELULAR) */}
      <div className="no-print fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-100 flex justify-around items-center py-2.5 px-2 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] z-50 md:hidden">
        <button 
          onClick={() => setActiveTab('editor')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all ${activeTab === 'editor' ? 'text-[#002137] scale-105' : 'text-slate-400'}`}
        >
          <LayoutDashboard className={`w-5 h-5 mb-0.5 ${activeTab === 'editor' ? 'text-blue-500' : ''}`} />
          <span className="text-[9px] font-black uppercase tracking-tight">Criar</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('database')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all ${activeTab === 'database' ? 'text-[#002137] scale-105' : 'text-slate-400'}`}
        >
          <History className={`w-5 h-5 mb-0.5 ${activeTab === 'database' ? 'text-blue-500' : ''}`} />
          <span className="text-[9px] font-black uppercase tracking-tight">Banco</span>
        </button>

        {!isStandalone && (
          <button 
            onClick={triggerPwaInstall}
            className="flex-1 flex flex-col items-center justify-center py-1 text-blue-600"
          >
            <Download className="w-5 h-5 mb-0.5 text-blue-600 animate-bounce" />
            <span className="text-[9px] font-black uppercase tracking-tight">Instalar</span>
          </button>
        )}

        <div className="flex-1 flex flex-col items-center justify-center py-1 text-slate-400">
          <div className="flex items-center gap-1 leading-none mb-0.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'}`} />
            <span className="text-[9px] font-black uppercase tracking-tight">{isOnline ? 'Pronto' : 'Sem Net'}</span>
          </div>
          <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Offline</span>
        </div>
      </div>

      {/* ABA EDITOR */}
      {activeTab === 'editor' && (
        <div className="animate-in fade-in duration-300">
          <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center no-print">
            <div className="flex gap-2">
                <button onClick={newQuote} className="flex items-center gap-2 bg-white text-slate-700 px-4 py-2 rounded-xl shadow-sm border border-slate-200 font-bold text-[10px] uppercase hover:bg-slate-50 transition-all">
                  <RotateCcw className="w-4 h-4 text-blue-500" /> Limpar
                </button>
                <button onClick={() => saveQuote(false)} className="flex items-center gap-2 bg-[#002137] text-white px-4 py-2 rounded-xl shadow-md font-bold text-[10px] uppercase hover:bg-black transition-all">
                  <Save className="w-4 h-4 text-blue-400" /> Salvar no Banco
                </button>
            </div>
          </div>

          <div 
            ref={containerRef}
            id="quote-container" 
            className="max-w-4xl mx-auto bg-white shadow-2xl md:rounded-2xl overflow-hidden border border-slate-200 print:border-none print:shadow-none mb-10"
          >
            {/* CABEÇALHO */}
            <header className="bg-[#002137] text-white p-4 md:p-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 md:gap-6 relative">
              <div className="flex flex-row items-center gap-3 md:gap-6 flex-1 w-full">
                <CompanyLogo />
                <div className="flex-1 flex flex-col justify-center text-left">
                  <h1 className="text-lg md:text-2xl font-black tracking-tighter uppercase mb-0.5 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent leading-none">
                    {COMPANY_INFO.name}
                  </h1>
                  <p className="text-slate-300 text-[9px] md:text-[11px] font-medium uppercase tracking-tight leading-tight mb-2">
                    {COMPANY_INFO.address}
                  </p>
                  <div className="flex flex-col gap-1 text-[8px] md:text-[9px] text-slate-400 font-bold uppercase tracking-wider border-t border-white/5 pt-2">
                    <span className="flex flex-wrap items-center gap-1 md:gap-2">
                      CNPJ: <span className="text-slate-200">{COMPANY_INFO.cnpj}</span> 
                      <span className="text-slate-600 hidden sm:inline">•</span> {COMPANY_INFO.city}
                    </span>
                    <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-0.5">
                      <span className="text-white font-extrabold flex items-center gap-1">
                        <User className="w-2.5 h-2.5 text-blue-400" /> {COMPANY_INFO.owner}
                      </span>
                      <span className="flex items-center gap-1 text-blue-300 font-extrabold">
                        <MessageCircle className="w-2.5 h-2.5" /> {COMPANY_INFO.phone}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 shrink-0 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6 header-right-side w-full md:w-auto md:min-w-[200px]">
                <div className="bg-blue-600/30 px-3 md:px-4 py-1.5 rounded-full border border-blue-400/30 text-blue-100 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] shrink-0">
                  Orçamento
                </div>
                <div className="space-y-1.5 flex-1 md:flex-initial text-right flex flex-col items-end w-full max-w-[220px] md:max-w-none">
                  <div className="flex items-center justify-end gap-2 w-full">
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-tighter shrink-0">DATA:</label>
                    <input 
                      type="text" 
                      value={clientData.date} 
                      onChange={handleClientChange} 
                      name="date" 
                      className="bg-white/5 px-2 py-1 rounded border border-white/10 text-[11px] md:text-[12px] font-black text-right w-full max-w-[110px] md:max-w-[120px] outline-none text-white focus:bg-white/10" 
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 w-full">
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-tighter shrink-0">Nº ORÇ:</label>
                    <input 
                      type="text" 
                      value={clientData.quoteNumber} 
                      onChange={handleClientChange} 
                      name="quoteNumber" 
                      className="bg-white/5 px-2 py-1 rounded border border-white/10 text-[11px] md:text-[12px] font-black text-right w-full max-w-[70px] md:max-w-[80px] outline-none text-white focus:bg-white/10" 
                    />
                  </div>
                </div>
              </div>
            </header>

            {/* DADOS CLIENTE */}
            <section className="p-4 md:p-6 bg-white border-b border-slate-100">
              <div className="flex items-center space-x-2 mb-4">
                <User className="w-4 h-4 text-[#002137]" />
                <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-800">Dados do Cliente</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 client-grid">
                <div className="col-span-2">
                  <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Nome / Razão Social</label>
                  <input type="text" name="name" value={clientData.name} onChange={handleClientChange} className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 outline-none" />
                </div>
                <div>
                  <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">CPF / CNPJ</label>
                  <input type="text" name="cpfCnpj" value={clientData.cpfCnpj} onChange={handleClientChange} className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-600 outline-none" />
                </div>
                <div>
                  <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Celular</label>
                  <input type="text" name="clientPhone" value={clientData.clientPhone} onChange={handleClientChange} className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-600 outline-none" placeholder="(00) 00000-0000" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Endereço Completo</label>
                  <input type="text" name="address" value={clientData.address} onChange={handleClientChange} className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-600 outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">E-mail</label>
                  <input type="email" name="email" value={clientData.email} onChange={handleClientChange} className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-600 outline-none" />
                </div>
              </div>
            </section>

            {/* INFO ADICIONAL */}
            <section className="px-4 md:px-6 py-3 bg-slate-50 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="flex items-center gap-3">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <div className="flex-1">
                  <label className="block text-[8px] font-black text-slate-400 uppercase mb-0.5 tracking-tight">Acabamento Selecionado</label>
                  <input type="text" value={budgetInfo.color} onChange={(e) => setBudgetInfo(p => ({...p, color: e.target.value}))} className="w-full bg-transparent border-none p-0 text-[10px] font-black text-slate-800 outline-none" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Hash className="w-4 h-4 text-blue-600 shrink-0" />
                <div className="flex-1">
                  <label className="block text-[8px] font-black text-slate-400 uppercase mb-0.5 tracking-tight">Nota Técnica</label>
                  <input type="text" value={budgetInfo.info} onChange={(e) => setBudgetInfo(p => ({...p, info: e.target.value}))} className="w-full bg-transparent border-none p-0 text-[10px] font-black text-slate-800 outline-none" placeholder="Ex: Vidro 10mm" />
                </div>
              </div>
            </section>

            {/* ITENS */}
            <section className="p-4 md:p-6 min-h-[250px]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-slate-700" />
                  <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-800">Descrição do Orçamento</h2>
                </div>
                <button onClick={addItem} className="no-print flex items-center gap-1.5 bg-[#002137] text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase shadow-md active:scale-95 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Item
                </button>
              </div>

              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="item-row flex flex-row items-start gap-4 border border-slate-100 rounded-xl p-3 bg-white relative group">
                    <button onClick={() => removeItem(item.id)} className="absolute -top-2 -right-2 no-print text-white bg-red-500 p-1.5 rounded-full shadow-lg opacity-100 sm:opacity-0 group-hover:opacity-100 z-10 transition-opacity">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    
                    {/* Imagem do Item ou Placeholder */}
                    <div className={`item-row-img-col border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center overflow-hidden bg-slate-50 relative shrink-0 ${!item.image ? 'print:hidden' : ''}`}>
                      {item.image ? (
                        <img src={item.image} alt="Produto" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="text-slate-300 w-5 h-5 sm:w-6 sm:h-6 lucide-image-icon" />
                      )}
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(item.id, e)} className="absolute inset-0 opacity-0 cursor-pointer no-print" />
                    </div>

                    {/* Detalhes do Item */}
                    <div className="item-row-details-col flex-1 flex flex-col justify-between text-left h-full min-h-[96px]">
                      <div className="w-full">
                        <textarea 
                          value={item.description || ''} 
                          onChange={(e) => updateItem(item.id, 'description', e.target.value)} 
                          className="w-full bg-transparent p-0 border-none text-[10px] sm:text-[11px] font-bold text-slate-800 leading-tight resize-none outline-none h-12" 
                          placeholder="Descrição do item..." 
                        />
                      </div>
                      
                      <div className="flex items-center justify-between gap-4 pt-2 border-t border-dashed border-slate-100 w-full mt-2">
                        <div className="flex items-center gap-3">
                          <div className="w-12">
                            <label className="block text-[7px] font-black text-slate-400 uppercase mb-0.5">Qtd</label>
                            <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))} className="w-full bg-slate-50 border border-slate-100 rounded h-7 p-0.5 text-[11px] font-black text-center outline-none focus:bg-slate-100" />
                          </div>
                          <div className="w-24 sm:w-28">
                            <label className="block text-[7px] font-black text-slate-400 uppercase mb-0.5">Valor Unitário</label>
                            <div className="flex items-center bg-slate-50 rounded px-1.5 border border-slate-100 h-7">
                              <span className="text-[8px] text-slate-400 font-black mr-1">R$</span>
                              <input type="number" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(item.id, 'unitPrice', Number(e.target.value))} className="w-full bg-transparent border-none py-1 text-[11px] font-black outline-none" />
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <label className="block text-[7px] font-black text-slate-400 uppercase mb-0.5">Total Item</label>
                          <span className="text-[12px] font-black text-slate-900">{formatCurrency(item.quantity * item.unitPrice)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* RODAPÉ */}
            <section className="p-4 md:p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-start gap-4 sm:gap-6 footer-row">
              <div className="flex-1">
                <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Observações Importantes</h3>
                <textarea rows={5} value={observations} onChange={(e) => setObservations(e.target.value)} className="w-full bg-white p-3 border border-slate-200 rounded-xl text-[10px] text-slate-600 outline-none leading-relaxed resize-none shadow-sm h-full min-h-[100px]" />
              </div>
              <div className="w-full sm:w-64 shrink-0">
                <div className="bg-[#002137] p-4 rounded-2xl shadow-xl relative overflow-hidden border border-white/5">
                  <span className="text-blue-300 text-[8px] font-black uppercase tracking-widest mb-1 block leading-none uppercase">VALOR TOTAL PROJETO</span>
                  <span className="text-white text-2xl font-black tracking-tighter block leading-none py-1">{formatCurrency(total)}</span>
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-[8px] font-black text-blue-200 italic uppercase leading-tight">Sujeito a alteração após medição.</p>
                  </div>
                </div>
                <p className="mt-3 text-[7px] text-slate-400 text-center uppercase font-black tracking-widest leading-none">Validade: 15 dias • Casa dos Vidros</p>
              </div>
            </section>

            <footer className="py-2.5 text-center border-t border-slate-50 bg-white">
              <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em]">© 2025 • {COMPANY_INFO.name}</p>
            </footer>
          </div>

          {/* AÇÕES FIXAS ABAIXO DO EDITOR */}
          <div className="max-w-4xl mx-auto mt-6 flex flex-row gap-4 justify-center no-print px-4 pb-12">
            <button onClick={handlePrintWithAutoSave} className="flex-1 max-w-[220px] flex items-center justify-center gap-2 bg-[#002137] text-white px-5 py-3.5 rounded-xl shadow-lg font-black uppercase text-[10px] active:scale-95 transition-all hover:bg-black">
              <Printer className="w-4 h-4" /> Gerar PDF / Imprimir
            </button>
            <button onClick={handleShareQuoteAsImage} disabled={isSharing} className={`flex-1 max-w-[220px] flex items-center justify-center gap-2 ${isSharing ? 'bg-slate-400' : 'bg-[#25D366] hover:bg-[#128C7E]'} text-white px-5 py-3.5 rounded-xl shadow-lg font-black uppercase text-[10px] active:scale-95 transition-all`}>
              <Share2 className="w-4 h-4" /> {isSharing ? "Gerando..." : "Enviar Foto"}
            </button>
          </div>
        </div>
      )}

      {/* ABA BANCO DE DADOS */}
      {activeTab === 'database' && (
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300 px-4 pb-20">
          <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-200 mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-black text-[#002137] uppercase tracking-tight">Banco de Dados</h2>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Gerencie e busque orçamentos salvos</p>
              </div>
              
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Buscar por nome, celular ou nº..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2">
                    <X className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                  </button>
                )}
              </div>
            </div>

            {filteredQuotes.length === 0 ? (
              <div className="py-20 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
                  <Search className="w-6 h-6 text-slate-200" />
                </div>
                <p className="text-slate-400 text-sm font-bold italic">
                  {searchTerm ? 'Nenhum orçamento encontrado para sua busca.' : 'Seu banco de dados está vazio.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                {filteredQuotes.map((q) => (
                  <div 
                    key={q.id} 
                    onClick={() => loadQuote(q)}
                    className="group bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-400 transition-all cursor-pointer relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                      <button 
                        onClick={(e) => deleteQuote(q.id, e)} 
                        className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex flex-col h-full">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 uppercase tracking-tighter">Nº {q.clientData.quoteNumber}</span>
                        <span className="text-[9px] font-black text-slate-300 uppercase">{new Date(q.timestamp).toLocaleDateString('pt-BR')}</span>
                      </div>
                      
                      <h3 className="text-sm font-black text-slate-800 uppercase line-clamp-1 mb-1 leading-none">{q.clientData.name || "Sem Nome"}</h3>
                      
                      <div className="flex items-center gap-2 mb-4">
                        <Phone className="w-3 h-3 text-slate-300" />
                        <span className="text-[10px] font-bold text-slate-500">{q.clientData.clientPhone || "Sem telefone"}</span>
                      </div>
                      
                      <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center">
                            <FileText className="w-3 h-3 text-slate-400" />
                          </div>
                          <span className="text-[9px] font-black text-slate-400 uppercase">{q.items.length} ITENS</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[13px] font-black text-[#002137]">{formatCurrency(q.items.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0))}</span>
                        </div>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <button className="flex-1 bg-slate-50 text-slate-400 text-[9px] font-black uppercase py-2.5 rounded-xl group-hover:bg-[#002137] group-hover:text-white transition-all">
                          Abrir no Editor
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="text-center">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Total no Banco de Dados: {savedQuotes.length} Registros</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
