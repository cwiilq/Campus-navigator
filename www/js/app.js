let startPlace = null;
let endPlace = null;
let currentFloor = 1;
let currentPath = [];
let currentRouteStair = null;
let routeBuilt = false;
let fullRouteData = null;

let scale = 1;
let translateX = 0;
let translateY = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let lastTranslateX = 0;
let lastTranslateY = 0;

function getGrid(floor) {
    if (floor === 1) return floor1Grid;
    if (floor === 2) return floor2Grid;
    return floor3Grid;
}

function isWalkable(grid, x, y, isTarget = false) {
    if (x < 0 || x >= GRID_COLS || y < 0 || y >= GRID_ROWS) return false;
    const val = grid[y][x];
    if (isTarget) return val === 1 || val === 2 || val === 3;
    return val === 1 || val === 2;
}

function leeAlgorithm(grid, startX, startY, targetX, targetY) {
    const queue = [{ x: startX, y: startY, dist: 0 }];
    const visited = Array(GRID_ROWS).fill().map(() => Array(GRID_COLS).fill(false));
    const parent = Array(GRID_ROWS).fill().map(() => Array(GRID_COLS).fill(null));
    visited[startY][startX] = true;
    const dirs = [[0,1],[1,0],[0,-1],[-1,0]];

    while (queue.length > 0) {
        const { x, y, dist } = queue.shift();
        if (x === targetX && y === targetY) {
            const path = [];
            let cx = x, cy = y;
            while (cx !== startX || cy !== startY) {
                path.unshift({ x: cx, y: cy });
                const p = parent[cy][cx];
                cx = p.x;
                cy = p.y;
            }
            path.unshift({ x: startX, y: startY });
            return path;
        }
        for (const [dx, dy] of dirs) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < GRID_COLS && ny >= 0 && ny < GRID_ROWS) {
                if (!visited[ny][nx]) {
                    const isTargetCell = (nx === targetX && ny === targetY);
                    if (isWalkable(grid, nx, ny, isTargetCell)) {
                        visited[ny][nx] = true;
                        parent[ny][nx] = { x, y };
                        queue.push({ x: nx, y: ny, dist: dist + 1 });
                    }
                }
            }
        }
    }

    let closestCell = null;
    let minDist = Infinity;
    for (let y = 0; y < GRID_ROWS; y++) {
        for (let x = 0; x < GRID_COLS; x++) {
            if (isWalkable(grid, x, y, false)) {
                const dist = Math.abs(x - targetX) + Math.abs(y - targetY);
                if (dist < minDist) {
                    minDist = dist;
                    closestCell = { x, y };
                }
            }
        }
    }

    if (closestCell) {
        const pathToNear = leeAlgorithm(grid, startX, startY, closestCell.x, closestCell.y);
        if (pathToNear) {
            pathToNear.push({ x: targetX, y: targetY });
            return pathToNear;
        }
    }

    return null;
}

function getDistance(x1, y1, x2, y2) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

function findBestStair(startX, startY, stairsOnFloor) {
    let bestStair = null;
    let bestDistance = Infinity;
    for (const stair of stairsOnFloor) {
        const dist = getDistance(startX, startY, stair.x, stair.y);
        if (dist < bestDistance) {
            bestDistance = dist;
            bestStair = stair;
        }
    }
    return bestStair;
}

function findPathBetweenFloors(start, target, stairsList) {
    const startFloorGrid = getGrid(start.floor);
    const targetFloorGrid = getGrid(target.floor);
    const startPos = { x: start.x, y: start.y };
    const targetPos = { x: target.x, y: target.y };

    const stairsOnStart = stairsList.filter(s => s.floor === start.floor);
    if (stairsOnStart.length === 0) {
        alert("На этаже отправления нет лестниц");
        return null;
    }

    const bestStartStair = findBestStair(startPos.x, startPos.y, stairsOnStart);
    if (!bestStartStair) return null;

    const startToStair = leeAlgorithm(startFloorGrid, startPos.x, startPos.y, bestStartStair.x, bestStartStair.y);
    if (!startToStair) return null;

    const stairsOnTarget = stairsList.filter(s => s.floor === target.floor);
    if (stairsOnTarget.length === 0) {
        alert("На целевом этаже нет лестниц");
        return null;
    }

    let bestTargetStair = null;
    let minDist = Infinity;

    for (const stair of stairsOnTarget) {
        const distToStartStair = Math.abs(stair.x - bestStartStair.x) + Math.abs(stair.y - bestStartStair.y);
        if (distToStartStair < minDist) {
            minDist = distToStartStair;
            bestTargetStair = stair;
        }
    }

    if (!bestTargetStair) return null;

    const stairToTarget = leeAlgorithm(targetFloorGrid, bestTargetStair.x, bestTargetStair.y, targetPos.x, targetPos.y);
    if (!stairToTarget) return null;

    return {
        path: [...startToStair, ...stairToTarget],
        stairPoint: bestStartStair,
        startPath: startToStair,
        endPath: stairToTarget,
        targetStair: bestTargetStair,
        startFloor: start.floor,
        targetFloor: target.floor
    };
}

function clearRoute() {
    const svg = document.getElementById("routeSvg");
    if (svg) svg.innerHTML = "";
    currentPath = [];
    currentRouteStair = null;
    routeBuilt = false;
    fullRouteData = null;
    const msgContainer = document.getElementById("stairMessageContainer");
    if (msgContainer) msgContainer.style.display = "none";
}

function getMapLayout() {
    const img = document.getElementById("floorMap");
    if (!img || !img.naturalWidth) return null;

    const imgRatio = img.naturalWidth / img.naturalHeight;
    const container = document.getElementById("mapArea");
    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;
    const containerRatio = containerWidth / containerHeight;

    let renderWidth, renderHeight, offsetX = 0, offsetY = 0;

    if (imgRatio > containerRatio) {
        renderWidth = containerWidth;
        renderHeight = containerWidth / imgRatio;
        offsetY = (containerHeight - renderHeight) / 2;
    } else {
        renderHeight = containerHeight;
        renderWidth = containerHeight * imgRatio;
        offsetX = (containerWidth - renderWidth) / 2;
    }

    return {
        offsetX: offsetX,
        offsetY: offsetY,
        width: renderWidth,
        height: renderHeight,
        cellW: renderWidth / GRID_COLS,
        cellH: renderHeight / GRID_ROWS
    };
}

function updateRouteThickness() {
    const lines = document.querySelectorAll("#routeSvg line");
    if (lines.length === 0) return;
    const baseWidth = 5;
    const dynamicWidth = Math.max(1.5, baseWidth / scale);
    for (let i = 0; i < lines.length; i++) {
        lines[i].setAttribute("stroke-width", dynamicWidth);
    }
}

function updateStairMessagePosition() {
    const msgElement = document.getElementById("stairMessageElement");
    if (!msgElement) return;
    if (!fullRouteData || fullRouteData.type !== "cross") return;
    if (currentFloor !== fullRouteData.startFloor) return;

    const stairPoint = fullRouteData.stairPoint;
    if (!stairPoint) return;

    const layout = getMapLayout();
    if (!layout) return;

    const mapX = layout.offsetX + stairPoint.x * layout.cellW;
    const mapY = layout.offsetY + stairPoint.y * layout.cellH;

    const screenX = mapX * scale + translateX;
    const screenY = mapY * scale + translateY;

    msgElement.style.left = screenX + "px";
    msgElement.style.top = screenY + "px";
    msgElement.style.transform = "translate(-50%, -100%)";
}

function updateTransform() {
    const wrapper = document.querySelector(".map-wrapper");
    if (wrapper) {
        wrapper.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`;
    }

    updateRouteThickness();
    updateStairMessagePosition();
}

function initPositions() {
    renderMarkers(currentFloor);
    if (routeBuilt && fullRouteData) {
        if (fullRouteData.type === "same") {
            if (fullRouteData.startFloor === currentFloor) {
                drawPathOnCanvas(fullRouteData.path);
            } else {
                const svg = document.getElementById("routeSvg");
                if (svg) svg.innerHTML = "";
            }
        } else if (fullRouteData.type === "cross") {
            if (currentFloor === fullRouteData.startFloor && fullRouteData.startPath) {
                drawPathOnCanvas(fullRouteData.startPath);
                const msgContainer = document.getElementById("stairMessageContainer");
                if (msgContainer) msgContainer.style.display = "none";
                showStairMessage(fullRouteData.stairPoint, fullRouteData.startFloor, fullRouteData.endFloor);
            } else if (currentFloor === fullRouteData.endFloor && fullRouteData.endPath) {
                drawPathOnCanvas(fullRouteData.endPath);
                const msgContainer = document.getElementById("stairMessageContainer");
                if (msgContainer) msgContainer.style.display = "none";
            } else {
                const svg = document.getElementById("routeSvg");
                if (svg) svg.innerHTML = "";
                const msgContainer = document.getElementById("stairMessageContainer");
                if (msgContainer) msgContainer.style.display = "none";
            }
        }
    }
}

function drawPathOnCanvas(path) {
    const svg = document.getElementById("routeSvg");
    if (!svg) return;
    svg.innerHTML = "";
    if (!path || path.length === 0) return;

    const layout = getMapLayout();
    if (!layout) return;

    for (let i = 0; i < path.length - 1; i++) {
        const p1 = path[i];
        const p2 = path[i + 1];
        const x1 = layout.offsetX + p1.x * layout.cellW;
        const y1 = layout.offsetY + p1.y * layout.cellH;
        const x2 = layout.offsetX + p2.x * layout.cellW;
        const y2 = layout.offsetY + p2.y * layout.cellH;

        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", x1);
        line.setAttribute("y1", y1);
        line.setAttribute("x2", x2);
        line.setAttribute("y2", y2);
        line.setAttribute("stroke", "#f39c12");
        line.setAttribute("stroke-linecap", "round");
        line.setAttribute("vector-effect", "non-scaling-stroke");
        svg.appendChild(line);
    }

    updateRouteThickness();
}

function showStairMessage(stairPoint, startFloor, targetFloor) {
    const container = document.getElementById("stairMessageContainer");
    if (!container) return;

    const oldMsg = document.getElementById("stairMessageElement");
    if (oldMsg) oldMsg.remove();

    const layout = getMapLayout();
    if (!layout) return;

    const mapX = layout.offsetX + stairPoint.x * layout.cellW;
    const mapY = layout.offsetY + stairPoint.y * layout.cellH;

    const screenX = mapX * scale + translateX;
    const screenY = mapY * scale + translateY;

    const direction = targetFloor > startFloor ? "↑ Поднимитесь" : "↓ Спуститесь";
    const messageText = direction + " на " + targetFloor + " этаж";

    const messageDiv = document.createElement("div");
    messageDiv.id = "stairMessageElement";
    messageDiv.className = "stair-message";
    messageDiv.textContent = messageText;
    messageDiv.style.left = screenX + "px";
    messageDiv.style.top = screenY + "px";

    container.appendChild(messageDiv);
    container.style.display = "block";
}

function buildRoute() {
    const svgClear = document.getElementById("routeSvg");
    if (svgClear) svgClear.innerHTML = "";

    if (!startPlace || !endPlace) {
        alert("Сначала выберите две точки");
        return;
    }

    clearRoute();

    const routeBtn = document.getElementById("mainRouteBtn");

    if (startPlace.floor === endPlace.floor) {
        const grid = getGrid(startPlace.floor);
        const path = leeAlgorithm(grid, startPlace.x, startPlace.y, endPlace.x, endPlace.y);
        if (!path) {
            alert("Не удалось построить маршрут");
            return;
        }
        currentPath = path;
        currentRouteStair = null;
        routeBuilt = true;
        fullRouteData = {
            type: "same",
            path: path,
            startFloor: startPlace.floor,
            endFloor: endPlace.floor
        };
        if (currentFloor === startPlace.floor) {
            drawPathOnCanvas(currentPath);
        }
        const descElem = document.getElementById("placeDesc");
        if (descElem) {
            descElem.textContent = "Маршрут построен от " + startPlace.name + " до " + endPlace.name;
        }
        if (routeBtn) {
            routeBtn.innerHTML = "Маршрут построен";
            routeBtn.style.background = "#6c757d";
            routeBtn.style.color = "#ffffff";
            routeBtn.disabled = true;
        }
    } else {
        const result = findPathBetweenFloors(startPlace, endPlace, stairs);
        if (!result) {
            alert("Не удалось построить маршрут между этажами");
            return;
        }
        currentPath = result.path;
        currentRouteStair = result.stairPoint;
        routeBuilt = true;
        fullRouteData = {
            type: "cross",
            startPath: result.startPath,
            endPath: result.endPath,
            stairPoint: result.stairPoint,
            startFloor: startPlace.floor,
            endFloor: endPlace.floor
        };

        if (currentFloor === startPlace.floor) {
            drawPathOnCanvas(result.startPath);
            showStairMessage(result.stairPoint, startPlace.floor, endPlace.floor);
        } else if (currentFloor === endPlace.floor) {
            drawPathOnCanvas(result.endPath);
        }

        const descElem = document.getElementById("placeDesc");
        if (descElem) {
            descElem.textContent = "Маршрут от " + startPlace.name + " до " + endPlace.name + " построен";
        }
        if (routeBtn) {
            routeBtn.innerHTML = "Маршрут построен";
            routeBtn.style.background = "#6c757d";
            routeBtn.style.color = "#ffffff";
            routeBtn.disabled = true;
        }
    }
    updateTransform();
}

function resetRouteButton() {
    const routeBtn = document.getElementById("mainRouteBtn");
    if (routeBtn) {
        routeBtn.innerHTML = "Построить маршрут";
        routeBtn.style.background = "#1a2a3a";
        routeBtn.style.color = "#ffffff";
        routeBtn.disabled = false;
    }
}

function selectPoint(place) {
    if (routeBuilt) {
        clearRoute();
        routeBuilt = false;
        startPlace = null;
        endPlace = null;
        resetRouteButton();
        const titleElem = document.querySelector(".place-title");
        titleElem.textContent = "Выберите две точки";
        const descElem = document.getElementById("placeDesc");
        descElem.textContent = "Нажмите на первую точку (откуда), затем на вторую (куда)";
        initPositions();
    }

    if (!startPlace) {
        startPlace = place;
        updateInfoCard();
        initPositions();
        if (place.floor !== currentFloor) {
            setCurrentFloor(place.floor);
        }
        const titleElem = document.querySelector(".place-title");
        titleElem.textContent = "Откуда: " + place.name;
        const descElem = document.getElementById("placeDesc");
        descElem.textContent = "Теперь выберите вторую точку (куда)";
    } else if (!endPlace) {
        if (startPlace.id === place.id) {
            startPlace = null;
            updateInfoCard();
            initPositions();
            const titleElem = document.querySelector(".place-title");
            titleElem.textContent = "Выберите две точки";
            const descElem = document.getElementById("placeDesc");
            descElem.textContent = "Нажмите на первую точку (откуда), затем на вторую (куда)";
            return;
        }
        endPlace = place;
        updateInfoCard();
        initPositions();
        if (place.floor !== currentFloor) {
            setCurrentFloor(place.floor);
        }
        const titleElem = document.querySelector(".place-title");
        titleElem.textContent = startPlace.name + " → " + endPlace.name;
        const descElem = document.getElementById("placeDesc");
        descElem.textContent = "Нажмите «Построить маршрут»";
    } else {
        startPlace = place;
        endPlace = null;
        clearRoute();
        resetRouteButton();
        updateInfoCard();
        initPositions();
        if (place.floor !== currentFloor) {
            setCurrentFloor(place.floor);
        }
        const titleElem = document.querySelector(".place-title");
        titleElem.textContent = "Откуда: " + place.name;
        const descElem = document.getElementById("placeDesc");
        descElem.textContent = "Теперь выберите вторую точку (куда)";
    }
}

function updateInfoCard() {
    const titleElem = document.querySelector(".place-title");
    const descElem = document.getElementById("placeDesc");
    const btn = document.getElementById("mainRouteBtn");
    if (!titleElem || !descElem || !btn) return;
    if (startPlace && endPlace) {
        titleElem.textContent = startPlace.name + " → " + endPlace.name;
        descElem.textContent = "Нажмите «Построить маршрут»";
        btn.innerHTML = "Построить маршрут";
        btn.disabled = false;
        btn.style.background = "#1a2a3a";
        btn.style.color = "#ffffff";
    } else if (startPlace) {
        titleElem.textContent = "Откуда: " + startPlace.name;
        descElem.textContent = "Выберите вторую точку";
        btn.innerHTML = "Выберите куда";
        btn.disabled = true;
        btn.style.background = "#94a3b8";
        btn.style.color = "#ffffff";
    } else if (endPlace) {
        titleElem.textContent = "Куда: " + endPlace.name;
        descElem.textContent = "Выберите первую точку";
        btn.innerHTML = "Выберите откуда";
        btn.disabled = true;
        btn.style.background = "#94a3b8";
        btn.style.color = "#ffffff";
    } else {
        titleElem.textContent = "Выберите две точки";
        descElem.textContent = "Нажмите на первую точку (откуда), затем на вторую (куда)";
        btn.innerHTML = "Выберите откуда и куда";
        btn.disabled = true;
        btn.style.background = "#94a3b8";
        btn.style.color = "#ffffff";
    }
}

function renderMarkers(floor) {
    const container = document.getElementById("markersContainer");
    if (!container) return;
    container.innerHTML = "";

    const layout = getMapLayout();
    if (!layout) return;

    const filtered = allPlaces.filter(p => p.floor === floor);

    for (const place of filtered) {
        const cx = layout.offsetX + place.x * layout.cellW;
        const cy = layout.offsetY + place.y * layout.cellH;
        const marker = document.createElement("div");
        marker.className = "place-marker";
        marker.style.left = cx + "px";
        marker.style.top = cy + "px";

        let markerColor = "#3b82f6";
        if (startPlace && startPlace.id === place.id) markerColor = "#2ecc71";
        if (endPlace && endPlace.id === place.id) markerColor = "#f39c12";
        marker.style.backgroundColor = markerColor;

        marker.addEventListener("click", (function(p) {
            return function() { selectPoint(p); };
        })(place));

        container.appendChild(marker);
    }
}

function setCurrentFloor(floor) {
    currentFloor = floor;
    const mapImg = document.getElementById("floorMap");
    if (mapImg) {
        mapImg.src = "img/floor-" + floor + ".svg";
        mapImg.onload = function() {
            scale = 1;
            translateX = 0;
            translateY = 0;
            updateTransform();
            initPositions();
        };
        if (mapImg.complete && mapImg.naturalWidth > 0) {
            scale = 1;
            translateX = 0;
            translateY = 0;
            updateTransform();
            initPositions();
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
    updateInfoCard();

    if (fullRouteData && fullRouteData.type === "cross") {
        if (currentFloor !== fullRouteData.startFloor) {
            const msgContainer = document.getElementById("stairMessageContainer");
            if (msgContainer) msgContainer.style.display = "none";
        } else if (fullRouteData.stairPoint) {
            updateStairMessagePosition();
            const msgContainer = document.getElementById("stairMessageContainer");
            if (msgContainer) msgContainer.style.display = "block";
        }
    }
}

function searchPlaces(searchText) {
    if (!searchText || searchText.trim() === "") {
        document.getElementById("resultsList").style.display = "none";
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
        let typeLabel = "";
        if (item.type === "room") typeLabel = "Аудитория";
        else if (item.type === "food") typeLabel = "Столовая";
        else if (item.type === "lib") typeLabel = "Библиотека";
        else if (item.type === "service") typeLabel = "Служебное";
        else typeLabel = "Объект";
        html += '<div class="result-item" data-id="' + item.id + '" data-floor="' + item.floor + '">' +
            '<div class="result-name">' + item.name + '</div>' +
            '<div class="result-type">' + typeLabel + " · Этаж " + item.floor + '</div>' +
            '</div>';
    }
    container.innerHTML = html;

    const items = container.querySelectorAll(".result-item");
    for (const el of items) {
        el.addEventListener("click", function() {
            const id = parseFloat(this.dataset.id);
            const targetFloor = parseInt(this.dataset.floor);
            const place = allPlaces.find(p => p.id === id);

            if (!place) return;

            const searchInput = document.getElementById("searchInput");
            if (searchInput) searchInput.value = "";
            container.style.display = "none";

            if (routeBuilt) {
                clearRoute();
                routeBuilt = false;
                startPlace = null;
                endPlace = null;
                resetRouteButton();
                updateInfoCard();
                initPositions();
            }

            function doSelect() {
                if (startPlace === null) {
                    startPlace = place;
                    updateInfoCard();
                    renderMarkers(currentFloor);
                    const titleElem = document.querySelector(".place-title");
                    titleElem.textContent = "Откуда: " + place.name;
                    const descElem = document.getElementById("placeDesc");
                    descElem.textContent = "Теперь выберите вторую точку (куда)";
                } else if (endPlace === null) {
                    if (startPlace.id === place.id) {
                        startPlace = null;
                        updateInfoCard();
                        renderMarkers(currentFloor);
                        const titleElem = document.querySelector(".place-title");
                        titleElem.textContent = "Выберите две точки";
                        const descElem = document.getElementById("placeDesc");
                        descElem.textContent = "Нажмите на первую точку (откуда), затем на вторую (куда)";
                        return;
                    }
                    endPlace = place;
                    updateInfoCard();
                    renderMarkers(currentFloor);
                    const titleElem = document.querySelector(".place-title");
                    titleElem.textContent = startPlace.name + " → " + endPlace.name;
                    const descElem = document.getElementById("placeDesc");
                    descElem.textContent = "Нажмите «Построить маршрут»";
                } else {
                    startPlace = place;
                    endPlace = null;
                    clearRoute();
                    resetRouteButton();
                    updateInfoCard();
                    renderMarkers(currentFloor);
                    const titleElem = document.querySelector(".place-title");
                    titleElem.textContent = "Откуда: " + place.name;
                    const descElem = document.getElementById("placeDesc");
                    descElem.textContent = "Теперь выберите вторую точку (куда)";
                }
                initPositions();
            }

            if (currentFloor !== targetFloor) {
                setCurrentFloor(targetFloor);
                setTimeout(function() {
                    doSelect();
                }, 300);
            } else {
                doSelect();
            }
        });
    }
}

let initialDistance = 0;
let lastScale = 1;
let initialTranslateX = 0;
let initialTranslateY = 0;

function getDistanceTouch(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

function onTouchStart(e) {
    if (e.touches.length === 2) {
        e.preventDefault();
        initialDistance = getDistanceTouch(e.touches);
        lastScale = scale;
        initialTranslateX = translateX;
        initialTranslateY = translateY;
        isDragging = false;
    } else if (e.touches.length === 1) {
        isDragging = true;
        dragStartX = e.touches[0].clientX;
        dragStartY = e.touches[0].clientY;
        lastTranslateX = translateX;
        lastTranslateY = translateY;
    }
}

function onTouchMove(e) {
    if (e.touches.length === 2) {
        e.preventDefault();
        const newDistance = getDistanceTouch(e.touches);
        const newScale = Math.min(5, Math.max(1, lastScale * (newDistance / initialDistance)));

        const mapArea = document.getElementById("mapArea");
        const rect = mapArea.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const newTranslateX = (initialTranslateX - centerX) * (newScale / lastScale) + centerX;
        const newTranslateY = (initialTranslateY - centerY) * (newScale / lastScale) + centerY;

        scale = newScale;
        translateX = newTranslateX;
        translateY = newTranslateY;

        updateTransform();
    } else if (e.touches.length === 1 && isDragging) {
        e.preventDefault();
        const dx = e.touches[0].clientX - dragStartX;
        const dy = e.touches[0].clientY - dragStartY;
        translateX = lastTranslateX + dx;
        translateY = lastTranslateY + dy;
        updateTransform();
    }
}

function onTouchEnd(e) {
    isDragging = false;
}

function onMouseDown(e) {
    e.preventDefault();
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    lastTranslateX = translateX;
    lastTranslateY = translateY;

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
}

function onMouseMove(e) {
    if (!isDragging) return;
    e.preventDefault();
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    translateX = lastTranslateX + dx;
    translateY = lastTranslateY + dy;
    updateTransform();
}

function onMouseUp(e) {
    isDragging = false;
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
}

function onWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.95 : 1.05;
    const newScale = Math.min(5, Math.max(1, scale * delta));

    const mapArea = document.getElementById("mapArea");
    const rect = mapArea.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newTranslateX = mouseX - (mouseX - translateX) * (newScale / scale);
    const newTranslateY = mouseY - (mouseY - translateY) * (newScale / scale);

    scale = newScale;
    translateX = newTranslateX;
    translateY = newTranslateY;

    updateTransform();
}

window.addEventListener("resize", function() {
    setTimeout(function() {
        initPositions();
    }, 100);
});

document.addEventListener("deviceready", function() {
    setCurrentFloor(1);
}, false);

window.onload = function() {
    setCurrentFloor(1);

    const mapArea = document.getElementById("mapArea");
    if (mapArea) {
        mapArea.addEventListener("touchstart", onTouchStart, { passive: false });
        mapArea.addEventListener("touchmove", onTouchMove, { passive: false });
        mapArea.addEventListener("touchend", onTouchEnd);
        mapArea.addEventListener("mousedown", onMouseDown);
        mapArea.addEventListener("wheel", onWheel, { passive: false });
    }

    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("input", function(e) {
            const results = searchPlaces(e.target.value);
            renderSearchResults(results);
        });
    }
    const routeBtn = document.getElementById("mainRouteBtn");
    if (routeBtn) {
        routeBtn.addEventListener("click", buildRoute);
    }
    const floorBtns = document.querySelectorAll(".floor-btn");
    for (const btn of floorBtns) {
        btn.addEventListener("click", function() {
            const floor = parseInt(this.dataset.floor);
            setCurrentFloor(floor);
        });
    }
    document.addEventListener("click", function(e) {
        const resultsDiv = document.getElementById("resultsList");
        const searchBox = document.querySelector(".search-box");
        if (resultsDiv && searchBox && !searchBox.contains(e.target) && !resultsDiv.contains(e.target)) {
            resultsDiv.style.display = "none";
        }
    });
};