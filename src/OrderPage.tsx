import { useState, useRef } from 'react'

interface MenuItem {
  id: string
  name: string
  price: number
  category: 'burger' | 'sides' | 'drinks' | 'desserts'
  image: string
}

interface OrderItem extends MenuItem {
  quantity: number
}

const menuItems: MenuItem[] = [
  // Burgers
  { id: '1', name: 'Classic Burger', price: 5.99, category: 'burger', image: '🍔' },
  { id: '2', name: 'Cheeseburger', price: 6.49, category: 'burger', image: '🍔' },
  { id: '3', name: 'Double Burger', price: 8.99, category: 'burger', image: '🍔' },
  { id: '4', name: 'Chicken Burger', price: 6.99, category: 'burger', image: '🍗' },
  
  // Sides
  { id: '5', name: 'French Fries', price: 2.99, category: 'sides', image: '🍟' },
  { id: '6', name: 'Onion Rings', price: 3.49, category: 'sides', image: '🧅' },
  { id: '7', name: 'Chicken Nuggets', price: 4.99, category: 'sides', image: '🍗' },
  
  // Drinks
  { id: '8', name: 'Cola', price: 1.99, category: 'drinks', image: '🥤' },
  { id: '9', name: 'Orange Juice', price: 2.49, category: 'drinks', image: '🧃' },
  { id: '10', name: 'Water', price: 1.49, category: 'drinks', image: '💧' },
  
  // Desserts
  { id: '11', name: 'Ice Cream', price: 2.99, category: 'desserts', image: '🍦' },
  { id: '12', name: 'Apple Pie', price: 2.49, category: 'desserts', image: '🥧' },
]

export function OrderPage() {
  const [activeCategory, setActiveCategory] = useState<string>('burger')
  const [cart, setCart] = useState<OrderItem[]>([])
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef<any>(null)

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id)
      if (existing) {
        return prev.map(i => 
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { ...item, quantity: 1 }]
    })
  }

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === itemId)
      if (existing && existing.quantity > 1) {
        return prev.map(i => 
          i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i
        )
      }
      return prev.filter(i => i.id !== itemId)
    })
  }

  const getTotalPrice = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)
  }

  const processVoiceOrder = (text: string) => {
    const lowerText = text.toLowerCase()
    
    menuItems.forEach(item => {
      const itemName = item.name.toLowerCase()
      if (lowerText.includes(itemName)) {
        const match = lowerText.match(new RegExp(`(\\d+)\\s*${itemName}|${itemName}\\s*(\\d+)?`, 'i'))
        const quantity = match ? parseInt(match[1] || match[2] || '1') : 1
        
        for (let i = 0; i < quantity; i++) {
          addToCart(item)
        }
      }
    })
  }

  const startListening = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = 'en-US'

      recognitionRef.current.onstart = () => {
        setIsListening(true)
        setTranscript('Listening...')
      }

      recognitionRef.current.onresult = (event: any) => {
        const speechResult = event.results[0][0].transcript
        setTranscript(speechResult)
        processVoiceOrder(speechResult)
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
        setTranscript('Error: Please try again')
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current.start()
    } else {
      alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.')
    }
  }

  const categories = [
    { id: 'burger', name: 'Burgers', icon: '🍔' },
    { id: 'sides', name: 'Sides', icon: '🍟' },
    { id: 'drinks', name: 'Drinks', icon: '🥤' },
    { id: 'desserts', name: 'Desserts', icon: '🍰' },
  ]

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left Side - Menu */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-red-600 text-white p-6 shadow-lg">
          <h1 className="text-3xl font-bold">McDonald's Kiosk</h1>
          <p className="text-sm mt-1">Select your items or use voice assistant</p>
        </div>

        {/* Category Tabs */}
        <div className="bg-white shadow-md p-4 flex gap-3 overflow-x-auto">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeCategory === cat.id
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <span className="text-2xl">{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Menu Items Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {menuItems
              .filter(item => item.category === activeCategory)
              .map(item => (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-6 flex flex-col items-center gap-3 hover:scale-105"
                >
                  <div className="text-6xl">{item.image}</div>
                  <h3 className="font-bold text-lg text-gray-800">{item.name}</h3>
                  <p className="text-xl font-semibold text-red-600">${item.price.toFixed(2)}</p>
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* Right Side - Cart & Voice Assistant */}
      <div className="w-96 bg-white shadow-2xl flex flex-col">
        {/* Voice Assistant Section */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
          <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
            <span>🎤</span> Voice Assistant
          </h2>
          <button
            onClick={startListening}
            disabled={isListening}
            className={`w-full py-4 rounded-lg font-semibold text-lg transition-all ${
              isListening
                ? 'bg-red-500 animate-pulse cursor-not-allowed'
                : 'bg-white text-blue-600 hover:bg-gray-100 shadow-lg'
            }`}
          >
            {isListening ? '🎤 Listening...' : '🎤 Tap to Order by Voice'}
          </button>
          {transcript && (
            <div className="mt-3 bg-white/20 rounded-lg p-3 text-sm">
              <p className="font-semibold">You said:</p>
              <p className="italic">"{transcript}"</p>
            </div>
          )}
          <p className="text-xs mt-3 opacity-90">
            Try saying: "One cheeseburger and fries" or "Two cola and a chicken burger"
          </p>
        </div>

        {/* Cart Section */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-xl font-bold text-gray-800">Your Order</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="text-center text-gray-400 mt-10">
                <p className="text-4xl mb-2">🛒</p>
                <p>Your cart is empty</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map(item => (
                  <div
                    key={item.id}
                    className="bg-gray-50 rounded-lg p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{item.image}</span>
                      <div>
                        <p className="font-semibold text-gray-800">{item.name}</p>
                        <p className="text-sm text-gray-600">${item.price.toFixed(2)} each</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="bg-red-500 text-white w-8 h-8 rounded-full hover:bg-red-600 font-bold"
                      >
                        -
                      </button>
                      <span className="font-bold text-lg w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => addToCart(item)}
                        className="bg-green-500 text-white w-8 h-8 rounded-full hover:bg-green-600 font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total & Checkout */}
          <div className="border-t p-4 space-y-3">
            <div className="flex justify-between items-center text-xl font-bold">
              <span>Total:</span>
              <span className="text-red-600">${getTotalPrice()}</span>
            </div>
            <button
              disabled={cart.length === 0}
              className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
                cart.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-500 text-white hover:bg-green-600 shadow-lg'
              }`}
            >
              Proceed to Payment
            </button>
            <button
              onClick={() => setCart([])}
              disabled={cart.length === 0}
              className="w-full py-2 text-red-600 hover:text-red-700 font-semibold"
            >
              Clear Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
