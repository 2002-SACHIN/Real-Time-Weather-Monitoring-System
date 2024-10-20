const assert = require('assert');
const { fetchWeatherData, calculateDailySummary, checkAndSendAlert } = require('./server');
const WeatherData = require('./models/WeatherData');

describe('Weather Monitoring System Tests', () => {
  // Test 1: System Setup
  it('should connect to OpenWeatherMap API successfully', async () => {
    const data = await fetchWeatherData('Delhi');
    assert(data.city === 'Delhi');
    assert(typeof data.temp === 'number');
  });

  // Test 2: Data Retrieval
  it('should retrieve weather data at configurable intervals', async () => {
    const initialData = await WeatherData.findOne({ city: 'Mumbai' }).sort({ dt: -1 });
    await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000)); // Wait for 5 minutes
    const newData = await WeatherData.findOne({ city: 'Mumbai' }).sort({ dt: -1 });
    assert(newData.dt > initialData.dt);
  });

  // Test 3: Temperature Conversion
  it('should convert temperature from Kelvin to Celsius', async () => {
    const data = await fetchWeatherData('Chennai');
    assert(data.temp >= -273.15 && data.temp <= 100); // Reasonable Celsius range
  });

  // Test 4: Daily Weather Summary
  it('should calculate daily summaries correctly', async () => {
    const today = new Date().toISOString().split('T')[0];
    const summary = await calculateDailySummary('Bangalore', today);
    assert(summary.avgTemp >= summary.minTemp && summary.avgTemp <= summary.maxTemp);
    assert(typeof summary.dominantWeather === 'string');
  });

  // Test 5: Alerting Thresholds
  it('should trigger alerts when temperature threshold is breached', async () => {
    let alertTriggered = false;
    const mockSendAlert = () => { alertTriggered = true; };
    await checkAndSendAlert('Kolkata', 36, mockSendAlert);
    await checkAndSendAlert('Kolkata', 37, mockSendAlert);
    assert(alertTriggered);
  });
});
