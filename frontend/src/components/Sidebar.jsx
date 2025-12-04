import { Link, useLocation } from 'react-router-dom'
import { Home, Code, BarChart3, Info, Moon, Sun } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

export default function Sidebar() {
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/analyzer', icon: Code, label: 'Analyzer' },
    { path: '/insights', icon: BarChart3, label: 'Insights' },
    { path: '/about', icon: Info, label: 'About' },
  ]

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-eco-green-600 dark:text-eco-green-400 flex items-center gap-2">
          <span className="text-3xl">🌱</span>
          ENACT
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Energy & Carbon-Aware Technology
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-eco-green-100 dark:bg-eco-green-900/30 text-eco-green-700 dark:text-eco-green-400 font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Theme Toggle */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
        </button>
      </div>
    </aside>
  )
}

