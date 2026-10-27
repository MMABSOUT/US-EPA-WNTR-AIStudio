# WNTR - Water Network Tool for Resilience (React)

An interactive, high-performance web application ported from the EPA & Sandia National Laboratories **Water Network Tool for Resilience (WNTR)** Python framework.

This application provides hydraulic network simulation, disaster scenario stress testing, resilience evaluation, and vulnerability analysis for municipal drinking water distribution systems.

## Key Features

- **Interactive Network Visualization**:
  - Full SVG/Canvas schematic viewer with pan, zoom, and fit-to-screen controls.
  - Multi-layer color choropleth: Nodal Pressure (m), Piezometric Head, Actual Delivered Demand (L/s), Water Quality / Chlorine Residual (mg/L), Pipe Flow Rate and Flow Direction Arrows.
  - Interactive selection and inspection of Junctions, Reservoirs, Storage Tanks, Pipes, and Pumps.

- **Hydraulic & Water Quality Engines**:
  - **Pressure-Dependent Demand (PDD)**: Wagner relationship throttling nodal demands during low-pressure events below required criteria ($P_{req} = 15$ m / 21.3 psi).
  - **Demand-Driven Analysis (DDA)**: Standard EPANET solver mode.
  - **Hazen-Williams Headloss Equation** and Pump Head Curve dynamics.
  - **First-Order Bulk Chlorine Decay** & Water Age accumulation over time.
  - **Dynamic Storage Tank Volume & Level Tracking** with gravity drainage autonomy.

- **Disaster & Extreme Event Scenarios**:
  - **Pipe Breaks & Ruptures**: Orifice leak modeling ($Q_{leak} = C_d A \sqrt{2g P}$) with configurable fissure area, rupture timing, and isolation.
  - **Fire Fighting Demands**: High-volume hydrant withdrawal (1000–5000 GPM) testing residual pressure drop against the NFPA 20-psi rule.
  - **Seismic / Earthquake Fragility**: Peak Ground Acceleration (PGA) mapping and American Lifelines Alliance (ALA) pipe break probabilities.
  - **Power Grid Outages**: Blackout failure tripping primary distribution pumps to evaluate storage tank reserves.
  - **Contaminant Intrusion**: Point-source chemical plume injection and down-network advective dispersion.

- **Resilience & Criticality Metrics**:
  - **Water Service Availability (WSA)**: Percentage of demanded water successfully delivered at required service pressure.
  - **Todini Resilience Index ($I_r$)**: Surplus hydraulic power quantification.
  - **Modified Resilience Index (MRI)**: Available power headroom at demand nodes.
  - **Population / Junctions Under Pressure**: Real-time count of non-compliant nodes.
  - **N-1 Pipe Criticality Scan**: Automated single-pipe-outage batch simulation ranking all distribution mains by system impact.

- **EPANET I/O**:
  - Built-in EPA benchmark networks: **Net1** and **Net2**.
  - Upload and parse custom `.inp` files.
  - Export modified networks to standard `.inp` format or download simulation results as JSON and CSV.

## Development

Run development server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

## References

- Klise, K., D. Hart, M. Bynum, J. Hogge, T. Haxton, R. Murray, and J. Burkhardt. *Water Network Tool for Resilience (WNTR) User Manual*. U.S. Environmental Protection Agency, EPA/600/B-23/098.
- Wagner, J.M., Shamir, U., Marks, D.H. *Water distribution reliability: Simulation methods*. Journal of Water Resources Planning and Management.
- Todini, E. *Looped water distribution networks design using a resilience index based approach*. Urban Water Journal.
