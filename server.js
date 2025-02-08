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
fs.createReadStream("simple_chemical_reactions.csv")
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
        const requiredReactants = [
            { name: reaction.reactant_1, coefficient: parseInt(reaction.coefficient_1, 10) },
            { name: reaction.reactant_2, coefficient: parseInt(reaction.coefficient_2, 10) },
            { name: reaction.reactant_3, coefficient: parseInt(reaction.coefficient_3, 10) }
        ];

        // Check if user has sufficient amounts of each required reactant
        return requiredReactants.every(reactant => {
            const userCoeff = userReactantsMap[reactant.name] || 0;
            return userCoeff >= reactant.coefficient;
        });
    };

    // Filter reactions based on whether the user has enough reactants
    const filteredReactions = chemicalReactions.filter(reaction => isMatch(reaction));

    // Return the filtered reactions
    res.json({ reactions: filteredReactions });
});




// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
