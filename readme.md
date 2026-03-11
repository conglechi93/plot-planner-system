You are a senior 3D web engineer.
Generate a complete project that implements a **3D Plot Planner tool** using:

* Babylon.js
* Vite
* TypeScript

The goal of this project is to create a **web-based tool that allows users to place and manage multiple house models on a land plot in a 3D scene**.

The implementation must follow good engineering practices and a modular architecture.

---

# 1. Tech Stack

Use the following stack:

* Babylon.js for the 3D engine
* Vite for development/build tooling
* TypeScript (strict mode enabled)
* ES modules
* No React or framework (pure TS + Babylon)

Dependencies:

babylonjs
babylonjs-loaders

---

# 2. Project Goal

Implement a **Plot Planner system** where users can:

1. View a 3D plot of land
2. Add house models
3. Place houses on the ground
4. Move houses
5. Rotate houses
6. Select houses
7. Delete houses
8. Save layout data

The system should support **multiple houses in the same scene**.

---

# 3. Project Structure

Follow this architecture:

src/

main.ts

scene/
createScene.ts
camera.ts
lights.ts
ground.ts

systems/
houseLoader.ts
placementSystem.ts
selectionSystem.ts
transformSystem.ts

models/

types/
HouseInstance.ts

utils/
math.ts

public/models/

---

# 4. Scene Setup

Create a Babylon scene with:

ArcRotateCamera
HemisphericLight
DirectionalLight
Large ground mesh representing the plot.

Ground size:

width = 50
height = 50

Enable pointer interaction on the scene.

---

# 5. House Model System

Implement a **HouseLoader module**.

Responsibilities:

Load GLB models from `/public/models`.

Example models:

house_small.glb
house_medium.glb

Each loaded house should return a **HouseInstance object**.

HouseInstance should contain:

id
mesh
position
rotation

---

# 6. Placement System

Implement a placement system that allows users to place houses.

Flow:

User clicks on the ground
Raycast from camera
Detect intersection with ground
Place selected house at that position

Use Babylon picking:

scene.pick()

The picked point should be used as:

mesh.position = pickedPoint

---

# 7. Selection System

Users should be able to click a house to select it.

Requirements:

Highlight the selected house
Store reference to selected house

Example:

selectedHouse: HouseInstance | null

---

# 8. Transform System

Implement transform operations for the selected house.

Move

When dragging the mouse, update position using raycasting.

Rotate

Press "R" key to rotate the house 90 degrees around Y axis.

Example:

mesh.rotation.y += Math.PI / 2

Delete

Press "Delete" key to remove the selected house.

---

# 9. Grid Snapping

Implement grid snapping when placing houses.

Grid size = 1 meter

Use a helper function:

snap(value: number, grid: number)

Example:

Math.round(value / grid) * grid

Apply snapping to X and Z position.

---

# 10. Layout Save System

Provide a function to export layout data.

Return JSON:

{
houses:[
{
type:"small",
position:{x:10,y:0,z:5},
rotation:90
}
]
}

---

# 11. Type Safety

Use TypeScript interfaces.

Example:

HouseInstance

interface HouseInstance {
id: string
mesh: BABYLON.Mesh
type: string
}

---

# 12. Performance Rules

Follow best practices:

Disable unnecessary shadows
Use GLB format models
Avoid heavy textures

---

# 13. Development Commands

Provide npm scripts:

npm install
npm run dev
npm run build

---

# 14. Expected Result

The final application should allow the user to:

Open the webpage
Add houses
Click ground to place houses
Select houses
Rotate houses
Move houses
Delete houses

All interactions must be smooth and responsive.

---

# 15. Bonus (optional)

If possible, implement Babylon GizmoManager to allow visual transform controls.

---

Generate the full codebase including:

* package.json
* vite config
* all TypeScript files
* example HTML
* comments explaining key parts of the code
