// context/DefectTypeContext.js
import React, { createContext } from 'react';

// Define the defect data structure
const defectData = {
    PAINTING: [
        "Scratch", "Chipping", "Line Mark", "Peel Off", "Paint Patching",
        "Rework Visible", "Thin Paint", "Off Colour", "Paint Fault", "Base Mark",
        "Paint Hole", "Sand Grove", "Sanding Mark", "Paint Wavy", "Dent",
        "Hump", "Bend", "Paint Crack", "Rusty", "Touch Up Mark",
        "Paint Touching", "Paint Popping", "Stain Mark", "Acid Mark", "Bird Drop",
        "Dirty", "Orange Peel",
    ],
    MECHANICAL: [
        "Stain Mark", "Scratch", "Not Align", "Jerking & Noise", "Poor Fit",
        "Wrinkle", "Damaged", "Rusty", "Rework Visible", "Crack",
        "Over Spray", "Bulging", "Over Tighten", "Missing", "Detached",
        "Torn", "Stagnant Water", "Bubble", "Not Tighten", "Gap",
        "Not Function", "Broken", "Folded", "Hump", "Dirty",
        "Fungus & Rusty", "Glue Mark", "Spot Mark", "Abnormal", "Bird Drop",
        "Wet", "Abnormal Noise",
    ],
    ELECTRICAL: [
        "Flat", "Malfunction", "Audio Blank", "No Signal",
    ]
};

// Create the context
export const DefectTypeContext = createContext();

// Create the provider component
export const DefectTypeProvider = ({ children }) => {
    // Prepare category options for dropdowns
    const categoryOptions = Object.keys(defectData).map(category => ({
        label: category.charAt(0) + category.slice(1).toLowerCase(),
        value: category
    }));

    // Function to get type options for a specific category
    const getTypeOptionsByCategory = (category) => {
        if (!category || !defectData[category]) return [];
        return defectData[category].map(type => ({
            label: type,
            value: type
        }));
    };

    // Value provided by the context
    const contextValue = {
        defectData, // The raw data object
        categoryOptions, // Formatted options for category dropdown
        getTypeOptionsByCategory // Function to get type options
    };

    return (
        <DefectTypeContext.Provider value={contextValue}>
            {children}
        </DefectTypeContext.Provider>
    );
};