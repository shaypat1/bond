import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// =====================================================
// Scene & Camera Setup
// =====================================================

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 300);
const renderer = new THREE.WebGLRenderer({ antialias: true });
const ambientLight = new THREE.AmbientLight(0xffffff, 5);
const pointLight = new THREE.PointLight(0xffffff, 5);
const controls = new OrbitControls(camera, renderer.domElement);

export function lightcamerasetup() {
    // For example, reset the camera position or update controls:
    camera.position.set(0, 0, 10);
    controls.update();
    // (Add any other camera/light setup code if needed.)
    scene.add(ambientLight);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);
    controls.enableDamping = true;
}

export function attachRendererToContainer(container) {
    // Get container dimensions:
    const width = container.clientWidth;
    const height = container.clientHeight;
    renderer.setSize(width, height);
    
    // Optionally, you might want to style the canvas so it fills the container.
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    
    // Append the renderer's canvas to the container instead of document.body:
    container.appendChild(renderer.domElement);
  }




// =====================================================
// Atomic Data (with electronegativity, radii, and valence)
// =====================================================
const atomicData = {
H:  { color: 0xffffff, radius: 0.25, valence: 1, electronegativity: 2.20 },
O:  { color: 0xff0000, radius: 0.48, valence: 2, electronegativity: 3.44 },
C:  { color: 0x444444, radius: 0.67, valence: 4, electronegativity: 2.55 },
N:  { color: 0x0000ff, radius: 0.56, valence: 3, electronegativity: 3.04 },
S:  { color: 0xffff00, radius: 0.88, valence: 2, electronegativity: 2.58 },
P:  { color: 0xffaa00, radius: 0.90, valence: 5, electronegativity: 2.19 },
Cl: { color: 0x00ff99, radius: 0.79, valence: 1, electronegativity: 3.16 }
};

// =====================================================
// Helper Functions & Geometry
// =====================================================
function getBondLength(el1, el2, bondOrder) {
const r1 = atomicData[el1] ? atomicData[el1].radius : 0.5;
const r2 = atomicData[el2] ? atomicData[el2].radius : 0.5;
const base = (r1 + r2) * 1.2;
return base / (1 + (bondOrder - 1) * 0.1);
}

function createBondMesh(pos1, pos2, bondOrder) {
const bondMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
const dir = new THREE.Vector3().subVectors(pos2, pos1).normalize();
const distance = pos1.distanceTo(pos2);
let perp = new THREE.Vector3(0, 0, 0);
if (Math.abs(dir.y) < 0.99) { perp.set(0, 1, 0); } else { perp.set(1, 0, 0); }
perp = perp.cross(dir).normalize();
const offsetMagnitude = 0.15;
let offsets = [];
if (bondOrder === 1) {
    offsets.push(new THREE.Vector3(0, 0, 0));
} else if (bondOrder === 2) {
    offsets.push(perp.clone().multiplyScalar(offsetMagnitude));
    offsets.push(perp.clone().multiplyScalar(-offsetMagnitude));
} else if (bondOrder === 3) {
    offsets.push(new THREE.Vector3(0, 0, 0));
    offsets.push(perp.clone().multiplyScalar(offsetMagnitude));
    offsets.push(perp.clone().multiplyScalar(-offsetMagnitude));
}
let bonds = [];
offsets.forEach(off => {
    const geometry = new THREE.CylinderGeometry(0.1, 0.1, distance, 16);
    const mesh = new THREE.Mesh(geometry, bondMaterial);
    const mid = new THREE.Vector3().addVectors(pos1, pos2).multiplyScalar(0.5).add(off);
    mesh.position.copy(mid);
    const axis = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(axis, dir);
    mesh.setRotationFromQuaternion(quaternion);
    scene.add(mesh);
    bonds.push(mesh);
});
return bonds;
}

// =====================================================
// Formula Parsing – recognizes acid, alcohol, ester groups,
// and now also phenyl ("C6H5") and amino ("NH2") groups.
// =====================================================
function parseFormula(formula) {
let originalFormula = formula; // Save the original formula string
let parsed = {
    counts: {},
    acid: false,
    alcohol: false,
    ester: false,
    phenyl: false,
    amino: false, 
    acidPart: "",
    alkoxyPart: "",
    original: formula
};

// Flag phenyl and amino groups if they appear anywhere in the formula.
if(originalFormula.includes("C6H5")) {
    parsed.phenyl = true;
}
if(originalFormula.includes("NH2")) {
    parsed.amino = true;
}

if (formula.endsWith("COOH")) {
    parsed.acid = true;
    formula = formula.substring(0, formula.length - "COOH".length);
} else if (formula.endsWith("OH")) {
    parsed.alcohol = true;
    formula = formula.substring(0, formula.length - "OH".length);
} else if (formula.indexOf("COO") !== -1) {
    parsed.ester = true;
    let idx = formula.indexOf("COO");
    parsed.acidPart = formula.substring(0, idx + 2);
    parsed.alkoxyPart = formula.substring(idx + 3);
    formula = "";
}
const regex = /([A-Z][a-z]?)(\d*)/g;
let match;
while ((match = regex.exec(formula)) !== null) {
    const elem = match[1];
    const count = parseInt(match[2] || "1");
    parsed.counts[elem] = (parsed.counts[elem] || 0) + count;
}
return parsed;
}

// =====================================================
// Pattern Tests
// =====================================================
function isSugar(counts) {
return counts["C"] && (counts["H"] === 2 * counts["C"]) &&
        (counts["O"] === counts["C"]) && (counts["C"] >= 3);
}
function isPeroxide(counts) {
return (!counts["C"]) && (counts["O"] === 2) && (counts["H"] === 2);
}
// Ether detection: exactly one oxygen (with at least one carbon on each side)
// and not already identified as acid, alcohol, or ester.
function isEther(parsed) {
let f = parsed.original;
return parsed.counts["O"] === 1 &&
        f[0] !== "O" &&
        f[f.length - 1] !== "O" &&
        !parsed.acid &&
        !parsed.alcohol &&
        !parsed.ester &&
        (parsed.counts["C"] !== undefined);
}

// =====================================================
// Hydrogen-Filling Routine
// =====================================================
function addMissingHydrogens(structure) {
for (let i = 0; i < structure.atoms.length; i++) {
    let atom = structure.atoms[i];
    if (atom.element === "H") continue;
    const expectedValence = (atom.targetValence !== undefined)
    ? atom.targetValence
    : (atomicData[atom.element] ? atomicData[atom.element].valence : 0);
    let currentBondOrder = 0;
    structure.bonds.forEach(bond => {
    if (bond.a === i || bond.b === i) {
        currentBondOrder += bond.order;
    }
    });
    let missing = expectedValence - currentBondOrder;
    if (missing <= 0) continue;
    let baseDirection = new THREE.Vector3(0, 0, 0);
    let count = 0;
    structure.bonds.forEach(bond => {
    if (bond.a === i) {
        let dir = new THREE.Vector3().subVectors(atom.pos, structure.atoms[bond.b].pos).normalize();
        baseDirection.add(dir);
        count++;
    } else if (bond.b === i) {
        let dir = new THREE.Vector3().subVectors(atom.pos, structure.atoms[bond.a].pos).normalize();
        baseDirection.add(dir);
        count++;
    }
    });
    if (count > 0) {
    baseDirection.divideScalar(count);
    } else {
    baseDirection.set(1, 0, 0);
    }
    baseDirection.normalize();
    for (let m = 0; m < missing; m++) {
    let direction = baseDirection.clone();
    if (missing > 1) {
        let angle = (2 * Math.PI / missing) * m;
        let perp = new THREE.Vector3();
        if (Math.abs(baseDirection.x) < 0.9) {
        perp.set(1, 0, 0);
        } else {
        perp.set(0, 1, 0);
        }
        perp = perp.cross(baseDirection).normalize();
        let quaternion = new THREE.Quaternion().setFromAxisAngle(perp, angle);
        direction.applyQuaternion(quaternion).normalize();
    }
    let bondLength = getBondLength(atom.element, "H", 1);
    let hPos = atom.pos.clone().add(direction.multiplyScalar(bondLength));
    let hIndex = structure.atoms.length;
    structure.atoms.push({ element: "H", pos: hPos });
    structure.bonds.push({ a: i, b: hIndex, order: 1 });
    }
}
return structure;
}

// =====================================================
// Helper: Align a Fragment Horizontally
// =====================================================
function alignFragment(fragment, mode, targetPos) {
if (fragment.atoms.length === 0) return;
let p0, pAnchor;
if (mode === "left") {
    p0 = fragment.atoms[0].pos.clone();
    pAnchor = fragment.atoms[fragment.atoms.length - 1].pos.clone();
} else if (mode === "right") {
    p0 = fragment.atoms[0].pos.clone();
    pAnchor = fragment.atoms[fragment.atoms.length - 1].pos.clone();
} else {
    return;
}
let v = new THREE.Vector3().subVectors(pAnchor, p0);
let vNorm = v.clone().normalize();
let targetDir = new THREE.Vector3(1, 0, 0); // align along +x
let quat = new THREE.Quaternion().setFromUnitVectors(vNorm, targetDir);
fragment.atoms.forEach(atom => {
    atom.pos.applyQuaternion(quat);
});
if (mode === "left") {
    let newAnchor = fragment.atoms[fragment.atoms.length - 1].pos.clone();
    let trans = new THREE.Vector3().subVectors(targetPos, newAnchor);
    fragment.atoms.forEach(atom => {
    atom.pos.add(trans);
    });
} else if (mode === "right") {
    let newAnchor = fragment.atoms[0].pos.clone();
    let trans = new THREE.Vector3().subVectors(targetPos, newAnchor);
    fragment.atoms.forEach(atom => {
    atom.pos.add(trans);
    });
}
}

// =====================================================
// SPECIAL-CASE BUILDERS (Small Molecules and Functional Groups)
// =====================================================
function buildDiatomicStructure(element, bondOrder) {
let structure = { atoms: [], bonds: [] };
let length = getBondLength(element, element, bondOrder);
let pos1 = new THREE.Vector3(0, 0, 0);
let pos2 = new THREE.Vector3(length, 0, 0);
structure.atoms.push({ element: element, pos: pos1.clone() });
structure.atoms.push({ element: element, pos: pos2.clone() });
structure.bonds.push({ a: 0, b: 1, order: bondOrder });
return structure;
}

function buildAmmoniaStructure() {
let structure = { atoms: [], bonds: [] };
let posN = new THREE.Vector3(0, 0, 0);
structure.atoms.push({ element: "N", pos: posN.clone() });
let bondLengthNH = getBondLength("N", "H", 1);
let hPositions = [
    new THREE.Vector3(bondLengthNH, 0, 0),
    new THREE.Vector3(-bondLengthNH/2, bondLengthNH * 0.87, 0),
    new THREE.Vector3(-bondLengthNH/2, -bondLengthNH * 0.87, 0)
];
hPositions.forEach(pos => {
    structure.atoms.push({ element: "H", pos: pos.clone() });
    structure.bonds.push({ a: 0, b: structure.atoms.length - 1, order: 1 });
});
return structure;
}

function buildCO2Structure() {
let structure = { atoms: [], bonds: [] };
let bondLengthCO = getBondLength("C", "O", 2);
let posC = new THREE.Vector3(0, 0, 0);
let posO1 = new THREE.Vector3(-bondLengthCO, 0, 0);
let posO2 = new THREE.Vector3(bondLengthCO, 0, 0);
structure.atoms.push({ element: "O", pos: posO1.clone() });
structure.atoms.push({ element: "C", pos: posC.clone() });
structure.atoms.push({ element: "O", pos: posO2.clone() });
structure.bonds.push({ a: 1, b: 0, order: 2 });
structure.bonds.push({ a: 1, b: 2, order: 2 });
return structure;
}

function buildSO3Structure() {
let structure = { atoms: [], bonds: [] };
let posS = new THREE.Vector3(0, 0, 0);
structure.atoms.push({ element: "S", pos: posS.clone() });
let bondLengthSO = getBondLength("S", "O", 2);
for (let i = 0; i < 3; i++){
    let angle = 2 * Math.PI * i / 3;
    let posO = new THREE.Vector3(bondLengthSO * Math.cos(angle), bondLengthSO * Math.sin(angle), 0);
    structure.atoms.push({ element: "O", pos: posO.clone() });
    structure.bonds.push({ a: 0, b: structure.atoms.length - 1, order: 2 });
}
return structure;
}

function buildPhosphoricAcidStructure() {
let structure = { atoms: [], bonds: [] };
let posP = new THREE.Vector3(0, 0, 0);
structure.atoms.push({ element: "P", pos: posP.clone() });
let bondLengthPO = getBondLength("P", "O", 2) || 1.5;
let posO1 = new THREE.Vector3(0, bondLengthPO, 0);
structure.atoms.push({ element: "O", pos: posO1.clone() });
structure.bonds.push({ a: 0, b: 1, order: 2 });
for (let i = 0; i < 3; i++){
    let angle = 2 * Math.PI * i / 3;
    let posO = new THREE.Vector3(bondLengthPO * Math.cos(angle), -bondLengthPO * 0.7, bondLengthPO * Math.sin(angle));
    structure.atoms.push({ element: "O", pos: posO.clone() });
    structure.bonds.push({ a: 0, b: structure.atoms.length - 1, order: 1 });
    let bondLengthOH = getBondLength("O", "H", 1);
    let posH = posO.clone().add(new THREE.Vector3(bondLengthOH, 0, 0));
    structure.atoms.push({ element: "H", pos: posH.clone() });
    structure.bonds.push({ a: structure.atoms.length - 2, b: structure.atoms.length - 1, order: 1 });
}
return structure;
}

function buildAmmoniumAcetateStructure() {
let acetateParsed = parseFormula("CH3COOH");
acetateParsed.acid = true;
let acetate = buildAcidStructure(acetateParsed);
// Remove the acidic hydrogen.
acetate.atoms.pop();
acetate.bonds.pop();
let ammonium = buildAmmoniaStructure();
let bondLengthNH = getBondLength("N", "H", 1);
let extraHPos = ammonium.atoms[0].pos.clone().add(new THREE.Vector3(0, bondLengthNH, 0));
ammonium.atoms.push({ element: "H", pos: extraHPos });
ammonium.bonds.push({ a: 0, b: ammonium.atoms.length - 1, order: 1 });
let shift = new THREE.Vector3(3, 0, 0);
ammonium.atoms.forEach(a => a.pos.add(shift));
let structure = { atoms: acetate.atoms.concat(ammonium.atoms), bonds: acetate.bonds.concat(ammonium.bonds) };
return structure;
}

function buildMethylPhosphateStructure() {
let phosphoric = buildPhosphoricAcidStructure();
phosphoric.atoms.splice(3, 1);
for (let i = 0; i < phosphoric.bonds.length; i++){
    if (phosphoric.bonds[i].b === 3) { phosphoric.bonds.splice(i,1); break; }
}
let methyl = buildCarbonChainStructure(parseFormula("CH3").counts, { adjustTerminal: "first" });
let bondLengthOC = getBondLength("O", "C", 1);
let shift = phosphoric.atoms[2].pos.clone().add(new THREE.Vector3(bondLengthOC, 0, 0)).sub(methyl.atoms[0].pos);
methyl.atoms.forEach(a => a.pos.add(shift));
phosphoric.bonds.push({ a: 2, b: phosphoric.atoms.length, order: 1 });
phosphoric.atoms = phosphoric.atoms.concat(methyl.atoms);
phosphoric.bonds = phosphoric.bonds.concat(methyl.bonds);
return phosphoric;
}

// =====================================================
// NEW FUNCTIONAL GROUP BUILDERS FOR PHENYL (BENZENE) AND AMINO GROUPS
// =====================================================

function buildPhenylStructure() {
let structure = { atoms: [], bonds: [] };
let L = getBondLength("C", "C", 1);
for (let i = 0; i < 6; i++) {
    let angle = i * 2 * Math.PI / 6;
    let x = L * Math.cos(angle);
    let y = L * Math.sin(angle);
    let z = 0; // benzene is planar (xy–plane)
    structure.atoms.push({ element: "C", pos: new THREE.Vector3(x, y, z) });
}
for (let i = 0; i < 6; i++) {
    let bondOrder = (i % 2 === 0) ? 2 : 1;
    structure.bonds.push({ a: i, b: (i + 1) % 6, order: bondOrder });
}
let bondLengthCH = getBondLength("C", "H", 1);
for (let i = 0; i < 6; i++) {
    if (i === 0) continue; // leave C0 for attachment (phenyl becomes C6H5)
    let carbonPos = structure.atoms[i].pos;
    let outward = carbonPos.clone().normalize();
    let hPos = carbonPos.clone().add(outward.multiplyScalar(bondLengthCH));
    structure.atoms.push({ element: "H", pos: hPos });
    structure.bonds.push({ a: i, b: structure.atoms.length - 1, order: 1 });
}
return structure;
}

function buildAminoGroupStructure() {
let structure = { atoms: [], bonds: [] };
structure.atoms.push({ element: "N", pos: new THREE.Vector3(0, 0, 0) });
let bondLengthNH = getBondLength("N", "H", 1);
let angle1 = 120 * Math.PI / 180;
let angle2 = -120 * Math.PI / 180;
let h1 = new THREE.Vector3(bondLengthNH * Math.cos(angle1), bondLengthNH * Math.sin(angle1), 0);
let h2 = new THREE.Vector3(bondLengthNH * Math.cos(angle2), bondLengthNH * Math.sin(angle2), 0);
structure.atoms.push({ element: "H", pos: h1 });
structure.bonds.push({ a: 0, b: 1, order: 1 });
structure.atoms.push({ element: "H", pos: h2 });
structure.bonds.push({ a: 0, b: 2, order: 1 });
return structure;
}

function buildAnilineStructure() {
let phenyl = buildPhenylStructure();
let amino = buildAminoGroupStructure();
let attachmentPoint = phenyl.atoms[0].pos.clone();
let outward = attachmentPoint.clone().normalize();
let bondLengthCN = getBondLength("C", "N", 1);
let targetNPos = attachmentPoint.clone().add(outward.clone().multiplyScalar(bondLengthCN));
let defaultDir = new THREE.Vector3(1, 0, 0);
let quaternion = new THREE.Quaternion().setFromUnitVectors(defaultDir, outward);
amino.atoms.forEach(atom => {
    atom.pos.applyQuaternion(quaternion);
});
let shift = targetNPos.clone().sub(amino.atoms[0].pos);
amino.atoms.forEach(atom => {
    atom.pos.add(shift);
});
let structure = { atoms: [], bonds: [] };
let phenylAtomCount = phenyl.atoms.length;
phenyl.atoms.forEach(atom => structure.atoms.push({ element: atom.element, pos: atom.pos.clone() }));
phenyl.bonds.forEach(bond => structure.bonds.push({ a: bond.a, b: bond.b, order: bond.order }));
let aminoAtomOffset = structure.atoms.length;
amino.atoms.forEach(atom => structure.atoms.push({ element: atom.element, pos: atom.pos.clone() }));
amino.bonds.forEach(bond => {
    structure.bonds.push({ a: bond.a + aminoAtomOffset, b: bond.b + aminoAtomOffset, order: bond.order });
});
structure.bonds.push({ a: 0, b: aminoAtomOffset, order: 1 });
structure = addMissingHydrogens(structure);
relaxStructure(structure, 1000);
return structure;
}

// =====================================================
// NEW FUNCTIONAL GROUP BUILDER: Sulfonic Acid Group (-SO3H)
// =====================================================
function buildSulfonicAcidGroup() {
let structure = { atoms: [], bonds: [] };
// Atom 0: Sulfur (S) at origin – this will attach to the phenyl ring.
structure.atoms.push({ element: "S", pos: new THREE.Vector3(0, 0, 0) });
// Determine bond lengths:
let dSO_double = getBondLength("S", "O", 2);
let dSO_single = getBondLength("S", "O", 1);
let dOH = getBondLength("O", "H", 1);
// Place first double-bonded oxygen (O1) along +x.
let posO1 = new THREE.Vector3(dSO_double, 0, 0);
structure.atoms.push({ element: "O", pos: posO1.clone() });
structure.bonds.push({ a: 0, b: 1, order: 2 });
// Place second double-bonded oxygen (O2) at 120° from O1 in the xy–plane.
let angle = 120 * Math.PI / 180;
let posO2 = new THREE.Vector3(dSO_double * Math.cos(angle), dSO_double * Math.sin(angle), 0);
structure.atoms.push({ element: "O", pos: posO2.clone() });
structure.bonds.push({ a: 0, b: 2, order: 2 });
// Place the single-bonded oxygen (O3) for the hydroxyl group at -120° from O1.
let angle2 = -120 * Math.PI / 180;
let posO3 = new THREE.Vector3(dSO_single * Math.cos(angle2), dSO_single * Math.sin(angle2), 0);
structure.atoms.push({ element: "O", pos: posO3.clone() });
structure.bonds.push({ a: 0, b: 3, order: 1 });
// Attach a hydrogen to O3 to complete the -OH.
let v = posO3.clone().normalize();
let posH = posO3.clone().add(v.multiplyScalar(dOH));
structure.atoms.push({ element: "H", pos: posH.clone() });
structure.bonds.push({ a: 3, b: 4, order: 1 });
return structure;
}

// =====================================================
// Modified buildEtherStructure remains unchanged
// =====================================================
function buildEtherStructure(formula, parsed) {
let parts = parsed.original.split("O");
if(parts.length !== 2 || parts[0] === "" || parts[1] === "") {
    return buildGenericStructure(parsed.counts);
}
let leftStr = parts[0];
let rightStr = parts[1];
let leftParsed = parseFormula(leftStr);
let rightParsed = parseFormula(rightStr);
let leftFrag = buildCarbonChainStructure(leftParsed.counts, { adjustTerminal: "last" });
let rightFrag = buildCarbonChainStructure(rightParsed.counts, { adjustTerminal: "first" });
if (leftParsed.counts["C"] === 1 && leftParsed.counts["H"] === 3) {
    leftFrag.atoms[0].functional = "methyl";
}
if (rightParsed.counts["C"] === 1 && rightParsed.counts["H"] === 3) {
    rightFrag.atoms[0].functional = "methyl";
}
let bondLengthOC = getBondLength("O", "C", 1);
alignFragment(leftFrag, "left", new THREE.Vector3(-bondLengthOC, 0, 0));
alignFragment(rightFrag, "right", new THREE.Vector3(bondLengthOC, 0, 0));
let structure = { atoms: [], bonds: [] };
leftFrag.atoms.forEach(a => structure.atoms.push({ element: a.element, pos: a.pos.clone(), targetValence: a.targetValence, functional: a.functional }));
leftFrag.bonds.forEach(b => structure.bonds.push({ a: b.a, b: b.b, order: b.order }));
let oxygenIndex = structure.atoms.length;
structure.atoms.push({ element: "O", pos: new THREE.Vector3(0,0,0), functional: "ether" });
let leftAnchorIndex = leftFrag.atoms.length - 1;
structure.bonds.push({ a: leftAnchorIndex, b: oxygenIndex, order: 1 });
let rightOffset = structure.atoms.length;
rightFrag.atoms.forEach(a => structure.atoms.push({ element: a.element, pos: a.pos.clone(), targetValence: a.targetValence, functional: a.functional }));
rightFrag.bonds.forEach(b => structure.bonds.push({ a: b.a + rightOffset, b: b.b + rightOffset, order: b.order }));
structure.bonds.push({ a: oxygenIndex, b: rightOffset, order: 1 });
structure = addMissingHydrogens(structure);
return structure;
}

// =====================================================
// OLD BUILDERS for Carbon–Chain Molecules
// =====================================================
function buildWaterStructure() {
let structure = { atoms: [], bonds: [] };
structure.atoms.push({ element: "O", pos: new THREE.Vector3(0, 0, 0) });
const bondLength = getBondLength("O", "H", 1);
const angle = (104.5 * Math.PI) / 180;
const xOffset = bondLength * Math.sin(angle / 2);
const yOffset = bondLength * Math.cos(angle / 2);
structure.atoms.push({ element: "H", pos: new THREE.Vector3(-xOffset, yOffset, 0) });
structure.atoms.push({ element: "H", pos: new THREE.Vector3(xOffset, yOffset, 0) });
structure.bonds.push({ a: 0, b: 1, order: 1 });
structure.bonds.push({ a: 0, b: 2, order: 1 });
return structure;
}

function buildSugarStructure(counts) {
let structure = { atoms: [], bonds: [] };
const n = counts["C"];
const bondLength = getBondLength("C", "C", 1);
let positions = [];
for (let i = 0; i < n; i++) {
    let angle = i * Math.PI / 3;
    let x = i * bondLength;
    let y = Math.sin(angle) * bondLength * 0.5;
    let z = Math.cos(angle) * bondLength * 0.5;
    let pos = new THREE.Vector3(x, y, z);
    positions.push(pos);
    structure.atoms.push({ element: "C", pos: pos.clone() });
}
for (let i = 0; i < n - 1; i++) {
    structure.bonds.push({ a: i, b: i + 1, order: 1 });
}
for (let i = 0; i < n; i++) {
    let basePos = positions[i].clone();
    let offset = new THREE.Vector3(0, bondLength, 0);
    offset.applyAxisAngle(new THREE.Vector3(1,0,0), i * Math.PI / 7);
    let subPos = basePos.clone().add(offset);
    if (i === n - 1) {
    let oIndex = structure.atoms.length;
    structure.atoms.push({ element: "O", pos: subPos.clone() });
    structure.bonds.push({ a: i, b: oIndex, order: 2 });
    } else {
    let oIndex = structure.atoms.length;
    structure.atoms.push({ element: "O", pos: subPos.clone() });
    structure.bonds.push({ a: i, b: oIndex, order: 1 });
    let ohPos = subPos.clone().add(new THREE.Vector3(0, 0.5 * bondLength, 0));
    let hIndex = structure.atoms.length;
    structure.atoms.push({ element: "H", pos: ohPos.clone() });
    structure.bonds.push({ a: oIndex, b: hIndex, order: 1 });
    }
}
structure = addMissingHydrogens(structure);
return structure;
}

function buildCarbonChainStructure(counts, options = {}) {
let structure = { atoms: [], bonds: [] };
const nC = counts["C"];
const bondLength = getBondLength("C", "C", 1);
let positions = [];
for (let i = 0; i < nC; i++) {
    let angle = i * Math.PI / 3;
    let x = i * bondLength;
    let y = Math.sin(angle) * bondLength * 0.5;
    let z = Math.cos(angle) * bondLength * 0.5;
    let pos = new THREE.Vector3(x, y, z);
    positions.push(pos);
    let atom = { element: "C", pos: pos.clone() };
    if (options.adjustTerminal) {
    if (options.adjustTerminal === "first" && i === 0) {
        atom.targetValence = atomicData["C"].valence - 1;
    }
    if (options.adjustTerminal === "last" && i === nC - 1) {
        atom.targetValence = atomicData["C"].valence - 1;
    }
    }
    structure.atoms.push(atom);
}
const keys = Object.keys(counts);
const pureHydrocarbon = keys.every(k => k === "C" || k === "H");
let U = 0;
if (pureHydrocarbon) {
    let satH = 2 * nC + 2;
    U = (satH - (counts["H"] || 0)) / 2;
    U = Math.round(U);
}
for (let i = 0; i < nC - 1; i++) {
    let bondOrder = 1;
    if (pureHydrocarbon && i === nC - 2 && U > 0) {
    bondOrder = 1 + U;
    if (bondOrder > 3) bondOrder = 3;
    }
    structure.bonds.push({ a: i, b: i + 1, order: bondOrder });
}
let hetero = {};
for (let elem in counts) {
    if (elem !== "C" && elem !== "H") { hetero[elem] = counts[elem]; }
}
for (let elem in hetero) {
    while (hetero[elem] > 0) {
    let i = Math.floor(Math.random() * nC);
    let pos = positions[i].clone().add(new THREE.Vector3((Math.random()-0.5)*bondLength,
                                                            (Math.random()-0.5)*bondLength,
                                                            (Math.random()-0.5)*bondLength));
    let idx = structure.atoms.length;
    structure.atoms.push({ element: elem, pos: pos });
    structure.bonds.push({ a: i, b: idx, order: 1 });
    hetero[elem]--;
    }
}
if (nC === 1 && counts["H"] === 3) {
    structure.atoms[0].functional = "methyl";
}
structure = addMissingHydrogens(structure);
return structure;
}

function buildPeroxideStructure(counts) {
let structure = { atoms: [], bonds: [] };
const bondLength = getBondLength("O", "O", 1);
let positions = [ new THREE.Vector3(0, 0, 0), new THREE.Vector3(bondLength, 0, 0) ];
for (let i = 0; i < 2; i++) {
    structure.atoms.push({ element: "O", pos: positions[i].clone() });
}
structure.bonds.push({ a: 0, b: 1, order: 1 });
for (let i = 0; i < 2; i++) {
    let pos = positions[i].clone().add(new THREE.Vector3(0, bondLength, 0));
    let hIndex = structure.atoms.length;
    structure.atoms.push({ element: "H", pos: pos });
    structure.bonds.push({ a: i, b: hIndex, order: 1 });
}
return structure;
}

function buildAlcoholStructure(parsed) {
let counts = parsed.counts;
let structure = { atoms: [], bonds: [] };
const nC = counts["C"] || 0;
const bondLength = getBondLength("C", "C", 1);
let positions = [];
for (let i = 0; i < nC; i++) {
    let angle = i * Math.PI / 3;
    let x = i * bondLength;
    let y = Math.sin(angle) * bondLength * 0.5;
    let z = Math.cos(angle) * bondLength * 0.5;
    let pos = new THREE.Vector3(x, y, z);
    positions.push(pos);
    structure.atoms.push({ element: "C", pos: pos.clone() });
}
for (let i = 0; i < nC - 1; i++) {
    structure.bonds.push({ a: i, b: i + 1, order: 1 });
}
let hydroxylCarbon = (nC > 0) ? nC - 1 : 0;
const bondLengthCO = getBondLength("C", "O", 1);
let offset = new THREE.Vector3(0, bondLengthCO, 0);
offset.applyAxisAngle(new THREE.Vector3(1,0,0), Math.PI/6);
let posO = positions[hydroxylCarbon].clone().add(offset);
let indexO = structure.atoms.length;
structure.atoms.push({ element: "O", pos: posO.clone() });
structure.bonds.push({ a: hydroxylCarbon, b: indexO, order: 1 });
const bondLengthOH = getBondLength("O", "H", 1);
let posH = posO.clone().add(new THREE.Vector3(bondLengthOH, 0, 0));
let indexH = structure.atoms.length;
structure.atoms.push({ element: "H", pos: posH });
structure.bonds.push({ a: indexO, b: indexH, order: 1 });
structure = addMissingHydrogens(structure);
return structure;
}

function buildAcidStructure(parsed) {
let counts = parsed.counts;
let structure = { atoms: [], bonds: [] };
const bondLengthC = getBondLength("C", "C", 1);
let positions = [];
let nC = counts["C"] || 0;
for (let i = 0; i < nC; i++) {
    let angle = i * Math.PI / 3;
    let x = i * bondLengthC;
    let y = Math.sin(angle) * bondLengthC * 0.5;
    let z = Math.cos(angle) * bondLengthC * 0.5;
    let pos = new THREE.Vector3(x, y, z);
    positions.push(pos);
    structure.atoms.push({ element: "C", pos: pos.clone() });
}
for (let i = 0; i < nC - 1; i++) {
    structure.bonds.push({ a: i, b: i + 1, order: 1 });
}
let acidCarbon;
if (nC > 0) {
    acidCarbon = positions[nC - 1].clone().add(new THREE.Vector3(bondLengthC, 0, 0));
    structure.atoms.push({ element: "C", pos: acidCarbon.clone() });
    structure.bonds.push({ a: nC - 1, b: structure.atoms.length - 1, order: 1 });
} else {
    acidCarbon = new THREE.Vector3(0, 0, 0);
    structure.atoms.push({ element: "C", pos: acidCarbon.clone() });
}
const bondLengthCO_dbl = getBondLength("C", "O", 2);
let posO1 = acidCarbon.clone().add(new THREE.Vector3(0, bondLengthCO_dbl, 0));
structure.atoms.push({ element: "O", pos: posO1.clone() });
structure.bonds.push({ a: structure.atoms.length - 2, b: structure.atoms.length - 1, order: 2 });
const bondLengthCO_sng = getBondLength("C", "O", 1);
let posO2 = acidCarbon.clone().add(new THREE.Vector3(0, -bondLengthCO_sng, 0));
structure.atoms.push({ element: "O", pos: posO2.clone() });
structure.bonds.push({ a: structure.atoms.length - 3, b: structure.atoms.length - 1, order: 1 });
const bondLengthOH = getBondLength("O", "H", 1);
let posH = posO2.clone().add(new THREE.Vector3(bondLengthOH, 0, 0));
structure.atoms.push({ element: "H", pos: posH.clone() });
structure.bonds.push({ a: structure.atoms.length - 2, b: structure.atoms.length - 1, order: 1 });
structure = addMissingHydrogens(structure);
return structure;
}

function buildEsterStructure(parsed) {
let structure = { atoms: [], bonds: [] };
let acidPart = parsed.acidPart;
let alkoxyPart = parsed.alkoxyPart;
const bondLengthCC = getBondLength("C", "C", 1);
const bondLengthCO_dbl = getBondLength("C", "O", 2);
const bondLengthCO_sng = getBondLength("C", "O", 1);
const bondLengthOC = getBondLength("O", "C", 1);
let acidRStr = "";
if (acidPart.length > 2) {
    acidRStr = acidPart.substring(0, acidPart.length - 2);
}
let acidR_structure;
if (acidRStr.length > 0) {
    acidR_structure = buildCarbonChainStructure(parseFormula(acidRStr).counts, { adjustTerminal: "last" });
} else {
    acidR_structure = { atoms: [], bonds: [] };
}
for (let atom of acidR_structure.atoms) {
    structure.atoms.push({ element: atom.element, pos: atom.pos.clone(), targetValence: atom.targetValence, functional: atom.functional });
}
for (let bond of acidR_structure.bonds) {
    structure.bonds.push({ a: bond.a, b: bond.b, order: bond.order });
}
let acidRCounts = parseFormula(acidRStr).counts;
let nCarbons = acidRCounts["C"] || 0;
let acylAnchorIndex = (nCarbons > 0) ? nCarbons - 1 : 0;
let acylAnchorPos = (nCarbons > 0) ? structure.atoms[acylAnchorIndex].pos.clone() : new THREE.Vector3(0, 0, 0);
let acylPos = acylAnchorPos.clone().add(new THREE.Vector3(bondLengthCC, 0, 0));
structure.atoms.push({ element: "C", pos: acylPos.clone() });
structure.bonds.push({ a: acylAnchorIndex, b: structure.atoms.length - 1, order: 1 });
let acylIndex = structure.atoms.length - 1;
let posO_dbl = acylPos.clone().add(new THREE.Vector3(0, bondLengthCO_dbl, 0));
structure.atoms.push({ element: "O", pos: posO_dbl.clone() });
structure.bonds.push({ a: acylIndex, b: structure.atoms.length - 1, order: 2 });
let posO_bridge = acylPos.clone().add(new THREE.Vector3(0, -bondLengthCO_sng, 0));
structure.atoms.push({ element: "O", pos: posO_bridge.clone() });
structure.bonds.push({ a: acylIndex, b: structure.atoms.length - 1, order: 1 });
let bridgeOIndex = structure.atoms.length - 1;
let alkoxy_structure;
if (alkoxyPart.length > 0) {
    alkoxy_structure = buildCarbonChainStructure(parseFormula(alkoxyPart).counts, { adjustTerminal: "first" });
} else {
    alkoxy_structure = buildCarbonChainStructure(parseFormula("CH3").counts, { adjustTerminal: "first" });
}
const shift = posO_bridge.clone().add(new THREE.Vector3(bondLengthOC, 0, 0));
let alkoxy_offset = shift.clone().sub(alkoxy_structure.atoms[0].pos);
for (let atom of alkoxy_structure.atoms) {
    atom.pos.add(alkoxy_offset);
    let idx = structure.atoms.length;
    structure.atoms.push({ element: atom.element, pos: atom.pos.clone(), targetValence: atom.targetValence, functional: atom.functional });
    if (atom === alkoxy_structure.atoms[0]) {
    structure.bonds.push({ a: bridgeOIndex, b: idx, order: 1 });
    }
}
for (let bond of alkoxy_structure.bonds) {
    let startIndex = structure.atoms.length - alkoxy_structure.atoms.length;
    structure.bonds.push({ a: startIndex + bond.a, b: startIndex + bond.b, order: bond.order });
}
structure = addMissingHydrogens(structure);
return structure;
}

function buildGenericStructure(counts) {
let structure = { atoms: [], bonds: [] };
let maxElem = null, maxCount = 0;
for (let elem in counts) {
    if (counts[elem] > maxCount) { maxCount = counts[elem]; maxElem = elem; }
}
const n = counts[maxElem];
const bondLength = getBondLength(maxElem, maxElem, 1);
let positions = [];
for (let i = 0; i < n; i++) {
    let pos = new THREE.Vector3(i * bondLength, 0, 0);
    positions.push(pos);
    structure.atoms.push({ element: maxElem, pos: pos.clone() });
}
for (let i = 0; i < n - 1; i++) {
    structure.bonds.push({ a: i, b: i + 1, order: 1 });
}
for (let elem in counts) {
    if (elem === maxElem || elem === "H") continue;
    let remaining = counts[elem];
    while (remaining > 0) {
    let i = Math.floor(Math.random() * n);
    let pos = positions[i].clone().add(new THREE.Vector3((Math.random()-0.5)*bondLength,
                                                            (Math.random()-0.5)*bondLength,
                                                            (Math.random()-0.5)*bondLength));
    let idx = structure.atoms.length;
    structure.atoms.push({ element: elem, pos: pos });
    structure.bonds.push({ a: i, b: idx, order: 1 });
    remaining--;
    }
}
structure = addMissingHydrogens(structure);
return structure;
}

// =====================================================
// NEW HELPER: Attach a substituent structure to a base structure.
// In our case, we assume the base (e.g. a phenyl ring) has its free
// attachment at atom index 0. The substituent’s attachment is assumed
// to be its atom index 0 (with its default orientation along +x).
// =====================================================
function attachSubstituent(baseStructure, substituentStructure) {
let baseAtom = baseStructure.atoms[0];
let subAtom = substituentStructure.atoms[0];
let center = new THREE.Vector3();
baseStructure.atoms.forEach(a => center.add(a.pos));
center.divideScalar(baseStructure.atoms.length);
let outward = new THREE.Vector3().subVectors(baseAtom.pos, center).normalize();
let bondLength = getBondLength(baseAtom.element, subAtom.element, 1);
let targetPos = baseAtom.pos.clone().add(outward.clone().multiplyScalar(bondLength));
let defaultDir = new THREE.Vector3(1, 0, 0);
let quaternion = new THREE.Quaternion().setFromUnitVectors(defaultDir, outward);
substituentStructure.atoms.forEach(atom => {
    atom.pos.applyQuaternion(quaternion);
});
let translation = new THREE.Vector3().subVectors(targetPos, substituentStructure.atoms[0].pos);
substituentStructure.atoms.forEach(atom => {
    atom.pos.add(translation);
});
let merged = { atoms: [], bonds: [] };
baseStructure.atoms.forEach(a => merged.atoms.push({ element: a.element, pos: a.pos.clone(), targetValence: a.targetValence, functional: a.functional }));
baseStructure.bonds.forEach(b => merged.bonds.push({ a: b.a, b: b.b, order: b.order }));
let offset = merged.atoms.length;
substituentStructure.atoms.forEach(a => merged.atoms.push({ element: a.element, pos: a.pos.clone(), targetValence: a.targetValence, functional: a.functional }));
substituentStructure.bonds.forEach(b => {
    merged.bonds.push({ a: b.a + offset, b: b.b + offset, order: b.order });
});
// Add the connecting bond between base and substituent (from base atom 0 to substituent atom 0).
merged.bonds.push({ a: 0, b: offset, order: 1 });
// Pre-relax the merged structure.
relaxStructure(merged, 1000);
return merged;
}

// =====================================================
// Modified Main Builder – now handles phenyl substituents.
// =====================================================
function buildMolecule(formula) {
if (formula === "C6H5NH2") {
    return buildAnilineStructure();
} else if (formula === "C6H5") {
    return buildPhenylStructure();
} else if (formula === "NH2") {
    return buildAminoGroupStructure();
}
// NEW: if the formula begins with "C6H5" but has extra substituent(s),
// remove the "C6H5" prefix and attach the substituent to the free
// attachment site of the phenyl ring.
if (formula.startsWith("C6H5") && formula !== "C6H5" && formula !== "C6H5NH2") {
    let substituentFormula = formula.substring(4);
    let phenyl = buildPhenylStructure();
    let substituent = buildMolecule(substituentFormula);
    return attachSubstituent(phenyl, substituent);
}
// NEW: Special-case for sulfonic acid functional group.
if (formula === "SO3H") {
    return buildSulfonicAcidGroup();
}
const parsed = parseFormula(formula);
if(parsed.phenyl && parsed.amino) {
    return buildAnilineStructure();
} else if(parsed.phenyl) {
    return buildPhenylStructure();
} else if(parsed.amino) {
    return buildAminoGroupStructure();
}
let structure;
if(formula === "O2") {
    structure = buildDiatomicStructure("O", 2);
} else if(formula === "H2") {
    structure = buildDiatomicStructure("H", 1);
} else if(formula === "NH3") {
    structure = buildAmmoniaStructure();
} else if(formula === "CO2") {
    structure = buildCO2Structure();
} else if(formula === "SO3") {
    structure = buildSO3Structure();
} else if(formula === "H3PO4") {
    structure = buildPhosphoricAcidStructure();
} else if(formula === "CH3COONH4") {
    structure = buildAmmoniumAcetateStructure();
} else if(formula === "CH3OPO3H2") {
    structure = buildMethylPhosphateStructure();
} else if(isEther(parsed)) {
    structure = buildEtherStructure(formula, parsed);
} else if(formula === "H2O" || (parsed.counts["H"] === 2 && parsed.counts["O"] === 1)) {
    structure = buildWaterStructure();
} else if(parsed.acid) {
    structure = buildAcidStructure(parsed);
} else if(parsed.ester) {
    structure = buildEsterStructure(parsed);
} else if(parsed.alcohol) {
    structure = buildAlcoholStructure(parsed);
} else if(parsed.counts["C"]) {
    if(isSugar(parsed.counts)) {
    structure = buildSugarStructure(parsed.counts);
    } else {
    structure = buildCarbonChainStructure(parsed.counts);
    }
} else if(isPeroxide(parsed.counts)) {
    structure = buildPeroxideStructure(parsed.counts);
} else {
    structure = buildGenericStructure(parsed.counts);
}
relaxStructure(structure, 1000);
return structure;
}

// =====================================================
// Relaxation Routine (Force-Directed with Repulsion)
// =====================================================
function relaxStructure(structure, iterations) {
const kBond = 0.1;
const kAngle = 0.01;
const kRepulsion = 0.05;
for (let iter = 0; iter < iterations; iter++) {
    for (let bond of structure.bonds) {
    if (bond.a < 0 || bond.a >= structure.atoms.length || bond.b < 0 || bond.b >= structure.atoms.length) {
        continue;
    }
    let atomA = structure.atoms[bond.a];
    let atomB = structure.atoms[bond.b];
    let ideal = getBondLength(atomA.element, atomB.element, bond.order);
    let delta = new THREE.Vector3().subVectors(atomB.pos, atomA.pos);
    let d = delta.length();
    if (d === 0) continue;
    let diff = d - ideal;
    let force = delta.clone().normalize().multiplyScalar(kBond * diff);
    atomA.pos.add(force);
    atomB.pos.sub(force);
    }
    for (let b = 0; b < structure.atoms.length; b++) {
    let connected = [];
    for (let bond of structure.bonds) {
        if (bond.a === b) connected.push(bond.b);
        else if (bond.b === b) connected.push(bond.a);
    }
    if (connected.length < 2) continue;
    if (b < 0 || b >= structure.atoms.length) continue;
    let elem = structure.atoms[b].element;
    let n = connected.length;
    let idealAngle = 109.5;
    if (elem === "C") {
        if (n === 4) idealAngle = 109.5;
        else if (n === 3) idealAngle = 120;
        else if (n === 2) idealAngle = 180;
    } else if (elem === "N") {
        if (n === 3) idealAngle = 107;
        else if (n === 2) idealAngle = 120;
    } else if (elem === "O") {
        if (n === 2) idealAngle = 104.5;
    }
    for (let i = 0; i < connected.length; i++) {
        for (let j = i + 1; j < connected.length; j++) {
        if (connected[i] < 0 || connected[i] >= structure.atoms.length ||
            connected[j] < 0 || connected[j] >= structure.atoms.length) continue;
        let A = structure.atoms[connected[i]];
        let C = structure.atoms[connected[j]];
        let B = structure.atoms[b];
        let vA = new THREE.Vector3().subVectors(A.pos, B.pos).normalize();
        let vC = new THREE.Vector3().subVectors(C.pos, B.pos).normalize();
        let currentAngle = vA.angleTo(vC) * (180 / Math.PI);
        let angleDiff = currentAngle - idealAngle;
        let correctionMag = kAngle * angleDiff * (Math.PI / 180);
        let perp = new THREE.Vector3().crossVectors(vA, vC).normalize();
        let adjustA = new THREE.Vector3().crossVectors(perp, vA).normalize().multiplyScalar(correctionMag);
        let adjustC = new THREE.Vector3().crossVectors(vC, perp).normalize().multiplyScalar(correctionMag);
        A.pos.add(adjustA);
        C.pos.add(adjustC);
        }
    }
    }
    for (let i = 0; i < structure.atoms.length; i++) {
    for (let j = i + 1; j < structure.atoms.length; j++) {
        let atomA = structure.atoms[i];
        let atomB = structure.atoms[j];
        let d = atomA.pos.distanceTo(atomB.pos);
        let rA = atomicData[atomA.element] ? atomicData[atomA.element].radius : 0.5;
        let rB = atomicData[atomB.element] ? atomicData[atomB.element].radius : 0.5;
        let minDist = (rA + rB) * 1.2;
        if (d < minDist && d > 0) {
        let repForce = kRepulsion * (minDist - d);
        let forceVec = new THREE.Vector3().subVectors(atomA.pos, atomB.pos).normalize().multiplyScalar(repForce);
        atomA.pos.add(forceVec);
        atomB.pos.sub(forceVec);
        }
    }
    }
}
}

// =====================================================
// Molecule3D Class: Create Three.js Meshes from Connectivity
// =====================================================
export default class Molecule3D {
constructor(formula, xOffset = 0) {
    this.formula = formula;
    this.xOffset = xOffset;
    this.structure = buildMolecule(formula);
    this.atoms = [];
    this.bonds = [];
    this.createMolecule();
}
createMolecule() {
    for (let atom of this.structure.atoms) {
    const elem = atom.element;
    const data = atomicData[elem] || { color: 0x888888, radius: 0.5 };
    const geometry = new THREE.SphereGeometry(data.radius, 32, 32);
    const material = new THREE.MeshStandardMaterial({ color: data.color });
    const mesh = new THREE.Mesh(geometry, material);
    let pos = atom.pos.clone().add(new THREE.Vector3(this.xOffset, 0, 0));
    mesh.position.copy(pos);
    scene.add(mesh);
    this.atoms.push(mesh);
    }
    for (let bond of this.structure.bonds) {
    let posA = this.structure.atoms[bond.a].pos.clone().add(new THREE.Vector3(this.xOffset, 0, 0));
    let posB = this.structure.atoms[bond.b].pos.clone().add(new THREE.Vector3(this.xOffset, 0, 0));
    let bondMeshes = createBondMesh(posA, posB, bond.order);
    this.bonds.push(...bondMeshes);
    }
}
}

// =====================================================
// Create Sample Molecules (Test Cases)
// =====================================================
// new Molecule3D("C2H4", -80);
// new Molecule3D("C2H5OH", -70);
// new Molecule3D("CH3OCH3", -60);      // Dimethyl ether
// new Molecule3D("C6H12", -50);
// new Molecule3D("CH4", -40);
// new Molecule3D("C6H5NH2", -30);       // Aniline (phenyl + amino group)
// new Molecule3D("C6H5SO3H", -20);       // Benzenesulfonic acid (phenyl with -SO3H attached)

// new Molecule3D("O2", 0);
// new Molecule3D("NH3", 20);
// new Molecule3D("C2H5OH", 40);
// new Molecule3D("H2O", 60);
// new Molecule3D("H2", 80);
// new Molecule3D("SO3", 100);
// new Molecule3D("H3PO4", 120);
// new Molecule3D("CO2", 140);
// new Molecule3D("CH3COONH4", 160);
// new Molecule3D("CH3COOC2H5", 180);
// new Molecule3D("CH3COOH", 200);
// new Molecule3D("CH3OCH3", 220);
// new Molecule3D("C6H12", 240);
// new Molecule3D("CH4", 260);
// new Molecule3D("C6H5NH2", 280);       // Aniline appears again for testing
// new Molecule3D("C6H5SO3H", 300);
//   new Molecule3D("CH3OPO3H2", 320);

// =====================================================
// Animation Loop
// =====================================================
export function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// =====================================================
// Clear Scene Function
// This function removes all objects from the scene except lights.
// =====================================================
export function clearScene() {
    for (let i = scene.children.length - 1; i >= 0; i--) {
        const child = scene.children[i];
        // Preserve lights (ambient, point, etc.)
        if (!(child instanceof THREE.Light)) {
        scene.remove(child);
        }
    }
}