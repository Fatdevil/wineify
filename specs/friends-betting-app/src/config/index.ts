import dotenv from 'dotenv';

dotenv.config();

const config = {
    app: {
        port: process.env.PORT || 3000,
        env: process.env.NODE_ENV || 'development',
    },
    db: {
        uri: process.env.DB_URI || 'mongodb://localhost:27017/friends-betting-app',
    },
    payout: {
        defaultHouseCut: parseFloat(process.env.DEFAULT_HOUSE_CUT) || 0.1, // 10%
    },
    notifications: {
        emailService: process.env.EMAIL_SERVICE || 'smtp',
        emailUser: process.env.EMAIL_USER || '',
        emailPass: process.env.EMAIL_PASS || '',
    },
};

export default config;