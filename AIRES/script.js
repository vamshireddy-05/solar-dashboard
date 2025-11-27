const form = document.getElementById('forecastForm');
const cardsContainer = document.querySelector('.forecast-cards');
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const weeklyCanvas = document.getElementById('weeklyTrend');
let weeklyChart = null;

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const city = document.getElementById('city').value.trim();
  if (!city) return;

  loadingEl.style.display = 'block';
  errorEl.textContent = '';
  cardsContainer.innerHTML = '';
  if (weeklyChart) weeklyChart.destroy();

  try {
    // 1️⃣ Geocoding
    const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${city}`);
    const geoData = await geoRes.json();
    if (!geoData.length) throw new Error('City not found');
    const lat = geoData[0].lat;
    const lon = geoData[0].lon;

    // 2️⃣ Fetch 7-day solar & cloud data
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=shortwave_radiation_sum,cloudcover_mean&timezone=auto`
    );
    const weatherData = await weatherRes.json();

    const radiationArr = weatherData?.daily?.shortwave_radiation_sum;
    const cloudArr = weatherData?.daily?.cloudcover_mean;
    const dateArr = weatherData?.daily?.time;

    if (!radiationArr || !cloudArr || !dateArr) throw new Error('Data not available for this location.');

    // 3️⃣ Create daily cards with mini charts
    for (let i = 0; i < Math.min(7, dateArr.length); i++) {
      const date = new Date(dateArr[i]);
      const dayLabel = date.toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' });

      const card = document.createElement('div');
      card.classList.add('card');

      card.innerHTML = `
        <h3>${dayLabel}</h3>
        <p>Sunlight: ${radiationArr[i].toFixed(1)} MJ/m² <i class="fas fa-sun" style="color:#f6c90e"></i></p>
        <p>Cloud Cover: ${cloudArr[i].toFixed(0)}% <i class="fas fa-cloud" style="color:#0077b6"></i></p>
        <canvas id="miniChart${i}" height="80"></canvas>
      `;
      cardsContainer.appendChild(card);

      // Mini chart per card with tooltip
      new Chart(document.getElementById(`miniChart${i}`), {
        type: 'bar',
        data: {
          labels: ['Sunlight', 'Cloud Cover'],
          datasets: [{
            label: dayLabel,
            data: [radiationArr[i], cloudArr[i]],
            backgroundColor: ['#f6c90e', '#0077b6'],
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const val = context.raw;
                  if (context.label === 'Sunlight') return `${val.toFixed(1)} MJ/m²`;
                  else return `${val.toFixed(0)} %`;
                }
              }
            }
          },
          scales: {
            y: { beginAtZero: true }
          }
        }
      });
    }

    // 4️⃣ Weekly trend chart
    weeklyChart = new Chart(weeklyCanvas, {
      type: 'line',
      data: {
        labels: dateArr.slice(0,7).map(d => new Date(d).toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric'})),
        datasets: [
          {
            label: 'Sunlight Energy (MJ/m²)',
            data: radiationArr.slice(0,7),
            borderColor: '#f6c90e',
            backgroundColor: 'rgba(246,201,14,0.2)',
            tension: 0.4,
            yAxisID: 'y1',
            pointStyle: 'circle',
            pointRadius: 6
          },
          {
            label: 'Cloud Cover (%)',
            data: cloudArr.slice(0,7),
            borderColor: '#0077b6',
            backgroundColor: 'rgba(0,119,182,0.2)',
            tension: 0.4,
            yAxisID: 'y2',
            pointStyle: 'rectRounded',
            pointRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        stacked: false,
        plugins: { legend: { position: 'top' } },
        scales: {
          y1: {
            type: 'linear',
            display: true,
            position: 'left',
            title: { display: true, text: 'Sunlight MJ/m²' },
          },
          y2: {
            type: 'linear',
            display: true,
            position: 'right',
            title: { display: true, text: 'Cloud Cover %' },
            grid: { drawOnChartArea: false },
          }
        }
      }
    });

  } catch (err) {
    console.error(err);
    errorEl.textContent = err.message;
  } finally {
    loadingEl.style.display = 'none';
  }
});


