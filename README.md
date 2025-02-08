# Bond
*TartanHacks: Team GC - Divij Aswinkumar, Wookho Chiang, George Lundgren, Akshay Patel*

A Web App solution for **organic chemical reaction visualization**.
Organic Chemistry can be challenging—abstract concepts and complex diagrams make learning and teaching difficult. **Bond** aims to simplify and enhance the understanding of organic chemical reactions by offering an interactive 3D simulation and visualization tool right in your browser.

## Table of Contents
- [Features](#features)
- [Project Structure](#project-structure)
- [Installation](#installation)

---

## Features
1. **3D Visualization**
   - Uses Three.js and WebGL to render interactive molecules and reactions in real-time.
2. **Simulation of Chemistry/Physics Laws**
   - Incorporates kinetic and dynamic properties to demonstrate how molecules interact.
3. **REST API for Pattern-Matching**
   - Receives chemical equations, calculates coefficients, and checks for balancing.
4. **Responsive Frontend**
   - Built with React and MUI for a clean, user-friendly interface.

---

## Project Structure
- **data/**: Holds data files for chemical reactions, reference tables, or sample JSON.  
- **public/**: Contains static assets that do not get compiled (images, icons, etc.).  
- **src/**: The heart of the frontend—React components, routes, and logic.  
- **server.cjs**: Node.js/Express server (commonJS) responsible for the backend REST API.  
- **package.json**: Project dependencies and scripts.  
- **vite.config.js**: Vite configuration file for building the project.

---

## Installation
1. **Clone the repository**:
   ```bash
   git clone https://github.com/username/bond.git
   cd bond
2. **Install Dependencies**:
   ```bash
   npm install
3. **Start Development Server**:
   ```bash
   npm run dev
