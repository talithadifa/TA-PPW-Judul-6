const GEO_API = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_API = 'https://api.open-meteo.com/v1/forecast';

let currentData = { name: '', lat: null, lon: null, country: '' };
let isCelsius = true;
let searchTimeout;
let updateInterval;

function getWeatherIcon(code, isDay) {
    const dayOrNight = isDay ? 'd' : 'n';
    let iconCode = '01'; 

    switch(code) {
        case 0: iconCode = '01'; break;
        case 1: iconCode = '02'; break;
        case 2: iconCode = '03'; break;
        case 3: iconCode = '04'; break;
        case 45: case 48: iconCode = '50'; break;
        case 51: case 53: case 55: iconCode = '09'; break;
        case 61: case 63: case 65: iconCode = '10'; break;
        case 80: case 81: case 82: iconCode = '09'; break;
        case 95: case 96: case 99: iconCode = '11'; break;
        default: iconCode = '02';
    }
    return `https://openweathermap.org/img/wn/${iconCode}${dayOrNight}@4x.png`;
}

const weatherDesc = {
    0: 'Cerah', 1: 'Cerah Berawan', 2: 'Berawan', 3: 'Mendung',
    45: 'Kabut', 48: 'Kabut Tebal', 51: 'Gerimis', 53: 'Gerimis', 55: 'Gerimis Lebat',
    61: 'Hujan', 63: 'Hujan', 65: 'Hujan Lebat', 80: 'Hujan Lokal',
    95: 'Badai Petir', 96: 'Badai Petir Ringan', 99: 'Badai Petir Berat'
};

const el = {
    body: document.body,
    input: document.getElementById('cityInput'),
    dropdown: document.getElementById('dropdownList'),
    loader: document.getElementById('loader'),
    content: document.getElementById('weatherContent'),
    locName: document.getElementById('locationName'),
    mainIcon: document.getElementById('mainIcon'), 
    temp: document.getElementById('tempDisplay'),
    desc: document.getElementById('descDisplay'),
    updateTime: document.getElementById('updateTime'),
    wind: document.getElementById('windSpeed'),
    humid: document.getElementById('humidity'),
    forecast: document.getElementById('forecastGrid'),
    favList: document.getElementById('favList'),
    btnFav: document.getElementById('btnFavorite')
};

el.input.addEventListener('input', function() {
    const query = this.value;
    if (query.length < 3) { el.dropdown.classList.add('hidden'); return; }
    if (searchTimeout) clearTimeout(searchTimeout);
    
    el.dropdown.classList.remove('hidden');
    el.dropdown.innerHTML = '<div class="p-4 text-center text-xs text-slate-400 dark:text-slate-300">Mencari...</div>';

    searchTimeout = setTimeout(async () => {
        try {
            const res = await fetch(`${GEO_API}?name=${query}&count=5&language=id&format=json`);
            const data = await res.json();
            el.dropdown.innerHTML = '';

            if (!data.results) {
                el.dropdown.innerHTML = '<div class="p-4 text-center text-xs text-slate-400 dark:text-slate-300">Tidak ditemukan</div>';
                return;
            }

            data.results.forEach(city => {
                const item = document.createElement('div');
                item.className = 'dropdown-item p-3 cursor-pointer flex items-center gap-3 transition border-b border-slate-100 dark:border-slate-700 last:border-0 hover:bg-sky-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200';
                item.innerHTML = `
                    <div class="w-8 h-8 rounded-full bg-sky-100 dark:bg-slate-600 flex items-center justify-center text-brand dark:text-sky-300"><i class="fas fa-map-marker-alt text-xs"></i></div>
                    <div class="text-sm"><div class="font-semibold">${city.name}</div><div class="text-xs text-slate-500 dark:text-slate-400">${city.country}</div></div>
                `;
                item.onclick = () => {
                    loadCity(city.latitude, city.longitude, city.name, city.country);
                    el.input.value = '';
                    el.dropdown.classList.add('hidden');
                };
                el.dropdown.appendChild(item);
            });
        } catch (e) { console.error(e); }
    }, 300);
});

document.addEventListener('click', e => {
    if (!el.input.contains(e.target) && !el.dropdown.contains(e.target)) el.dropdown.classList.add('hidden');
});

async function loadCity(lat, lon, name, country) {
    el.loader.classList.remove('hidden');
    el.content.classList.add('opacity-50');
    currentData = { lat, lon, name, country };
    checkFavoriteStatus();

    try {
        const unitParam = isCelsius ? '' : '&temperature_unit=fahrenheit';
        const url = `${WEATHER_API}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto${unitParam}`;
        const res = await fetch(url);
        const data = await res.json();
        
        setTimeout(() => {
            renderUI(data);
            el.loader.classList.add('hidden');
            el.content.classList.remove('opacity-50');
        }, 300);

        if(updateInterval) clearInterval(updateInterval);
        updateInterval = setInterval(() => refreshData(), 300000);
    } catch (error) {
        alert("Gagal memuat.");
        el.loader.classList.add('hidden');
        el.content.classList.remove('opacity-50');
    }
}

function refreshData() {
    if(currentData.lat) loadCity(currentData.lat, currentData.lon, currentData.name, currentData.country);
}

function renderUI(data) {
    const current = data.current;
    const daily = data.daily;
    const desc = weatherDesc[current.weather_code] || 'Tidak Diketahui';
    const unit = isCelsius ? '°C' : '°F';

    el.locName.innerText = `${currentData.name}, ${currentData.country}`;
    const iconUrl = getWeatherIcon(current.weather_code, current.is_day);
    el.mainIcon.src = iconUrl; 
    el.temp.innerText = `${Math.round(current.temperature_2m)}${unit}`;
    el.desc.innerText = desc;

    const dateNow = new Date();
    const dateOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const timeOptions = { hour: '2-digit', minute: '2-digit' };
    el.updateTime.innerHTML = `<div class="font-bold">${dateNow.toLocaleDateString('id-ID', dateOptions)}</div><div class="text-xs opacity-80">Pukul ${dateNow.toLocaleTimeString('id-ID', timeOptions)}</div>`;

    el.wind.innerText = Math.round(current.wind_speed_10m);
    el.humid.innerText = current.relative_humidity_2m;

    el.forecast.innerHTML = '';
    for(let i = 1; i <= 5; i++) {
        if(!daily.time[i]) break;
        const date = new Date(daily.time[i]).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
        const fDesc = weatherDesc[daily.weather_code[i]] || '';
        const fIconUrl = getWeatherIcon(daily.weather_code[i], 1); 

        el.forecast.innerHTML += `
            <div class="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-3 rounded-2xl text-center shadow-sm hover:shadow-md transition">
                <div class="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-2 uppercase">${date}</div>
                <div class="flex justify-center mb-2"><img src="${fIconUrl}" alt="icon" class="w-12 h-12 filter drop-shadow-md"></div>
                <div class="flex justify-center items-center gap-1 mb-1">
                    <span class="font-bold text-slate-700 dark:text-white text-sm">${Math.round(daily.temperature_2m_max[i])}°</span>
                    <span class="text-slate-300 dark:text-slate-600 text-xs">/</span>
                    <span class="text-xs text-slate-500 dark:text-slate-400">${Math.round(daily.temperature_2m_min[i])}°</span>
                </div>
                <div class="text-[10px] text-slate-400 dark:text-slate-300 capitalize truncate">${fDesc}</div>
            </div>
        `;
    }
}

function toggleFavorite() {
    let favs = JSON.parse(localStorage.getItem('favCitiesFinal')) || [];
    const existingIndex = favs.findIndex(c => c.name === currentData.name);
    if (existingIndex === -1) favs.push(currentData);
    else favs.splice(existingIndex, 1);
    localStorage.setItem('favCitiesFinal', JSON.stringify(favs));
    checkFavoriteStatus();
    renderFavorites();
}

function checkFavoriteStatus() {
    let favs = JSON.parse(localStorage.getItem('favCitiesFinal')) || [];
    const isFav = favs.some(c => c.name === currentData.name);
    if(isFav) {
        el.btnFav.innerHTML = '<i class="fas fa-check mr-2"></i> Tersimpan';
        el.btnFav.className = "text-xs bg-white text-brand font-bold px-5 py-2 rounded-full transition shadow-md border border-brand";
    } else {
        el.btnFav.innerHTML = '<i class="far fa-heart mr-2"></i> Simpan Lokasi';
        el.btnFav.className = "text-xs bg-brand hover:bg-sky-600 text-white font-medium px-5 py-2 rounded-full transition shadow-lg shadow-sky-200";
    }
}

function renderFavorites() {
    const favs = JSON.parse(localStorage.getItem('favCitiesFinal')) || [];
    el.favList.innerHTML = '';
    if(favs.length === 0) {
        el.favList.innerHTML = '<li class="w-full text-center text-slate-400 dark:text-slate-400 text-xs italic py-4">Belum ada kota favorit</li>';
        return;
    }
    favs.forEach(city => {
        const li = document.createElement('li');
        li.className = 'group relative bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 px-4 py-2 rounded-full cursor-pointer border border-slate-200 dark:border-slate-600 shadow-sm transition flex items-center gap-2 text-slate-700 dark:text-slate-200';
        li.innerHTML = `
            <i class="fas fa-city text-brand dark:text-sky-400 text-xs"></i>
            <span class="text-sm font-medium">${city.name}</span>
            <button class="delete-btn opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 ml-1 transition"><i class="fas fa-times-circle"></i></button>
        `;
        li.onclick = (e) => {
            if(e.target.closest('.delete-btn')) {
                e.stopPropagation();
                const newFavs = favs.filter(c => c.name !== city.name);
                localStorage.setItem('favCitiesFinal', JSON.stringify(newFavs));
                renderFavorites();
                checkFavoriteStatus();
            } else {
                loadCity(city.lat, city.lon, city.name, city.country);
            }
        };
        el.favList.appendChild(li);
    });
}

document.getElementById('unitToggle').addEventListener('click', () => { isCelsius = !isCelsius; refreshData(); });
document.getElementById('themeToggle').addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    const body = document.body;
    if(body.classList.contains('from-sky-100')) {
        body.classList.remove('from-sky-100', 'via-blue-100', 'to-indigo-200');
        body.classList.add('bg-slate-900', 'text-white');
        document.querySelector('#themeToggle i').className = 'fas fa-sun text-yellow-300';
    } else {
        body.classList.add('from-sky-100', 'via-blue-100', 'to-indigo-200');
        body.classList.remove('bg-slate-900', 'text-white');
        document.querySelector('#themeToggle i').className = 'fas fa-moon';
    }
});

window.addEventListener('load', () => { renderFavorites(); loadCity(-5.45, 105.26, 'Bandar Lampung', 'Indonesia'); });