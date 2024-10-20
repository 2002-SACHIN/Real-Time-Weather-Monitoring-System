const express = require('express');
const mongoose = require('mongoose');
const https = require('https');
const nodemailer = require('nodemailer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const redis = require('redis');
const { promisify } = require('util');

const app = express();
const port = process.env.PORT || 3000;

// Security enhancements
app.use(helmet());
app.use(express.json({ limit: '10kb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

// Redis setup for caching
const redisClient = redis.createClient(process.env.REDIS_URL);
const getAsync = promisify(redisClient.get).bind(redisClient);
const setAsync = promisify(redisClient.set).bind(redisClient);

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const weatherSchema = new mongoose.Schema({
  city: String,
  main: String,
  temp: Number,
  feels_like: Number,
  humidity: Number,
  wind_speed: Number,
  dt: Number,
  date: Date
});

const WeatherData = mongoose.model('WeatherData', weatherSchema);

const API_KEY = process.env.OPENWEATHERMAP_API_KEY;
const cities = ['Delhi', 'Mumbai', 'Chennai', 'Bangalore', 'Kolkata', 'Hyderabad'];

async function fetchWeatherData(city) {
  const cacheKey = `weather:${city}`;
  const cachedData = await getAsync(cacheKey);
  if (cachedData) {
    return JSON.parse(cachedData);
  }

  return new Promise((resolve, reject) => {
    https.get(`https://api.openweathermap.org/data/2.5/weather?q=${city},IN&appid=${API_KEY}`, (resp) => {
      let data = '';
      resp.on('data', (chunk) => {
        data += chunk;
      });
      resp.on('end', async () => {
        const response = JSON.parse(data);
        const { main, weather, wind, dt } = response;
        const processedData = {
          city,
          main: weather[0].main,
          temp: main.temp - 273.15,
          feels_like: main.feels_like - 273.15,
          humidity: main.humidity,
          wind_speed: wind.speed,
          dt
        };
        await setAsync(cacheKey, JSON.stringify(processedData), 'EX', 300);
        resolve(processedData);
      });
    }).on("error", (err) => {
      reject(`Error: ${err.message}`);
    });
  });
}

async function saveWeatherData(data) {
  const weatherData = new WeatherData({
    ...data,
    date: new Date(data.dt * 1000)
  });
  await weatherData.save();
}

async function calculateDailySummary(city, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const data = await WeatherData.find({
    city,
    date: { $gte: startOfDay, $lte: endOfDay }
  });

  const temperatures = data.map(d => d.temp);
  const weatherConditions = data.map(d => d.main);

  return {
    city,
    date: startOfDay,
    avgTemp: temperatures.reduce((a, b) => a + b, 0) / temperatures.length,
    maxTemp: Math.max(...temperatures),
    minTemp: Math.min(...temperatures),
    dominantWeather: getMostFrequent(weatherConditions),
    avgHumidity: data.reduce((sum, d) => sum + d.humidity, 0) / data.length,
    avgWindSpeed: data.reduce((sum, d) => sum + d.wind_speed, 0) / data.length
  };
}

function getMostFrequent(arr) {
  return arr.sort((a,b) =>
    arr.filter(v => v===a).length - arr.filter(v => v===b).length
  ).pop();
}

const alertThreshold = 35;
const alertConsecutiveCount = 2;
let alertCounts = {};

async function checkAndSendAlert(city, temp) {
  if (temp > alertThreshold) {
    alertCounts[city] = (alertCounts[city] || 0) + 1;
    if (alertCounts[city] >= alertConsecutiveCount) {
      sendAlertEmail(city, temp);
      alertCounts[city] = 0;
    }
  } else {
    alertCounts[city] = 0;
  }
}

function sendAlertEmail(city, temp) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.ALERT_EMAIL,
    subject: `Weather Alert for ${city}`,
    text: `The temperature in ${city} has exceeded ${alertThreshold}°C for ${alertConsecutiveCount} consecutive readings. Current temperature: ${temp.toFixed(1)}°C`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
}

function scheduleFetchWeatherData() {
  setInterval(async () => {
    for (const city of cities) {
      try {
        const data = await fetchWeatherData(city);
        await saveWeatherData(data);
        await checkAndSendAlert(city, data.temp);
      } catch (error) {
        console.error(`Error processing data for ${city}:`, error);
      }
    }
  }, 5 * 60 * 1000);
}

scheduleFetchWeatherData();

app.get('/api/weather/:city', async (req, res) => {
  try {
    const { city } = req.params;
    if (!cities.includes(city)) {
      return res.status(400).json({ error: 'Invalid city' });
    }
    const latestData = await WeatherData.findOne({ city }).sort({ dt: -1 });
    res.json(latestData);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/summary/:city/:date', async (req, res) => {
  try {
    const { city, date } = req.params;
    if (!cities.includes(city) || !date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return res.status(400).json({ error: 'Invalid input' });
    }
    const summary = await calculateDailySummary(city, new Date(date));
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/forecast/:city', async (req, res) => {
  try {
    const { city } = req.params;
    if (!cities.includes(city)) {
      return res.status(400).json({ error: 'Invalid city' });
    }
    const cacheKey = `forecast:${city}`;
    const cachedForecast = await getAsync(cacheKey);
    if (cachedForecast) {
      return res.json(JSON.parse(cachedForecast));
    }
    const forecast = await new Promise((resolve, reject) => {
      https.get(`https://api.openweathermap.org/data/2.5/forecast?q=${city},IN&appid=${API_KEY}`, (resp) => {
        let data = '';
        resp.on('data', (chunk) => {
          data += chunk;
        });
        resp.on('end', () => {
          resolve(JSON.parse(data));
        });
      }).on("error", (err) => {
        reject(`Error: ${err.message}`);
      });
    });
    await setAsync(cacheKey, JSON.stringify(forecast), 'EX', 1800);
    res.json(forecast);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch forecast data' });
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
