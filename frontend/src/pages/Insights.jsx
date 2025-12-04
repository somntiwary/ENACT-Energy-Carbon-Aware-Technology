import { useState, useEffect, useRef, useCallback } from 'react'
import { TrendingUp, Activity, Zap, Globe } from 'lucide-react'
import { getEmissionSummary, getEmissions } from '../utils/api'
import EmissionChart from '../components/EmissionChart'
import ActivityBreakdownChart from '../components/ActivityBreakdownChart'

// Cache data to prevent refetch on page switch
const insightsCache = {
  summary: null,
  todayEmissions: null,
  lastFetch: null,
  cacheTimeout: 30000, // 30 seconds cache
  daysRange: 7
}

export default function Insights() {
  const [summary, setSummary] = useState(insightsCache.summary)
  const [todayEmissions, setTodayEmissions] = useState(insightsCache.todayEmissions)
  const [loading, setLoading] = useState(!insightsCache.summary) // Only show loading if no cached data
  const [daysRange, setDaysRange] = useState(insightsCache.daysRange)
  const isMountedRef = useRef(true)
  const dataFetchedRef = useRef(false)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const loadData = useCallback(async (forceRefresh = false) => {
    if (!isMountedRef.current) return
    
    // Check cache first - only fetch if cache is stale, missing, or daysRange changed
    const now = Date.now()
    const cacheAge = insightsCache.lastFetch ? now - insightsCache.lastFetch : Infinity
    const daysRangeChanged = insightsCache.daysRange !== daysRange
    
    if (!forceRefresh && !daysRangeChanged && insightsCache.summary && insightsCache.todayEmissions && cacheAge < insightsCache.cacheTimeout) {
      // Use cached data
      if (isMountedRef.current) {
        setSummary(insightsCache.summary)
        setTodayEmissions(insightsCache.todayEmissions)
        setLoading(false)
        return
      }
    }
    
    // Only show loading if we don't have cached data
    if (!insightsCache.summary || daysRangeChanged) {
      setLoading(true)
    }
    
    try {
      const [summaryData, todayData] = await Promise.all([
        getEmissionSummary(daysRange, false, true), // Get all history
        getEmissions('today')
      ])
      
      // Debug logging (only in development)
      if (process.env.NODE_ENV === 'development' && forceRefresh) {
        console.log('Insights: Loaded data', {
          summaryDays: summaryData.daily_summaries?.length || 0,
          todayLogs: todayData.logs?.length || 0,
          fromCache: !forceRefresh && !daysRangeChanged && insightsCache.summary && cacheAge < insightsCache.cacheTimeout
        })
      }
      
      // Update cache
      insightsCache.summary = summaryData
      insightsCache.todayEmissions = todayData
      insightsCache.lastFetch = now
      insightsCache.daysRange = daysRange
      
      if (isMountedRef.current) {
        setSummary(summaryData)
        setTodayEmissions(todayData)
        setLoading(false)
        dataFetchedRef.current = true
      }
    } catch (error) {
      console.error('Failed to load insights:', error)
      if (isMountedRef.current) {
        // Set default empty data
        const defaultSummary = {
          period_days: daysRange,
          daily_summaries: [],
          total_emissions_grams: 0,
          total_energy_kwh: 0
        }
        const defaultToday = { logs: [], summary: { activity_count: 0 } }
        setSummary(defaultSummary)
        setTodayEmissions(defaultToday)
        insightsCache.summary = defaultSummary
        insightsCache.todayEmissions = defaultToday
        setLoading(false)
      }
    }
  }, [daysRange])

  useEffect(() => {
    // Initial load - only if not already loaded or daysRange changed
    if (!dataFetchedRef.current || insightsCache.daysRange !== daysRange) {
      loadData()
    }
  }, [loadData, daysRange])

  // Listen for tracking events to update in real-time
  useEffect(() => {
    const handleTrackingComplete = () => {
      if (isMountedRef.current) {
        setTimeout(() => {
          loadData(true) // Force refresh when tracking completes
        }, 500)
      }
    }
    
    window.addEventListener('emissionTracked', handleTrackingComplete)
    return () => window.removeEventListener('emissionTracked', handleTrackingComplete)
  }, [loadData])

  const calculateTrend = () => {
    if (!summary || !summary.daily_summaries || summary.daily_summaries.length < 2) return { trend: 'neutral', value: 0 }
    const recent = summary.daily_summaries.slice(0, 2)
    const change = (recent[0]?.emissions_grams || 0) - (recent[1]?.emissions_grams || 0)
    const percentChange = (recent[1]?.emissions_grams || 0) > 0 
      ? ((change / (recent[1].emissions_grams || 1)) * 100).toFixed(1)
      : '0'
    return {
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
      value: Math.abs(parseFloat(percentChange) || 0)
    }
  }

  const trend = calculateTrend()
  const avgDaily = summary && summary.total_emissions_grams !== undefined && summary.period_days
    ? ((summary.total_emissions_grams || 0) / (summary.period_days || 1)).toFixed(4)
    : '0'

  return (
    <div className="p-8 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Insights & Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Detailed analysis of your carbon footprint and energy usage patterns
          </p>
        </div>
        <select
          value={daysRange}
          onChange={(e) => setDaysRange(Number(e.target.value))}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-eco-green-500"
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <span className={`text-sm font-medium ${
              trend.trend === 'up' ? 'text-red-600 dark:text-red-400' :
              trend.trend === 'down' ? 'text-eco-green-600 dark:text-eco-green-400' :
              'text-gray-600 dark:text-gray-400'
            }`}>
              {trend.trend === 'up' ? '↑' : trend.trend === 'down' ? '↓' : '→'} {trend.value}%
            </span>
          </div>
          <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">Trend</h3>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            {trend.trend === 'up' ? 'Increasing' : trend.trend === 'down' ? 'Decreasing' : 'Stable'} emissions
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Activity className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">Avg Daily Emissions</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{avgDaily}g CO₂</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Per day average</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-eco-green-100 dark:bg-eco-green-900/30 rounded-lg">
              <Globe className="w-6 h-6 text-eco-green-600 dark:text-eco-green-400" />
            </div>
          </div>
          <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">Total Activities</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {loading ? '...' : todayEmissions?.summary?.activity_count || 0}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Today</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Emission Timeline
          </h2>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-eco-green-600"></div>
            </div>
          ) : summary?.daily_summaries && summary.daily_summaries.length > 0 ? (
            <EmissionChart data={summary.daily_summaries} />
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-500">
              <p>No emission data available</p>
              <p className="text-xs mt-2">Start tracking activities to see emissions timeline</p>
              {summary && (
                <p className="text-xs mt-1 text-gray-500">
                  {summary.daily_summaries?.length || 0} days in range
                </p>
              )}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Activity Breakdown
          </h2>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-eco-green-600"></div>
            </div>
          ) : (
            todayEmissions?.logs && todayEmissions.logs.length > 0 ? (
              <ActivityBreakdownChart data={todayEmissions.logs} />
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-500">
                <p>No activity data available</p>
                <p className="text-xs mt-2">Track activities today to see breakdown</p>
              </div>
            )
          )}
        </div>
      </div>

      {/* Detailed Table */}
      {summary && summary.daily_summaries && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Daily Breakdown
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Date</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Emissions (g CO₂)</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Energy (kWh)</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Activities</th>
                </tr>
              </thead>
              <tbody>
                {summary.daily_summaries.map((day, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                      {new Date(day.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-medium text-gray-900 dark:text-white">
                      {(day.emissions_grams || 0).toFixed(4)}g
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-gray-600 dark:text-gray-400">
                      {(day.energy_kwh || 0).toFixed(6)} kWh
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-gray-600 dark:text-gray-400">
                      {day.activity_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

