let allPlaces = [
    {
        id: 1,
        name: "101",
        floor: 1,
        type: "room",
        x: 0.189,
        y: 0.18,
        center: { x: 0.223, y: 0.183 },
        desc: "Аудитория 101"
    },
    {
        id: 2,
        name: "102",
        floor: 1,
        type: "room",
        x: 0.29,
        y: 0.223,
        center: { x: 0.256, y: 0.206 },
        desc: "Аудитория 102"
    },
    {
        id: 3,
        name: "103",
        floor: 1,
        type: "room",
        x: 0.19,
        y: 0.201,
        center: { x: 0.223, y: 0.203 },
        desc: "Аудитория 103"
    },
    {
        id: 4,
        name: "Столовая",
        floor: 1,
        type: "food",
        x: 0.823,
        y: 0.046,
        center: { x: 0.82, y: 0.531 },
        desc: "Столовая ИРИТ-РТФ"
    },
    {
        id: 5,
        name: "136",
        floor: 1,
        type: "room",
        x: 0.563,
        y: 0.701,
        center: { x: 0.528, y: 0.722 },
        desc: "Аудитория 136"
    },
    {
        id: 6,
        name: "127Т",
        floor: 1,
        type: "room",
        x: 0.092,
        y: 0.752,
        center: { x: 0.0565, y: 0.7535 },
        desc: "Аудитория 127Т"
    }
];

const placeToRoad = {
    1: { roadId: "road_left_1", x: 0.239, y: 0.174 },
    2: { roadId: "road_left_1", x: 0.239, y: 0.174 },
    3: { roadId: "road_left_1", x: 0.239, y: 0.174 },
    4: { roadId: "road_toKitchen_horizontal", x: 0.8234, y: 0.532 },
    5: { roadId: "road_from124_to138_1", x: 0.6804, y: 0.732 },
    6: { roadId: "road_127T_right", x: 0.092, y: 0.752 }
};

const roads1 = [
    {
        id: "road_left_1",
        floor: 1,
        points: [
            { x: 0.239, y: 0.174 },
            { x: 0.239, y: 0.756 }
        ],
        connected: ["road_127T_left"]
    },
    {
        id: "road_127T_left",
        floor: 1,
        points: [
            { x: 0.239, y: 0.756 },
            { x: 0.3489, y: 0.756 }
        ],
        connected: ["road_left_1", "road_to124_1", "road_127T_right"]
    },
    {
        id: "road_127T_right",
        floor: 1,
        points: [
            { x: 0.096, y: 0.756 },
            { x: 0.239, y: 0.756 },
            { x: 0.092, y: 0.752 }
        ],
        connected: ["road_127T_left"]
    },
    {
        id: "road_to124_1",
        floor: 1,
        points: [
            { x: 0.3489, y: 0.756 },
            { x: 0.3489, y: 0.732 }
        ],
        connected: ["road_127T_left", "road_from124_to138_1"]
    },
    {
        id: "road_from124_to138_1",
        floor: 1,
        points: [
            { x: 0.3489, y: 0.732 },
            { x: 0.6804, y: 0.732 }
        ],
        connected: ["road_to124_1", "road_down138_1"]
    },
    {
        id: "road_down138_1",
        floor: 1,
        points: [
            { x: 0.6804, y: 0.732 },
            { x: 0.6804, y: 0.7307 }
        ],
        connected: ["road_from124_to138_1", "road_to135_1"]
    },
    {
        id: "road_to135_1",
        floor: 1,
        points: [
            { x: 0.6804, y: 0.7307 },
            { x: 0.8234, y: 0.7307 }
        ],
        connected: ["road_down138_1", "road_toKitchen_horizontal"]
    },
    {
        id: "road_toKitchen_horizontal",
        floor: 1,
        points: [
            { x: 0.8234, y: 0.7307 },
            { x: 0.8234, y: 0.532 }
        ],
        connected: ["road_to135_1"]
    }
];

const roads0 = [
    {
        id: "road_entry_0",
        floor: 0,
        points: [
            { x: 0.5, y: 0.5 }
        ],
        connected: []
    }
];

const stairs = [];

let currentFloor = 1;
let currentRoute = null;