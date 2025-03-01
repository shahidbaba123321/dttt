const dateUtils = {
    formatDate: (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    formatDateTime: (date) => {
        return new Date(date).toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    getRelativeTime: (date) => {
        const now = new Date();
        const diff = now - new Date(date);
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days} days ago`;
        if (hours > 0) return `${hours} hours ago`;
        if (minutes > 0) return `${minutes} minutes ago`;
        return 'Just now';
    }
};
