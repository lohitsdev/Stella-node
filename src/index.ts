import StellaApp from './app.js';

console.log('Hello from Stella! 🌟');

// Initialize and start the Stella API application
const app = new StellaApp();

// Graceful shutdown handling
process.on('SIGINT', async () => {
  await app.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await app.shutdown();
  process.exit(0);
});

// Start the application
app.start().catch(error => {
  console.error('Failed to start application:', error);
  process.exit(1);
});

export default StellaApp;
