import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from './store'
import Dashboard from './pages/Dashboard'
import DashboardView from './pages/DashboardView'
import Database from './pages/Database'
import Pipeline from './pages/Pipeline'
import Navigation from './components/Navigation'

function App() {
  return (
    <Provider store={store}>
      <Router future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <div className="h-full flex flex-col bg-gray-50">
          <Navigation />
          <main className="flex-1 w-full overflow-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<DashboardView />} />
              <Route path="/database" element={<Database />} />
              <Route path="/pipeline" element={<Pipeline />} />
              <Route path="/pipeline/:id" element={<Pipeline />} />
            </Routes>
          </main>
        </div>
      </Router>
    </Provider>
  )
}

export default App