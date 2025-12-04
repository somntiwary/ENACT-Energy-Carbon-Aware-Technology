import { memo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

function EmissionChart({ data }) {
  // Safely process data with error handling
  let chartData = []
  
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-500">
        <p>No data available</p>
        <p className="text-xs mt-2">Start tracking activities to see emissions</p>
      </div>
    )
  }

  try {
    chartData = data
      .filter(item => item && item.date) // Only filter out items without dates
      .map((item) => {
        let dateObj
        try {
          if (item.date) {
            // Handle YYYY-MM-DD format
            if (typeof item.date === 'string' && item.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
              dateObj = new Date(item.date + 'T00:00:00')
            } else {
              dateObj = new Date(item.date)
            }
            
            if (isNaN(dateObj.getTime())) {
              console.warn('Invalid date:', item.date)
              dateObj = new Date()
            }
          } else {
            dateObj = new Date()
          }
        } catch (e) {
          console.warn('Date parsing error:', e, item.date)
          dateObj = new Date()
        }
        
        const emissions = parseFloat(item.emissions_grams || 0)
        const energy = parseFloat(item.energy_kwh || 0) * 1000 // Convert to Wh
        
        return {
          date: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          dateRaw: item.date || dateObj.toISOString().split('T')[0],
          emissions: isNaN(emissions) ? 0 : emissions,
          energy: isNaN(energy) ? 0 : energy,
        }
      })
      .sort((a, b) => {
        // Sort by date
        try {
          const dateA = new Date(a.dateRaw)
          const dateB = new Date(b.dateRaw)
          return dateA.getTime() - dateB.getTime()
        } catch {
          return 0
        }
      })
    
    // Debug logging
    if (chartData.length === 0) {
      console.warn('EmissionChart: Processed data is empty', { input: data, output: chartData })
    } else {
      console.log('EmissionChart: Processed data successfully', { 
        inputLength: data.length, 
        outputLength: chartData.length,
        sampleData: chartData.slice(0, 3)
      })
    }
  } catch (error) {
    console.error('Error processing chart data:', error, { data })
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500">
        <div className="text-center">
          <p>Error loading chart data</p>
          <p className="text-xs mt-2 text-red-500">{error.message}</p>
        </div>
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-500">
        <p>No valid data to display</p>
        <p className="text-xs mt-2">Start tracking activities to see emissions</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
        <XAxis
          dataKey="date"
          stroke="#6b7280"
          className="dark:text-gray-400"
          style={{ fill: 'currentColor' }}
        />
        <YAxis
          yAxisId="left"
          stroke="#ef4444"
          label={{ value: 'CO₂ (g)', angle: -90, position: 'insideLeft' }}
          style={{ fill: 'currentColor' }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          stroke="#3b82f6"
          label={{ value: 'Energy (Wh)', angle: 90, position: 'insideRight' }}
          style={{ fill: 'currentColor' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
          }}
          className="dark:bg-gray-800 dark:border-gray-700"
        />
        <Legend />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="emissions"
          stroke="#ef4444"
          strokeWidth={2}
          name="CO₂ Emissions (g)"
          dot={{ fill: '#ef4444', r: 4 }}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="energy"
          stroke="#3b82f6"
          strokeWidth={2}
          name="Energy (Wh)"
          dot={{ fill: '#3b82f6', r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// Memoize component to prevent unnecessary re-renders
export default memo(EmissionChart, (prevProps, nextProps) => {
  // Custom comparison - only re-render if data actually changed
  if (!prevProps.data && !nextProps.data) return true
  if (!prevProps.data || !nextProps.data) return false
  if (prevProps.data.length !== nextProps.data.length) return false
  
  // Compare data arrays
  return JSON.stringify(prevProps.data) === JSON.stringify(nextProps.data)
})

