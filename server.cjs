// server.js
const express = require("express");
const fs = require("fs");
const csvParser = require("csv-parser");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors({
    origin: "http://localhost:5173" ,
    methods: ["GET", "POST"]
}));

// Load CSV data into memory
let chemicalReactions = [];
fs.createReadStream("organic_reactions.csv")
  .pipe(csvParser())
  .on("data", (row) => {
    chemicalReactions.push(row);
  })
  .on("end", () => {
    console.log("CSV file loaded into memory!");
  });

// POST endpoint for searching reactions
app.post("/search", (req, res) => {
  const { reactants } = req.body; // Expecting reactants as an array of objects with name and coefficient

  if (!reactants || !Array.isArray(reactants) || reactants.length === 0) {
    return res
      .status(400)
      .json({ error: `Please provide an array of reactants. ${reactants}` });
  }

  // Create a map of user reactants with their coefficients
  const userReactantsMap = {};
  reactants.forEach((reactant) => {
    userReactantsMap[reactant.name] = parseInt(reactant.coefficient, 10);
  });

  // Function to check if user has enough of each reactant
  const isMatch = (reaction) => {
    const requiredReactants = [];
    const requiredRatios = [];
    let coeff1, coeff2, coeff3;

    if (reaction.reactant_1) {
      coeff1 = parseInt(reaction.coefficient_1, 10);
      requiredReactants.push({ name: reaction.reactant_1, coefficient: coeff1 });
    }
    if (reaction.reactant_2) {
      coeff2 = parseInt(reaction.coefficient_2, 10);
      requiredReactants.push({ name: reaction.reactant_2, coefficient: coeff2 });
      requiredRatios.push({ between: "21", ratio: coeff2 / coeff1 });
    }
    if (reaction.reactant_3) {
      coeff3 = parseInt(reaction.coefficient_3, 10);
      requiredReactants.push({
        name: reaction.reactant_3,
        coefficient: coeff3,
      });
      requiredRatios.push({ between: "32", ratio: coeff3 / coeff2 });
    }

    // Check if user has sufficient amounts of each required reactant
    const hasEnoughReactants = requiredReactants.every((reactant) => {
      const userCoeff = userReactantsMap[reactant.name] || 0;
      return userCoeff >= reactant.coefficient;
    });

    if (!hasEnoughReactants) {
      return false;
    }

    // Check the ratio between reactants
    let isValidRatio = true;
    requiredRatios.forEach((ratio) => {
      // Extract indices from the string "21" or "32"
      const [firstIdx, secondIdx] = ratio.between.split("").map(Number);
      const firstName = reaction[`reactant_${firstIdx}`];
      const secondName = reaction[`reactant_${secondIdx}`];
      const userFirst = userReactantsMap[firstName];
      const userSecond = userReactantsMap[secondName];
      const userRatio = userFirst / userSecond;
      if (Math.abs(userRatio - ratio.ratio) > 0.1) {
        // Allow a small margin for floating point differences
        isValidRatio = false;
      }
    });

    return isValidRatio;
  };

  // Filter reactions based on whether the user has enough reactants
  const filteredReactions = chemicalReactions.filter((reaction) =>
    isMatch(reaction)
  );

  // Map over filtered reactions to calculate products based on the limiting reagent
  const results = filteredReactions.map((reaction) => {
    const products = [];
    let ratioMultiple = 1000; // default large number

    if (reaction.reactant_1) {
      const coeff1 = parseInt(reaction.coefficient_1, 10);
      const userCoeff1 = userReactantsMap[reaction.reactant_1];
      ratioMultiple = Math.min(ratioMultiple, Math.floor(userCoeff1 / coeff1));
    }
    if (reaction.reactant_2) {
      const coeff2 = parseInt(reaction.coefficient_2, 10);
      const userCoeff2 = userReactantsMap[reaction.reactant_2];
      ratioMultiple = Math.min(ratioMultiple, Math.floor(userCoeff2 / coeff2));
    }
    if (reaction.reactant_3) {
      const coeff3 = parseInt(reaction.coefficient_3, 10);
      const userCoeff3 = userReactantsMap[reaction.reactant_3];
      ratioMultiple = Math.min(ratioMultiple, Math.floor(userCoeff3 / coeff3));
    }

    if (reaction.product_1) {
      products.push({
        name: reaction.product_1,
        coefficient: parseInt(reaction.coefficient_p1, 10) * ratioMultiple,
      });
    }
    if (reaction.product_2) {
      products.push({
        name: reaction.product_2,
        coefficient: parseInt(reaction.coefficient_p2, 10) * ratioMultiple,
      });
    }
    if (reaction.product_3) {
      products.push({
        name: reaction.product_3,
        coefficient: parseInt(reaction.coefficient_p3, 10) * ratioMultiple,
      });
    }

    return { products };
  });

  if (results.length === 0) {
    res.status(404).json({ error: 'No reactions found for the given reactants.' });
    return;
  }

  res.json({ reactions: results });
});

// ── Serve Static Files ──
// Tell Express to serve files from the "public" folder.
app.use(express.static(path.join(__dirname, "")));

// For a single-page app (SPA), send index.html for any unknown route.
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
