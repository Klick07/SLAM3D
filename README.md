# Autonomous Rover Simulation (MERN / R3F / Rapier)

A high-performance 3D interactive autonomous rover simulation built with React, React Three Fiber (R3F), @react-three/rapier physics engine, and Drei. This project features real-time Newtonian physics calculations, interactive multi-angle camera switching, dynamic procedural environment generation, and a live telemetry HUD overlay.

---

## Features

- **Physics-Based Movement**: Powered by `@react-three/rapier` with custom velocity integration, friction, and responsive steering logic (`F = ma`).
- **Interactive Telemetry Dashboard**: Real-time HUD tracking velocity/speed ($m/s$), acceleration ($m/s^2$), and dynamic force ($N$).
- **Multi-Camera System**: Clickable camera modes allowing instant perspective switching (Third-Person Chase, Top-Down Satellite, and Driver First-Person view).
- **Procedural Environment**: Optimized road strip coupled with randomized side-aligned tree placement and custom ground lighting.
- **State-Driven Animation**: Smooth GLTF animation sequencing (such as automated startup calibration routines).

---

## Tech Stack

- **Framework**: React, Vite
- **3D Graphics & Scene Management**: Three.js, React Three Fiber (R3F), `@react-three/drei`
- **Physics Engine**: `@react-three/rapier`
- **Styling**: Inline CSS / Flexbox / Responsive HUD UI

---

## Project Structure

```tree
src/
├── App.jsx            # Main entry point, UI HUD overlay, Canvas, Physics world, & Vehicle component
├── /public            # 3D Assets (rover.glb, road.glb, tree.glb, etc.)
└── main.jsx           # React root renderer
```

---

## Getting Started

### Prerequisites
Make sure you have **Node.js** (v18+ recommended) and **npm** installed on your machine.

### Installation & Setup

1. Clone the repository or open your project directory:
   ```bash
   cd your-project-folder
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Ensure your GLB model files (`rover.glb`, `road.glb`, `tree.glb`) are placed correctly inside the `public/` directory.

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to the local development URL provided by Vite (typically `http://localhost:5173`).

---

## Controls

| Key / Action | Function |
| :--- | :--- |
| **W / Up Arrow** | Drive Forward |
| **S / Down Arrow** | Drive Backward |
| **A / Left Arrow** | Steer Left |
| **D / Right Arrow** | Steer Right |
| **Space** | Apply Brakes |
| **C Key** | Toggle Camera Mode via Keyboard |
| **HUD Button** | Click to cycle Camera Perspectives |