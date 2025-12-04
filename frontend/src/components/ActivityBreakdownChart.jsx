import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

// Gradient color definitions for each activity type
const GRADIENT_COLORS = {
  youtube: { start: '#FF6B6B', end: '#EE5A6F' }, // Red gradient
  ott: { start: '#A78BFA', end: '#8B5CF6' }, // Purple gradient
  gmail: { start: '#60A5FA', end: '#3B82F6' }, // Blue gradient
  browsing: { start: '#34D399', end: '#10B981' }, // Green gradient
  code_execution: { start: '#FBBF24', end: '#F59E0B' }, // Amber gradient
  idle: { start: '#9CA3AF', end: '#6B7280' }, // Gray gradient
  unknown: { start: '#94A3B8', end: '#64748B' }, // Slate gradient
}

// Generate unique gradient IDs and colors for each activity
const generateGradientId = (activityName) => `gradient-${activityName.toLowerCase().replace(/\s+/g, '-')}`

export default function ActivityBreakdownChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500">
        No activity data available
      </div>
    )
  }

  // Aggregate by activity type
  const activityMap = {}
  data.forEach((log) => {
    const type = (log.activity_type || 'unknown').toLowerCase()
    if (!activityMap[type]) {
      // Format name properly
      const nameMap = {
        'youtube': 'YouTube',
        'ott': 'OTT Streaming',
        'gmail': 'Gmail',
        'browsing': 'Browsing',
        'code_execution': 'Code Execution',
        'idle': 'Idle',
        'unknown': 'Unknown'
      }
      activityMap[type] = {
        name: nameMap[type] || type.charAt(0).toUpperCase() + type.slice(1),
        value: 0,
        emissions: 0,
        type: type,
      }
    }
    activityMap[type].value += log.duration_seconds || 0
    activityMap[type].emissions += log.co2_grams || 0
  })

  const chartData = Object.values(activityMap)
    .filter(item => item.value > 0) // Only show activities with data
    .map((item, index) => ({
      ...item,
      value: Math.round(item.value / 60), // Convert to minutes
      gradientId: generateGradientId(item.name),
      percent: 0, // Will be calculated
    }))

  // Calculate percentages
  const total = chartData.reduce((sum, item) => sum + item.value, 0)
  chartData.forEach(item => {
    item.percent = total > 0 ? (item.value / total) * 100 : 0
  })

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <defs>
            {chartData.map((entry) => {
              const colorKey = entry.type.toLowerCase()
              const colors = GRADIENT_COLORS[colorKey] || GRADIENT_COLORS.unknown
              return (
                <linearGradient key={entry.gradientId} id={entry.gradientId} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={colors.start} stopOpacity={1} />
                  <stop offset="100%" stopColor={colors.end} stopOpacity={1} />
                </linearGradient>
              )
            })}
          </defs>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={false}
            outerRadius={100}
            innerRadius={0}
            fill="#8884d8"
            dataKey="value"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth={2}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={`url(#${entry.gradientId})`}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name, props) => {
              if (props?.payload?.emissions !== undefined) {
                return [`${(props.payload.emissions || 0).toFixed(4)}g CO₂`, 'Emissions']
              }
              return [`${value} minutes`, 'Duration']
            }}
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Custom Legend Below Chart */}
      <div className="mt-4 flex flex-wrap justify-center gap-4 px-2">
        {chartData.map((entry, index) => {
          const colorKey = entry.type.toLowerCase()
          const colors = GRADIENT_COLORS[colorKey] || GRADIENT_COLORS.unknown
          return (
            <div
              key={index}
              className="flex items-center gap-2 min-w-[140px] flex-shrink-0"
            >
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${colors.start} 0%, ${colors.end} 100%)`,
                  boxShadow: `0 2px 4px rgba(0, 0, 0, 0.1)`,
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {entry.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {entry.percent.toFixed(1)}% • {entry.emissions.toFixed(4)}g CO₂
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

