const routes = ['auth', 'achievements', 'analytics', 'leaves', 'reports', 'ai', 'subjects', 'marks', 'attendance', 'assignments', 'notifications', 'blockchain'];
routes.forEach(r => {
    try {
        require(`./routes/${r}`);
    } catch (e) {
        if (e.message.includes('Route')) {
            console.log(`Error in ${r}: ${e.message}`);
        }
    }
});
