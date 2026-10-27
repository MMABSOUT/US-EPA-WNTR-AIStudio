import { WaterNetworkModel, JunctionNode, ReservoirNode, TankNode, PipeLink, PumpLink } from '../types/network';

export function parseInpFile(content: string, name = 'Imported Network'): WaterNetworkModel {
  const lines = content.split(/\r?\n/);
  let currentSection = '';

  const nodes: Record<string, any> = {};
  const links: Record<string, any> = {};
  const coords: Record<string, { x: number; y: number }> = {};
  const patterns: Record<string, { name: string; multipliers: number[] }> = {
    '1': { name: '1', multipliers: [1.0, 1.2, 1.4, 1.6, 1.4, 1.2, 1.0, 0.8, 0.6, 0.4, 0.6, 0.8] },
  };

  for (let rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith(';')) continue;

    if (line.startsWith('[') && line.endsWith(']')) {
      currentSection = line.slice(1, -1).toUpperCase();
      continue;
    }

    const tokens = line.split(/\s+/);
    if (tokens.length < 2) continue;

    switch (currentSection) {
      case 'COORDINATES': {
        const [id, xStr, yStr] = tokens;
        coords[id] = { x: parseFloat(xStr), y: parseFloat(yStr) };
        break;
      }
      case 'JUNCTIONS': {
        const [id, elevStr, demandStr, patternName] = tokens;
        nodes[id] = {
          id,
          type: 'Junction' as const,
          x: 0,
          y: 0,
          elevation: parseFloat(elevStr) || 0,
          baseDemand: (parseFloat(demandStr) || 0) * 0.00006309, // standard GPM to m3/s conversion or raw
          patternName: patternName || '1',
          initialQuality: 0.8,
        };
        break;
      }
      case 'RESERVOIRS': {
        const [id, headStr] = tokens;
        nodes[id] = {
          id,
          type: 'Reservoir' as const,
          x: 0,
          y: 0,
          head: parseFloat(headStr) || 100,
          initialQuality: 1.0,
        };
        break;
      }
      case 'TANKS': {
        const [id, elevStr, initLStr, minLStr, maxLStr, diamStr] = tokens;
        nodes[id] = {
          id,
          type: 'Tank' as const,
          x: 0,
          y: 0,
          elevation: parseFloat(elevStr) || 0,
          initLevel: parseFloat(initLStr) || 3.0,
          minLevel: parseFloat(minLStr) || 1.0,
          maxLevel: parseFloat(maxLStr) || 6.0,
          diameter: parseFloat(diamStr) || 15.0,
          initialQuality: 0.8,
        };
        break;
      }
      case 'PIPES': {
        const [id, startNode, endNode, lenStr, diamStr, roughStr] = tokens;
        links[id] = {
          id,
          type: 'Pipe' as const,
          startNode,
          endNode,
          length: parseFloat(lenStr) || 1000,
          diameter: (parseFloat(diamStr) || 12) * 0.0254, // inches to meters if > 1
          roughness: parseFloat(roughStr) || 100,
          status: 'Open' as const,
        };
        break;
      }
      case 'PUMPS': {
        const [id, startNode, endNode] = tokens;
        links[id] = {
          id,
          type: 'Pump' as const,
          startNode,
          endNode,
          pumpType: 'HeadCurve' as const,
          headCurve: { h0: 75, r: 3000, n: 2 },
          status: 'Open' as const,
          efficiency: 75,
        };
        break;
      }
    }
  }

  // Assign coordinates
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [id, node] of Object.entries(nodes)) {
    if (coords[id]) {
      node.x = coords[id].x;
      node.y = coords[id].y;
    } else {
      // Auto assign layout if no coordinates
      node.x = Math.random() * 80 + 10;
      node.y = Math.random() * 80 + 10;
    }
    minX = Math.min(minX, node.x);
    maxX = Math.max(maxX, node.x);
    minY = Math.min(minY, node.y);
    maxY = Math.max(maxY, node.y);
  }

  // Normalize coordinates to 10..90 scale if large
  if (maxX > 100 || minX < 0 || maxY > 100 || minY < 0) {
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    for (const node of Object.values(nodes) as any[]) {
      node.x = 10 + ((node.x - minX) / rangeX) * 80;
      node.y = 10 + ((node.y - minY) / rangeY) * 80;
    }
  }

  return {
    name,
    description: `User-imported network with ${Object.keys(nodes).length} nodes and ${Object.keys(links).length} links.`,
    options: {
      duration: 86400,
      hydraulicTimestep: 3600,
      demandModel: 'PDD',
      requiredPressure: 15.0,
      minimumPressure: 0.0,
      pressureExponent: 0.5,
      waterQuality: 'Chlorine',
      chlorineDecayCoeff: 0.000005,
    },
    patterns,
    nodes,
    links,
  };
}

export function exportToInpFile(model: WaterNetworkModel): string {
  const lines: string[] = [
    `[TITLE]`,
    `; Water Network Model exported from WNTR React`,
    `; Network: ${model.name}`,
    ``,
    `[JUNCTIONS]`,
    `;ID              Elev        Demand      Pattern`,
  ];

  for (const node of Object.values(model.nodes)) {
    if (node.type === 'Junction') {
      const demandGpm = (node.baseDemand / 0.00006309).toFixed(2);
      lines.push(`${node.id.padEnd(16)} ${node.elevation.toFixed(2).padEnd(11)} ${demandGpm.padEnd(11)} ${node.patternName || '1'}`);
    }
  }

  lines.push(``, `[RESERVOIRS]`, `;ID              Head        Pattern`);
  for (const node of Object.values(model.nodes)) {
    if (node.type === 'Reservoir') {
      lines.push(`${node.id.padEnd(16)} ${node.head.toFixed(2)}`);
    }
  }

  lines.push(``, `[TANKS]`, `;ID              Elev        InitLvl     MinLvl      MaxLvl      Diam        MinVol`);
  for (const node of Object.values(model.nodes)) {
    if (node.type === 'Tank') {
      lines.push(
        `${node.id.padEnd(16)} ${node.elevation.toFixed(2).padEnd(11)} ${node.initLevel.toFixed(2).padEnd(11)} ${node.minLevel.toFixed(2).padEnd(11)} ${node.maxLevel.toFixed(2).padEnd(11)} ${node.diameter.toFixed(2)}`
      );
    }
  }

  lines.push(``, `[PIPES]`, `;ID              Node1           Node2           Length      Diam        Roughness   MinorLoss   Status`);
  for (const link of Object.values(model.links)) {
    if (link.type === 'Pipe') {
      const diamInches = (link.diameter / 0.0254).toFixed(1);
      lines.push(
        `${link.id.padEnd(16)} ${link.startNode.padEnd(15)} ${link.endNode.padEnd(15)} ${link.length.toFixed(1).padEnd(11)} ${diamInches.padEnd(11)} ${link.roughness.toFixed(0).padEnd(11)} 0           ${link.status.toUpperCase()}`
      );
    }
  }

  lines.push(``, `[PUMPS]`, `;ID              Node1           Node2           Parameters`);
  for (const link of Object.values(model.links)) {
    if (link.type === 'Pump') {
      lines.push(`${link.id.padEnd(16)} ${link.startNode.padEnd(15)} ${link.endNode.padEnd(15)} HEAD 1`);
    }
  }

  lines.push(``, `[COORDINATES]`, `;Node            X-Coord         Y-Coord`);
  for (const node of Object.values(model.nodes)) {
    lines.push(`${node.id.padEnd(16)} ${node.x.toFixed(2).padEnd(15)} ${node.y.toFixed(2)}`);
  }

  lines.push(``, `[END]`, ``);
  return lines.join('\n');
}
