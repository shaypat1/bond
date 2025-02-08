const express = require("express");
const fs = require("fs");
const csvParser = require("csv-parser");
const cors = require("cors");

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json()); // Enable JSON parsing for request body
app.use(cors()); // Enable cross-origin requests

// Store chemical reactions in memory
let chemicalReactions = [];

// Load CSV into memory on server start
fs.createReadStream("organic_reactions.csv")
  .pipe(csvParser())
  .on("data", (row) => {
    chemicalReactions.push(row);
  })
  .on("end", () => {
    console.log("CSV file loaded into memory!");
  });

// POST endpoint to search for reactions
app.post("/search", (req, res) => {
    const { reactants } = req.body; // Expecting reactants as an array of objects with name and coefficient

    if (!reactants || !Array.isArray(reactants) || reactants.length === 0) {
        return res.status(400).json({ error: "Please provide an array of reactants." });
    }

    // Create a map of user reactants with their coefficients
    const userReactantsMap = {};
    reactants.forEach(reactant => {
        userReactantsMap[reactant.name] = reactant.coefficient;
    });

    // Function to check if user has enough of each reactant
    const isMatch = (reaction) => {
        const requiredReactants = [];
        const requiredRatios = [];
        if (reaction.reactant_1) {
            coeff1 = parseInt(reaction.coefficient_1, 10);
            requiredReactants.push({ name: reaction.reactant_1, coefficient: coeff1 });
        }
        if (reaction.reactant_2) {
            coeff2 = parseInt(reaction.coefficient_2, 10);
            requiredReactants.push({ name: reaction.reactant_2, coefficient: coeff2 });
            requiredRatios.push({ between: "21", ratio: coeff2 / coeff1 })
        }
        if (reaction.reactant_3) {
            coeff3 = parseInt(reaction.coefficient_3, 10);
            requiredReactants.push({ name: reaction.reactant_3, coefficient: parseInt(reaction.coefficient_3, 10) });
            requiredRatios.push({ between: "32", ratio: coeff3 / coeff2 })
        }
        reactantCoeffs = []

        // Check if user has sufficient amounts of each required reactant
        const hasEnoughReactants = requiredReactants.every(reactant => {
            const userCoeff = userReactantsMap[reactant.name] || 0;
            reactantCoeffs.push(userCoeff);
            return userCoeff >= reactant.coefficient;
        });

        if (!hasEnoughReactants) {
            return false;
        }


        // Check the ratio between reactants
        let isValidRatio = true;
        requiredRatios.forEach(ratio => {
            const [firstReactant, secondReactant] = ratio.between.split("").map(r => parseInt(r));
            const userRatio = userReactantsMap[`${reaction[`reactant_${firstReactant}`]}`] / userReactantsMap[`${reaction[`reactant_${secondReactant}`]}`];
            if (Math.abs(userRatio - ratio.ratio) > 0.1) { // Allowing a small margin of error for floating point comparisons
                isValidRatio = false;
            }
        });

        return isValidRatio;
    };

    // Filter reactions based on whether the user has enough reactants
    const filteredReactions = chemicalReactions.filter(reaction => isMatch(reaction));

    // Map over the filtered reactions to return only the products and their coefficients
    const results = filteredReactions.map(reaction => {
        const products = [];
        let ratioMultiple = 1000; // Default ratio multiple

        // Get the ratio multiple for this reaction

        if (reaction.reactant_1) {
            const coeff1 = parseInt(reaction.coefficient_1, 10);
            const userCoeff1 = userReactantsMap[reaction.reactant_1];
            ratioMultiple = Math.min(ratioMultiple, Math.floor(userCoeff1/coeff1));
        }
        if (reaction.reactant_2) {
            const coeff2 = parseInt(reaction.coefficient_2, 10);
            const userCoeff2 = userReactantsMap[reaction.reactant_2];
            ratioMultiple = Math.min(ratioMultiple, Math.floor(userCoeff2/coeff2));
        }
        if (reaction.reactant_3) {
            const coeff3 = parseInt(reaction.coefficient_3, 10);
            const userCoeff3 = userReactantsMap[reaction.reactant_3];
            ratioMultiple = Math.min(ratioMultiple, Math.floor(userCoeff3/coeff3));
        }

        // Add products with the multiplied coefficient based on the ratio
        if (reaction.product_1) {
            products.push({
                name: reaction.product_1,
                coefficient: parseInt(reaction.coefficient_p1, 10) * ratioMultiple
            });
        }
        if (reaction.product_2) {
            products.push({
                name: reaction.product_2,
                coefficient: parseInt(reaction.coefficient_p2, 10) * ratioMultiple
            });
        }
        if (reaction.product_3) {
            products.push({
                name: reaction.product_3,
                coefficient: parseInt(reaction.coefficient_p3, 10) * ratioMultiple
            });
        }

        return { products };
    });

    // Return only the products with their coefficients
    res.json({ reactions: results });
});




// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
