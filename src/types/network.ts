export type NodeType = 'Junction' | 'Reservoir' | 'Tank';
export type LinkType = 'Pipe' | 'Pump' | 'Valve';
export type LinkStatus = 'Open' | 'Closed' | 'CV' | 'Leaking' | 'Broken';
export type DemandModelType = 'DDA' | 'PDD';

export interface JunctionNode {
  id: string;
  type: 'Junction';
  x: number;
  y: number;
  elevation: number; // meters
  baseDemand: number; // m3/s or L/s
  patternName?: string;
  emitterCoeff?: number;
  initialQuality?: number; // mg/L (e.g. Chlorine)
  leakArea?: number; // m2
  leakDischargeCoeff?: number;
  hasFireDemand?: boolean;
  fireDemand?: number; // m3/s
  fireStart?: number; // seconds
  fireEnd?: number; // seconds
}

export interface ReservoirNode {
  id: string;
  type: 'Reservoir';
  x: number;
  y: number;
  head: number; // meters
  initialQuality?: number;
}

export interface TankNode {
  id: string;
  type: 'Tank';
  x: number;
  y: number;
  elevation: number; // meters
  initLevel: number; // meters above elevation
  minLevel: number; // meters
  maxLevel: number; // meters
  diameter: number; // meters
  minVolume?: number;
  initialQuality?: number;
}

export type NetworkNode = JunctionNode | ReservoirNode | TankNode;

export interface PipeLink {
  id: string;
  type: 'Pipe';
  startNode: string;
  endNode: string;
  length: number; // meters
  diameter: number; // meters
  roughness: number; // Hazen-Williams C
  status: LinkStatus;
  minorLoss?: number;
  leakArea?: number; // m2
  leakTimeStart?: number; // seconds
  leakTimeEnd?: number;
  isIsolated?: boolean;
}

export interface PumpLink {
  id: string;
  type: 'Pump';
  startNode: string;
  endNode: string;
  pumpType: 'Power' | 'HeadCurve';
  power?: number; // kW
  headCurve?: {
    h0: number; // shutoff head (m)
    r: number;  // flow coefficient
    n: number;  // exponent
  };
  status: 'Open' | 'Closed';
  efficiency?: number; // e.g. 75%
  outageStart?: number; // seconds
  outageEnd?: number;
}

export interface ValveLink {
  id: string;
  type: 'Valve';
  startNode: string;
  endNode: string;
  valveType: 'PRV' | 'PSV' | 'PBV' | 'FCV' | 'TCV';
  setting: number;
  status: 'Open' | 'Closed' | 'Active';
}

export type NetworkLink = PipeLink | PumpLink | ValveLink;

export interface Pattern {
  name: string;
  multipliers: number[]; // typically 12 or 24 multipliers
}

export interface SimulationOptions {
  duration: number; // total duration in seconds (e.g., 86400 for 24h)
  hydraulicTimestep: number; // seconds (e.g. 3600 for 1h)
  demandModel: DemandModelType;
  requiredPressure: number; // meters (e.g. 15m ~= 21.3 psi)
  minimumPressure: number; // meters (e.g. 0m)
  pressureExponent: number; // typically 0.5 (Wagner model)
  waterQuality: 'None' | 'Chlorine' | 'WaterAge';
  chlorineDecayCoeff: number; // 1/day or 1/s (bulk decay)
}

export interface WaterNetworkModel {
  name: string;
  description: string;
  nodes: Record<string, NetworkNode>;
  links: Record<string, NetworkLink>;
  patterns: Record<string, Pattern>;
  options: SimulationOptions;
}

// Hydraulic Simulation Time-step Results
export interface NodeStepResult {
  demand: number; // m3/s actual delivered
  expectedDemand: number; // m3/s requested
  head: number; // meters
  pressure: number; // meters
  quality: number; // mg/L or hours
  leakDemand: number; // m3/s lost to leak
}

export interface LinkStepResult {
  flow: number; // m3/s
  velocity: number; // m/s
  headloss: number; // meters
  status: LinkStatus;
  energyKW: number; // kW used by pumps
}

export interface TimeStepResult {
  time: number; // seconds
  nodes: Record<string, NodeStepResult>;
  links: Record<string, LinkStepResult>;
  systemDemandRequested: number;
  systemDemandDelivered: number;
  systemLeakage: number;
  wsa: number; // Water Service Availability (0 to 100%)
  todiniIndex: number;
  mri: number; // Modified Resilience Index
  populationImpacted: number; // Count of nodes with pressure < required
  tankAutonomyPercent: number; // Average tank storage capacity
  pumpingEnergyKWh: number;
}

export interface SimulationResults {
  networkName: string;
  timesteps: TimeStepResult[];
  summary: {
    averageWSA: number;
    minWSA: number;
    totalWaterSuppliedM3: number;
    totalWaterLostM3: number;
    maxPopulationImpacted: number;
    averageTodini: number;
    totalPumpEnergyKWh: number;
    criticalDeficitNodes: string[];
  };
}

export interface DisasterScenario {
  id: string;
  type: 'none' | 'pipe_break' | 'fire_flow' | 'earthquake' | 'power_outage' | 'contamination';
  name: string;
  description: string;
  params: {
    pipeId?: string;
    leakAreaMm2?: number; // mm^2
    startTimeHour?: number;
    durationHours?: number;
    nodeId?: string;
    fireFlowGPM?: number;
    pgaG?: number; // Peak Ground Acceleration in g (0.1 to 0.8)
    outageStartHour?: number;
    outageDurationHours?: number;
    contaminantNodeId?: string;
    contaminantConcentration?: number; // mg/L
  };
}

export interface PipeCriticalityItem {
  pipeId: string;
  diameterMm: number;
  lengthM: number;
  wsaDropPercent: number;
  nodesUnderPressure: number;
  demandDeficitM3: number;
  criticalityRank: number;
}
