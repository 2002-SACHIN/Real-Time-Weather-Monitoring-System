import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Sun, Cloud, CloudRain, Wind } from 'lucide-react';

const cities = ['Delhi', 'Mumbai', 'Chennai', 'Bangalore', 'Kolkata', 'Hyderabad'];

const WeatherIcon = ({ condition }) => {
  switch (condition.toLowerCase()) {
    case 'sunny': return <Sun className="w-8 h-8 text-yellow-400" />;
    case 'cloudy': return <Cloud className="w-8 h-8 text-gray-400" />;
    case 'rainy': return <CloudRain className="w-8 h-8 text-blue-400" />;
    default: return <Wind className="w-8 h-8 text-gray-600" />;
  }
};

const App = () => {
  const [weatherData, setWeatherData] = useState({});
  const [summaries, setSummaries] = useState({});
  const [selectedCity, setSelectedCity] = useState(cities[0]);
  const [forecast, setForecast] = useState([]);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Simulate fetching weather data
        const simulatedWeatherData = {};
        const simulatedSummaries = {};
        const simulatedForecast = [];

        cities.forEach(city => {
          simulatedWeatherData[city] = {
            temp: Math.random() * 20 + 15,
            feels_like: Math.random() * 20 + 15,
            humidity: Math.floor(Math.random() * 50) + 30,
            wind_speed: Math.random() * 5,
            main: ['Sunny', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 3)]
          };

          simulatedSummaries[city] = {
            avgTemp: Math.random() * 20 + 15,
            maxTemp: Math.random() * 10 + 25,
            minTemp: Math.random() * 10 + 10,
            dominantWeather: ['Sunny', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 3)],
            avgHumidity: Math.floor(Math.random() * 50) + 30,
            avgWindSpeed: Math.random() * 5
          };
        });

        for (let i = 0; i < 5; i++) {
          simulatedForecast.push({
            dt: Date.now() / 1000 + i * 86400,
            main: { temp: Math.random() * 20 + 273.15 },
            weather: [{ main: ['Sunny', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 3)] }]
          });
        }

        setWeatherData(simulatedWeatherData);
        setSummaries(simulatedSummaries);
        setForecast(simulatedForecast);

        // Update chart data
        const newChartData = cities.map(city => ({
          name: city,
          avg: simulatedSummaries[city].avgTemp,
          max: simulatedSummaries[city].maxTemp,
          min: simulatedSummaries[city].minTemp
        }));
        setChartData(newChartData);

      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 300000); // Update every 5 minutes

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-200 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-extrabold text-indigo-800 mb-8 text-center">
          Weather Monitoring Dashboard
        </h1>
        
        {/* City cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {cities.map(city => (
            <div 
              key={city} 
              className={`p-6 rounded-lg shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 cursor-pointer ${
                selectedCity === city ? 'bg-white ring-4 ring-indigo-400' : 'bg-indigo-50 hover:bg-white'
              }`}
              onClick={() => setSelectedCity(city)}
            >
              <h2 className="text-2xl font-bold text-indigo-700 mb-4">{city}</h2>
              {weatherData[city] && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-semibold">{weatherData[city].temp.toFixed(1)}°C</span>
                    <WeatherIcon condition={weatherData[city].main} />
                  </div>
                  <p className="text-gray-600">Feels like: {weatherData[city].feels_like.toFixed(1)}°C</p>
                  <p className="text-gray-600">Humidity: {weatherData[city].humidity}%</p>
                  <p className="text-gray-600">Wind: {weatherData[city].wind_speed.toFixed(1)} m/s</p>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Daily Summary */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
          <h2 className="text-3xl font-bold text-indigo-800 mb-6">Daily Summary for {selectedCity}</h2>
          {summaries[selectedCity] && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-indigo-100 p-4 rounded-lg">
                <p className="text-lg font-semibold">Average Temp</p>
                <p className="text-3xl font-bold text-indigo-700">{summaries[selectedCity].avgTemp.toFixed(1)}°C</p>
              </div>
              <div className="bg-red-100 p-4 rounded-lg">
                <p className="text-lg font-semibold">Max Temp</p>
                <p className="text-3xl font-bold text-red-700">{summaries[selectedCity].maxTemp.toFixed(1)}°C</p>
              </div>
              <div className="bg-blue-100 p-4 rounded-lg">
                <p className="text-lg font-semibold">Min Temp</p>
                <p className="text-3xl font-bold text-blue-700">{summaries[selectedCity].minTemp.toFixed(1)}°C</p>
              </div>
              <div className="bg-yellow-100 p-4 rounded-lg">
                <p className="text-lg font-semibold">Dominant Weather</p>
                <p className="text-2xl font-bold text-yellow-700">{summaries[selectedCity].dominantWeather}</p>
              </div>
              <div className="bg-green-100 p-4 rounded-lg">
                <p className="text-lg font-semibold">Average Humidity</p>
                <p className="text-3xl font-bold text-green-700">{summaries[selectedCity].avgHumidity.toFixed(1)}%</p>
              </div>
              <div className="bg-purple-100 p-4 rounded-lg">
                <p className="text-lg font-semibold">Average Wind Speed</p>
                <p className="text-3xl font-bold text-purple-700">{summaries[selectedCity].avgWindSpeed.toFixed(1)} m/s</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Temperature Comparison Chart */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
          <h2 className="text-3xl font-bold text-indigo-800 mb-6">Temperature Comparison</h2>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="avg" stroke="#8884d8" name="Average" strokeWidth={2} />
              <Line type="monotone" dataKey="max" stroke="#82ca9d" name="Maximum" strokeWidth={2} />
              <Line type="monotone" dataKey="min" stroke="#ffc658" name="Minimum" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* 5-Day Forecast */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-3xl font-bold text-indigo-800 mb-6">5-Day Forecast for {selectedCity}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {forecast.map((item, index) => (
              <div key={index} className="bg-gradient-to-b from-blue-50 to-indigo-100 p-6 rounded-lg shadow transition-all duration-300 ease-in-out transform hover:scale-105">
                <p className="text-lg font-semibold mb-2">{new Date(item.dt * 1000).toLocaleDateString()}</p>
                <p className="text-3xl font-bold text-indigo-700 mb-2">{(item.main.temp - 273.15).toFixed(1)}°C</p>
                <p className="text-lg text-gray-700">{item.weather[0].main}</p>
                <WeatherIcon condition={item.weather[0].main} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
