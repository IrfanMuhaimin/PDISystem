import React, { useContext, useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { ChecklistContext } from '../context/ChecklistContext';

// --- Keep original constants ---
const imageKeys = ['vehicle1', 'vehicle2', 'vehicle3'];
const baseImages = {
    'vehicle1': require('../assets/vehicle.png'),
    'vehicle2': require('../assets/vehicle2.png'),
    'vehicle3': require('../assets/vehicle3.png')
};
const MARKER_SIZE = 24;

export default function MarkModal({ visible, onClose, selectedItem, closeDefectModal }) {
    // --- Keep original state and context hooks ---
    const { updateDefectDetails } = useContext(ChecklistContext);
    const [selectedImageKey, setSelectedImageKey] = useState('vehicle1');
    const [marks, setMarks] = useState([]);
    const [imageLayout, setImageLayout] = useState(null);
    const isInitialRenderForVisibility = useRef(true); // Ref to track initial setup

    // *** REVISED useEffect Hook ***
    useEffect(() => {
        // This effect now ONLY sets state when visibility CHANGES FROM false TO true
        if (visible) {
            // Check the ref to see if we already processed this visibility event
            if (isInitialRenderForVisibility.current) {
                console.log('[Effect] Initial setup for visible modal. Item:', selectedItem?.name);
                if (selectedItem) {
                    const initialImageKey = selectedItem.defectDetails?.selectedImage || 'vehicle1';
                    // Load marks ONLY if they were explicitly saved for the initialImageKey
                    const initialMarks = (selectedItem.defectDetails?.selectedImage === initialImageKey)
                                         ? (selectedItem.defectDetails.marks || [])
                                         : [];

                    console.log(`[Effect] Setting initial state: key=${initialImageKey}, marksCount=${initialMarks.length}`);
                    setSelectedImageKey(initialImageKey);
                    setMarks(initialMarks);
                    setImageLayout(null); // Reset layout for measurement
                } else {
                    // Fallback if no item (shouldn't happen with correct usage)
                    console.log('[Effect] No selected item on initial visibility, resetting state.');
                    setSelectedImageKey('vehicle1');
                    setMarks([]);
                    setImageLayout(null);
                }
                // Mark initial setup as done for this visibility period
                isInitialRenderForVisibility.current = false;
            } else {
                 console.log('[Effect] Skipping state set, not initial render for this visibility period.');
            }
        } else {
            // Reset the ref when the modal becomes hidden
            console.log('[Effect] Modal hidden, resetting initial render flag.');
            isInitialRenderForVisibility.current = true;
            setImageLayout(null); // Also clear layout when hidden
        }
    }, [visible, selectedItem]); // Keep dependencies, but logic inside controls execution


    // --- Keep original handleImageTap function ---
    const handleImageTap = (event) => {
        if (!selectedItem || !imageLayout) return;
        const { locationX, locationY } = event.nativeEvent;
        const { width, height } = imageLayout;
        if (locationX < 0 || locationX > width || locationY < 0 || locationY > height) return;
        const newMark = { nx: locationX / width, ny: locationY / height };
        const updatedMarks = [...marks, newMark];
        setMarks(updatedMarks);
        // Update context based on the *CURRENTLY* selected image key in the state
        updateDefectDetails(selectedItem.section, selectedItem.name, {
            ...selectedItem.defectDetails,
            marks: updatedMarks,
            selectedImage: selectedImageKey, // Use state value here
        });
        setTimeout(() => {
            onClose();
            if (closeDefectModal) closeDefectModal();
        }, 0);
    };

    // --- Keep original handleImageChange function ---
    const handleImageChange = (newImageKey) => {
        console.log(`handleImageChange: Setting state key = ${newImageKey}`);
        setSelectedImageKey(newImageKey); // Update local state
        setMarks([]);                 // Clear local marks view
        setImageLayout(null);        // Reset layout

        // Update context with the new image key being viewed
        // Let handleImageTap handle saving marks specific to this key
        updateDefectDetails(selectedItem.section, selectedItem.name, {
            ...selectedItem.defectDetails,
            // Important: Don't clear marks in context here, only update the selected image pointer
            selectedImage: newImageKey,
        });
    };

    // --- Keep original getImageSource function ---
    const getImageSource = () => {
        console.log(`[Render] getImageSource called with key: ${selectedImageKey}`);
        return baseImages[selectedImageKey] || baseImages['vehicle1'];
    };

    // --- Keep original navigation handlers ---
    const handleNextImage = () => {
        const currentIndex = imageKeys.indexOf(selectedImageKey);
        const nextIndex = (currentIndex + 1) % imageKeys.length;
        handleImageChange(imageKeys[nextIndex]);
    };

    const handlePreviousImage = () => {
        const currentIndex = imageKeys.indexOf(selectedImageKey);
        const previousIndex = (currentIndex - 1 + imageKeys.length) % imageKeys.length;
        handleImageChange(imageKeys[previousIndex]);
    };

    // --- Keep original onImageLayout callback ---
     const onImageLayout = useCallback((event) => {
        const { width, height } = event.nativeEvent.layout;
        console.log(`[Layout] Measured: ${width}x${height} for key ${selectedImageKey}`);
        // Check layout dimensions before setting state
        if (width > 0 && height > 0) {
             if (!imageLayout || imageLayout.width !== width || imageLayout.height !== height) {
                setImageLayout({ width, height });
            }
        } else {
            console.warn(`[Layout] Invalid layout dimensions measured: ${width}x${height}`);
        }
    }, [imageLayout, selectedImageKey]); // Add selectedImageKey dependency


    // --- Rendering Logic ---
    console.log(`[Render] Rendering MarkModal. Current selectedImageKey state: ${selectedImageKey}`);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.modalContainer}>
                <Text style={styles.header}>Mark Defect Location</Text>
                <View style={styles.imageSelector}>
                    <TouchableOpacity onPress={handlePreviousImage} style={styles.imageButton}>
                        <Text style={styles.imageButtonText}>Back</Text>
                    </TouchableOpacity>
                     <Text style={{color:'white', marginHorizontal: 10, fontSize: 16, fontWeight: 'bold'}}>{selectedImageKey}</Text>
                    <TouchableOpacity onPress={handleNextImage} style={styles.imageButton}>
                        <Text style={styles.imageButtonText}>Next</Text>
                    </TouchableOpacity>
                </View>
                <View>
                    <TouchableOpacity activeOpacity={1} onPress={handleImageTap} disabled={!imageLayout}>
                        <Image
                            key={selectedImageKey} // Keep the key prop!
                            source={getImageSource()}
                            style={styles.image}
                            onLayout={onImageLayout}
                            onError={(e) => console.error("Image Load Error:", e.nativeEvent.error)}
                        />
                        {imageLayout && marks.map((mark, index) => {
                            const pixelX = mark.nx * imageLayout.width;
                            const pixelY = mark.ny * imageLayout.height;
                            const markerStyle = {
                                left: pixelX - MARKER_SIZE / 2,
                                top: pixelY - MARKER_SIZE / 2,
                             };
                            return (
                                <View key={index} style={[styles.markerContainer, markerStyle]}>
                                    {selectedItem?.defectDetails?.location === 'Interior' && <View style={styles.circle} />}
                                    <Text style={styles.xMark}>X</Text>
                                </View>
                            );
                        })}
                        {/* Optional: Add loading indicator if imageLayout is null */}
                        {!imageLayout && (
                            <View style={styles.loadingOverlay}>
                                {/* You can put an ActivityIndicator or Text here */}
                                <Text style={{color: 'white'}}>Loading Image...</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                    <Text style={styles.closeText}>Close</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );
}

// --- ORIGINAL STYLES + Loading Overlay ---
const styles = StyleSheet.create({
    modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    header: { fontSize: 20, fontWeight: 'bold', color: 'white', marginBottom: 10 },
    imageSelector: { flexDirection: 'row', justifyContent: 'space-around', width: '90%', marginBottom: 10, alignItems: 'center' },
    imageButton: { backgroundColor: '#ffe6cc', padding: 15, paddingHorizontal: 40, borderRadius: 5 },
    imageButtonText: { fontWeight: 'bold', color: 'black' },
    image: { width: 500, height: 600, resizeMode: 'contain', backgroundColor: 'white' },
    markerContainer: { position: 'absolute', alignItems: 'center', justifyContent: 'center', width: MARKER_SIZE, height: MARKER_SIZE },
    xMark: { fontSize: 16, fontWeight: 'bold', color: 'red' },
    circle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: 'black', position: 'absolute' },
    closeButton: { marginTop: 20, backgroundColor: 'maroon', padding: 15, paddingHorizontal: 40, borderRadius: 5 },
    closeText: { fontWeight: 'bold', color: 'white' },
    // Added simple overlay style
    loadingOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    }
});