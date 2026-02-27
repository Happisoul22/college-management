import { createContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { toast } from 'react-toastify';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        checkUserLoggedIn();
    }, []);

    // Check if user is logged in
    const checkUserLoggedIn = async () => {
        const token = sessionStorage.getItem('token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                // Check expiry
                if (decoded.exp * 1000 < Date.now()) {
                    logout();
                } else {
                    // Fetch user details? Or just use decoded info?
                    // Fetching fresh user data is better usually
                    const { data } = await api.get('/auth/me');
                    setUser(data.data);
                }
            } catch (err) {
                console.error(err);
                logout();
            }
        }
        setLoading(false);
    };

    // Register
    const register = async (userData) => {
        try {
            await api.post('/auth/register', userData);
            // Do NOT auto-login — redirect to login page with success message
            toast.success('Registration successful! Please sign in to continue.');
            navigate('/login');
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.error || 'Registration failed');
            throw err;
        }
    };

    // Login
    const login = async (userData) => {
        try {
            const res = await api.post('/auth/login', userData);
            sessionStorage.setItem('token', res.data.token);
            setUser(res.data.user);
            navigate('/dashboard');
            toast.success('Login successful!');
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.error || 'Login failed');
            throw err;
        }
    };

    // Logout
    const logout = () => {
        setUser(null);
        sessionStorage.removeItem('token');
        navigate('/login');
        toast.info('Logged out');
    };

    return (
        <AuthContext.Provider value={{ user, setUser, register, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
