// context/RectifyContext.js
import React, { createContext, useState, useCallback, useMemo } from 'react';

// Define the initial shape of your context state
const initialRectifyState = {
  carInfo: null,
  rectifyItems: [],
  images: [],
  loading: false,
  error: null,
};

// Create the context with default values (including functions)
export const RectifyContext = createContext({
  ...initialRectifyState,
  setRectifyData: (fetchedCarInfo, fetchedDefectItems, fetchedImages) => {},
  clearRectifyData: () => {},
  rectifyItemWithDetails: (itemId, details) => {}, // Renamed function
  unrectifyItem: (itemId) => {},          // Renamed function
  setLoading: (isLoading) => {},
  setError: (errorMessage) => {},
});

// Create the Provider component
export const RectifyProvider = ({ children }) => {
  const [carInfo, setCarInfo] = useState(initialRectifyState.carInfo);
  const [rectifyItems, setRectifyItems] = useState(initialRectifyState.rectifyItems);
  const [images, setImages] = useState(initialRectifyState.images);
  const [loading, setLoading] = useState(initialRectifyState.loading);
  const [error, setError] = useState(initialRectifyState.error);

  // Function to initialize or update data (e.g., from API)
  const setRectifyData = useCallback((fetchedCarInfo, fetchedDefectItems, fetchedImages) => {
    console.log("[RectifyContext] Setting rectify data");
    setCarInfo(fetchedCarInfo || null);
    setImages(fetchedImages || []);

    // Process fetched items: ensure 'rectified' starts as false and details are null
    const initialRectifyItems = (fetchedDefectItems || []).map(item => ({
      ...item, // Spread fetched item properties
      rectified: !!item.rectified, // Use fetched status if available, otherwise default false
      // Ensure rectifier fields exist, using fetched or null
      rectifierName: item.rectifierName || null,
      rectifierNo: item.rectifierNo || null,
      rectificationDate: item.rectificationDate || null,
      closed: item.closed || false,
      remark: item.remark || null,
    }));

    setRectifyItems(initialRectifyItems);
    setLoading(false);
    setError(null);
  }, []);

  // Function to clear context state
  const clearRectifyData = useCallback(() => {
    console.log("[RectifyContext] Clearing rectify data");
    setCarInfo(initialRectifyState.carInfo);
    setRectifyItems(initialRectifyState.rectifyItems);
    setImages(initialRectifyState.images);
    setLoading(initialRectifyState.loading);
    setError(initialRectifyState.error);
  }, []);

  // *** RENAMED & CORRECTED: Sets details AND marks as rectified ***
  // Updates an item with details and marks it as rectified.
  const rectifyItemWithDetails = useCallback((itemId, { name, no, remark, date, closed }) => {
    console.log(`Closed: ${closed} `);
    console.log(`[RectifyContext] Rectifying item ${itemId} with details`);
    setRectifyItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId
          ? { // Create new item object immutably
              ...item,
              rectified: true, // <-- Set rectified to TRUE
              rectifierName: name,
              rectifierNo: no,
              rectificationDate: date, // Should be ISO string from modal
              closed: closed || false,
              remark: remark || null,
            }
          : item // Return other items unchanged
      )
    );
  }, []);

  // *** RENAMED & CORRECTED: Only UN-rectifies and clears details ***
  // Marks an item as not rectified and clears its details.
  const unrectifyItem = useCallback((itemId) => {
    console.log(`[RectifyContext] Un-rectifying item ${itemId}`);
    setRectifyItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId
          ? { // Create new item object immutably
              ...item,
              rectified: false, // <-- Set rectified to FALSE
              rectifierName: null, // Clear details
              rectifierNo: null,
              rectificationDate: null,
              closed: false,
              remark: null,
            }
          : item // Return other items unchanged
      )
    );
  }, []);

  // Simple state setters for loading and error
  const handleSetLoading = useCallback((isLoading) => {
    setLoading(isLoading);
  }, []);

  const handleSetError = useCallback((errorMessage) => {
    setError(errorMessage);
    setLoading(false); // Often want to stop loading on error
  }, []);

  // Memoize the context value to optimize performance
  const contextValue = useMemo(() => ({
    carInfo,
    rectifyItems,
    images,
    loading,
    error,
    setRectifyData,
    clearRectifyData,
    rectifyItemWithDetails, // Use new name
    unrectifyItem,          // Use new name
    setLoading: handleSetLoading,
    setError: handleSetError,
  }), [
      carInfo, rectifyItems, images, loading, error, setRectifyData,
      clearRectifyData, rectifyItemWithDetails, unrectifyItem,
      handleSetLoading, handleSetError // Include all functions/state in dependencies
  ]);


  return (
    <RectifyContext.Provider value={contextValue}>
      {children}
    </RectifyContext.Provider>
  );
};