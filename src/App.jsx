import React, { useRef, useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Card,
  CardContent,
  Box,
  Grid,
  Button,
  TextField,
  CssBaseline,
} from '@mui/material';
import { motion } from 'framer-motion';
import './App.css';

// Import Molecule3D from the module you created.
import Molecule3D, {attachRendererToContainer, lightcamerasetup, animate, clearScene} from './Molecule3D';

// Helper function to render molecules into a given container.
// (This version assumes you have modified Molecule3D so that its constructor signature is:
//    new Molecule3D(formula, xOffset, container)
// instead of always appending to document.body.)
const renderMolecules = (molecules, container) => {
  if (!container) return;
  // Clear out the container (for example, remove any previous canvas)
  container.innerHTML = '';
  // Render each molecule with a slight horizontal offset.
  attachRendererToContainer(container);
  lightcamerasetup();
  clearScene();
  molecules.forEach((formula, index) => {
    // Create a new Molecule3D instance; note that you may need to adjust this
    // depending on how you’ve reworked your Molecule3D class.
    for (let i = 0; i < formula.coefficient; i++) {
      new Molecule3D(formula.name, index * 5 + i*2);
    }
    animate();
  });
};

function App() {
  // Refs for the viewer boxes.
  const viewerReactantsRef = useRef(null);
  const viewerProductsRef = useRef(null);
  const [numReactants, setNumReactants] = useState(1);
  const [reactants, setReactants] = useState([{ name: '', coefficient: '' }]);
  const [products, setProducts] = useState([]);

  // Validate molecule formula: only allow groups of allowed elements (C, H, N, O, P, S)
  // optionally followed by digits.
  const isValidFormula = (name) => {
    return /^(?:[CHNOPS](?:\d+)?)+$/.test(name);
  };

  // Validate coefficient: should be a positive integer.
  const isValidCoefficient = (coefficient) => {
    return /^[1-9]\d*$/.test(coefficient);
  };

  const handleNumReactantsChange = (e) => {
    const value = parseInt(e.target.value, 10) || 1;
    setNumReactants(value);

    if (value > reactants.length) {
      const newReactants = [...reactants];
      while (newReactants.length < value) {
        newReactants.push({ name: '', coefficient: '' });
      }
      setReactants(newReactants);
    } else {
      setReactants((prev) => prev.slice(0, value));
    }
  };

  const handleReactantChange = (index, field, value) => {
    // For the molecular formula, force uppercase.
    if (field === 'name') {
      value = value.toUpperCase();
    }
    const updated = [...reactants];
    updated[index][field] = value;
    setReactants(updated);
  };

  // This handler will render the reactant molecules into the reactants viewer.
  const handleShowReactants = () => {
    // Validate that each reactant field is complete and valid.
    const invalidReactants = reactants.filter(
      (r) =>
        r.name === '' ||
        !isValidFormula(r.name) ||
        r.coefficient === '' ||
        !isValidCoefficient(r.coefficient)
    );
    if (invalidReactants.length > 0) {
      alert(
        'Please check that all reactant molecule formulae are valid (only C, H, N, O, P, S allowed) and that all coefficients are positive integers.'
      );
      return;
    }
    // Create an array of formulas (if you have coefficients, you might want to render each formula
    // as many times as the coefficient indicates – here we simply render one instance per reactant)
    // const reactantFormulas = reactants.map((r) => r.name);
    renderMolecules(reactants, viewerReactantsRef.current);
  };

  // The handleBond function is triggered when the Bond button is pressed.
  // In addition to (or instead of) making your fetch call, you can also render the product molecules.
  const handleBond = () => {
    // Validate reactants first.
    const invalidReactants = reactants.filter(
      (r) =>
        r.name === '' ||
        !isValidFormula(r.name) ||
        r.coefficient === '' ||
        !isValidCoefficient(r.coefficient)
    );
    if (invalidReactants.length > 0) {
      alert(
        'Please check that all reactant molecule formulae are valid (only C, H, N, O, P, S allowed) and that all coefficients are positive integers.'
      );
      return;
    }
    console.log('Bonding these reactants:', reactants);

    // Your API call (for example, to calculate a reaction) remains the same.
    fetch('http://localhost:3000/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reactants: reactants,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log('Response from API:', data);
        // Assume that data.reactions[0].products is an array of product formulas.
        setProducts(data.reactions[0].products);
        // Render the product molecules in the products viewer.
        renderMolecules(data.reactions[0].products, viewerProductsRef.current);
        // alert('Bond successful! Check the console for results.');
      })
      .catch((error) => {
        console.error('Error:', error);
        alert('Bond failed. Check the inputs.');
      });
  };

  return (
    <>
      <CssBaseline />
      <Box
        sx={{
          background: '#70b6a1',
          minHeight: '100vh',
          color: 'white',
          pb: 6,
        }}
      >
        {/* AppBar */}
        <AppBar
          position="static"
          sx={{
            background: 'rgba(20,20,20,0.8)',
            backdropFilter: 'blur(10px)',
            boxShadow: 'none',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <Toolbar>
            <Typography
              variant="h6"
              sx={{
                flexGrow: 1,
                textAlign: 'center',
                color: '#b0bec5',
                fontWeight: 'bold',
                fontSize: '3rem',
                fontFamily: '"Lora", serif',
              }}
            >
              BOND
            </Typography>
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg" sx={{ mt: 6, mb: 6 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Grid container spacing={4}>
              {/* Reactant Setup Card */}
              <Grid item xs={12}>
                <Card
                  sx={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(8px)',
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
                    transition: 'transform 0.3s, box-shadow 0.3s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
                    },
                  }}
                >
                  <CardContent>
                    <Typography
                      variant="h5"
                      gutterBottom
                      sx={{
                        color: 'black',
                        fontWeight: 600,
                        fontFamily: '"Lora", serif',
                        textAlign: 'center',
                      }}
                    >
                      Reactant Setup
                    </Typography>

                    {/* Number of Reactants */}
                    <TextField
                      label="Number of Reactants"
                      type="number"
                      variant="outlined"
                      size="small"
                      className="lora-regular"
                      InputLabelProps={{ style: { color: 'black', fontFamily: '"Lora", serif' } }}
                      sx={{
                        mb: 3,
                        backgroundColor: 'rgba(0,0,0,0.2)',
                        borderRadius: '4px',
                        input: { color: 'black' },
                        fontFamily: '"Lora", serif',
                      }}
                      inputProps={{ min: 1 }}
                      value={numReactants}
                      onChange={handleNumReactantsChange}
                    />

                    {/* Dynamic Reactant Fields */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                      {reactants.map((reactant, index) => {
                        const formulaError =
                          reactant.name !== '' && !isValidFormula(reactant.name);
                        const coefficientError =
                          reactant.coefficient !== '' &&
                          !isValidCoefficient(reactant.coefficient);
                        return (
                          <Box
                            key={index}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              border: '1px solid rgba(255,255,255,0.2)',
                              borderRadius: '8px',
                              p: 1,
                            }}
                          >
                            <TextField
                              label="Coeff."
                              variant="outlined"
                              size="small"
                              type="number"
                              InputLabelProps={{ style: { color: 'black', fontFamily: '"Lora", serif' } }}
                              inputProps={{ min: 1, step: 1 }}
                              sx={{
                                width: 80,
                                backgroundColor: 'rgba(0,0,0,0.2)',
                                input: { color: 'black' },
                                fontFamily: '"Lora", serif',
                              }}
                              value={reactant.coefficient}
                              onChange={(e) =>
                                handleReactantChange(index, 'coefficient', e.target.value)
                              }
                              error={coefficientError}
                              helperText={coefficientError ? 'Must be a positive integer' : ''}
                            />

                            <TextField
                              label="Molecular Formula"
                              variant="outlined"
                              size="small"
                              InputLabelProps={{ style: { color: 'black', fontFamily: '"Lora", serif' } }}
                              sx={{
                                width: 140,
                                backgroundColor: 'rgba(0,0,0,0.2)',
                                input: { color: 'black' },
                                fontFamily: '"Lora", serif',
                              }}
                              value={reactant.name}
                              onChange={(e) =>
                                handleReactantChange(index, 'name', e.target.value)
                              }
                              placeholder="e.g. H2O"
                              error={formulaError}
                              helperText={formulaError ? 'Only C, H, N, O, P, S allowed' : ''}
                            />
                          </Box>
                        );
                      })}
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, gap: 2 }}>
                      <Button
                        variant="contained"
                        sx={{
                          background: 'linear-gradient(45deg, #607d8b, #455a64)',
                          color: '#fff',
                          padding: '10px 40px',
                          borderRadius: '8px',
                          textTransform: 'none',
                          fontWeight: 'bold',
                          fontSize: '1.5rem',
                          fontFamily: '"Lora", serif',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                          transition: 'background 0.3s, transform 0.2s',
                          '&:hover': {
                            background: 'linear-gradient(45deg, #455a64, #607d8b)',
                            transform: 'scale(1.02)',
                          },
                        }}
                        onClick={handleShowReactants}
                      >
                        Show Reactants
                      </Button>

                      <Button
                        variant="contained"
                        sx={{
                          background: 'linear-gradient(45deg, #607d8b, #455a64)',
                          color: '#fff',
                          padding: '10px 40px',
                          borderRadius: '8px',
                          textTransform: 'none',
                          fontWeight: 'bold',
                          fontSize: '1.5rem',
                          fontFamily: '"Lora", serif',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                          transition: 'background 0.3s, transform 0.2s',
                          '&:hover': {
                            background: 'linear-gradient(45deg, #455a64, #607d8b)',
                            transform: 'scale(1.02)',
                          },
                        }}
                        onClick={handleBond}
                      >
                        Show Products
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* 3D Molecule Card for Reactants */}
              <Grid item xs={12} md={6}>
                <Card
                  sx={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(8px)',
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
                    transition: 'transform 0.3s, box-shadow 0.3s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
                    },
                  }}
                >
                  <CardContent>
                    <Typography
                      variant="h5"
                      gutterBottom
                      sx={{
                        color: 'black',
                        fontWeight: 600,
                        fontFamily: '"Lora", serif',
                      }}
                    >
                      Reactants
                    </Typography>
                    <Box
                      ref={viewerReactantsRef}
                      sx={{
                        width: '100%',
                        height: '400px',
                        backgroundColor: 'rgba(0,0,0,0.4)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                      }}
                    >
                      <Typography variant="body1" color="gray" className="lora-regular">
                        3D viewer for reactants will be shown here.
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* 3D Molecule Card for Products */}
              <Grid item xs={12} md={6}>
                <Card
                  sx={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(8px)',
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
                    transition: 'transform 0.3s, box-shadow 0.3s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
                    },
                  }}
                >
                  <CardContent>
                    <Typography
                      variant="h5"
                      gutterBottom
                      sx={{
                        color: 'black',
                        fontWeight: 600,
                        fontFamily: '"Lora", serif',
                      }}
                    >
                      Products
                    </Typography>
                    <Box
                      ref={viewerProductsRef}
                      sx={{
                        width: '100%',
                        height: '400px',
                        backgroundColor: 'rgba(0,0,0,0.4)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Typography variant="body1" color="gray" className="lora-regular">
                        3D viewer for products will be shown here.
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </motion.div>
        </Container>
      </Box>
    </>
  );
}

export default App;
