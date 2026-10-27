import {
  WaterNetworkModel,
  SimulationResults,
  TimeStepResult,
  NodeStepResult,
  LinkStepResult,
  DisasterScenario,
  PipeCriticalityItem,
  PipeLink,
} from '../types/network';

const G = 9.81; // m/s^2
const WATER_DENSITY = 1000; // kg/m^3

// Hazen-Williams headloss calculation
export function calculateHeadloss(lengthM: number, diameterM: number, roughnessC: number, flowM3s: number): number {
  if (Math.abs(flowM3s) < 1e-9) return 0;
  const sign = Math.sign(flowM3s);
  const qAbs = Math.abs(flowM3s);
  // Headloss (m) = 10.67 * L * Q^1.852 / (C^1.852 * D^4.87)
  const hf = 10.67 * lengthM * Math.pow(qAbs, 1.852) / (Math.pow(roughnessC, 1.852) * Math.pow(diameterM, 4.87));
  return sign * hf;
}

// Orifice leak equation: Q = Cd * A * sqrt(2 * g * P)
export function calculateLeakFlow(areaM2: number, pressureM: number, cd = 0.75): number {
  if (pressureM <= 0 || areaM2 <= 0) return 0;
  return cd * areaM2 * Math.sqrt(2 * G * pressureM);
}

// Wagner PDD formula
export function calculatePddDemand(
  requestedDemandM3s: number,
  pressureM: number,
  pMin: number,
  pReq: number,
  exponent = 0.5
): number {
  if (requestedDemandM3s <= 0) return 0;
  if (pressureM <= pMin) return 0;
  if (pressureM >= pReq) return requestedDemandM3s;
  const ratio = (pressureM - pMin) / (pReq - pMin);
  return requestedDemandM3s * Math.pow(ratio, exponent);
}

export function runSimulation(
  baseModel: WaterNetworkModel,
  scenario?: DisasterScenario
): SimulationResults {
  // Deep clone model to avoid mutating baseModel during simulation
  const model: WaterNetworkModel = JSON.parse(JSON.stringify(baseModel));
  const { options, nodes, links, patterns } = model;
  const duration = options.duration;
  const dt = options.hydraulicTimestep;
  const numSteps = Math.floor(duration / dt);

  // Initialize tank states
  const tankLevels: Record<string, number> = {};
  for (const [id, node] of Object.entries(nodes)) {
    if (node.type === 'Tank') {
      tankLevels[id] = node.initLevel;
    }
  }

  // Pre-apply scenario modifications
  const brokenPipes = new Set<string>();
  const leakingPipes: Record<string, number> = {}; // pipeId -> leakAreaM2

  if (scenario && scenario.type !== 'none') {
    if (scenario.type === 'pipe_break' && scenario.params.pipeId) {
      const area = (scenario.params.leakAreaMm2 || 2500) * 1e-6; // convert mm2 to m2
      leakingPipes[scenario.params.pipeId] = area;
    } else if (scenario.type === 'earthquake' && scenario.params.pgaG) {
      // Fragility curve logic based on PGA (g)
      const pga = scenario.params.pgaG;
      // American Lifelines Alliance (ALA) repair rate per km = a * PGA^b
      // Higher PGA leads to break rate
      const repairRatePerKm = 0.00187 * Math.pow(pga * 980, 1.2); // empirical ALA relation
      for (const [linkId, link] of Object.entries(links)) {
        if (link.type === 'Pipe') {
          const lengthKm = link.length / 1000;
          const expectedRepairs = repairRatePerKm * lengthKm;
          const probBreak = 1 - Math.exp(-expectedRepairs);
          // Deterministic seed simulation based on pipeId string
          const pseudoRand = (linkId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 100) / 100;
          if (probBreak > 0.4 && pseudoRand < 0.6) {
            brokenPipes.add(linkId);
          } else if (probBreak > 0.15) {
            leakingPipes[linkId] = 0.005; // 5000 mm2 fissure
          }
        }
      }
    }
  }

  const timesteps: TimeStepResult[] = [];

  for (let step = 0; step <= numSteps; step++) {
    const tSeconds = step * dt;
    const hourOfDay = (tSeconds / 3600) % 24;
    const patternIdx = Math.floor(hourOfDay) % 24;

    // Get current demand multiplier from pattern '1' or default 1.0
    const mult = patterns['1']?.multipliers[patternIdx] ?? 1.0;

    // Check scenario timing
    const isScenarioActive = (startHour?: number, durHours?: number) => {
      if (startHour === undefined) return true;
      const startS = startHour * 3600;
      const endS = startS + (durHours !== undefined ? durHours * 3600 : 86400 * 10);
      return tSeconds >= startS && tSeconds <= endS;
    };

    // Pump outage check
    const isPumpOutage =
      scenario?.type === 'power_outage' &&
      isScenarioActive(scenario.params.outageStartHour, scenario.params.outageDurationHours);

    // Contamination check
    const isContaminationActive =
      scenario?.type === 'contamination' &&
      isScenarioActive(scenario.params.startTimeHour, scenario.params.durationHours);

    // Solve hydraulics for this time-step
    // Step A: Determine Heads at Fixed Boundary Nodes (Reservoirs & Tanks)
    const nodeHeads: Record<string, number> = {};
    for (const [id, node] of Object.entries(nodes)) {
      if (node.type === 'Reservoir') {
        nodeHeads[id] = node.head;
      } else if (node.type === 'Tank') {
        nodeHeads[id] = node.elevation + tankLevels[id];
      }
    }

    // Step B: Calculate Junction Demands and Fire Flow
    const requestedDemands: Record<string, number> = {};
    for (const [id, node] of Object.entries(nodes)) {
      if (node.type === 'Junction') {
        let req = node.baseDemand * mult;
        if (
          scenario?.type === 'fire_flow' &&
          scenario.params.nodeId === id &&
          isScenarioActive(scenario.params.startTimeHour, scenario.params.durationHours)
        ) {
          // Convert fireFlow GPM to m3/s (1 GPM = 0.00006309 m3/s)
          const fireM3s = (scenario.params.fireFlowGPM || 2000) * 0.00006309;
          req += fireM3s;
        }
        requestedDemands[id] = req;
      }
    }

    // Step C: Flow balance & Pressure iteration (Hardy Cross / Newton relaxation)
    // Estimate initial heads for junctions based on nearest source head and topological distance
    const junctionIds = Object.keys(nodes).filter((id) => nodes[id].type === 'Junction');
    for (const jId of junctionIds) {
      if (nodeHeads[jId] === undefined) {
        nodeHeads[jId] = 235.0; // Initial guess in elevation range
      }
    }

    // Iterative equilibrium relaxation for network headloss
    const linkFlows: Record<string, number> = {};
    const linkVelocities: Record<string, number> = {};
    const linkHeadloss: Record<string, number> = {};
    const linkEnergies: Record<string, number> = {};
    const linkStatuses: Record<string, any> = {};

    // Run convergence iterations
    const maxIter = 12;
    for (let iter = 0; iter < maxIter; iter++) {
      // Calculate link flows based on head differential
      for (const [lId, link] of Object.entries(links)) {
        const u = link.startNode;
        const v = link.endNode;
        const hu = nodeHeads[u] ?? 230;
        const hv = nodeHeads[v] ?? 230;

        if (link.type === 'Pump') {
          if (isPumpOutage || link.status === 'Closed') {
            linkFlows[lId] = 0;
            linkVelocities[lId] = 0;
            linkHeadloss[lId] = 0;
            linkEnergies[lId] = 0;
            linkStatuses[lId] = 'Closed';
          } else {
            // Pump head curve: H = h0 - r * Q^2  => Q = sqrt(max(0, (h0 - (hv - hu)) / r))
            const h0 = link.headCurve?.h0 ?? 75;
            const r = link.headCurve?.r ?? 3000;
            const headDiff = hv - hu;
            let qPump = 0;
            if (headDiff < h0) {
              qPump = Math.sqrt(Math.max(0, (h0 - headDiff) / r));
            } else {
              qPump = 0.001; // minimal bleed
            }
            // Clamp pump flow to nominal capacity
            qPump = Math.min(qPump, 0.25);
            linkFlows[lId] = qPump;
            linkVelocities[lId] = qPump / (Math.PI * Math.pow(0.35 / 2, 2));
            linkHeadloss[lId] = -(h0 - r * Math.pow(qPump, 2)); // energy added
            // Power: P (kW) = gamma * Q * H / efficiency
            const pumpHead = Math.max(0, h0 - r * Math.pow(qPump, 2));
            linkEnergies[lId] = (WATER_DENSITY * G * qPump * pumpHead) / (0.75 * 1000);
            linkStatuses[lId] = 'Open';
          }
          continue;
        }

        // Pipe link
        if (brokenPipes.has(lId) || link.status === 'Closed') {
          linkFlows[lId] = 0;
          linkVelocities[lId] = 0;
          linkHeadloss[lId] = 0;
          linkEnergies[lId] = 0;
          linkStatuses[lId] = brokenPipes.has(lId) ? 'Broken' : 'Closed';
          continue;
        }

        const deltaH = hu - hv;
        const sign = Math.sign(deltaH);
        const absDeltaH = Math.abs(deltaH);

        // Hazen-Williams inverted: Q = sign * [ (DeltaH * C^1.852 * D^4.87) / (10.67 * L) ]^(1/1.852)
        const C = link.type === 'Pipe' ? link.roughness : 100;
        const D = link.type === 'Pipe' ? link.diameter : 0.3;
        const L = link.type === 'Pipe' ? Math.max(link.length, 10) : 10;

        const denom = 10.67 * L;
        const numer = absDeltaH * Math.pow(C, 1.852) * Math.pow(D, 4.87);
        let q = sign * Math.pow(Math.max(0, numer / denom), 1 / 1.852);

        // Clamp to physical ranges
        if (isNaN(q)) q = 0;
        linkFlows[lId] = q;
        const area = Math.PI * Math.pow(D / 2, 2);
        linkVelocities[lId] = Math.abs(q) / area;
        linkHeadloss[lId] = deltaH;
        linkEnergies[lId] = 0;
        linkStatuses[lId] = leakingPipes[lId] ? 'Leaking' : 'Open';
      }

      // Update junction heads based on node continuity
      for (const jId of junctionIds) {
        let netInflow = 0;
        let flowConductance = 0;

        for (const [lId, link] of Object.entries(links)) {
          if (link.startNode === jId) {
            netInflow -= linkFlows[lId] || 0;
            flowConductance += 0.0008;
          } else if (link.endNode === jId) {
            netInflow += linkFlows[lId] || 0;
            flowConductance += 0.0008;
          }
        }

        const jNode = nodes[jId];
        const jElev = jNode && jNode.type !== 'Reservoir' ? jNode.elevation : 200;

        // Leak at junction or adjacent link
        let leakRate = 0;
        for (const [lId, leakArea] of Object.entries(leakingPipes)) {
          const l = links[lId];
          if (l && (l.startNode === jId || l.endNode === jId)) {
            const pressM = Math.max(0, nodeHeads[jId] - jElev);
            leakRate += calculateLeakFlow(leakArea, pressM) * 0.5;
          }
        }

        const press = Math.max(0, nodeHeads[jId] - jElev);
        let actualD = requestedDemands[jId] || 0;
        if (options.demandModel === 'PDD') {
          actualD = calculatePddDemand(
            actualD,
            press,
            options.minimumPressure,
            options.requiredPressure,
            options.pressureExponent
          );
        }

        const deficit = netInflow - actualD - leakRate;
        // Relax node head
        const stepSize = 0.35 / Math.max(0.0005, flowConductance);
        nodeHeads[jId] += Math.max(-5, Math.min(5, deficit * stepSize));
      }
    }

    // Step D: Calculate final node metrics (Pressure, actual demand, quality)
    const nodeResults: Record<string, NodeStepResult> = {};
    let totalRequestedDemand = 0;
    let totalDeliveredDemand = 0;
    let totalLeakage = 0;
    let nodesUnderPressure = 0;

    for (const [id, node] of Object.entries(nodes)) {
      const elev = node.type === 'Reservoir' ? node.head : node.elevation;
      const head = nodeHeads[id] ?? elev;
      const pressure = node.type === 'Reservoir' ? 0 : Math.max(-20, head - elev);

      let reqD = 0;
      let actD = 0;
      let leakD = 0;

      if (node.type === 'Junction') {
        reqD = requestedDemands[id] || 0;
        if (options.demandModel === 'PDD') {
          actD = calculatePddDemand(
            reqD,
            pressure,
            options.minimumPressure,
            options.requiredPressure,
            options.pressureExponent
          );
        } else {
          actD = reqD;
        }

        // Check leaks on adjacent links
        for (const [lId, leakArea] of Object.entries(leakingPipes)) {
          const l = links[lId];
          if (l && (l.startNode === id || l.endNode === id)) {
            leakD += calculateLeakFlow(leakArea, Math.max(0, pressure)) * 0.5;
          }
        }

        totalRequestedDemand += reqD;
        totalDeliveredDemand += actD;
        totalLeakage += leakD;

        if (pressure < options.requiredPressure && reqD > 0) {
          nodesUnderPressure++;
        }
      }

      // Water quality / Chlorine decay or water age
      let quality = node.initialQuality || 1.0;
      if (options.waterQuality === 'Chlorine') {
        // First order bulk decay: C(t) = C0 * exp(-k * t)
        const decayK = options.chlorineDecayCoeff;
        quality = Math.max(0.05, quality * Math.exp(-decayK * tSeconds));
      } else if (options.waterQuality === 'WaterAge') {
        quality = (tSeconds / 3600) * 0.8 + (id.charCodeAt(0) % 5);
      }

      // If contamination scenario injected at this node
      if (
        isContaminationActive &&
        scenario?.params.contaminantNodeId === id
      ) {
        quality = scenario.params.contaminantConcentration || 5.0; // High toxin concentration
      }

      nodeResults[id] = {
        demand: actD,
        expectedDemand: reqD,
        head,
        pressure,
        quality,
        leakDemand: leakD,
      };
    }

    // Step E: Update Tank Levels for next time-step
    let totalTankPct = 0;
    let tankCount = 0;

    for (const [id, node] of Object.entries(nodes)) {
      if (node.type === 'Tank') {
        tankCount++;
        // Calculate net inflow to tank
        let netInflow = 0;
        for (const [lId, link] of Object.entries(links)) {
          if (link.endNode === id) netInflow += linkFlows[lId] || 0;
          if (link.startNode === id) netInflow -= linkFlows[lId] || 0;
        }

        const tankArea = Math.PI * Math.pow(node.diameter / 2, 2);
        const deltaLevel = (netInflow * dt) / tankArea;
        const newLevel = Math.max(node.minLevel, Math.min(node.maxLevel, tankLevels[id] + deltaLevel));
        tankLevels[id] = newLevel;

        const capacityPct = ((newLevel - node.minLevel) / (node.maxLevel - node.minLevel)) * 100;
        totalTankPct += capacityPct;
      }
    }

    const avgTankAutonomy = tankCount > 0 ? totalTankPct / tankCount : 100;
    const wsa = totalRequestedDemand > 0 ? Math.min(100, Math.max(0, (totalDeliveredDemand / totalRequestedDemand) * 100)) : 100;

    // Todini Resilience Index calculation:
    // Ir = (Pout - Pexp) / (Pin - Pexp)
    let pOut = 0;
    let pExp = 0;
    let pInRes = 0;
    let pInPump = 0;

    for (const [id, node] of Object.entries(nodes)) {
      if (node.type === 'Junction') {
        const nr = nodeResults[id];
        pOut += nr.demand * nr.head;
        pExp += nr.demand * ((node.elevation || 0) + options.requiredPressure);
      } else if (node.type === 'Reservoir') {
        const outFlow = Object.entries(links)
          .filter(([_, l]) => l.startNode === id)
          .reduce((sum, [lId]) => sum + (linkFlows[lId] || 0), 0);
        pInRes += outFlow * node.head;
      }
    }

    for (const [lId, link] of Object.entries(links)) {
      if (link.type === 'Pump' && linkFlows[lId] > 0) {
        const hl = Math.abs(linkHeadloss[lId] || 0);
        pInPump += linkFlows[lId] * hl;
      }
    }

    const todiniDenom = pInRes + pInPump - pExp;
    const todiniIndex = todiniDenom !== 0 ? Math.max(0, Math.min(1, (pOut - pExp) / todiniDenom)) : 0.65;
    const mri = pExp > 0 ? (pOut - pExp) / pExp : 0.5;

    // Total pumping energy for this step in kWh = sum(kW * (dt/3600))
    const totalPumpKw = Object.values(linkEnergies).reduce((acc, kw) => acc + kw, 0);
    const stepPumpKWh = totalPumpKw * (dt / 3600);

    const linkStepResults: Record<string, LinkStepResult> = {};
    for (const [lId, link] of Object.entries(links)) {
      linkStepResults[lId] = {
        flow: linkFlows[lId] || 0,
        velocity: linkVelocities[lId] || 0,
        headloss: linkHeadloss[lId] || 0,
        status: linkStatuses[lId] || 'Open',
        energyKW: linkEnergies[lId] || 0,
      };
    }

    timesteps.push({
      time: tSeconds,
      nodes: nodeResults,
      links: linkStepResults,
      systemDemandRequested: totalRequestedDemand,
      systemDemandDelivered: totalDeliveredDemand,
      systemLeakage: totalLeakage,
      wsa,
      todiniIndex,
      mri,
      populationImpacted: nodesUnderPressure,
      tankAutonomyPercent: avgTankAutonomy,
      pumpingEnergyKWh: stepPumpKWh,
    });
  }

  // Calculate overall summary metrics
  const totalWaterSupplied = timesteps.reduce((acc, t) => acc + t.systemDemandDelivered * dt, 0);
  const totalWaterLost = timesteps.reduce((acc, t) => acc + t.systemLeakage * dt, 0);
  const avgWsa = timesteps.reduce((acc, t) => acc + t.wsa, 0) / timesteps.length;
  const minWsa = Math.min(...timesteps.map((t) => t.wsa));
  const maxPop = Math.max(...timesteps.map((t) => t.populationImpacted));
  const avgTodini = timesteps.reduce((acc, t) => acc + t.todiniIndex, 0) / timesteps.length;
  const totalPumpEnergy = timesteps.reduce((acc, t) => acc + t.pumpingEnergyKWh, 0);

  // Critical deficit nodes: junctions with lowest avg pressure
  const junctionIds = Object.keys(nodes).filter((id) => nodes[id].type === 'Junction');
  const junctionAvgPressures = junctionIds.map((id) => {
    const avgP = timesteps.reduce((acc, t) => acc + (t.nodes[id]?.pressure || 0), 0) / timesteps.length;
    return { id, avgP };
  });
  junctionAvgPressures.sort((a, b) => a.avgP - b.avgP);
  const criticalDeficitNodes = junctionAvgPressures.slice(0, 3).map((item) => item.id);

  return {
    networkName: model.name,
    timesteps,
    summary: {
      averageWSA: Math.round(avgWsa * 10) / 10,
      minWSA: Math.round(minWsa * 10) / 10,
      totalWaterSuppliedM3: Math.round(totalWaterSupplied),
      totalWaterLostM3: Math.round(totalWaterLost),
      maxPopulationImpacted: maxPop,
      averageTodini: Math.round(avgTodini * 100) / 100,
      totalPumpEnergyKWh: Math.round(totalPumpEnergy * 10) / 10,
      criticalDeficitNodes,
    },
  };
}

// Pipe Criticality Analysis Sweep: runs simulations closing one pipe at a time
export function runCriticalityAnalysis(model: WaterNetworkModel): PipeCriticalityItem[] {
  const baselineResults = runSimulation(model);
  const baseAvgWsa = baselineResults.summary.averageWSA;

  const pipeLinks = Object.entries(model.links).filter(([_, l]) => l.type === 'Pipe') as [string, PipeLink][];
  const criticalityList: PipeCriticalityItem[] = [];

  for (const [pId, pipe] of pipeLinks) {
    // Clone and close pipe
    const clonedModel: WaterNetworkModel = JSON.parse(JSON.stringify(model));
    clonedModel.links[pId].status = 'Closed';

    const testResults = runSimulation(clonedModel);
    const testAvgWsa = testResults.summary.averageWSA;
    const wsaDrop = Math.max(0, baseAvgWsa - testAvgWsa);
    const nodesUnderPress = testResults.summary.maxPopulationImpacted;
    const demandDeficit = Math.max(
      0,
      baselineResults.summary.totalWaterSuppliedM3 - testResults.summary.totalWaterSuppliedM3
    );

    criticalityList.push({
      pipeId: pId,
      diameterMm: Math.round(pipe.diameter * 1000),
      lengthM: Math.round(pipe.length),
      wsaDropPercent: Math.round(wsaDrop * 10) / 10,
      nodesUnderPressure: nodesUnderPress,
      demandDeficitM3: Math.round(demandDeficit),
      criticalityRank: 0,
    });
  }

  // Sort by highest WSA drop, then highest demand deficit
  criticalityList.sort((a, b) => b.wsaDropPercent - a.wsaDropPercent || b.demandDeficitM3 - a.demandDeficitM3);
  criticalityList.forEach((item, idx) => {
    item.criticalityRank = idx + 1;
  });

  return criticalityList;
}
