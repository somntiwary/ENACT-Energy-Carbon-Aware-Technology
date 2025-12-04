import { useState, useEffect, useRef } from 'react'
import { Play, Square, RefreshCw, Activity, Youtube, Mail, Globe } from 'lucide-react'
import { trackEmission } from '../utils/api'

export default function CarbonTracker() {
  const [isTracking, setIsTracking] = useState(false)
  const [currentActivity, setCurrentActivity] = useState(null)
  const [startTime, setStartTime] = useState(null)
  const [duration, setDuration] = useState(0)
  const [lastEmission, setLastEmission] = useState(null)
  const [thresholdAlert, setThresholdAlert] = useState(null)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (isTracking && startTime) {
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000)
        setDuration(elapsed)
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isTracking, startTime])

  const startTracking = (activityType) => {
    setCurrentActivity(activityType)
    setIsTracking(true)
    setStartTime(Date.now())
    setDuration(0)
  }

  const stopTracking = async () => {
    if (!isTracking || !startTime || !currentActivity) return

    const durationSeconds = (Date.now() - startTime) / 1000

    try {
      const metadata = {
        quality: 'standard',
        platform: currentActivity === 'youtube' ? 'web' : currentActivity === 'ott' ? 'app' : 'browser'
      }
      const result = await trackEmission(currentActivity, durationSeconds, metadata)
      setLastEmission(result.data)
      
      // Check for threshold alerts
      if (result.threshold_alert && result.threshold_alert.reached) {
        setThresholdAlert(result.threshold_alert)
      } else {
        setThresholdAlert(null)
      }
      
      // Dispatch event to notify Dashboard of new emission
      window.dispatchEvent(new CustomEvent('emissionTracked', { detail: result.data }))
    } catch (error) {
      console.error('Failed to track emission:', error)
    }

    setIsTracking(false)
    setCurrentActivity(null)
    setStartTime(null)
    setDuration(0)
  }

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const activityConfig = {
    youtube: { icon: Youtube, label: 'YouTube', color: 'text-red-600 dark:text-red-400' },
    ott: { icon: Activity, label: 'OTT Streaming', color: 'text-purple-600 dark:text-purple-400' },
    gmail: { icon: Mail, label: 'Gmail', color: 'text-blue-600 dark:text-blue-400' },
    browsing: { icon: Globe, label: 'Browsing', color: 'text-green-600 dark:text-green-400' },
  }

  return (
    <div className="space-y-4">
      {/* Timer Display */}
      <div className="text-center p-6 bg-gradient-to-br from-eco-green-50 to-blue-50 dark:from-eco-green-900/20 dark:to-blue-900/20 rounded-lg border border-eco-green-200 dark:border-eco-green-800">
        <div className="text-4xl font-mono font-bold text-gray-900 dark:text-white mb-2">
          {formatTime(duration)}
        </div>
        {currentActivity && (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            {(() => {
              const Icon = activityConfig[currentActivity]?.icon || Activity
              return <Icon className="w-4 h-4" />
            })()}
            <span>Tracking: {activityConfig[currentActivity]?.label || currentActivity}</span>
          </div>
        )}
      </div>

      {/* Activity Buttons */}
      {!isTracking ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => startTracking('youtube')}
            className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg transition-colors"
          >
            <Youtube className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">YouTube</span>
          </button>
          <button
            onClick={() => startTracking('ott')}
            className="flex items-center gap-2 px-4 py-3 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-lg transition-colors"
          >
            <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">OTT</span>
          </button>
          <button
            onClick={() => startTracking('gmail')}
            className="flex items-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors"
          >
            <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Gmail</span>
          </button>
          <button
            onClick={() => startTracking('browsing')}
            className="flex items-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg transition-colors"
          >
            <Globe className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Browsing</span>
          </button>
        </div>
      ) : (
        <button
          onClick={stopTracking}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
        >
          <Square className="w-5 h-5" />
          Stop Tracking
        </button>
      )}

      {/* Threshold Alert */}
      {thresholdAlert && thresholdAlert.suggestions && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-2 border-yellow-400 dark:border-yellow-600 animate-pulse">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              <p className="text-sm font-bold text-yellow-900 dark:text-yellow-200">
                {thresholdAlert.type === 'daily' ? 'Daily' : 'Weekly'} Threshold Reached!
              </p>
            </div>
            <button
              onClick={() => setThresholdAlert(null)}
              className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200"
            >
              ×
            </button>
          </div>
          <div className="space-y-2 text-sm text-yellow-800 dark:text-yellow-300">
            <p className="font-medium mb-2">Optimization Suggestions:</p>
            <div className="bg-white dark:bg-gray-800 p-3 rounded border border-yellow-200 dark:border-yellow-700">
              <pre className="whitespace-pre-wrap text-xs font-sans">
                {thresholdAlert.suggestions.response || 'No suggestions available'}
              </pre>
              {thresholdAlert.suggestions.model && (
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                  Powered by: {thresholdAlert.suggestions.model}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Last Emission Result */}
      {lastEmission && (
        <div className="p-4 bg-eco-green-50 dark:bg-eco-green-900/20 rounded-lg border border-eco-green-200 dark:border-eco-green-800">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Last Tracked Emission</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600 dark:text-gray-400">CO₂ Emitted</p>
              <p className="text-lg font-bold text-eco-green-600 dark:text-eco-green-400">
                {(lastEmission.co2_grams || 0).toFixed(4)}g
              </p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Energy Used</p>
              <p className="text-lg font-bold text-eco-green-600 dark:text-eco-green-400">
                {(lastEmission.energy_kwh || 0).toFixed(6)} kWh
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

