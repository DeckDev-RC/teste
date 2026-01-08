import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, createContext } from 'react'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'

// Auth Context (visual only for now)
export const AuthContext = createContext(null)

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [user, setUser] = useState(null)

    const login = (email) => {
        setIsAuthenticated(true)
        setUser({ email, name: email.split('@')[0] })
    }

    const logout = () => {
        setIsAuthenticated(false)
        setUser(null)
    }

    return (
        <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
            <Routes>
                <Route
                    path="/login"
                    element={
                        isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
                    }
                />
                <Route
                    path="/"
                    element={
                        isAuthenticated ? <HomePage /> : <Navigate to="/login" replace />
                    }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </AuthContext.Provider>
    )
}

export default App
