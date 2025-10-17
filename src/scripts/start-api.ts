/**
 * Start script for Stella API
 * This can be used as an alternative entry point
 */
import StellaApp from '../app.js';

console.log('🚀 Starting Stella API from script...');

const app = new StellaApp();

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('\n📛 Received SIGINT signal');
  await app.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n📛 Received SIGTERM signal');
  await app.shutdown();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the application
app.start().catch(error => {
  console.error('❌ Failed to start Stella API:', error);
  process.exit(1);
});
