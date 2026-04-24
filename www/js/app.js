let startPlace = null;
let endPlace = null;
let currentRouteRoads = [];
let appCurrentFloor = 1;

function getRoadsByFloor(floor) {
    if (floor === 0) return roads0;
    if (floor === 1) return roads1;
    return [];
}

function getTypeLabel(type) {
    if (type === "admin") return "Администрация";
    if (type === "food") return "Столовая";
    if (type === "lib") return "Библиотека";
    if (type === "room") return "Аудитория";
    return "Объект";
}

function getImageActualSize() {
    const container = document.getElementById("mapArea");
    if (!container) return { left: 0, top: 0, width: 0, height: 0 };
    return {
        left: 0,
        top: 0,
        width: container.clientWidth,
        height: container.clientHeight
    };
}

function getPointCoordinates(place) {
    const imgSize = getImageActualSize();
    if (!place) return null;
    if (place.center) {
        return { x: place.center.x * imgSize.width, y: place.center.y * imgSize.height };
    }
    return { x: place.x * imgSize.width, y: place.y * imgSize.height };
}

function getRoadIdFromPlace(place) {
    const roadInfo = placeToRoad[place.id];
    if (typeof roadInfo === 'string') return roadInfo;
    if (roadInfo && roadInfo.roadId) return roadInfo.roadId;
    return null;
}

function updateInfoCard() {
    const titleElem = document.querySelector(".place-title");
    const descElem = document.getElementById("placeDesc");
    const btn = document.getElementById("mainRouteBtn");

    if (!titleElem || !descElem || !btn) return;

    if (startPlace && endPlace) {
        titleElem.textContent = "Маршрут готов";
        descElem.textContent = "От: " + startPlace.name + " → До: " + endPlace.name;
        btn.innerHTML = 'Построить маршрут';
        btn.classList.remove("disabled");
        btn.disabled = false;
    } else if (startPlace) {
        titleElem.textContent = "Выберите куда";
        descElem.textContent = "От: " + startPlace.name + " → (выберите точку назначения)";
        btn.innerHTML = 'Сначала выберите куда';
        btn.classList.add("disabled");
        btn.disabled = true;
    } else if (endPlace) {
        titleElem.textContent = "Выберите откуда";
        descElem.textContent = "(выберите откуда) → До: " + endPlace.name;
        btn.innerHTML = 'Сначала выберите откуда';
        btn.classList.add("disabled");
        btn.disabled = true;
    } else {
        titleElem.textContent = "Выберите две точки";
        descElem.textContent = "Нажмите на первую точку (откуда), затем на вторую (куда)";
        btn.innerHTML = 'Выберите откуда и куда';
        btn.classList.add("disabled");
        btn.disabled = true;
    }
}

function renderMarkers(floor) {
    const container = document.getElementById("markersContainer");
    if (!container) return;
    container.innerHTML = "";

    const imgSize = getImageActualSize();
    if (imgSize.width === 0 || imgSize.height === 0) {
        setTimeout(function() { renderMarkers(floor); }, 100);
        return;
    }

    const filtered = allPlaces.filter(p => p.floor === floor);

    for (const place of filtered) {
        const coords = getPointCoordinates(place);
        if (!coords) continue;

        const marker = document.createElement("div");
        marker.className = "place-marker";
        marker.style.left = coords.x + "px";
        marker.style.top = coords.y + "px";

        let markerColor = "#e74c3c";
        if (startPlace && startPlace.id === place.id) markerColor = "#2ecc71";
        if (endPlace && endPlace.id === place.id) markerColor = "#3498db";
        marker.style.backgroundColor = markerColor;

        marker.addEventListener("click", (function(p) {
            return function() { selectPoint(p); };
        })(place));

        container.appendChild(marker);
    }
}

function selectPoint(place) {
    if (!startPlace) {
        startPlace = place;
        updateInfoCard();
        renderMarkers(appCurrentFloor);
    } else if (!endPlace) {
        if (startPlace.id === place.id) {
            startPlace = null;
            updateInfoCard();
            renderMarkers(appCurrentFloor);
            return;
        }
        endPlace = place;
        updateInfoCard();
        renderMarkers(appCurrentFloor);
    } else {
        startPlace = place;
        endPlace = null;
        currentRouteRoads = [];
        const svg = document.getElementById("routeSvg");
        if (svg) svg.innerHTML = "";
        updateInfoCard();
        renderMarkers(appCurrentFloor);
    }
}

function setCurrentFloor(floor) {
    appCurrentFloor = floor;
    const mapImg = document.getElementById("floorMap");
    if (mapImg) {
        mapImg.src = "img/floor-" + floor + ".png";
        mapImg.onload = function() {
            renderMarkers(appCurrentFloor);
            if (currentRouteRoads.length > 0) {
                renderRouteOnSvg(currentRouteRoads);
            }
        };
        if (mapImg.complete && mapImg.naturalHeight !== 0) {
            renderMarkers(appCurrentFloor);
        }
    }
    const btns = document.querySelectorAll(".floor-btn");
    for (let i = 0; i < btns.length; i++) {
        const btn = btns[i];
        btn.classList.remove("active");
        if (parseInt(btn.dataset.floor) === floor) {
            btn.classList.add("active");
        }
    }
    currentRouteRoads = [];
    const routeSvg = document.getElementById("routeSvg");
    if (routeSvg) routeSvg.innerHTML = "";
    updateInfoCard();
}

function findRouteOnRoads(fromRoadId, toRoadId, roads) {
    const queue = [{ roadId: fromRoadId, path: [fromRoadId] }];
    const visited = new Set();
    while (queue.length > 0) {
        const current = queue.shift();
        if (visited.has(current.roadId)) continue;
        visited.add(current.roadId);
        if (current.roadId === toRoadId) {
            return current.path;
        }
        const road = roads.find(r => r.id === current.roadId);
        if (road && road.connected) {
            for (const nextId of road.connected) {
                if (!visited.has(nextId)) {
                    queue.push({
                        roadId: nextId,
                        path: [...current.path, nextId]
                    });
                }
            }
        }
    }
    return null;
}

function renderRouteOnSvg(routeRoadIds) {
    const svg = document.getElementById("routeSvg");
    if (!svg) return;
    svg.innerHTML = "";

    if (!routeRoadIds || routeRoadIds.length === 0) return;

    const imgSize = getImageActualSize();
    if (imgSize.width === 0 || imgSize.height === 0) return;

    const roads = getRoadsByFloor(appCurrentFloor);
    const drawnSegments = new Set();

    for (let i = 0; i < routeRoadIds.length; i++) {
        const roadId = routeRoadIds[i];
        const road = roads.find(r => r.id === roadId);
        if (!road || !road.points) continue;

        const points = road.points;

        for (let j = 0; j < points.length - 1; j++) {
            const p1 = points[j];
            const p2 = points[j + 1];

            const segmentKey = roadId + "_" + j;
            if (drawnSegments.has(segmentKey)) continue;
            drawnSegments.add(segmentKey);

            const x1 = p1.x * imgSize.width;
            const y1 = p1.y * imgSize.height;
            const x2 = p2.x * imgSize.width;
            const y2 = p2.y * imgSize.height;

            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", x1);
            line.setAttribute("y1", y1);
            line.setAttribute("x2", x2);
            line.setAttribute("y2", y2);
            line.setAttribute("stroke", "#f39c12");
            line.setAttribute("stroke-width", "6");
            line.setAttribute("stroke-linecap", "round");
            svg.appendChild(line);
        }
    }
}

function buildRoute() {
    if (!startPlace || !endPlace) {
        alert("Сначала выберите две точки");
        return;
    }

    if (startPlace.floor !== endPlace.floor) {
        alert("Маршруты между разными этажами пока не поддерживаются");
        return;
    }

    if (appCurrentFloor !== startPlace.floor) {
        setCurrentFloor(startPlace.floor);
        setTimeout(() => buildRoute(), 500);
        return;
    }

    const startRoadId = getRoadIdFromPlace(startPlace);
    const endRoadId = getRoadIdFromPlace(endPlace);

    if (!startRoadId || !endRoadId) {
        alert("Не удалось найти дороги для этих точек");
        return;
    }

    const roads = getRoadsByFloor(startPlace.floor);
    const route = findRouteOnRoads(startRoadId, endRoadId, roads);

    if (!route) {
        alert("Не удалось построить маршрут");
        return;
    }

    currentRouteRoads = route;
    renderRouteOnSvg(currentRouteRoads);

    const descElem = document.getElementById("placeDesc");
    if (descElem) {
        descElem.textContent = "Маршрут построен от " + startPlace.name + " до " + endPlace.name;
    }
}

function filterPlaces(searchText) {
    if (!searchText || searchText.trim() === "") {
        const container = document.getElementById("resultsList");
        if (container) container.style.display = "none";
        return [];
    }
    const lowerQuery = searchText.toLowerCase();
    return allPlaces.filter(p => p.name.toLowerCase().indexOf(lowerQuery) !== -1);
}

function renderSearchResults(results) {
    const container = document.getElementById("resultsList");
    if (results.length === 0) {
        container.style.display = "none";
        return;
    }
    container.style.display = "block";
    let html = "";
    for (const item of results) {
        const typeLabel = getTypeLabel(item.type);
        html += '<div class="result-item" data-id="' + item.id + '">' +
            '<div class="result-name">' + item.name + '</div>' +
            '<div class="result-type">' + typeLabel + ' · Этаж ' + item.floor + '</div>' +
            '</div>';
    }
    container.innerHTML = html;

    const items = container.querySelectorAll(".result-item");
    for (const el of items) {
        el.addEventListener("click", function() {
            const id = parseInt(this.dataset.id);
            const place = allPlaces.find(p => p.id === id);
            if (place) selectPoint(place);
            container.style.display = "none";
        });
    }
}

function addNewPlace() {
    const nameInput = document.getElementById("newName");
    const xInput = document.getElementById("newX");
    const yInput = document.getElementById("newY");
    const floorInput = document.getElementById("newFloor");
    const typeSelect = document.getElementById("newType");

    const newName = nameInput.value.trim();
    const newX = parseFloat(xInput.value.trim());
    const newY = parseFloat(yInput.value.trim());
    const newFloor = parseInt(floorInput.value.trim());
    const newType = typeSelect.value;

    if (!newName || isNaN(newX) || isNaN(newY) || isNaN(newFloor)) {
        alert("Заполните все поля");
        return;
    }

    const newId = Date.now();
    let defaultDesc = "";
    if (newType === "admin") defaultDesc = "Административное здание";
    else if (newType === "food") defaultDesc = "Точка питания";
    else if (newType === "lib") defaultDesc = "Библиотека";
    else if (newType === "room") defaultDesc = "Учебная аудитория";
    else defaultDesc = "Объект инфраструктуры";

    allPlaces.push({
        id: newId,
        name: newName,
        x: newX,
        y: newY,
        center: { x: newX + 0.02, y: newY - 0.01 },
        floor: newFloor,
        type: newType,
        desc: defaultDesc
    });

    renderMarkers(appCurrentFloor);
    nameInput.value = "";
    xInput.value = "";
    yInput.value = "";
    floorInput.value = "";
    document.getElementById("addForm").style.display = "none";
    alert("Место добавлено");
}

window.addEventListener("resize", () => {
    setTimeout(() => {
        renderMarkers(appCurrentFloor);
        if (currentRouteRoads.length > 0) {
            renderRouteOnSvg(currentRouteRoads);
        }
    }, 100);
});

document.addEventListener("deviceready", () => {
    setCurrentFloor(1);
}, false);

window.onload = () => {
    setCurrentFloor(1);

    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            renderSearchResults(filterPlaces(e.target.value));
        });
    }

    const routeBtn = document.getElementById("mainRouteBtn");
    if (routeBtn) {
        routeBtn.addEventListener("click", buildRoute);
    }

    const adminBtn = document.getElementById("adminToggleBtn");
    const addFormDiv = document.getElementById("addForm");
    if (adminBtn && addFormDiv) {
        adminBtn.addEventListener("click", () => {
            addFormDiv.style.display = addFormDiv.style.display === "none" || addFormDiv.style.display === "" ? "flex" : "none";
        });
    }

    const saveBtn = document.getElementById("saveNewBtn");
    if (saveBtn) {
        saveBtn.addEventListener("click", addNewPlace);
    }

    const floorBtns = document.querySelectorAll(".floor-btn");
    for (const btn of floorBtns) {
        btn.addEventListener("click", () => {
            const floor = parseInt(btn.dataset.floor);
            setCurrentFloor(floor);
            startPlace = null;
            endPlace = null;
            currentRouteRoads = [];
            const svg = document.getElementById("routeSvg");
            if (svg) svg.innerHTML = "";
            updateInfoCard();
            renderMarkers(appCurrentFloor);
        });
    }

    document.addEventListener("click", (e) => {
        const resultsDiv = document.getElementById("resultsList");
        const searchBox = document.querySelector(".search-box");
        if (resultsDiv && searchBox && !searchBox.contains(e.target) && !resultsDiv.contains(e.target)) {
            resultsDiv.style.display = "none";
        }
    });
};