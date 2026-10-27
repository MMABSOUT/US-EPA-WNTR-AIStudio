import { WaterNetworkModel } from '../types/network';

export const NET1_MODEL: WaterNetworkModel = {
  name: 'Net1 (EPA Standard)',
  description: 'Classic EPA 9-junction distribution system with 1 reservoir, 1 elevated storage tank, 1 pump, and 12 pipes.',
  options: {
    duration: 86400, // 24 hours
    hydraulicTimestep: 3600, // 1 hour
    demandModel: 'PDD',
    requiredPressure: 15.0, // meters (~21 psi)
    minimumPressure: 0.0,
    pressureExponent: 0.5,
    waterQuality: 'Chlorine',
    chlorineDecayCoeff: 0.000005, // 1/s
  },
  patterns: {
    '1': {
      name: '1',
      multipliers: [1.0, 1.2, 1.4, 1.6, 1.4, 1.2, 1.0, 0.8, 0.6, 0.4, 0.6, 0.8, 1.0, 1.2, 1.5, 1.6, 1.5, 1.3, 1.1, 0.9, 0.7, 0.5, 0.7, 0.9],
    },
  },
  nodes: {
    '9': {
      id: '9',
      type: 'Reservoir',
      x: 10,
      y: 70,
      head: 121.92, // 400 ft
      initialQuality: 1.0, // mg/L chlorine
    },
    '2': {
      id: '2',
      type: 'Tank',
      x: 50,
      y: 90,
      elevation: 259.08, // 850 ft
      initLevel: 3.65,
      minLevel: 3.05,
      maxLevel: 6.10,
      diameter: 15.24, // 50 ft
      initialQuality: 0.8,
    },
    '10': {
      id: '10',
      type: 'Junction',
      x: 20,
      y: 70,
      elevation: 216.4,
      baseDemand: 0.0,
      patternName: '1',
      initialQuality: 0.9,
    },
    '11': {
      id: '11',
      type: 'Junction',
      x: 30,
      y: 70,
      elevation: 216.4,
      baseDemand: 0.00946, // ~150 GPM
      patternName: '1',
      initialQuality: 0.85,
    },
    '12': {
      id: '12',
      type: 'Junction',
      x: 50,
      y: 70,
      elevation: 213.36,
      baseDemand: 0.00946, // ~150 GPM
      patternName: '1',
      initialQuality: 0.8,
    },
    '13': {
      id: '13',
      type: 'Junction',
      x: 70,
      y: 70,
      elevation: 211.84,
      baseDemand: 0.00631, // ~100 GPM
      patternName: '1',
      initialQuality: 0.75,
    },
    '21': {
      id: '21',
      type: 'Junction',
      x: 30,
      y: 40,
      elevation: 213.36,
      baseDemand: 0.00946, // ~150 GPM
      patternName: '1',
      initialQuality: 0.8,
    },
    '22': {
      id: '22',
      type: 'Junction',
      x: 50,
      y: 40,
      elevation: 211.84,
      baseDemand: 0.01262, // ~200 GPM
      patternName: '1',
      initialQuality: 0.75,
    },
    '23': {
      id: '23',
      type: 'Junction',
      x: 70,
      y: 40,
      elevation: 210.31,
      baseDemand: 0.00946, // ~150 GPM
      patternName: '1',
      initialQuality: 0.7,
    },
    '31': {
      id: '31',
      type: 'Junction',
      x: 30,
      y: 10,
      elevation: 213.36,
      baseDemand: 0.00631, // ~100 GPM
      patternName: '1',
      initialQuality: 0.7,
    },
    '32': {
      id: '32',
      type: 'Junction',
      x: 50,
      y: 10,
      elevation: 210.31,
      baseDemand: 0.00631, // ~100 GPM
      patternName: '1',
      initialQuality: 0.65,
    },
  },
  links: {
    'Pump-9': {
      id: 'Pump-9',
      type: 'Pump',
      startNode: '9',
      endNode: '10',
      pumpType: 'HeadCurve',
      headCurve: {
        h0: 76.2, // 250 ft shutoff head
        r: 3950.0,
        n: 2.0,
      },
      status: 'Open',
      efficiency: 75,
    },
    '10': {
      id: '10',
      type: 'Pipe',
      startNode: '10',
      endNode: '11',
      length: 3209.5,
      diameter: 0.4572, // 18 in
      roughness: 100,
      status: 'Open',
    },
    '11': {
      id: '11',
      type: 'Pipe',
      startNode: '11',
      endNode: '12',
      length: 1609.3,
      diameter: 0.3556, // 14 in
      roughness: 100,
      status: 'Open',
    },
    '12': {
      id: '12',
      type: 'Pipe',
      startNode: '12',
      endNode: '13',
      length: 1609.3,
      diameter: 0.254, // 10 in
      roughness: 100,
      status: 'Open',
    },
    '21': {
      id: '21',
      type: 'Pipe',
      startNode: '21',
      endNode: '22',
      length: 1609.3,
      diameter: 0.254, // 10 in
      roughness: 100,
      status: 'Open',
    },
    '22': {
      id: '22',
      type: 'Pipe',
      startNode: '22',
      endNode: '23',
      length: 1609.3,
      diameter: 0.3048, // 12 in
      roughness: 100,
      status: 'Open',
    },
    '31': {
      id: '31',
      type: 'Pipe',
      startNode: '31',
      endNode: '32',
      length: 1609.3,
      diameter: 0.1524, // 6 in
      roughness: 100,
      status: 'Open',
    },
    '110': {
      id: '110',
      type: 'Pipe',
      startNode: '2',
      endNode: '12',
      length: 60.96, // 200 ft tank connector
      diameter: 0.4572, // 18 in
      roughness: 100,
      status: 'Open',
    },
    '111': {
      id: '111',
      type: 'Pipe',
      startNode: '11',
      endNode: '21',
      length: 1609.3,
      diameter: 0.254, // 10 in
      roughness: 100,
      status: 'Open',
    },
    '112': {
      id: '112',
      type: 'Pipe',
      startNode: '12',
      endNode: '22',
      length: 1609.3,
      diameter: 0.3048, // 12 in
      roughness: 100,
      status: 'Open',
    },
    '113': {
      id: '113',
      type: 'Pipe',
      startNode: '13',
      endNode: '23',
      length: 1609.3,
      diameter: 0.2032, // 8 in
      roughness: 100,
      status: 'Open',
    },
    '121': {
      id: '121',
      type: 'Pipe',
      startNode: '21',
      endNode: '31',
      length: 1609.3,
      diameter: 0.2032, // 8 in
      roughness: 100,
      status: 'Open',
    },
    '122': {
      id: '122',
      type: 'Pipe',
      startNode: '22',
      endNode: '32',
      length: 1609.3,
      diameter: 0.1524, // 6 in
      roughness: 100,
      status: 'Open',
    },
  },
};

export const NET2_MODEL: WaterNetworkModel = {
  name: 'Net2 (Dual Zone Loop)',
  description: 'Branched and looped 16-node network with high elevation gradient and multiple redundant loops for resilience analysis.',
  options: {
    duration: 86400,
    hydraulicTimestep: 3600,
    demandModel: 'PDD',
    requiredPressure: 16.0,
    minimumPressure: 0.0,
    pressureExponent: 0.5,
    waterQuality: 'Chlorine',
    chlorineDecayCoeff: 0.000006,
  },
  patterns: {
    '1': {
      name: '1',
      multipliers: [0.8, 0.9, 1.2, 1.5, 1.3, 1.1, 1.0, 0.9, 0.7, 0.6, 0.8, 1.1, 1.3, 1.6, 1.4, 1.2, 1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.6, 0.7],
    },
  },
  nodes: {
    'Source': { id: 'Source', type: 'Reservoir', x: 5, y: 50, head: 110.0, initialQuality: 1.2 },
    'TankA': { id: 'TankA', type: 'Tank', x: 45, y: 85, elevation: 230.0, initLevel: 4.2, minLevel: 2.5, maxLevel: 6.5, diameter: 20.0, initialQuality: 0.9 },
    'TankB': { id: 'TankB', type: 'Tank', x: 85, y: 20, elevation: 220.0, initLevel: 3.8, minLevel: 2.0, maxLevel: 5.5, diameter: 18.0, initialQuality: 0.85 },
    'J1': { id: 'J1', type: 'Junction', x: 18, y: 50, elevation: 190.0, baseDemand: 0.005, patternName: '1', initialQuality: 1.1 },
    'J2': { id: 'J2', type: 'Junction', x: 32, y: 68, elevation: 198.0, baseDemand: 0.012, patternName: '1', initialQuality: 0.95 },
    'J3': { id: 'J3', type: 'Junction', x: 32, y: 32, elevation: 192.0, baseDemand: 0.014, patternName: '1', initialQuality: 0.95 },
    'J4': { id: 'J4', type: 'Junction', x: 50, y: 50, elevation: 205.0, baseDemand: 0.018, patternName: '1', initialQuality: 0.85 },
    'J5': { id: 'J5', type: 'Junction', x: 45, y: 72, elevation: 202.0, baseDemand: 0.008, patternName: '1', initialQuality: 0.9 },
    'J6': { id: 'J6', type: 'Junction', x: 68, y: 68, elevation: 200.0, baseDemand: 0.015, patternName: '1', initialQuality: 0.8 },
    'J7': { id: 'J7', type: 'Junction', x: 68, y: 32, elevation: 195.0, baseDemand: 0.016, patternName: '1', initialQuality: 0.8 },
    'J8': { id: 'J8', type: 'Junction', x: 82, y: 50, elevation: 192.0, baseDemand: 0.011, patternName: '1', initialQuality: 0.75 },
    'J9': { id: 'J9', type: 'Junction', x: 85, y: 35, elevation: 190.0, baseDemand: 0.009, patternName: '1', initialQuality: 0.8 },
    'J10': { id: 'J10', type: 'Junction', x: 50, y: 15, elevation: 188.0, baseDemand: 0.010, patternName: '1', initialQuality: 0.85 },
  },
  links: {
    'PumpMain': { id: 'PumpMain', type: 'Pump', startNode: 'Source', endNode: 'J1', pumpType: 'HeadCurve', headCurve: { h0: 85.0, r: 2800.0, n: 2.0 }, status: 'Open', efficiency: 78 },
    'P1': { id: 'P1', type: 'Pipe', startNode: 'J1', endNode: 'J2', length: 1800, diameter: 0.40, roughness: 110, status: 'Open' },
    'P2': { id: 'P2', type: 'Pipe', startNode: 'J1', endNode: 'J3', length: 1800, diameter: 0.40, roughness: 110, status: 'Open' },
    'P3': { id: 'P3', type: 'Pipe', startNode: 'J2', endNode: 'J5', length: 1200, diameter: 0.35, roughness: 110, status: 'Open' },
    'P4': { id: 'P4', type: 'Pipe', startNode: 'J5', endNode: 'TankA', length: 300, diameter: 0.40, roughness: 120, status: 'Open' },
    'P5': { id: 'P5', type: 'Pipe', startNode: 'J2', endNode: 'J4', length: 1600, diameter: 0.30, roughness: 100, status: 'Open' },
    'P6': { id: 'P6', type: 'Pipe', startNode: 'J3', endNode: 'J4', length: 1600, diameter: 0.30, roughness: 100, status: 'Open' },
    'P7': { id: 'P7', type: 'Pipe', startNode: 'J3', endNode: 'J10', length: 1500, diameter: 0.25, roughness: 100, status: 'Open' },
    'P8': { id: 'P8', type: 'Pipe', startNode: 'J4', endNode: 'J6', length: 1700, diameter: 0.30, roughness: 100, status: 'Open' },
    'P9': { id: 'P9', type: 'Pipe', startNode: 'J4', endNode: 'J7', length: 1700, diameter: 0.30, roughness: 100, status: 'Open' },
    'P10': { id: 'P10', type: 'Pipe', startNode: 'J5', endNode: 'J6', length: 1900, diameter: 0.25, roughness: 100, status: 'Open' },
    'P11': { id: 'P11', type: 'Pipe', startNode: 'J6', endNode: 'J8', length: 1500, diameter: 0.25, roughness: 100, status: 'Open' },
    'P12': { id: 'P12', type: 'Pipe', startNode: 'J7', endNode: 'J8', length: 1500, diameter: 0.25, roughness: 100, status: 'Open' },
    'P13': { id: 'P13', type: 'Pipe', startNode: 'J7', endNode: 'J9', length: 1200, diameter: 0.25, roughness: 100, status: 'Open' },
    'P14': { id: 'P14', type: 'Pipe', startNode: 'J9', endNode: 'TankB', length: 250, diameter: 0.35, roughness: 120, status: 'Open' },
    'P15': { id: 'P15', type: 'Pipe', startNode: 'J10', endNode: 'J7', length: 2000, diameter: 0.20, roughness: 95, status: 'Open' },
  },
};

export const BUILTIN_NETWORKS: Record<string, WaterNetworkModel> = {
  'Net1': NET1_MODEL,
  'Net2': NET2_MODEL,
};
