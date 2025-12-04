import { useState } from 'react'
import { Upload, Send, Loader, FileCode, AlertCircle, CheckCircle } from 'lucide-react'
import { analyzeCode, uploadCode } from '../utils/api'

export default function Analyzer() {
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('python')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)

  const handleAnalyze = async () => {
    if (!code.trim()) {
      setError('Please enter code to analyze')
      return
    }

    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const data = await analyzeCode(code, language)
      
      // Check if response has success field
      if (data && (data.success !== false)) {
        // Valid response - check if it has required fields
        if (!data.static_analysis) {
          data.static_analysis = {
            complexity: { total_complexity: 0 },
            metrics: { maintainability_index: 0, lines_of_code: code.split('\n').length },
            issues: []
          }
        }
        if (!data.ai_suggestions) {
          data.ai_suggestions = {
            success: true,
            response: "**Basic Optimization Tips:**\n\n1. Use efficient data structures\n2. Avoid unnecessary loops\n3. Minimize function calls in loops\n4. Use built-in functions when possible",
            model: "fallback"
          }
        }
        if (!data.energy_estimate) {
          data.energy_estimate = {
            energy_kwh: 0.0,
            co2_grams: 0.0,
            power_watts: 0.0
          }
        }
        
        setResults(data)
        
        // Show warning if present
        if (data.warning) {
          console.warn('Analysis warning:', data.warning)
        }
      } else {
        // Response indicates failure but still has data
        if (data && data.static_analysis) {
          setResults(data)
        } else {
          setError(data?.error || 'Failed to analyze code. Please try again.')
        }
      }
    } catch (err) {
      console.error('Analysis error:', err)
      
      // Try to extract error message from response
      let errorMessage = 'Failed to analyze code. Please try again.'
      
      if (err.response) {
        if (err.response.data) {
          if (err.response.data.detail) {
            errorMessage = err.response.data.detail
          } else if (err.response.data.error) {
            errorMessage = err.response.data.error
          } else if (typeof err.response.data === 'string') {
            errorMessage = err.response.data
          }
        } else if (err.response.status === 500) {
          errorMessage = 'Server error. Please try again later.'
        } else if (err.response.status === 404) {
          errorMessage = 'Analysis endpoint not found. Please check backend connection.'
        }
      } else if (err.message) {
        if (err.message.includes('Network Error') || err.message.includes('ECONNREFUSED')) {
          errorMessage = 'Cannot connect to backend. Please ensure the backend server is running.'
        } else {
          errorMessage = err.message
        }
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const data = await uploadCode(file)
      
      // Check if response has success field
      if (data && (data.success !== false)) {
        // Valid response - ensure all required fields exist
        if (!data.static_analysis) {
          data.static_analysis = {
            complexity: { total_complexity: 0 },
            metrics: { maintainability_index: 0, lines_of_code: 0 },
            issues: []
          }
        }
        if (!data.ai_suggestions) {
          data.ai_suggestions = {
            success: true,
            response: "**Basic Optimization Tips:**\n\n1. Use efficient data structures\n2. Avoid unnecessary loops\n3. Minimize function calls in loops\n4. Use built-in functions when possible",
            model: "fallback"
          }
        }
        if (!data.energy_estimate) {
          data.energy_estimate = {
            energy_kwh: 0.0,
            co2_grams: 0.0,
            power_watts: 0.0
          }
        }
        
        setResults(data)
        
        // Try to read file content for display
        const reader = new FileReader()
        reader.onload = (e) => {
          setCode(e.target.result)
        }
        reader.readAsText(file)
        
        // Show warning if present
        if (data.warning) {
          console.warn('Analysis warning:', data.warning)
        }
      } else {
        // Response indicates failure but still has data
        if (data && data.static_analysis) {
          setResults(data)
        } else {
          setError(data?.error || 'Failed to upload and analyze file.')
        }
      }
    } catch (err) {
      console.error('Upload error:', err)
      
      // Try to extract error message from response
      let errorMessage = 'Failed to upload and analyze file.'
      
      if (err.response) {
        if (err.response.data) {
          if (err.response.data.detail) {
            errorMessage = err.response.data.detail
          } else if (err.response.data.error) {
            errorMessage = err.response.data.error
          } else if (typeof err.response.data === 'string') {
            errorMessage = err.response.data
          }
        } else if (err.response.status === 500) {
          errorMessage = 'Server error. Please try again later.'
        } else if (err.response.status === 404) {
          errorMessage = 'Upload endpoint not found. Please check backend connection.'
        }
      } else if (err.message) {
        if (err.message.includes('Network Error') || err.message.includes('ECONNREFUSED')) {
          errorMessage = 'Cannot connect to backend. Please ensure the backend server is running.'
        } else {
          errorMessage = err.message
        }
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          AI Green Coding Analyzer
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Analyze your code for energy efficiency and get AI-powered optimization suggestions
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FileCode className="w-5 h-5" />
              Code Input
            </h2>
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".py,.cpp,.c,.js,.java"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="flex items-center gap-2 px-4 py-2 bg-eco-green-100 dark:bg-eco-green-900/30 text-eco-green-700 dark:text-eco-green-400 rounded-lg hover:bg-eco-green-200 dark:hover:bg-eco-green-900/50 transition-colors">
                <Upload className="w-4 h-4" />
                <span className="text-sm font-medium">Upload</span>
              </div>
            </label>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-eco-green-500 focus:border-transparent"
            >
              <option value="python">Python</option>
              <option value="cpp">C++</option>
              <option value="c">C</option>
              <option value="javascript">JavaScript</option>
              <option value="java">Java</option>
            </select>
          </div>

          <div className="mb-4">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Paste your code here or upload a file..."
              className="w-full h-96 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-eco-green-500 focus:border-transparent resize-none"
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={loading || !code.trim()}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-eco-green-600 hover:bg-eco-green-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Analyze Code
              </>
            )}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}
        </div>

        {/* Results Panel */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-eco-green-600 dark:text-eco-green-400" />
            Analysis Results
          </h2>

          {!results && !loading && (
            <div className="flex items-center justify-center h-full min-h-[400px] text-gray-400 dark:text-gray-500">
              <div className="text-center">
                <FileCode className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Results will appear here after analysis</p>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <div className="text-center">
                <Loader className="w-12 h-12 mx-auto mb-4 animate-spin text-eco-green-600 dark:text-eco-green-400" />
                <p className="text-gray-600 dark:text-gray-400">Analyzing code...</p>
              </div>
            </div>
          )}

          {results && (
            <div className="space-y-6 max-h-[800px] overflow-y-auto">
              {/* Static Analysis */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Static Analysis
                </h3>
                <div className="space-y-3">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Complexity Score</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {results.static_analysis?.complexity?.total_complexity || 'N/A'}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Maintainability Index</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {results.static_analysis?.metrics?.maintainability_index || 'N/A'}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Lines of Code</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {results.static_analysis?.metrics?.lines_of_code || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Energy Estimate */}
              {results.energy_estimate && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Energy Estimate
                  </h3>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Estimated CO₂</p>
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                          {(results.energy_estimate?.co2_grams || 0).toFixed(4)}g
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Energy (kWh)</p>
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                          {(results.energy_estimate?.energy_kwh || 0).toFixed(6)} kWh
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Issues */}
              {results.static_analysis?.issues && results.static_analysis.issues.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Detected Issues
                  </h3>
                  <div className="space-y-2">
                    {results.static_analysis.issues.map((issue, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border ${
                          issue.severity === 'high'
                            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                            : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                        }`}
                      >
                        <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                          {issue.message}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {issue.suggestion}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Suggestions - Always show if ai_suggestions exists */}
              {results.ai_suggestions && (() => {
                const responseText = String(results.ai_suggestions.response || '').trim()
                const hasValidResponse = responseText.length > 0
                
                // If response is empty, use fallback
                if (!hasValidResponse) {
                  // Generate fallback suggestions on frontend if backend didn't provide them
                  const fallbackResponse = "**Optimization Suggestions Based on Static Analysis:**\n\n" +
                    "**General Energy Efficiency Tips:**\n" +
                    "1. Use efficient data structures (sets for lookups, lists for iteration)\n" +
                    "2. Avoid unnecessary loops - use built-in functions when possible\n" +
                    "3. Minimize function calls in loops\n" +
                    "4. Use generators for large datasets to reduce memory usage\n" +
                    "5. Consider caching results of expensive computations\n" +
                    "6. Use list comprehensions instead of loops where applicable\n" +
                    "7. Profile your code to identify actual bottlenecks\n" +
                    "8. Use appropriate algorithms (O(n log n) vs O(n²))"
                  
                  return (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-eco-green-600 dark:text-eco-green-400" />
                        Optimization Suggestions
                      </h3>
                      <div className="p-4 bg-eco-green-50 dark:bg-eco-green-900/20 rounded-lg border border-eco-green-200 dark:border-eco-green-800">
                        <div className="prose dark:prose-invert max-w-none">
                          <div 
                            className="whitespace-pre-wrap text-sm text-gray-900 dark:text-white font-sans"
                            dangerouslySetInnerHTML={{
                              __html: fallbackResponse
                                .replace(/\n/g, '<br/>')
                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 pt-3 border-t border-eco-green-200 dark:border-eco-green-800">
                          💡 Suggestions based on static code analysis
                        </p>
                      </div>
                    </div>
                  )
                }
                
                // Valid response - show it
                return (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-eco-green-600 dark:text-eco-green-400" />
                      Optimization Suggestions
                    </h3>
                    <div className="p-4 bg-eco-green-50 dark:bg-eco-green-900/20 rounded-lg border border-eco-green-200 dark:border-eco-green-800">
                      <div className="prose dark:prose-invert max-w-none">
                        <div 
                          className="whitespace-pre-wrap text-sm text-gray-900 dark:text-white font-sans"
                          dangerouslySetInnerHTML={{
                            __html: responseText
                              .replace(/\n/g, '<br/>')
                              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                              .replace(/\*(.*?)\*/g, '<em>$1</em>')
                          }}
                        />
                      </div>
                      {results.ai_suggestions.model && results.ai_suggestions.model !== 'static_analysis_fallback' && results.ai_suggestions.model !== 'fallback' && results.ai_suggestions.model !== 'basic_fallback' && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 pt-3 border-t border-eco-green-200 dark:border-eco-green-800">
                          🤖 Powered by: {results.ai_suggestions.model}
                        </p>
                      )}
                      {(results.ai_suggestions.model === 'static_analysis_fallback' || results.ai_suggestions.model === 'fallback' || results.ai_suggestions.model === 'basic_fallback') && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 pt-3 border-t border-eco-green-200 dark:border-eco-green-800">
                          💡 Suggestions based on static code analysis
                        </p>
                      )}
                    </div>
                  </div>
                )
              })()}
              
              {/* Show message if no ai_suggestions object at all */}
              {results && !results.ai_suggestions && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-eco-green-600 dark:text-eco-green-400" />
                    Optimization Suggestions
                  </h3>
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">
                      Generating optimization suggestions... This may take a moment.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

