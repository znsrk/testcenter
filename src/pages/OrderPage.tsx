import { useState, useEffect, useRef } from 'react';
import { ShoppingBag, Mic, MicOff, Loader2, Trash2, ChevronRight, UtensilsCrossed, CheckCircle2, ReceiptText } from 'lucide-react';

// --- CONFIGURATION ---
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'YOUR_GOOGLE_GEMINI_KEY'; 
const CARTESIA_API_KEY = import.meta.env.VITE_CARTESIA_API_KEY || 'YOUR_CARTESIA_API_KEY';
const CARTESIA_VOICE_ID = "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc"; 

interface MenuItem {
  id: number;
  name: string;
  price: number;
  category: string;
  image: string;
  desc: string;
}

interface OrderItem extends MenuItem {
  instanceId: number;
}

interface ReceiptData {
    orderId: string;
    items: OrderItem[];
    total: number;
    timestamp: string;
}

const MENU: MenuItem[] = [
  // MAIN MEALS
  { id: 1, name: "Vegetable Soup", price: 5.35, category: "Mains", image: "🥣", desc: "Healthy and warm blended vegetable soup." },
  { id: 2, name: "Noodles with Bean Sprouts", price: 4.20, category: "Mains", image: "🍜", desc: "Stir-fried noodles mixed with fresh bean sprouts." },
  { id: 3, name: "Chicken Tikka Masala", price: 5.30, category: "Mains", image: "🥘", desc: "Creamy spiced chicken curry served in a rich sauce." },
  { id: 4, name: "Crispy Duck Pancakes", price: 6.40, category: "Mains", image: "🌯", desc: "Shredded crispy duck served with thin pancakes." },
  { id: 5, name: "Chicken with Boiled Rice", price: 5.30, category: "Mains", image: "🍛", desc: "Tender chicken pieces served over steamed white rice." },
  { id: 6, name: "Kebab (lamb in pitta bread)", price: 4.20, category: "Mains", image: "🥙", desc: "Seasoned lamb served inside a soft pitta bread." },

  // SIDE DISHES
  { id: 7, name: "Chicken Salad", price: 6.50, category: "Side Dishes", image: "🥗", desc: "Fresh mixed greens topped with grilled chicken." },
  { id: 8, name: "Spring Rolls", price: 2.05, category: "Side Dishes", image: "🥢", desc: "Crispy fried rolls filled with vegetables." },

  // DESSERTS
  { id: 9, name: "Ice Cream", price: 2.50, category: "Desserts", image: "🍦", desc: "Creamy frozen dessert in a tub." },
  { id: 10, name: "Fruit Salad", price: 3.00, category: "Desserts", image: "🥣", desc: "A selection of fresh, seasonal chopped fruits." },

  // DRINKS
  { id: 11, name: "Cola", price: 1.00, category: "Drinks", image: "🥤", desc: "Refreshing carbonated cola drink." },
  { id: 12, name: "Mineral Water (still)", price: 2.50, category: "Drinks", image: "💧", desc: "Still mineral water in a bottle." }
];

const CATEGORIES = ["All", "Breakfast", "Starters", "Mains", "Desserts", "Drinks"]; // Added "All" category

export default function OrderPage() {
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [activeCategory, setActiveCategory] = useState("All"); // Changed initial active category to "All"
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [aiMessage, setAiMessage] = useState("Hi! Tap the mic to order.");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [isReceiptVisible, setIsReceiptVisible] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-hide receipt after 5 seconds
  useEffect(() => {
    if (isReceiptVisible) {
      const timer = setTimeout(() => {
        setIsReceiptVisible(false);
        // Fully clear receipt data after animation
        setTimeout(() => setReceipt(null), 500);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isReceiptVisible]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true; 
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      let finalTranscript = '';

      recognitionRef.current.onresult = (event: any) => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
          else interimTranscript += event.results[i][0].transcript;
        }

        silenceTimerRef.current = setTimeout(() => {
          const fullText = (finalTranscript + interimTranscript).trim();
          if (fullText) {
            processOrderWithAI(fullText);
            try { recognitionRef.current?.stop(); } catch(e) {}
          }
        }, 1500);
      };

      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onend = () => { setIsListening(false); finalTranscript = ''; };
    }
  }, []);

  const toggleListening = () => {
    if (isPlayingAudio || isProcessing) return;
    if (isListening) {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      try { recognitionRef.current?.stop(); } catch(e) {}
    } else {
      setAiMessage("Listening...");
      try { recognitionRef.current?.start(); } catch(e) { setIsListening(true); }
    }
  };

  const processOrderWithAI = async (userText: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setAiMessage("Thinking...");
    
    try {
      const prompt = `You are a cashier. Menu: ${JSON.stringify(MENU.map(m => ({ id: m.id, name: m.name })))}. User: "${userText}". Identify item IDs. Format JSON: { "add_item_ids": [ids], "voice_response": "short text" }`;
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { response_mime_type: "application/json" } })
      });

      const data = await response.json();
      const result = JSON.parse(data.candidates[0].content.parts[0].text);

      if (result.add_item_ids?.length) {
        const newItems = result.add_item_ids
          .map((id: number) => MENU.find(m => m.id === id))
          .filter(Boolean)
          .map((item: MenuItem) => ({ ...item, instanceId: Math.random() }));
        setCart(prev => [...prev, ...newItems]);
      }

      setAiMessage(result.voice_response || "Added to your order.");
      speakResponse(result.voice_response || "Order updated.");
    } catch (error) {
      setAiMessage("Sorry, I missed that.");
    } finally {
      setIsProcessing(false);
    }
  };

  const speakResponse = async (text: string) => {
    if (!CARTESIA_API_KEY || CARTESIA_API_KEY === 'YOUR_CARTESIA_API_KEY') return;
    try {
      setIsPlayingAudio(true);
      const response = await fetch("https://api.cartesia.ai/tts/bytes", {
        method: "POST",
        headers: { "Cartesia-Version": "2024-06-10", "X-API-Key": CARTESIA_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          model_id: "sonic-3", transcript: text, voice: { mode: "id", id: CARTESIA_VOICE_ID },
          output_format: { container: "mp3", sample_rate: 44100, bit_rate: 128000 },
        }),
      });
      const blob = new Blob([await response.arrayBuffer()], { type: "audio/mp3" });
      const audio = new Audio(URL.createObjectURL(blob));
      audioRef.current = audio;
      audio.onended = () => setIsPlayingAudio(false);
      await audio.play();
    } catch (e) { setIsPlayingAudio(false); }
  };

  const handleCompleteOrder = () => {
    if (cart.length === 0) return;
    
    const newReceipt: ReceiptData = {
        orderId: Math.random().toString(36).substring(2, 7).toUpperCase(),
        items: [...cart],
        total: cart.reduce((sum, item) => sum + item.price, 0),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setReceipt(newReceipt);
    setIsReceiptVisible(true);
    setCart([]);
    setAiMessage("Thank you! Your order is being prepared.");
    speakResponse("Thank you for your order. We are preparing it now.");
  };

  const total = cart.reduce((sum, item) => sum + item.price, 0);
  const filteredMenu = activeCategory === "All" 
    ? MENU 
    : MENU.filter(item => item.category === activeCategory); // Modified filtering logic

  return (
    <div className="h-screen bg-[#F5F5F5] flex overflow-hidden font-sans select-none relative">
      
      {/* --- RECEIPT OVERLAY --- */}
      {receipt && (
        <div className={`absolute inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-500 ${isReceiptVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className={`bg-white w-80 p-8 shadow-2xl rounded-sm transform transition-transform duration-500 font-mono ${isReceiptVisible ? 'scale-100 rotate-0' : 'scale-90 rotate-2'}`}>
                <div className="flex flex-col items-center border-b-2 border-dashed border-gray-200 pb-4 mb-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                        <CheckCircle2 className="text-emerald-500" />
                    </div>
                    <h2 className="text-xl font-bold uppercase tracking-widest">Receipt</h2>
                    <p className="text-xs text-gray-400">ORDER #{receipt.orderId}</p>
                </div>
                <div className="space-y-2 mb-6 text-sm">
                    {receipt.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between">
                            <span className="truncate pr-4">{item.name}</span>
                            <span>${item.price.toFixed(2)}</span>
                        </div>
                    ))}
                </div>
                <div className="border-t-2 border-gray-100 pt-4 flex justify-between font-bold text-lg">
                    <span>TOTAL</span>
                    <span>${receipt.total.toFixed(2)}</span>
                </div>
                <div className="mt-8 text-center text-[10px] text-gray-400 uppercase tracking-tighter">
                    <p>{receipt.timestamp}</p>
                    <p className="mt-1">Enjoy your meal!</p>
                </div>
                {/* Visual jagged bottom for receipt effect */}
                <div className="absolute -bottom-2 left-0 right-0 flex overflow-hidden">
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="w-8 h-4 bg-white rotate-45 transform origin-top-left shadow-sm"></div>
                    ))}
                </div>
            </div>
        </div>
      )}

      {/* --- SIDEBAR --- */}
      <div className="w-28 bg-white border-r border-gray-200 flex flex-col items-center py-6 gap-4">
        <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-red-100">
            <UtensilsCrossed className="text-white w-8 h-8" />
        </div>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={`flex flex-col items-center justify-center w-20 h-20 rounded-xl transition-all ${activeCategory === cat ? 'bg-[#FFC72C] text-gray-900 shadow-md font-bold' : 'text-gray-400 hover:bg-gray-50'}`}>
            <span className="text-xs text-center leading-tight uppercase tracking-tighter">{cat}</span>
          </button>
        ))}
      </div>

      {/* --- MAIN AREA --- */}
      <div className="flex-1 flex flex-col relative">
        <header className="p-8 pb-4">
          <h2 className="text-4xl font-black text-gray-900 flex items-center gap-3">
            {activeCategory} <ChevronRight className="w-8 h-8 text-red-600" />
          </h2>
        </header>

        <div className="flex-1 overflow-y-auto p-8 pt-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 content-start pb-48">
          {filteredMenu.map((item) => (
            <div key={item.id} 
              onClick={() => setCart(prev => [...prev, { ...item, instanceId: Math.random() }])}
              className="bg-white rounded-3xl p-6 shadow-sm border-2 border-transparent hover:border-[#FFC72C] active:scale-95 transition-all cursor-pointer group flex flex-col items-center overflow-hidden"
            >
              <div className="text-7xl mb-6 group-hover:scale-110 transition-transform">{item.image}</div>
              {/* Name and Price Bar */}
              <div className="w-full bg-gray-50 rounded-2xl p-3 flex flex-col items-center gap-1 group-hover:bg-[#FFF8E1] transition-colors">
                <h3 className="font-bold text-gray-800 text-sm text-center leading-tight h-8 line-clamp-2">{item.name}</h3>
                <p className="text-emerald-600 font-black text-lg">${item.price.toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* --- AI ASSISTANT (REFINED CENTERING) --- */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl bg-gray-900 rounded-[3rem] shadow-2xl p-3 pl-10 flex items-center gap-6 border-4 border-white">
            <div className="flex-1 py-1">
                <p className="text-gray-500 text-[9px] uppercase font-black tracking-widest mb-0.5">Voice Command</p>
                <div 
                    className="max-h-20 overflow-y-auto pr-4"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} // Hide scrollbar for Firefox and IE/Edge
                >
                    <p className={`text-white text-lg font-medium leading-tight ${isListening ? 'animate-pulse text-red-400' : ''}`}>
                        {aiMessage}
                    </p>
                </div>
            </div>
            <button onClick={toggleListening} disabled={isProcessing || isPlayingAudio}
                className={`w-16 h-16 shrink-0 rounded-full flex items-center justify-center transition-all ${isPlayingAudio ? 'bg-gray-800' : isListening ? 'bg-red-600 scale-110 shadow-[0_0_20px_rgba(220,38,38,0.5)]' : 'bg-red-600 hover:bg-red-700'}`}>
                {isProcessing || isPlayingAudio ? <Loader2 className="w-8 h-8 text-white animate-spin" /> : isListening ? <MicOff className="w-8 h-8 text-white" /> : <Mic className="w-8 h-8 text-white" />}
            </button>
        </div>
      </div>

      {/* --- ORDER SUMMARY --- */}
      <div className="w-[380px] bg-white border-l border-gray-200 flex flex-col shadow-2xl z-20">
        <div className="p-8 pb-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2"><ShoppingBag className="w-7 h-7 text-red-600" /> My Order</h2>
            <p className="text-gray-400 text-sm font-bold">{cart.length} items</p>
          </div>
          <ReceiptText className="text-gray-200 w-10 h-10" />
        </div>

        <div className="flex-1 overflow-y-auto px-6 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-20 px-10">
              <UtensilsCrossed className="w-20 h-20 mb-4" />
              <p className="font-bold text-lg">Your cart is empty</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.instanceId} className="group flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-gray-200 animate-in fade-in slide-in-from-right-4">
                <div className="text-3xl">{item.image}</div>
                <div className="flex-1">
                  <p className="font-extrabold text-gray-800 leading-tight text-sm">{item.name}</p>
                  <p className="text-emerald-600 font-black text-sm">${item.price.toFixed(2)}</p>
                </div>
                <button onClick={() => setCart(prev => prev.filter(i => i.instanceId !== item.instanceId))} className="p-2 bg-white rounded-lg text-gray-300 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-8 bg-gray-50 border-t border-gray-200 rounded-t-[40px] shadow-inner">
          <div className="flex justify-between items-end mb-6">
            <div>
                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Total</p>
                <p className="text-4xl font-black text-gray-900">${total.toFixed(2)}</p>
            </div>
            <div className="text-right text-[10px] text-gray-400 font-bold">Tax Included</div>
          </div>
          <button onClick={handleCompleteOrder} disabled={cart.length === 0}
            className={`w-full py-6 rounded-2xl font-black text-xl transition-all shadow-xl ${cart.length > 0 ? 'bg-red-600 text-white hover:bg-red-700 active:scale-95' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
            COMPLETE ORDER
          </button>
        </div>
      </div>
    </div>
  );
}