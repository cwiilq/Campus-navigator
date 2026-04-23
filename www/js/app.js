let currentSelectedPlace = null;

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
        titleElem.textContent = typeLabel + " · " + place.name;
        descElem.textContent = place.desc;
        btn.innerHTML = '<span class="route-icon"></span> Построить маршрут';
        btn.classList.remove("disabled");
        btn.disabled = false;
        currentSelectedPlace = place;
    } else {
        titleElem.textContent = "Не выбрано";
        descElem.textContent = "Нажмите на здание на карте или найдите в поиске";
        btn.innerHTML = '<span class="route-icon"></span> Выберите точку назначения';
        btn.classList.add("disabled");
        btn.disabled = true;
        currentSelectedPlace = null;
    }
}

function setCurrentFloor(floor) {
    currentFloor = floor;
    document.getElementById("floorMap").src = "img/floor-" + floor + ".png";
    document.querySelectorAll(".floor-btn").forEach(btn => {
        btn.classList.remove("active");
        if (btn.dataset.floor === floor.toString()) {
            btn.classList.add("active");
        }
    });
    updateInfoCard(null);
}

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
        html += '<div class="result-item" data-id="' + item.id + '">' +
            '<div class="result-name">' + item.name + '</div>' +
            '<div class="result-type">' + typeText + ' · ' + item.desc.substring(0, 50) + '</div>' +
            '</div>';
    }
    container.innerHTML = html;

    container.querySelectorAll(".result-item").forEach(el => {
        el.addEventListener("click", function() {
            const id = parseInt(this.dataset.id);
            const place = allPlaces.find(p => p.id === id);
            if (place) {
                currentSelectedPlace = place;
                updateInfoCard(place);
                document.getElementById("resultsList").style.display = "none";
                const searchInput = document.getElementById("searchInput");
                if (searchInput) searchInput.value = place.name;
                if (place.floor !== currentFloor) {
                    setCurrentFloor(place.floor);
                }
            }
        });
    });
}

function buildRouteToPlace() {
    if (!currentSelectedPlace) return;
    const desc = document.querySelector(".place-desc");
    const originalText = desc.textContent;
    desc.textContent = "Маршрут в данном режиме не доступен — используйте GPS‑навигацию на телефоне";
    setTimeout(() => {
        if (currentSelectedPlace) {
            desc.textContent = currentSelectedPlace.desc;
        } else {
            desc.textContent = originalText;
        }
    }, 3000);
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

    if (!newName) {
        alert("Введите название");
        return;
    }
    if (isNaN(newX) || isNaN(newY)) {
        alert("Введите корректные координаты X и Y");
        return;
    }
    if (isNaN(newFloor) || newFloor < 0 || newFloor > 4) {
        alert("Введите этаж от 0 до 4");
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
        x: newX,
        y: newY,
        floor: newFloor,
        type: newType,
        desc: defaultDesc
    };

    allPlaces.push(newPlace);

    nameInput.value = "";
    xInput.value = "";
    yInput.value = "";
    floorInput.value = "";

    document.getElementById("addForm").style.display = "none";
    alert("Место добавлено");
}

document.addEventListener("deviceready", function() {
    setCurrentFloor(0);

    window.addEventListener("resize", function() {
        const img = document.getElementById("floorMap");
        img.style.objectFit = "cover";
    });
}, false);

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

    document.querySelectorAll(".floor-btn").forEach(btn => {
        btn.addEventListener("click", function() {
            const floor = parseInt(btn.dataset.floor);
            setCurrentFloor(floor);
        });
    });
};