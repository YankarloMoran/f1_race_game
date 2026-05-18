// Centralized track definitions for all circuits
// Each track defines: spline points, width, name, country, colors, AI brake zones

export const TRACKS = {
  monza: {
    id: 'monza',
    name: 'Autodromo Nazionale di Monza',
    country: 'Italia 🇮🇹',
    flag: '🇮🇹',
    description: 'El Templo de la Velocidad',
    width: 18,
    laps: 3,
    startZ: 70,
    accentColor: 0xe63946,
    points: [
      [0,0,-60],[0,0,60],[0,0,200],[10,0,230],[-5,0,250],[35,0,300],
      [100,0,330],[160,0,290],[170,0,220],[170,0,170],[155,0,150],
      [175,0,130],[190,0,90],[205,0,50],[190,0,10],[165,0,-20],
      [100,0,-70],[30,0,-110],[-20,0,-140],[-65,0,-130],[-90,0,-100],
      [-120,0,-70],[-150,0,-10],[-170,0,50],[-180,0,100],[-140,0,135],
      [-70,0,110],[-30,0,30]
    ],
    aiBreakZones: [
      { tStart: 0.06, tEnd: 0.12, speedFactor: 0.4 },
      { tStart: 0.28, tEnd: 0.35, speedFactor: 0.5 },
      { tStart: 0.42, tEnd: 0.50, speedFactor: 0.45 },
      { tStart: 0.60, tEnd: 0.68, speedFactor: 0.35 },
      { tStart: 0.80, tEnd: 0.88, speedFactor: 0.55 }
    ]
  },

  spa: {
    id: 'spa',
    name: 'Circuit de Spa-Francorchamps',
    country: 'Bélgica 🇧🇪',
    flag: '🇧🇪',
    description: 'Eau Rouge y las Ardenas',
    width: 17,
    laps: 3,
    startZ: 60,
    accentColor: 0xffb703,
    points: [
      [0,0,-50],[0,0,60],[0,0,180],[-15,0,220],[-40,0,250],
      [-30,2,280],[-10,5,320],[20,8,340],[50,6,330],[80,3,300],
      [120,0,260],[150,0,210],[180,0,170],[200,0,120],[210,0,60],
      [200,0,0],[180,0,-50],[150,0,-90],[110,0,-120],[60,0,-140],
      [20,0,-150],[-30,0,-140],[-80,0,-120],[-120,0,-80],
      [-140,0,-30],[-130,0,20],[-100,0,50],[-60,0,30],[-30,0,0]
    ],
    aiBreakZones: [
      { tStart: 0.05, tEnd: 0.10, speedFactor: 0.35 },
      { tStart: 0.25, tEnd: 0.32, speedFactor: 0.6 },
      { tStart: 0.45, tEnd: 0.52, speedFactor: 0.45 },
      { tStart: 0.62, tEnd: 0.70, speedFactor: 0.4 },
      { tStart: 0.82, tEnd: 0.90, speedFactor: 0.5 }
    ]
  },

  monaco: {
    id: 'monaco',
    name: 'Circuit de Monaco',
    country: 'Mónaco 🇲🇨',
    flag: '🇲🇨',
    description: 'Las calles más famosas del mundo',
    width: 13,
    laps: 3,
    startZ: 50,
    accentColor: 0xc1121f,
    points: [
      [0,0,-40],[0,0,40],[0,0,100],[8,0,130],[20,0,150],
      [40,0,155],[60,0,140],[75,0,110],[80,0,80],[85,0,50],
      [90,0,20],[100,0,-10],[110,0,-30],[115,0,-60],[105,0,-85],
      [85,0,-100],[60,0,-105],[35,0,-100],[15,0,-90],[0,0,-80],
      [-15,0,-95],[-35,0,-110],[-55,0,-105],[-70,0,-85],
      [-80,0,-55],[-75,0,-25],[-60,0,0],[-40,0,10],[-20,0,0]
    ],
    aiBreakZones: [
      { tStart: 0.04, tEnd: 0.10, speedFactor: 0.3 },
      { tStart: 0.18, tEnd: 0.25, speedFactor: 0.3 },
      { tStart: 0.35, tEnd: 0.42, speedFactor: 0.35 },
      { tStart: 0.50, tEnd: 0.58, speedFactor: 0.3 },
      { tStart: 0.65, tEnd: 0.72, speedFactor: 0.35 },
      { tStart: 0.82, tEnd: 0.90, speedFactor: 0.4 }
    ]
  },

  silverstone: {
    id: 'silverstone',
    name: 'Silverstone Circuit',
    country: 'Reino Unido 🇬🇧',
    flag: '🇬🇧',
    description: 'La cuna del automovilismo',
    width: 18,
    laps: 3,
    startZ: 60,
    accentColor: 0x00b4d8,
    points: [
      [0,0,-50],[0,0,60],[0,0,180],[20,0,220],[50,0,240],
      [90,0,235],[130,0,210],[160,0,170],[175,0,130],[170,0,80],
      [150,0,40],[120,0,10],[100,0,-20],[110,0,-60],[130,0,-90],
      [140,0,-130],[120,0,-160],[80,0,-170],[40,0,-165],[0,0,-155],
      [-40,0,-140],[-70,0,-110],[-90,0,-70],[-100,0,-30],
      [-95,0,10],[-75,0,40],[-45,0,30],[-20,0,0]
    ],
    aiBreakZones: [
      { tStart: 0.05, tEnd: 0.12, speedFactor: 0.5 },
      { tStart: 0.22, tEnd: 0.30, speedFactor: 0.55 },
      { tStart: 0.42, tEnd: 0.48, speedFactor: 0.45 },
      { tStart: 0.55, tEnd: 0.62, speedFactor: 0.4 },
      { tStart: 0.75, tEnd: 0.85, speedFactor: 0.5 }
    ]
  },

  suzuka: {
    id: 'suzuka',
    name: 'Suzuka International Racing Course',
    country: 'Japón 🇯🇵',
    flag: '🇯🇵',
    description: 'La legendaria figura de 8',
    width: 16,
    laps: 3,
    startZ: 60,
    accentColor: 0xff7b00,
    points: [
      [0,0,-50],[0,0,60],[0,0,170],[15,0,210],[40,0,230],
      [70,0,220],[95,0,190],[110,0,150],[115,0,110],[105,0,70],
      [80,0,40],[50,0,20],[20,0,10],[-10,0,20],[-40,0,50],
      [-65,0,80],[-80,0,120],[-85,0,160],[-75,0,195],[-50,0,210],
      [-20,0,200],[0,0,180],[10,0,150],[5,0,110],[-10,0,70],
      [-30,0,30],[-40,0,-10],[-35,0,-50],[-15,0,-70]
    ],
    aiBreakZones: [
      { tStart: 0.05, tEnd: 0.12, speedFactor: 0.45 },
      { tStart: 0.20, tEnd: 0.28, speedFactor: 0.5 },
      { tStart: 0.38, tEnd: 0.45, speedFactor: 0.4 },
      { tStart: 0.55, tEnd: 0.62, speedFactor: 0.45 },
      { tStart: 0.72, tEnd: 0.80, speedFactor: 0.4 },
      { tStart: 0.88, tEnd: 0.95, speedFactor: 0.5 }
    ]
  }
};

export const TRACK_LIST = Object.keys(TRACKS);
