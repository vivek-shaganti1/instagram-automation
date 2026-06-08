const { InstagramService } = require('./backend/dist/services/instagram.js');
const service = new InstagramService();
service.syncAnalytics().then(console.log).catch(console.error);
