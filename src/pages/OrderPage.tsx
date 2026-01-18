import { useState, useEffect, useRef } from 'react';
import { ShoppingBag, Mic, MicOff, Loader2, Trash2 } from 'lucide-react';

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

const MENU: MenuItem[] = [
  // BREAKFAST (1-15)
  { id: 1, name: "Two Fried Eggs", price: 6.50, category: "Breakfast", image: "🍳", desc: "Two eggs cooked in a pan, served with toast." },
  { id: 2, name: "Pancakes with Syrup", price: 8.99, category: "Breakfast", image: "🥞", desc: "Three sweet pancakes with maple syrup and butter." },
  { id: 3, name: "Fruit and Yogurt", price: 5.50, category: "Breakfast", image: "🥣", desc: "Fresh yogurt with seasonal berries and honey." },
  { id: 4, name: "Breakfast Burrito", price: 9.50, category: "Breakfast", image: "🌯", desc: "Flour tortilla with eggs, cheese, and beans." },
  { id: 5, name: "Oatmeal with Nuts", price: 4.99, category: "Breakfast", image: "🥣", desc: "Warm oats served with almonds and brown sugar." },
  { id: 6, name: "French Toast", price: 7.99, category: "Breakfast", image: "🍞", desc: "Bread dipped in egg and cinnamon, then fried." },
  { id: 7, name: "Cheese Omelette", price: 8.50, category: "Breakfast", image: "🥚", desc: "Fluffy eggs filled with melted cheddar cheese." },
  { id: 8, name: "Bacon and Egg Roll", price: 6.00, category: "Breakfast", image: "🥯", desc: "Crispy bacon and a fried egg in a soft bread roll." },
  { id: 9, name: "Avocado Toast", price: 10.50, category: "Breakfast", image: "🥑", desc: "Smashed avocado on toasted sourdough bread." },
  { id: 10, name: "Belgian Waffles", price: 9.00, category: "Breakfast", image: "🧇", desc: "Crispy waffles topped with whipped cream." },
  { id: 11, name: "Smoked Salmon Bagel", price: 12.99, category: "Breakfast", image: "🥯", desc: "Cream cheese and salmon on a toasted bagel." },
  { id: 12, name: "Mushroom Toast", price: 7.50, category: "Breakfast", image: "🍄", desc: "Fried mushrooms on toast with garlic butter." },
  { id: 13, name: "Fruit Salad Bowl", price: 6.50, category: "Breakfast", image: "🍍", desc: "A mix of melon, pineapple, and grapes." },
  { id: 14, name: "Poached Eggs", price: 7.00, category: "Breakfast", image: "🥚", desc: "Two eggs cooked in water, served on toast." },
  { id: 15, name: "English Muffin", price: 3.99, category: "Breakfast", image: "🧁", desc: "Toasted muffin served with jam and butter." },

  // STARTERS (16-35)
  { id: 16, name: "Tomato Soup", price: 5.99, category: "Starters", image: "🥣", desc: "Classic creamy tomato soup with fresh basil." },
  { id: 17, name: "Garlic Bread", price: 4.50, category: "Starters", image: "🥖", desc: "Toasted bread with garlic, herbs, and butter." },
  { id: 18, name: "Onion Rings", price: 5.00, category: "Starters", image: "🧅", desc: "Crispy fried onions served with a spicy dip." },
  { id: 19, name: "Chicken Wings", price: 8.99, category: "Starters", image: "🍗", desc: "Spicy chicken wings served with blue cheese sauce." },
  { id: 20, name: "Vegetable Samosas", price: 5.50, category: "Starters", image: "🥟", desc: "Fried pastry filled with spicy potatoes and peas." },
  { id: 21, name: "Prawn Cocktail", price: 9.50, category: "Starters", image: "🍤", desc: "Cold prawns served with a creamy pink sauce." },
  { id: 22, name: "Fried Calamari", price: 10.99, category: "Starters", image: "🦑", desc: "Crispy squid rings with a lemon slice." },
  { id: 23, name: "Hummus and Pita", price: 6.50, category: "Starters", image: "🥙", desc: "Chickpea dip served with warm flatbread." },
  { id: 24, name: "Spring Rolls", price: 6.00, category: "Starters", image: "🌯", desc: "Crunchy rolls filled with fresh vegetables." },
  { id: 25, name: "Mozzarella Sticks", price: 7.50, category: "Starters", image: "🧀", desc: "Fried cheese sticks served with tomato sauce." },
  { id: 26, name: "Bruschetta", price: 7.00, category: "Starters", image: "🍅", desc: "Toasted bread topped with tomatoes and olive oil." },
  { id: 27, name: "Potato Skins", price: 7.99, category: "Starters", image: "🥔", desc: "Baked potato halves filled with cheese and bacon." },
  { id: 28, name: "Stuffed Mushrooms", price: 8.50, category: "Starters", image: "🍄", desc: "Mushrooms filled with herbs and breadcrumbs." },
  { id: 29, name: "Nachos", price: 9.99, category: "Starters", image: "🌮", desc: "Tortilla chips with melted cheese and jalapeños." },
  { id: 30, name: "Chicken Skewers", price: 8.00, category: "Starters", image: "🍢", desc: "Grilled chicken pieces with a peanut sauce." },
  { id: 31, name: "French Onion Soup", price: 6.99, category: "Starters", image: "🥣", desc: "Rich onion soup topped with melted cheese." },
  { id: 32, name: "Greek Salad", price: 7.50, category: "Starters", image: "🥗", desc: "Cucumber, tomato, olives, and feta cheese." },
  { id: 33, name: "Caprese Salad", price: 8.50, category: "Starters", image: "🍅", desc: "Fresh mozzarella, tomatoes, and balsamic glaze." },
  { id: 34, name: "Mini Tacos", price: 9.00, category: "Starters", image: "🌮", desc: "Three small tacos with beef and salsa." },
  { id: 35, name: "Spinach Dip", price: 7.50, category: "Starters", image: "🥘", desc: "Warm cheese and spinach dip with crackers." },

  // MAINS (36-75)
  { id: 36, name: "Beef Burger", price: 12.99, category: "Mains", image: "🍔", desc: "Juicy beef patty with lettuce and tomato." },
  { id: 37, name: "Cheeseburger", price: 13.50, category: "Mains", image: "🧀", desc: "Our classic beef burger with extra cheddar cheese." },
  { id: 38, name: "Margherita Pizza", price: 11.00, category: "Mains", image: "🍕", desc: "Pizza with tomato sauce, mozzarella, and basil." },
  { id: 39, name: "Pepperoni Pizza", price: 12.50, category: "Mains", image: "🍕", desc: "Pizza topped with spicy pepperoni slices." },
  { id: 40, name: "Spaghetti Bolognese", price: 14.00, category: "Mains", image: "🍝", desc: "Pasta served with a rich meat and tomato sauce." },
  { id: 41, name: "Chicken Stir-Fry", price: 13.99, category: "Mains", image: "🍲", desc: "Chicken and vegetables cooked quickly in a pan." },
  { id: 42, name: "Fish and Chips", price: 15.50, category: "Mains", image: "🐟", desc: "Fried fish in batter served with thick fries." },
  { id: 43, name: "Grilled Steak", price: 22.00, category: "Mains", image: "🥩", desc: "Beef steak served with roasted potatoes." },
  { id: 44, name: "Vegetable Lasagna", price: 13.50, category: "Mains", image: "🥘", desc: "Layers of pasta with vegetables and white sauce." },
  { id: 45, name: "Lamb Curry", price: 16.50, category: "Mains", image: "🍛", desc: "Tender lamb cooked in a spicy curry sauce." },
  { id: 46, name: "Roast Chicken", price: 14.99, category: "Mains", image: "🍗", desc: "Chicken cooked in the oven with herbs." },
  { id: 47, name: "BBQ Pork Ribs", price: 18.00, category: "Mains", image: "🍖", desc: "Slow-cooked ribs with sweet barbecue sauce." },
  { id: 48, name: "Shrimp Scampi", price: 17.50, category: "Mains", image: "🍝", desc: "Pasta with prawns, garlic, and lemon juice." },
  { id: 49, name: "Mushroom Risotto", price: 13.00, category: "Mains", image: "🍚", desc: "Creamy rice cooked with fresh mushrooms." },
  { id: 50, name: "Turkey Sandwich", price: 10.50, category: "Mains", image: "🥪", desc: "Sliced turkey, lettuce, and mayo on brown bread." },
  { id: 51, name: "Veget veggie Wrap", price: 9.99, category: "Mains", image: "🌯", desc: "Tortilla filled with grilled veggies and hummus." },
  { id: 52, name: "Fried Rice", price: 11.50, category: "Mains", image: "🥡", desc: "Rice fried with eggs, peas, and carrots." },
  { id: 53, name: "Beef Stew", price: 15.00, category: "Mains", image: "🥘", desc: "A warm bowl of beef, carrots, and potatoes." },
  { id: 54, name: "Baked Cod", price: 16.99, category: "Mains", image: "🐟", desc: "White fish baked with lemon and butter." },
  { id: 55, name: "Tuna Salad Sandwich", price: 9.50, category: "Mains", image: "🥪", desc: "Tuna and mayo mix on a soft baguette." },
  { id: 56, name: "Chicken Parmesan", price: 15.50, category: "Mains", image: "🍝", desc: "Fried chicken with tomato sauce and cheese." },
  { id: 57, name: "Pork Chop", price: 14.50, category: "Mains", image: "🥩", desc: "Grilled pork meat served with apple sauce." },
  { id: 58, name: "Lentil Soup", price: 10.00, category: "Mains", image: "🥣", desc: "Healthy soup made with brown lentils and spices." },
  { id: 59, name: "Fettuccine Alfredo", price: 13.50, category: "Mains", image: "🍝", desc: "Pasta in a very creamy white cheese sauce." },
  { id: 60, name: "Chicken Burrito", price: 11.99, category: "Mains", image: "🌯", desc: "Large tortilla with chicken, rice, and salsa." },
  { id: 61, name: "Shepherd's Pie", price: 14.00, category: "Mains", image: "🥧", desc: "Minced meat and vegetables topped with mashed potato." },
  { id: 62, name: "Pad Thai", price: 13.00, category: "Mains", image: "🍜", desc: "Rice noodles with peanuts, sprouts, and lime." },
  { id: 63, name: "Falafel Plate", price: 11.00, category: "Mains", image: "🧆", desc: "Fried chickpea balls served with salad and rice." },
  { id: 64, name: "Cottage Pie", price: 14.00, category: "Mains", image: "🥧", desc: "Beef mince topped with golden mashed potatoes." },
  { id: 65, name: "Lobster Roll", price: 24.00, category: "Mains", image: "🦞", desc: "Fresh lobster meat in a buttery bread roll." },
  { id: 66, name: "Chicken Caesar Wrap", price: 10.99, category: "Mains", image: "🌯", desc: "Grilled chicken, romaine, and dressing in a wrap." },
  { id: 67, name: "Veggie Burger", price: 12.50, category: "Mains", image: "🍔", desc: "A plant-based patty with fresh vegetables." },
  { id: 68, name: "Beef Tacos", price: 11.50, category: "Mains", image: "🌮", desc: "Three crunchy tacos with beef and cheese." },
  { id: 69, name: "Grilled Salmon", price: 18.99, category: "Mains", image: "🐟", desc: "Pink salmon fillet served with asparagus." },
  { id: 70, name: "Spicy Ramen", price: 12.99, category: "Mains", image: "🍜", desc: "Noodle soup with a hot and spicy broth." },
  { id: 71, name: "Meatball Sub", price: 11.00, category: "Mains", image: "🥖", desc: "Large bread roll filled with meatballs and sauce." },
  { id: 72, name: "Eggplant Parmesan", price: 13.50, category: "Mains", image: "🍆", desc: "Slices of eggplant baked with cheese and tomato." },
  { id: 73, name: "Quiche Lorraine", price: 10.50, category: "Mains", image: "🥧", desc: "Savory tart with eggs, cheese, and bacon." },
  { id: 74, name: "Teriyaki Chicken", price: 14.00, category: "Mains", image: "🍱", desc: "Chicken glazed in a sweet soy sauce." },
  { id: 75, name: "Bangers and Mash", price: 13.00, category: "Mains", image: "🌭", desc: "English sausages served with mashed potato." },

  // SIDES (76-85)
  { id: 76, name: "French Fries", price: 3.99, category: "Sides", image: "🍟", desc: "Crispy fried potato strips with salt." },
  { id: 77, name: "Mashed Potatoes", price: 4.50, category: "Sides", image: "🥔", desc: "Creamy boiled potatoes with butter and milk." },
  { id: 78, name: "Steamed Broccoli", price: 4.00, category: "Sides", image: "🥦", desc: "Fresh green broccoli cooked with steam." },
  { id: 79, name: "White Rice", price: 3.00, category: "Sides", image: "🍚", desc: "A bowl of simple steamed white rice." },
  { id: 80, name: "Coleslaw", price: 3.50, category: "Sides", image: "🥗", desc: "Cabbage and carrot salad with mayo." },
  { id: 81, name: "Garden Salad", price: 4.99, category: "Sides", image: "🥬", desc: "A small bowl of lettuce, tomato, and cucumber." },
  { id: 82, name: "Corn on the Cob", price: 3.50, category: "Sides", image: "🌽", desc: "Boiled sweet corn served with butter." },
  { id: 83, name: "Roasted Carrots", price: 4.50, category: "Sides", image: "🥕", desc: "Carrots baked in the oven with honey." },
  { id: 84, name: "Baked Beans", price: 3.00, category: "Sides", image: "🫘", desc: "Warm beans in a sweet tomato sauce." },
  { id: 85, name: "Garlic Spinach", price: 4.50, category: "Sides", image: "🍃", desc: "Spinach leaves cooked with fresh garlic." },

  // DESSERTS (86-95)
  { id: 86, name: "Chocolate Cake", price: 6.50, category: "Desserts", image: "🍰", desc: "Rich and moist dark chocolate layer cake." },
  { id: 87, name: "Apple Pie", price: 5.99, category: "Desserts", image: "🥧", desc: "Sweet apples in a crispy pastry crust." },
  { id: 88, name: "Vanilla Ice Cream", price: 4.00, category: "Desserts", image: "🍨", desc: "Two scoops of classic vanilla bean ice cream." },
  { id: 89, name: "Cheesecake", price: 6.99, category: "Desserts", image: "🍰", desc: "Creamy cheese dessert on a biscuit base." },
  { id: 90, name: "Fruit Tart", price: 5.50, category: "Desserts", image: "🥧", desc: "A small pastry filled with cream and fruit." },
  { id: 91, name: "Chocolate Brownie", price: 4.50, category: "Desserts", image: "🍪", desc: "A soft, square chocolate cake with nuts." },
  { id: 92, name: "Lemon Sorbet", price: 4.50, category: "Desserts", image: "🍧", desc: "A refreshing frozen dessert made with lemon." },
  { id: 93, name: "Rice Pudding", price: 4.00, category: "Desserts", image: "🥣", desc: "Warm rice cooked with milk, sugar, and cinnamon." },
  { id: 94, name: "Tiramisu", price: 7.50, category: "Desserts", image: "☕", desc: "Italian dessert with coffee and mascarpone." },
  { id: 95, name: "Blueberry Muffin", price: 3.50, category: "Desserts", image: "🧁", desc: "Sweet bread with fresh blueberries inside." },

  // DRINKS (96-100)
  { id: 96, name: "Hot Coffee", price: 3.00, category: "Drinks", image: "☕", desc: "Freshly brewed black coffee or with milk." },
  { id: 97, name: "Iced Tea", price: 3.50, category: "Drinks", image: "🍹", desc: "Cold black tea with lemon and ice cubes." },
  { id: 98, name: "Orange Juice", price: 4.00, category: "Drinks", image: "🍊", desc: "Freshly squeezed juice from sweet oranges." },
  { id: 99, name: "Sparkling Water", price: 2.50, category: "Drinks", image: "🫧", desc: "Water with bubbles and a slice of lime." },
  { id: 100, name: "Hot Chocolate", price: 4.50, category: "Drinks", image: "☕", desc: "Milk and cocoa topped with marshmallows." }
];

export default function OrderPage() {
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false); // New: Tracks audio playback
  const [aiMessage, setAiMessage] = useState("Hi! Tap the mic to order.");
  
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null); // New: Manual silence detection

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      // Changed to continuous: true so we can manage the 'thinking' time manually
      recognitionRef.current.continuous = true; 
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      let finalTranscript = '';

      recognitionRef.current.onresult = (event: any) => {
        // Clear silence timer on every new result
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        // Set a timer to wait 2 seconds before finalizing (allows for pauses/thinking)
        silenceTimerRef.current = setTimeout(() => {
          if (finalTranscript || interimTranscript) {
            const fullText = (finalTranscript + interimTranscript).trim();
            if (fullText) processOrderWithAI(fullText);
            recognitionRef.current?.stop();
          }
        }, 1300); // 1300ms pause allowed
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech error", event);
        setIsListening(false);
        setAiMessage("I didn't catch that. Please try again.");
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
        finalTranscript = ''; // Reset for next session
      };
    } else {
      setAiMessage("Voice input not supported in this browser.");
    }
  }, []);

  const toggleListening = () => {
    // Prevent mic toggle if audio is playing or processing
    if (isPlayingAudio || isProcessing) return;

    if (isListening) {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      recognitionRef.current?.stop();
    } else {
      setIsListening(true);
      recognitionRef.current?.start();
      setAiMessage("Listening... (Speak your order)");
    }
  };

  const processOrderWithAI = async (userText: string) => {
    setIsProcessing(true);
    setAiMessage("Thinking...");

    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GOOGLE_GEMINI_KEY') {
      console.error("Missing Google Gemini API Key");
      setAiMessage("System Error: API Key missing.");
      setIsProcessing(false);
      return;
    }

    try {
      const prompt = `
        You are a cashier. Menu: ${JSON.stringify(MENU.map(m => ({ id: m.id, name: m.name })))}.
        User said: "${userText}".
        Identify items. If user asks for something not on menu, ignore it or apologize in voice_response. Choose items simply, if a user asks for X,  give X only.
        Return strictly JSON.
        Format: { "add_item_ids": [ids], "voice_response": "text" }
      `;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            response_mime_type: "application/json"
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const rawText = data.candidates[0].content.parts[0].text;
      const result = JSON.parse(rawText);

      if (result.add_item_ids && Array.isArray(result.add_item_ids)) {
        const newItems = result.add_item_ids
          .map((id: number) => MENU.find(m => m.id === id))
          .filter(Boolean)
          .map((item: MenuItem) => ({ ...item, instanceId: Date.now() + Math.random() }));
        
        setCart(prev => [...prev, ...newItems]);
      }

      setAiMessage(result.voice_response || "Done.");
      speakResponse(result.voice_response || "Order updated.");

    } catch (error) {
      console.error("AI Processing Error:", error);
      setAiMessage("Sorry, I had trouble processing that order.");
    } finally {
      setIsProcessing(false);
    }
  };

const speakResponse = async (text: string) => {
  const apiKey = CARTESIA_API_KEY;
  const voiceId = CARTESIA_VOICE_ID || "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc";

  if (!apiKey || apiKey === 'YOUR_CARTESIA_API_KEY') {
    console.warn("Cartesia API Key missing");
    return;
  }

  try {
    setIsPlayingAudio(true); // Lock the mic button
    const response = await fetch("https://api.cartesia.ai/tts/bytes", {
      method: "POST",
      headers: {
        "Cartesia-Version": "2024-06-10", 
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model_id: "sonic-3", 
        transcript: text,
        voice: {
          mode: "id",
          id: voiceId,
        },
        output_format: {
          container: "mp3",
          sample_rate: 44100,
          bit_rate: 128000,
        },
      }),
    });

    if (!response.ok) {
      setIsPlayingAudio(false);
      return;
    }

    const arrayBuffer = await response.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: "audio/mp3" });
    const url = URL.createObjectURL(blob);

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(url);
    audioRef.current = audio;

    audio.onended = () => setIsPlayingAudio(false); // Unlock mic button
    audio.onerror = () => setIsPlayingAudio(false); // Unlock on error
    
    await audio.play();

  } catch (error) {
    console.error("TTS Error:", error);
    setIsPlayingAudio(false);
  }
};

  const removeFromCart = (instanceId: number) => {
    setCart(prev => prev.filter(i => i.instanceId !== instanceId));
  };

  const total = cart.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 font-sans flex flex-col md:flex-row">
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

      <div className="w-full md:w-96 bg-white border-l border-stone-200 flex flex-col h-[50vh] md:h-screen shadow-xl z-10">
        <div className="p-6 bg-orange-50 border-b border-orange-100">
          <h2 className="text-xl font-bold flex items-center gap-2 text-orange-900">
            <ShoppingBag className="w-5 h-5" /> Current Order
          </h2>
        </div>

        <div className="p-4 bg-stone-900 text-stone-50 flex flex-col gap-3">
            <div className="text-sm text-stone-300 uppercase tracking-wider font-semibold">AI Agent</div>
            <p className="text-stone-100 italic text-lg leading-relaxed">"{aiMessage}"</p>
            
            <button 
              onClick={toggleListening}
              disabled={isProcessing || isPlayingAudio}
              className={`mt-2 flex items-center justify-center gap-2 py-4 rounded-xl font-bold transition-all ${
                isPlayingAudio 
                  ? 'bg-stone-700 text-stone-400 cursor-not-allowed'
                  : isListening 
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white'
              }`}
            >
              {isProcessing ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
              ) : isPlayingAudio ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Responding...</>
              ) : isListening ? (
                <><MicOff className="w-5 h-5" /> Stop Listening</>
              ) : (
                <><Mic className="w-5 h-5" /> Tap to Speak Order</>
              )}
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="text-center text-stone-400 mt-10">
              <p>Your basket is empty.</p>
              <p className="text-sm mt-2 italic">Try: "I want a breakfast burrito and some hot chocolate"</p>
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