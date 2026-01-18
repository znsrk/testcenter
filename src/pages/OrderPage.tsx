import React, { useState, useEffect, useRef } from 'react';
import { ShoppingBag, Mic, MicOff, Loader2, Trash2 } from 'lucide-react';

// --- CONFIGURATION ---
// In a real app, use import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'YOUR_GOOGLE_GEMINI_KEY'; 
const CARTESIA_API_KEY = import.meta.env.VITE_CARTESIA_API_KEY || 'YOUR_CARTESIA_API_KEY';

// A soft, fast voice ID from Cartesia (Sonic English)
const CARTESIA_VOICE_ID = "694f9389-12c6-4d7e-97e3-085e79e67831"; 

interface MenuItem {
  id: number;
  name: string;
  price: number;
  category: string;
  image: string; // Using emojis or placeholder colors for simplicity
  desc: string;
}

interface OrderItem extends MenuItem {
  instanceId: number; // Unique ID for list rendering
}

const MENU: MenuItem[] = [
  { id: 1, name: "Chicken Tikka Masala", price: 14.99, category: "Mains", image: "🍛", desc: "Creamy tomato curry with tender chicken." },
  { id: 2, name: "Classic Caesar Salad", price: 8.99, category: "Salads", image: "🥗", desc: "Romaine lettuce, croutons, parmesan." },
  { id: 3, name: "Avocado Green Bowl", price: 11.50, category: "Salads", image: "🥑", desc: "Fresh avocado, quinoa, and greens." },
  { id: 4, name: "Grilled Salmon", price: 18.99, category: "Mains", image: "🐟", desc: "Fresh atlantic salmon with herbs." },
  { id: 5, name: "Berry Smoothie", price: 5.99, category: "Drinks", image: "🥤", desc: "Mixed berries and yogurt blend." },
  { id: 6, name: "Garlic Naan", price: 3.50, category: "Sides", image: "🍞", desc: "Freshly baked flatbread." },
];

export default function OrderPage() {
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiMessage, setAiMessage] = useState("Hi! Tap the mic to order.");
  
  // Refs for audio handling
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // --- 1. VOICE INPUT (Google Engine via Web Speech API) ---
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        processOrderWithAI(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech error", event);
        setIsListening(false);
        setAiMessage("I didn't catch that. Please try again.");
      };
      
      recognitionRef.current.onend = () => setIsListening(false);
    } else {
      setAiMessage("Voice input not supported in this browser.");
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setIsListening(true);
      recognitionRef.current?.start();
      setAiMessage("Listening...");
    }
  };

  // --- 2. AI LOGIC (Google Gemini) ---
  const processOrderWithAI = async (userText: string) => {
    setIsProcessing(true);
    setAiMessage("Thinking...");

    try {
      const prompt = `
        You are a friendly drive-thru cashier. 
        Menu: ${JSON.stringify(MENU.map(m => ({ id: m.id, name: m.name })))}.
        User said: "${userText}".
        
        Task: 
        1. Identify items from the menu based on the user's request.
        2. Create a short, friendly response explaining why you added these items (e.g., "Good choice, that pairs well with...").
        3. If the user asks for something not on the menu, politely apologize.
        
        Output strictly valid JSON (no markdown formatting):
        {
          "add_item_ids": [integer array of IDs found],
          "voice_response": "string response for TTS"
        }
      `;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();
      const rawText = data.candidates[0].content.parts[0].text;
      
      // Clean up markdown code blocks if Gemini adds them
      const jsonStr = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const result = JSON.parse(jsonStr);

      // Update Cart
      if (result.add_item_ids && result.add_item_ids.length > 0) {
        const newItems = result.add_item_ids
          .map((id: number) => MENU.find(m => m.id === id))
          .filter(Boolean)
          .map((item: MenuItem) => ({ ...item, instanceId: Date.now() + Math.random() }));
        
        setCart(prev => [...prev, ...newItems]);
      }

      setAiMessage(result.voice_response);
      speakResponse(result.voice_response);

    } catch (error) {
      console.error("AI Error:", error);
      setAiMessage("Sorry, I had trouble processing that order.");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- 3. TEXT TO SPEECH (Cartesia) ---
  const speakResponse = async (text: string) => {
    if (!CARTESIA_API_KEY) return;
    
    try {
      const response = await fetch("https://api.cartesia.ai/tts/bytes", {
        method: "POST",
        headers: {
          "Cartesia-Version": "2024-06-10",
          "X-API-Key": CARTESIA_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model_id: "sonic-english",
          transcript: text,
          voice: {
            mode: "id",
            id: CARTESIA_VOICE_ID,
          },
          output_format: {
            container: "mp3",
            sample_rate: 44100,
            bit_rate: 128000,
          },
        }),
      });

      if (!response.ok) throw new Error("TTS failed");

      const arrayBuffer = await response.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: "audio/mp3" });
      const url = URL.createObjectURL(blob);
      
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const audio = new Audio(url);
      audioRef.current = audio;
      audio.play();

    } catch (error) {
      console.error("TTS Error:", error);
    }
  };

  const removeFromCart = (instanceId: number) => {
    setCart(prev => prev.filter(i => i.instanceId !== instanceId));
  };

  const total = cart.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 font-sans flex flex-col md:flex-row">
      {/* --- MENU SECTION --- */}
      <div className="flex-1 p-6 overflow-y-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-stone-900 mb-2">Fresh & Organic</h1>
          <p className="text-stone-500">Select items manually or ask our AI assistant.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MENU.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 hover:border-orange-200 transition-colors cursor-pointer"
                 onClick={() => setCart(prev => [...prev, { ...item, instanceId: Date.now() }])}>
              <div className="text-4xl mb-3">{item.image}</div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg">{item.name}</h3>
                <span className="font-bold text-emerald-600">${item.price.toFixed(2)}</span>
              </div>
              <p className="text-sm text-stone-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* --- SIDEBAR BASKET --- */}
      <div className="w-full md:w-96 bg-white border-l border-stone-200 flex flex-col h-[50vh] md:h-screen shadow-xl z-10">
        <div className="p-6 bg-orange-50 border-b border-orange-100">
          <h2 className="text-xl font-bold flex items-center gap-2 text-orange-900">
            <ShoppingBag className="w-5 h-5" /> Current Order
          </h2>
        </div>

        {/* AI INTERFACE */}
        <div className="p-4 bg-stone-900 text-stone-50 flex flex-col gap-3">
            <div className="text-sm text-stone-300 uppercase tracking-wider font-semibold">AI Agent</div>
            <p className="text-stone-100 italic text-lg leading-relaxed">"{aiMessage}"</p>
            
            <button 
              onClick={toggleListening}
              disabled={isProcessing}
              className={`mt-2 flex items-center justify-center gap-2 py-4 rounded-xl font-bold transition-all ${
                isListening 
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white'
              }`}
            >
              {isProcessing ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
              ) : isListening ? (
                <><MicOff className="w-5 h-5" /> Stop Listening</>
              ) : (
                <><Mic className="w-5 h-5" /> Tap to Speak Order</>
              )}
            </button>
        </div>

        {/* CART ITEMS */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="text-center text-stone-400 mt-10">
              <p>Your basket is empty.</p>
              <p className="text-sm mt-2">Try saying "I want a salad and a smoothie"</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.instanceId} className="flex justify-between items-center p-3 bg-stone-50 rounded-lg border border-stone-100">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{item.image}</span>
                  <div>
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-stone-500">${item.price.toFixed(2)}</p>
                  </div>
                </div>
                <button onClick={() => removeFromCart(item.instanceId)} className="text-stone-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* FOOTER TOTAL */}
        <div className="p-6 bg-stone-50 border-t border-stone-200">
          <div className="flex justify-between items-center mb-4">
            <span className="text-stone-500">Total</span>
            <span className="text-2xl font-bold text-stone-900">${total.toFixed(2)}</span>
          </div>
          <button className="w-full py-3 bg-stone-900 text-white rounded-lg font-semibold hover:bg-stone-800 transition-colors">
            Checkout
          </button>
        </div>
      </div>
    </div>
  );
}