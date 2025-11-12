// components/GradeCalculator.tsx
import { useState } from 'react'

export function GradeCalculator() {
  const [midterm, setMidterm] = useState<string>('')
  const [endterm, setEndterm] = useState<string>('')
  const [final, setFinal] = useState<string>('')
  const [result, setResult] = useState<number | null>(null)
  const [letterGrade, setLetterGrade] = useState<string>('')

  const calculateGrade = () => {
    const midtermScore = parseFloat(midterm) || 0
    const endtermScore = parseFloat(endterm) || 0
    const finalScore = parseFloat(final) || 0

    // Standard weighted calculation: 30% midterm, 30% endterm, 40% final
    const totalGrade = (midtermScore * 0.3) + (endtermScore * 0.3) + (finalScore * 0.4)
    
    setResult(totalGrade)
    setLetterGrade(getLetterGrade(totalGrade))
  }

  const getLetterGrade = (score: number): string => {
    if (score >= 90) return 'A'
    if (score >= 80) return 'B'
    if (score >= 70) return 'C'
    if (score >= 60) return 'D'
    return 'F'
  }

  const resetCalculator = () => {
    setMidterm('')
    setEndterm('')
    setFinal('')
    setResult(null)
    setLetterGrade('')
  }

  return (
    <div style={{ 
      maxWidth: '600px', 
      margin: '40px auto', 
      padding: '30px', 
      backgroundColor: '#f9f9f9', 
      borderRadius: '10px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
    }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px', color: '#333' }}>
        Grade Calculator
      </h1>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Midterm (30%):
        </label>
        <input
          type="number"
          value={midterm}
          onChange={(e) => setMidterm(e.target.value)}
          placeholder="Enter score (0-100)"
          min="0"
          max="100"
          style={{ 
            width: '100%', 
            padding: '10px', 
            fontSize: '16px',
            borderRadius: '5px',
            border: '1px solid #ddd'
          }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Endterm (30%):
        </label>
        <input
          type="number"
          value={endterm}
          onChange={(e) => setEndterm(e.target.value)}
          placeholder="Enter score (0-100)"
          min="0"
          max="100"
          style={{ 
            width: '100%', 
            padding: '10px', 
            fontSize: '16px',
            borderRadius: '5px',
            border: '1px solid #ddd'
          }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Final (40%):
        </label>
        <input
          type="number"
          value={final}
          onChange={(e) => setFinal(e.target.value)}
          placeholder="Enter score (0-100)"
          min="0"
          max="100"
          style={{ 
            width: '100%', 
            padding: '10px', 
            fontSize: '16px',
            borderRadius: '5px',
            border: '1px solid #ddd'
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
        <button
          onClick={calculateGrade}
          style={{
            flex: 1,
            padding: '12px',
            fontSize: '16px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Calculate
        </button>
        <button
          onClick={resetCalculator}
          style={{
            flex: 1,
            padding: '12px',
            fontSize: '16px',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Reset
        </button>
      </div>

      {result !== null && (
        <div style={{ 
          textAlign: 'center', 
          padding: '20px', 
          backgroundColor: '#fff',
          borderRadius: '8px',
          border: '2px solid #4CAF50'
        }}>
          <h2 style={{ marginBottom: '10px', color: '#333' }}>Your Grade</h2>
          <p style={{ fontSize: '48px', fontWeight: 'bold', margin: '10px 0', color: '#4CAF50' }}>
            {result.toFixed(2)}%
          </p>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#666' }}>
            Letter Grade: {letterGrade}
          </p>
        </div>
      )}
    </div>
  )
}
