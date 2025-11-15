import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { Bell, BarChart3, Settings, Users, CheckSquare } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Metrics from './pages/Metrics';
import Team from './pages/Team';
import SettingsPage from './pages/Settings';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="container">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link to="/" className="text-xl font-bold text-gray-900">
                Team Efficiency
              </Link>
              <div className="hidden md:flex space-x-4">
                <Link
                  to="/"
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:text-gray-900 hover:bg-gray-50"
                >
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Queue
                </Link>
                <Link
                  to="/metrics"
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:text-gray-900 hover:bg-gray-50"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Metrics
                </Link>
                <Link
                  to="/team"
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:text-gray-900 hover:bg-gray-50"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Team
                </Link>
                <Link
                  to="/settings"
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:text-gray-900 hover:bg-gray-50"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="relative p-2 text-gray-600 hover:text-gray-900">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  JD
                </div>
                <span className="text-sm font-medium text-gray-700 hidden sm:block">
                  John Doe
                </span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/metrics" element={<Metrics />} />
          <Route path="/team" element={<Team />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;