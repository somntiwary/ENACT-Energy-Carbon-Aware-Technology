import { Leaf, Zap, Code, BarChart3, Github, ExternalLink } from 'lucide-react'

export default function About() {
  return (
    <div className="p-8 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          About ENACT
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Energy & Carbon-Aware Technology - Building a sustainable digital future
        </p>
      </div>

      {/* Mission */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 bg-eco-green-100 dark:bg-eco-green-900/30 rounded-lg">
            <Leaf className="w-8 h-8 text-eco-green-600 dark:text-eco-green-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Our Mission
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              ENACT (Energy & Carbon-Aware Technology) is a comprehensive platform designed to help developers
              and digital users understand and reduce their carbon footprint. By providing real-time monitoring,
              AI-powered code analysis, and actionable insights, we empower individuals and organizations to make
              more sustainable choices in their digital activities.
            </p>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg w-fit mb-4">
            <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Digital Carbon Tracker
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Monitor real-time carbon emissions from browsing, streaming, email, and other digital activities
            using benchmark data from CodeCarbon and Green Algorithms.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg w-fit mb-4">
            <Code className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            AI Code Analyzer
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Analyze code for energy inefficiency using static analysis and AI-powered optimization suggestions
            from OpenRouter's LLM models.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="p-3 bg-eco-green-100 dark:bg-eco-green-900/30 rounded-lg w-fit mb-4">
            <Zap className="w-6 h-6 text-eco-green-600 dark:text-eco-green-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Real-Time Insights
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Get comprehensive analytics, trends, and visualizations to understand your carbon footprint
            patterns and identify optimization opportunities.
          </p>
        </div>
      </div>

      {/* Tech Stack */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Technology Stack
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Frontend</h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-400">
              <li>• React.js 18.2</li>
              <li>• Tailwind CSS 3.3</li>
              <li>• Recharts & Chart.js</li>
              <li>• React Router DOM</li>
              <li>• Axios for API calls</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Backend</h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-400">
              <li>• FastAPI (Python)</li>
              <li>• Radon for code analysis</li>
              <li>• psutil for system metrics</li>
              <li>• OpenRouter AI integration</li>
              <li>• Local JSON storage</li>
            </ul>
          </div>
        </div>
      </div>

      {/* APIs Used */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          APIs & Data Sources
        </h2>
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">OpenRouter AI</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Provides AI-powered code optimization suggestions using multiple LLM models including GPT, Mistral, and Gemini.
            </p>
            <a
              href="https://openrouter.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-eco-green-600 dark:text-eco-green-400 hover:underline flex items-center gap-1"
            >
              Visit OpenRouter <ExternalLink className="w-4 h-4" />
            </a>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">CodeCarbon & Green Algorithms</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Emission benchmark data and conversion factors for accurate carbon footprint estimation.
            </p>
            <a
              href="https://github.com/mlco2/codecarbon"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-eco-green-600 dark:text-eco-green-400 hover:underline flex items-center gap-1"
            >
              Learn more <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Usage */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          How to Use
        </h2>
        <ol className="space-y-4 list-decimal list-inside text-gray-600 dark:text-gray-400">
          <li>
            <span className="font-semibold text-gray-900 dark:text-white">Dashboard:</span> View your overall carbon footprint, eco-score, and real-time metrics.
          </li>
          <li>
            <span className="font-semibold text-gray-900 dark:text-white">Analyzer:</span> Paste or upload code files to get AI-powered optimization suggestions and energy estimates.
          </li>
          <li>
            <span className="font-semibold text-gray-900 dark:text-white">Insights:</span> Explore detailed analytics, trends, and activity breakdowns over time.
          </li>
          <li>
            <span className="font-semibold text-gray-900 dark:text-white">Real-Time Tracker:</span> Monitor carbon emissions as you browse, stream, or work.
          </li>
        </ol>
      </div>

      {/* Footer */}
      <div className="text-center text-gray-500 dark:text-gray-400 text-sm pt-8">
        <p>Built with ❤️ for a sustainable digital future</p>
        <p className="mt-2">ENACT v1.0.0 - Energy & Carbon-Aware Technology</p>
      </div>
    </div>
  )
}

