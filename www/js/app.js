let campusMap;
let currentSelectedPlace = null;

function getIconPreset(type) {
    if (type === "admin") return "islands#governmentIcon";
    if (type === "food") return "islands#foodIcon";
    if (type === "lib") return "islands#libraryIcon";
    if (type === "room") return "islands#educationIcon";
    return "islands#blueIcon";
}

function getTypeLabel(type) {
    if (type === "admin") return "Администрация";
    if (type === "food") return "Столовая";
    if (type === "lib") return "Библиотека";
    if (type === "room") return "Аудитория";
    return "Объект";
}

function updateInfoCard(place) {
    const titleElem = document.querySelector(".place-title");
    const descElem = document.querySelector(".place-desc");
    const btn = document.getElementById("mainRouteBtn");

    if (place) {
        const typeLabel = getTypeLabel(place.type);
        titleElem.innerHTML = typeLabel + " · " + place.name;
        descElem.innerHTML = place.desc;
        btn.innerHTML = '<span class="route-icon"></span> Проложить маршрут';
        btn.classList.remove("disabled");
        btn.disabled = false;
        currentSelectedPlace = place;
    } else {
        titleElem.innerHTML = "Не выбрано";
        descElem.innerHTML = "Нажмите на здание на карте или найдите в поиске";
        btn.innerHTML = '<span class="route-icon"></span> Выберите точку назначения';
        btn.classList.add("disabled");
        btn.disabled = true;
        currentSelectedPlace = null;
    }
}

function addMarkersToMap() {
    if (!campusMap) return;
    campusMap.geoObjects.removeAll();

    for (let i = 0; i < allPlaces.length; i++) {
        const place = allPlaces[i];
        const placemark = new ymaps.Placemark([place.lat, place.lon], {
            balloonContentHeader: "<strong>" + place.name + "</strong>",
            balloonContentBody: "<div style='margin:8px 0'>" + place.desc + "</div>",
            balloonContentFooter: "<button style='padding:6px 12px; background:#2563eb; color:white; border:none; border-radius:20px;' onclick='window.selectPlaceById(" + place.id + ")'>Выбрать</button>"
        }, {
            preset: getIconPreset(place.type),
            balloonCloseButton: true
        });

        placemark.events.add('click', (function(p) {
            return function() {
                window.selectPlaceById(p.id);
            };
        })(place));

        campusMap.geoObjects.add(placemark);
    }
}

window.selectPlaceById = function(id) {
    const place = allPlaces.find(function(p) { return p.id === id; });
    if (place) {
        campusMap.setCenter([place.lat, place.lon], 18, {
            duration: 300
        });
        updateInfoCard(place);
        document.getElementById("resultsList").style.display = "none";
        const searchInput = document.getElementById("searchInput");
        if (searchInput) searchInput.value = place.name;
    }
};

function filterPlaces(searchText) {
    if (!searchText || searchText.trim() === "") {
        document.getElementById("resultsList").style.display = "none";
        return [];
    }
    const lowerQuery = searchText.toLowerCase();
    const filtered = [];
    for (let i = 0; i < allPlaces.length; i++) {
        const p = allPlaces[i];
        if (p.name.toLowerCase().indexOf(lowerQuery) !== -1 || p.desc.toLowerCase().indexOf(lowerQuery) !== -1) {
            filtered.push(p);
        }
    }
    return filtered;
}

function renderSearchResults(results) {
    const container = document.getElementById("resultsList");
    if (results.length === 0) {
        container.style.display = "none";
        return;
    }

    container.style.display = "block";
    let html = "";
    for (let i = 0; i < results.length; i++) {
        const item = results[i];
        const typeText = getTypeLabel(item.type);
        html += '<div class="result-item" onclick="window.selectPlaceById(' + item.id + ')">' +
            '<div class="result-name">' + item.name + '</div>' +
            '<div class="result-type">' + typeText + ' · ' + item.desc.substring(0, 50) + '</div>' +
            '</div>';
    }
    container.innerHTML = html;
}

function buildRouteToPlace() {
    if (!currentSelectedPlace) return;

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            const userLat = position.coords.latitude;
            const userLon = position.coords.longitude;
            const destLat = currentSelectedPlace.lat;
            const destLon = currentSelectedPlace.lon;

            const mapsUrl = "https://yandex.ru/maps/?rtext=" + userLat + "," + userLon + "~" + destLat + "," + destLon + "&rtt=pedestrian";
            window.open(mapsUrl, "_blank");

            const descDiv = document.querySelector(".place-desc");
            const originalText = descDiv.innerHTML;
            descDiv.innerHTML = "Маршрут открыт в Яндекс.Картах";
            setTimeout(function() {
                if (currentSelectedPlace) {
                    descDiv.innerHTML = currentSelectedPlace.desc;
                } else {
                    descDiv.innerHTML = originalText;
                }
            }, 3000);
        }, function(error) {
            alert("Не удалось определить местоположение");
        });
    } else {
        alert("Геолокация не поддерживается");
    }
}

function addNewPlace() {
    const nameInput = document.getElementById("newName");
    const latInput = document.getElementById("newLat");
    const lonInput = document.getElementById("newLon");
    const typeSelect = document.getElementById("newType");

    const newName = nameInput.value.trim();
    const newLat = parseFloat(latInput.value.trim());
    const newLon = parseFloat(lonInput.value.trim());
    const newType = typeSelect.value;

    if (!newName) {
        alert("Введите название");
        return;
    }
    if (isNaN(newLat) || isNaN(newLon)) {
        alert("Введите координаты");
        return;
    }

    const newId = Date.now();
    let defaultDesc = "";
    if (newType === "admin") defaultDesc = "Административное здание";
    else if (newType === "food") defaultDesc = "Точка питания";
    else if (newType === "lib") defaultDesc = "Библиотека";
    else if (newType === "room") defaultDesc = "Учебная аудитория";
    else defaultDesc = "Объект инфраструктуры";

    const newPlace = {
        id: newId,
        name: newName,
        lat: newLat,
        lon: newLon,
        type: newType,
        desc: defaultDesc
    };

    allPlaces.push(newPlace);
    addMarkersToMap();

    nameInput.value = "";
    latInput.value = "";
    lonInput.value = "";

    document.getElementById("addForm").style.display = "none";
    alert("Место добавлено");
}

document.addEventListener('deviceready', function() {
    ymaps.ready(function() {
        campusMap = new ymaps.Map("map", {
            center: [campusCenter.lat, campusCenter.lon],
            zoom: 17,
            controls: ["zoomControl", "fullscreenControl"]
        });

        addMarkersToMap();
    });
}, false);

ymaps.ready(function() {
    if (typeof cordova === 'undefined') {
        campusMap = new ymaps.Map("map", {
            center: [campusCenter.lat, campusCenter.lon],
            zoom: 17,
            controls: ["zoomControl", "fullscreenControl"]
        });

        addMarkersToMap();
    }
});

window.onload = function() {
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("input", function(e) {
            const query = e.target.value;
            const results = filterPlaces(query);
            renderSearchResults(results);
        });
    }

    const routeBtn = document.getElementById("mainRouteBtn");
    if (routeBtn) {
        routeBtn.addEventListener("click", buildRouteToPlace);
    }

    const adminBtn = document.getElementById("adminToggleBtn");
    const addFormDiv = document.getElementById("addForm");
    if (adminBtn) {
        adminBtn.addEventListener("click", function() {
            if (addFormDiv.style.display === "none" || addFormDiv.style.display === "") {
                addFormDiv.style.display = "flex";
            } else {
                addFormDiv.style.display = "none";
            }
        });
    }

    const saveBtn = document.getElementById("saveNewBtn");
    if (saveBtn) {
        saveBtn.addEventListener("click", addNewPlace);
    }

    document.addEventListener("click", function(e) {
        const resultsDiv = document.getElementById("resultsList");
        const searchBox = document.querySelector(".search-box");
        if (resultsDiv && searchBox && !searchBox.contains(e.target) && !resultsDiv.contains(e.target)) {
            if (resultsDiv.style.display !== "none") {
                setTimeout(function() {
                    if (document.activeElement !== searchInput) {
                        resultsDiv.style.display = "none";
                    }
                }, 150);
            }
        }
    });
};