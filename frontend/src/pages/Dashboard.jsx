import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Activity, Zap, TrendingDown, Globe, HardDrive, Cpu } from 'lucide-react'
import { getEmissionSummary, getSystemMetrics } from '../utils/api'
import CarbonTracker from '../components/CarbonTracker'
import EmissionChart from '../components/EmissionChart'

// Cache data to prevent refetch on page switch
const dashboardCache = {
  summary: null,
  systemMetrics: null,
  lastFetch: null,
  cacheTimeout: 30000 // 30 seconds cache
}

export default function Dashboard() {
  const [summary, setSummary] = useState(dashboardCache.summary)
  const [systemMetrics, setSystemMetrics] = useState(dashboardCache.systemMetrics)
  const [loading, setLoading] = useState(!dashboardCache.summary) // Only show loading if no cached data
  const isMountedRef = useRef(true)
  const intervalRef = useRef(null)
  const dataFetchedRef = useRef(false)

  // Prevent unnecessary re-renders on tab switch
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const loadData = useCallback(async (forceRefresh = false) => {
    if (!isMountedRef.current) return
    
    // Check cache first - only fetch if cache is stale or missing
    const now = Date.now()
    const cacheAge = dashboardCache.lastFetch ? now - dashboardCache.lastFetch : Infinity
    
    if (!forceRefresh && dashboardCache.summary && cacheAge < dashboardCache.cacheTimeout) {
      // Use cached data
      if (isMountedRef.current) {
        setSummary(dashboardCache.summary)
        setLoading(false)
        return
      }
    }
    
    try {
      // Load all historical data for comprehensive view
      let data = await getEmissionSummary(30, false, true) // Get all history, max 30 days
      
      // Debug logging (only in development)
      if (process.env.NODE_ENV === 'development' && forceRefresh) {
        console.log('Dashboard: Loaded emission data', { 
          totalDays: data.daily_summaries?.length || 0,
          totalEmissions: data.total_emissions_grams ?? 0,
          fromCache: !forceRefresh && dashboardCache.summary && cacheAge < dashboardCache.cacheTimeout
        })
      }
      
      // If no data exists, try with demo data
      if (!data.total_emissions_grams && data.daily_summaries?.every(d => d.emissions_grams === 0)) {
        data = await getEmissionSummary(7, true, false)
      }
      
      // Update cache
      dashboardCache.summary = data
      dashboardCache.lastFetch = now
      
      if (isMountedRef.current) {
        setSummary(data)
        setLoading(false)
        dataFetchedRef.current = true
      }
    } catch (error) {
      console.error('Failed to load emission summary:', error)
      if (isMountedRef.current) {
        // Set default empty data instead of crashing
        const defaultData = {
          period_days: 7,
          daily_summaries: [],
          total_emissions_grams: 0,
          total_energy_kwh: 0
        }
        setSummary(defaultData)
        dashboardCache.summary = defaultData
        setLoading(false)
      }
    }
  }, [])

  const loadSystemMetrics = useCallback(async (forceRefresh = false) => {
    if (!isMountedRef.current) return
    
    // Check cache first - metrics refresh more frequently
    const now = Date.now()
    const cacheAge = dashboardCache.lastFetch ? now - dashboardCache.lastFetch : Infinity
    
    if (!forceRefresh && dashboardCache.systemMetrics && cacheAge < 10000) { // 10 seconds cache for metrics
      // Use cached metrics
      if (isMountedRef.current) {
        setSystemMetrics(dashboardCache.systemMetrics)
        return
      }
    }
    
    try {
      const metrics = await getSystemMetrics()
      // Update cache
      dashboardCache.systemMetrics = metrics
      
      if (isMountedRef.current) {
        setSystemMetrics(metrics)
      }
    } catch (error) {
      console.error('Failed to load system metrics:', error)
      if (isMountedRef.current) {
        // Set default metrics instead of crashing
        const defaultMetrics = {
          cpu_percent: 0,
          memory_percent: 0,
          memory_used_gb: 0,
          memory_total_gb: 0
        }
        setSystemMetrics(defaultMetrics)
        dashboardCache.systemMetrics = defaultMetrics
      }
    }
  }, [])

  useEffect(() => {
    // Initial load - only if not already loaded
    if (!dataFetchedRef.current) {
      loadData()
    }
    loadSystemMetrics()
    
    // Real-time updates: refresh every 10 seconds when active (reduced from 5s for better performance)
    intervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        loadData(true) // Force refresh on interval
        loadSystemMetrics(true) // Force refresh on interval
      }
    }, 10000) // Refresh every 10 seconds for real-time updates

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [loadData, loadSystemMetrics])

  // Listen for custom events from CarbonTracker when tracking completes
  useEffect(() => {
    const handleTrackingComplete = () => {
      if (isMountedRef.current) {
        // Small delay to ensure backend has processed the data
        setTimeout(() => {
          loadData(true) // Force refresh when tracking completes
        }, 500)
      }
    }
    
    window.addEventListener('emissionTracked', handleTrackingComplete)
    return () => window.removeEventListener('emissionTracked', handleTrackingComplete)
  }, [loadData])

  // Calculate ECO SCORE dynamically based on emission data
  // This score updates automatically whenever summary changes
  const ecoScore = useMemo(() => {
    // If no summary data yet, return default
    if (!summary) return 85
    
    const totalEmissions = summary.total_emissions_grams || 0
    const periodDays = summary.period_days || 7
    
    // If no emissions, return perfect score
    if (totalEmissions === 0) return 100
    
    // Avoid division by zero
    if (periodDays === 0 || isNaN(periodDays)) return 85
    
    // Calculate average daily emissions
    const avgDailyEmissions = totalEmissions / periodDays
    
    // Eco score calculation based on daily average
    // Scale: 0g/day = 100, 0.5g/day = 95, 1g/day = 90, 2g/day = 80, 5g/day = 50, 10g/day = 0
    // Using a logarithmic scale for better distribution
    let score = 100
    
    if (avgDailyEmissions > 0) {
      // More forgiving scale: logarithmic base
      if (avgDailyEmissions <= 0.1) {
        score = 100
      } else if (avgDailyEmissions <= 0.5) {
        score = 100 - (avgDailyEmissions * 20) // 95-90 range
      } else if (avgDailyEmissions <= 1) {
        score = 90 - ((avgDailyEmissions - 0.5) * 10) // 85-90 range
      } else if (avgDailyEmissions <= 2) {
        score = 85 - ((avgDailyEmissions - 1) * 5) // 80-85 range
      } else if (avgDailyEmissions <= 5) {
        score = 80 - ((avgDailyEmissions - 2) * 10) // 50-80 range
      } else {
        score = Math.max(0, 50 - ((avgDailyEmissions - 5) * 10)) // 0-50 range
      }
    }
    
    // Ensure score is between 0 and 100
    score = Math.max(0, Math.min(100, score))
    
    // Return valid number
    const result = Math.round(score)
    if (isNaN(result) || !isFinite(result)) return 85
    return result
  }, [summary])

  return (
    <div className="p-8 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Monitor your digital carbon footprint in real-time
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-eco-green-100 dark:bg-eco-green-900/30 rounded-lg">
              <Activity className="w-6 h-6 text-eco-green-600 dark:text-eco-green-400" />
            </div>
            <span className="text-2xl font-bold text-eco-green-600 dark:text-eco-green-400">
              {typeof ecoScore === 'number' && !isNaN(ecoScore) ? ecoScore : 85}
            </span>
          </div>
          <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">Eco Score</h3>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Higher is better</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {loading ? '...' : summary?.total_emissions_grams !== undefined ? `${(summary.total_emissions_grams || 0).toFixed(3)}g` : '0g'}
            </span>
          </div>
          <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total CO₂</h3>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Last 7 days</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Zap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {loading ? '...' : summary?.total_energy_kwh !== undefined ? `${(summary.total_energy_kwh || 0).toFixed(6)} kWh` : '0 kWh'}
            </span>
          </div>
          <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">Energy Used</h3>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Last 7 days</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Cpu className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {systemMetrics?.cpu_percent !== undefined ? `${(systemMetrics.cpu_percent || 0).toFixed(1)}%` : '...'}
            </span>
          </div>
          <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">CPU Usage</h3>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Current</p>
        </div>
      </div>

      {/* System Metrics Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
              <HardDrive className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {systemMetrics?.memory_percent !== undefined ? `${(systemMetrics.memory_percent || 0).toFixed(1)}%` : '...'}
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {systemMetrics?.memory_used_gb !== undefined && systemMetrics?.memory_total_gb !== undefined 
                  ? `${systemMetrics.memory_used_gb.toFixed(1)} / ${systemMetrics.memory_total_gb.toFixed(1)} GB`
                  : '...'}
              </p>
            </div>
          </div>
          <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">Memory Usage</h3>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">RAM consumption</p>
        </div>

        {systemMetrics?.disk_percent !== undefined && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <HardDrive className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {systemMetrics.disk_percent.toFixed(1)}%
              </span>
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">Disk Usage</h3>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Storage consumption</p>
          </div>
        )}
      </div>

      {/* Charts and Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Emission Trends
            </h2>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live Updates</span>
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-eco-green-600"></div>
            </div>
          ) : summary?.daily_summaries && summary.daily_summaries.length > 0 ? (
            <EmissionChart data={summary.daily_summaries} />
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-500">
              <p>No emission data available</p>
              <p className="text-xs mt-2">Start tracking activities to see trends</p>
              {summary && (
                <p className="text-xs mt-1 text-gray-500">
                  {summary.daily_summaries?.length || 0} days loaded
                </p>
              )}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Real-Time Tracker
          </h2>
          <CarbonTracker />
        </div>
      </div>

      {/* Activity Breakdown */}
      {summary && summary.daily_summaries && summary.daily_summaries.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Recent Activity
          </h2>
          <div className="space-y-3">
            {summary.daily_summaries.slice(0, 7).map((day, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {day.activity_count} activities
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {(day.emissions_grams || 0).toFixed(4)}g CO₂
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {(day.energy_kwh || 0).toFixed(6)} kWh
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

