// screens/MarkModal.js 
import React, { useContext, useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { ChecklistContext } from '../context/ChecklistContext';

const imageKeys = ['vehicle1', 'vehicle2', 'vehicle3'];
const baseImages = {
    'vehicle1': require('../assets/vehicle.png'),
    'vehicle2': require('../assets/vehicle2.png'),
    'vehicle3': require('../assets/vehicle3.png')
};
const MARKER_SIZE = 24;

export default function MarkModal({
    visible,
    onClose,
    selectedItem,
}) {
    const { updateDefectDetails } = useContext(ChecklistContext);

    const [currentSelectedImageKey, setCurrentSelectedImageKey] = useState(imageKeys[0]);
    const [currentMarks, setCurrentMarks] = useState([]);
    const [imageLayout, setImageLayout] = useState(null);
    const isInitialSetupDone = useRef(false);

    const itemInfo = selectedItem ? {
                                        id: selectedItem.id,
                                        section: selectedItem.section,
                                        name: selectedItem.name
                                    } : null;
    const initialDefectDetailsFromProp = selectedItem?.defectDetails || {};


    useEffect(() => {
        if (visible) {
            if (!isInitialSetupDone.current) {
                console.log('[MarkModal Effect] Initial setup. Item Name:', itemInfo?.name);
                console.log('[MarkModal Effect] Received initialDefectDetailsFromProp:', JSON.stringify(initialDefectDetailsFromProp));

                const imgKey = initialDefectDetailsFromProp?.selectedImage || imageKeys[0];
                const initMarks = (initialDefectDetailsFromProp?.selectedImage === imgKey && Array.isArray(initialDefectDetailsFromProp.marks))
                                   ? initialDefectDetailsFromProp.marks
                                   : [];

                setCurrentSelectedImageKey(imgKey);
                setCurrentMarks(initMarks);
                setImageLayout(null);
                isInitialSetupDone.current = true;
                console.log(`[MarkModal Effect] Initial state set: imageKey=${imgKey}, marksCount=${initMarks.length}`);
            }
        } else {
            isInitialSetupDone.current = false;
        }
    }, [visible, selectedItem]);

    const handleImageTap = (event) => {
        if (!itemInfo || !itemInfo.id || !itemInfo.section) {
            console.error("[MarkModal Tap] Critical: itemInfo, item ID, or section is missing. selectedItem was:", JSON.stringify(selectedItem));
            return;
        }
        if (!imageLayout) {
            console.warn("[MarkModal Tap] Image layout not available yet.");
            return;
        }

        const { locationX, locationY } = event.nativeEvent;
        const { width, height } = imageLayout;

        if (locationX < 0 || locationX > width || locationY < 0 || locationY > height) {
            console.warn("[MarkModal Tap] Tap occurred out of image bounds.");
            return;
        }

        const newMark = { nx: locationX / width, ny: locationY / height };
        const updatedMarksForThisImage = [...currentMarks, newMark];
        setCurrentMarks(updatedMarksForThisImage);

        const defectDetailsToSave = {
            ...initialDefectDetailsFromProp,
            marks: updatedMarksForThisImage,
            selectedImage: currentSelectedImageKey,
        };

        console.log(`[MarkModal Tap] Updating context for item ${itemInfo.id}, section ${itemInfo.section}. Payload:`, JSON.stringify(defectDetailsToSave));
        updateDefectDetails(itemInfo.section, itemInfo.id, defectDetailsToSave);

        setTimeout(() => {
            onClose();
            if (closeDefectModal) {
                closeDefectModal();
            }
        }, 0);
    };

    const handleImageChange = (newImageKey) => {
        if (!itemInfo || !itemInfo.id || !itemInfo.section) {
            console.error("[MarkModal ImageChange] Critical: itemInfo, item ID, or section is missing.");
            return;
        }

        console.log(`[MarkModal ImageChange] Changing to image: ${newImageKey}`);
        setCurrentSelectedImageKey(newImageKey);
        setCurrentMarks([]);
        setImageLayout(null);

        const defectDetailsForImageChange = {
            ...initialDefectDetailsFromProp,
            selectedImage: newImageKey,
            marks: [],
        };
        console.log(`[MarkModal ImageChange] Updating context for item ${itemInfo.id}. Payload:`, JSON.stringify(defectDetailsForImageChange));
        updateDefectDetails(itemInfo.section, itemInfo.id, defectDetailsForImageChange);
    };

    const getImageSource = () => baseImages[currentSelectedImageKey] || baseImages[imageKeys[0]];

    const handleNextImage = () => {
        const currentIndex = imageKeys.indexOf(currentSelectedImageKey);
        const nextIndex = (currentIndex + 1) % imageKeys.length;
        handleImageChange(imageKeys[nextIndex]);
    };

    const handlePreviousImage = () => {
        const currentIndex = imageKeys.indexOf(currentSelectedImageKey);
        const previousIndex = (currentIndex - 1 + imageKeys.length) % imageKeys.length;
        handleImageChange(imageKeys[previousIndex]);
    };

     const onImageLayout = useCallback((event) => {
        const { width, height } = event.nativeEvent.layout;
        // console.log(`[MarkModal Layout] Measured: ${width}x${height} for key ${currentSelectedImageKey}`);
        if (width > 0 && height > 0) {
             if (!imageLayout || imageLayout.width !== width || imageLayout.height !== height) {
                setImageLayout({ width, height });
                console.log(`[MarkModal Layout] Layout SET for ${currentSelectedImageKey}: ${width}x${height}`);
            }
        } else {
            console.warn(`[MarkModal Layout] Invalid layout dimensions measured: ${width}x${height}`);
        }
    }, [imageLayout, currentSelectedImageKey]);


    if (!visible) {
        return null;
    }

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.modalContainer}>
                <Text style={styles.header}>Mark Defect on: {itemInfo?.name || 'Item'}</Text>
                <View style={styles.imageSelector}>
                    <TouchableOpacity onPress={handlePreviousImage} style={styles.imageButton} disabled={imageKeys.length <=1}>
                        <Text style={styles.imageButtonText}>Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.imageKeyText}>{currentSelectedImageKey}</Text>
                    <TouchableOpacity onPress={handleNextImage} style={styles.imageButton} disabled={imageKeys.length <=1}>
                        <Text style={styles.imageButtonText}>Next</Text>
                    </TouchableOpacity>
                </View>
                <View>
                    <TouchableOpacity activeOpacity={1} onPress={handleImageTap} disabled={!imageLayout}>
                        <Image
                            key={currentSelectedImageKey}
                            source={getImageSource()}
                            style={styles.image}
                            onLayout={onImageLayout}
                            onError={(e) => console.error("Image Load Error for key " + currentSelectedImageKey + ":", e.nativeEvent.error)}
                        />
                        {imageLayout && currentMarks.map((mark, index) => {
                            const pixelX = mark.nx * imageLayout.width;
                            const pixelY = mark.ny * imageLayout.height;
                            const markerStyle = {
                                left: pixelX - MARKER_SIZE / 2,
                                top: pixelY - MARKER_SIZE / 2,
                             };
                            return (
                                <View key={index} style={[styles.markerContainer, markerStyle]}>
                                    {initialDefectDetailsFromProp?.location === 'Interior' && <View style={styles.circle} />}
                                    <Text style={styles.xMark}>X</Text>
                                </View>
                            );
                        })}
                        {!imageLayout && (
                            <View style={styles.loadingOverlay}>
                                <ActivityIndicator size="large" color="white" />
                                <Text style={styles.loadingText}>Loading Image...</Text>
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

const styles = StyleSheet.create({
    modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    header: { fontSize: 20, fontWeight: 'bold', color: 'white', marginBottom: 10 },
    imageSelector: { flexDirection: 'row', justifyContent: 'space-around', width: '90%', marginBottom: 10, alignItems: 'center' },
    imageButton: { backgroundColor: '#ffe6cc', padding: 15, paddingHorizontal: 40, borderRadius: 5 },
    imageButtonText: { fontWeight: 'bold', color: 'black' },
    imageKeyText: {color:'white', marginHorizontal: 10, fontSize: 16, fontWeight: 'bold', textAlign: 'center', flexShrink: 1},
    image: { width: 500, height: 600, resizeMode: 'contain', backgroundColor: 'white' },
    markerContainer: { position: 'absolute', alignItems: 'center', justifyContent: 'center', width: MARKER_SIZE, height: MARKER_SIZE },
    xMark: { fontSize: 16, fontWeight: 'bold', color: 'red' },
    circle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: 'black', position: 'absolute' },
    closeButton: { marginTop: 20, backgroundColor: 'maroon', padding: 15, paddingHorizontal: 40, borderRadius: 5 },
    closeText: { fontWeight: 'bold', color: 'white' },
    loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: 'white', marginTop: 10, fontSize: 12 }
});