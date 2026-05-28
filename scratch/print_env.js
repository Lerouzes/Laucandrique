console.log('Environment variables:');
Object.keys(process.env).forEach(key => {
    if (key.includes('SUPABASE') || key.includes('KEY') || key.includes('SECRET') || key.includes('DATABASE') || key.includes('URL')) {
        console.log(`${key}: ${process.env[key] ? process.env[key].substring(0, 15) + '...' : 'none'}`);
    }
});
