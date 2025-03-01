const API_BASE_URL = 'https://18.215.160.136.nip.io/api';

const api = {
    // Authentication
    verifyToken: async () => {
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${API_BASE_URL}/verify-token`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return await response.json();
        } catch (error) {
            console.error('Token verification failed:', error);
            return { success: false };
        }
    },

    // Dashboard Stats
    getDashboardStats: async () => {
        return await api.authenticatedRequest('/dashboard/stats');
    },

    // Helper method for authenticated requests
    authenticatedRequest: async (endpoint, method = 'GET', body = null) => {
        const token = localStorage.getItem('token');
        try {
            const options = {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            };

            if (body) {
                options.body = JSON.stringify(body);
            }

            const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }
};
