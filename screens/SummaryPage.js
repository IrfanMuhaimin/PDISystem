// SummaryPage.js
import React, { useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
    View, Text, ScrollView, StyleSheet, Modal, Image, TouchableOpacity, Platform, Alert,
    ActivityIndicator // Keep ActivityIndicator import
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { ChecklistContext } from '../context/ChecklistContext'; // Adjust path if needed
import { jwtDecode } from 'jwt-decode';
import ScreenWrapper from '../styles/flowstudiosbg.js'; // Adjust path if needed
import commonStyles, { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/commonStyles'; // Adjust path if needed

// --- Constants (Keep Original) ---
const imageKeys = ['vehicle1', 'vehicle2', 'vehicle3'];
const baseImages = {
    'vehicle1': require('../assets/vehicle.png'), // Adjust path if needed
    'vehicle2': require('../assets/vehicle2.png'), // Adjust path if needed
    'vehicle3': require('../assets/vehicle3.png')  // Adjust path if needed
};
const MARKER_SIZE = 24; // Size for centering calculation (for display)
// Keep original (potentially problematic) hardcoded dimensions if needed elsewhere, but handleFinish won't use them for normalization
const OLD_MARK_MODAL_IMAGE_WIDTH = 500;
const OLD_MARK_MODAL_IMAGE_HEIGHT = 600;


export default function SummaryPage({ navigation }) {
    // --- State Hooks (Keep Original + add isSubmitting) ---
    const { checklist, carInfo, updateCarInfo } = useContext(ChecklistContext);
    const [selectedSupervisor, setSelectedSupervisor] = useState('');
    const [imageModalVisible, setImageModalVisible] = useState(false);
    const [modalVisible, setModalVisible] = useState(false); // For success modal
    const [selectedImageKeyForModal, setSelectedImageKeyForModal] = useState('vehicle1');
    const [summaryImageLayout, setSummaryImageLayout] = useState(null); // For DISPLAY logic
    const [isSubmitting, setIsSubmitting] = useState(false); // ADDED: Loading state for API call

    // --- Memos for Data Calculation (Keep Original) ---
    const summary = useMemo(() => {
        if (!checklist || typeof checklist !== 'object') { return []; }
        try {
            return Object.entries(checklist).map(([section, items]) => {
                const validItems = Array.isArray(items) ? items : [];
                return { section, checkedCount: validItems.filter(item => item?.checked).length, defectCount: validItems.filter(item => item?.defect).length };
            });
        } catch (error) { console.error("[Memo: summary] Error:", error); return []; }
    }, [checklist]);

    const defectSummary = useMemo(() => {
        // This calculation remains as it was in your original code
        if (!checklist || typeof checklist !== 'object') { return []; }
        try {
            return Object.entries(checklist).flatMap(([section, items]) => {
                const validItems = Array.isArray(items) ? items : [];

                console.log(validItems[0].defect);
                console.log(validItems[1].defect);

                return validItems
                    .filter(item => item?.defect) // Original filter condition
                    .map(item => ({
                        section,
                        name: item.name,
                        category: item.defectDetails?.category || 'N/A',
                        type: item.defectDetails?.type || 'N/A',
                        remarks: item.defectDetails?.remarks || 'No remarks',
                        location: item.defectDetails?.location || 'N/A',
                        // Reads marks from context - assuming MarkModal saves {nx, ny} here now
                        marks: item.defectDetails?.marks || [],
                        selectedImage: item.defectDetails?.selectedImage || 'vehicle1',
                    }));
            });
        } catch (error) { console.error("[Memo: defectSummary] Error:", error); return []; }
    }, [checklist]);

    // --- Helper Functions (Keep Original) ---
    const getImageSource = (selectedImageKey) => baseImages[selectedImageKey] || baseImages['vehicle1'];

    const handleNextImage = () => {
        const currentIndex = imageKeys.indexOf(selectedImageKeyForModal);
        const nextIndex = (currentIndex + 1) % imageKeys.length;
        setSummaryImageLayout(null);
        setSelectedImageKeyForModal(imageKeys[nextIndex]);
    };

    const handlePreviousImage = () => {
        const currentIndex = imageKeys.indexOf(selectedImageKeyForModal);
        const previousIndex = (currentIndex - 1 + imageKeys.length) % imageKeys.length;
        setSummaryImageLayout(null);
        setSelectedImageKeyForModal(imageKeys[previousIndex]);
    };

    const formatTime = (date) => {
        if (!date) return 'N/A';
        const dateObj = date instanceof Date ? date : new Date(date);
        if (isNaN(dateObj.getTime())) return 'Invalid Date';
        try { return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }); } // Keep original formatting or adjust as needed
        catch { return 'Error'; }
    };

    // --- Layout Callback for Modal Image (Keep Original) ---
     const onSummaryImageLayout = useCallback((event) => {
         console.log("[Summary Layout] onLayout fired"); // Keep original log
         const { width, height } = event.nativeEvent.layout;
         if (width > 0 && height > 0) {
            if (!summaryImageLayout || summaryImageLayout.width !== width || summaryImageLayout.height !== height) {
                 console.log(`[Summary Layout] *** Setting layout state: ${width}x${height} ***`); // Keep original log
                 setSummaryImageLayout({ width, height });
             }
         } else { console.warn(`[Summary Layout] Invalid dimensions: ${width}x${height}`); } // Keep original log
    }, [summaryImageLayout]);

    // --- Mark Calculation for DISPLAY (Keep Original Display Logic) ---
    // NOTE: This display logic still assumes marks are {nx, ny} for accurate rendering,
    // aligning with the assumption for the *updated* handleFinish.
    const currentImageKey = selectedImageKeyForModal || imageKeys[0];
    const defectsForCurrentImage = useMemo(() => {
        if (!Array.isArray(defectSummary)) return [];
        return defectSummary.filter(defect => defect.selectedImage === currentImageKey);
    }, [defectSummary, currentImageKey]);

    const renderableMarks = useMemo(() => {
        // Keep original console log
        console.log("[Memo] Calculating renderable marks for DISPLAY. Layout:", summaryImageLayout ? 'Yes' : 'No', "Defect count:", defectsForCurrentImage.length);
        if (!summaryImageLayout || !Array.isArray(defectsForCurrentImage) || defectsForCurrentImage.length === 0) {
           return [];
        }
        const marks = [];
        defectsForCurrentImage.forEach((defect, index) => {
            const defectMarks = Array.isArray(defect.marks) ? defect.marks : [];
            // *** ASSUMING marks for display are {nx, ny} based on current best practice ***
            defectMarks.forEach((mark, j) => {
                if (mark && typeof mark.nx === 'number' && typeof mark.ny === 'number') { // Check for nx, ny for display
                    const pixelX = mark.nx * summaryImageLayout.width;
                    const pixelY = mark.ny * summaryImageLayout.height;
                    marks.push({
                        key: `${defect.name}-${index}-${j}`, // Keep original key generation
                        pixelX: pixelX - MARKER_SIZE / 2,
                        pixelY: pixelY - MARKER_SIZE / 2,
                        location: defect.location
                    });
                } else {
                    // Keep original warning log
                     console.warn(`[Mark Calc Display] Expected {nx, ny} but found:`, mark);
                }
            });
        });
         // Keep original console log
        console.log("[Memo] Calculated marks for display:", marks.length);
        return marks;
    }, [summaryImageLayout, defectsForCurrentImage]); // Keep original dependencies


    // --- handleFinish: MODIFIED TO SEND NORMALIZED COORDINATES CORRECTLY ---
    const handleFinish = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        const endTime = new Date();
        updateCarInfo({ ...carInfo, endTime });

        let staffUsername = 'unknown';
        try {
            const staffToken = await AsyncStorage.getItem('authToken');
            if (staffToken) staffUsername = jwtDecode(staffToken).username;
        } catch (e) { console.error("Error decoding token:", e); }

        const requestBody = {
            chassis_no: carInfo.chassis_no,
            staff_username: staffUsername,
            supervisor_username: selectedSupervisor,
            start_time: carInfo.startTime, // Or format if needed: carInfo.startTime?.toISOString().slice(0, 19).replace('T', ' ')
            end_time: endTime.toISOString().slice(0, 19).replace('T', ' '),
            defect: defectSummary.length > 0 ? 1 : 0,
            items: [],
        };

        Object.entries(checklist || {}).forEach(([section, items], index) => {
             const validItems = Array.isArray(items) ? items : [];
             validItems.forEach(item => {
                 if (!item || !item.name) return;

                 let itemDefects = []; // Array for defect(s) of THIS item

                 if (item.defect && item.defectDetails) {
                    // --- Start API Payload Modification ---
                    const normalizedMarksFromContext = item.defectDetails.marks || [];
                    const selectedImage = item.defectDetails.selectedImage || 'vehicle1';
                    const imageId = parseInt(selectedImage.replace('vehicle', '') || '1', 10) || 1;
                    const locationFromContext = item.defectDetails.location || 'N/A'; // Get location

                    console.log(`[API Payload] Item: ${item.name} - Found ${normalizedMarksFromContext.length} marks in context for image ${selectedImage} (ID: ${imageId})`);

                    // Initialize the single mark object for the API
                    let formattedMarkObject = null;

                    // Find the *first valid* mark in the array
                    const firstValidMark = normalizedMarksFromContext.find(
                        mark => mark && typeof mark.nx === 'number' && typeof mark.ny === 'number'
                    );

                    if (firstValidMark) {
                         console.log(`[API Payload] Using first valid mark: {nx: ${firstValidMark.nx}, ny: ${firstValidMark.ny}}`);
                         // Format the *first valid* mark using 'x', 'y' keys as required by API
                         formattedMarkObject = {
                             x: firstValidMark.nx, // Use nx value for x key
                             y: firstValidMark.ny, // Use ny value for y key
                             image_id: imageId
                         };
                         console.log(` -> Formatted Mark for API:`, formattedMarkObject);
                    } else {
                         console.log(`[API Payload] No valid marks found for item ${item.name}. Sending null for 'mark'.`);
                    }

                    // Create the defect payload object matching the API structure
                    const defectPayload = {
                        category: item.defectDetails.category || 'N/A',
                        type: item.defectDetails.type || 'N/A',
                        location: locationFromContext.toLowerCase(), // Convert location to lowercase
                        mark: formattedMarkObject, // Assign the single mark object (or null)
                        remarks: item.defectDetails.remarks || '',
                        repaired: false, // Keep initial state as false (matches previous code)
                        // REMOVED: 'marks' key which was an array
                    };
                    itemDefects.push(defectPayload); // Add the single defect object to the array for this item
                    // --- End API Payload Modification ---

                 } // End if (item.defect)

                 // Create the item payload (structure remains the same)
                 // Ensure the key 'defect' matches what the API expects for the array of defect objects
                 const formattedItem = {
                     section: index + 1,
                     name: item.name,
                     pass: !!item.checked,
                     defect: itemDefects, // Assign the array (usually with 0 or 1 defect object)
                 };
                 requestBody.items.push(formattedItem);
            }); // End items.forEach
        }); // End Object.entries(checklist).forEach

        console.log('--- Submitting Checklist Payload (Matching API Spec) ---');
        console.log(JSON.stringify(requestBody, null, 2));
        console.log('--- End Payload ---');

        // Keep the fetch logic as it was (with try/catch/finally)
        try {
            const currentToken = await AsyncStorage.getItem('authToken');
            if (!currentToken) throw new Error("Authentication token missing.");
            const response = await fetch('http://pdi.flowstudios.com.my/api/jobcards', { // Verify URL
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json', // Good practice
                    Authorization: `Bearer ${currentToken}`
                },
                body: JSON.stringify(requestBody),
            });
            if (!response.ok) {
                 let errorMsg = `Submit Failed (${response.status})`;
                 let errorData = null;
                 try {
                     errorData = await response.json();
                     errorMsg = errorData?.message || errorData?.error || JSON.stringify(errorData) || errorMsg;
                     console.error("Server Error (JSON):", errorData);
                 } catch (e) {
                     const textError = await response.text();
                     errorMsg = textError || errorMsg;
                     console.error("Server Error (Non-JSON):", textError);
                 }
                 throw new Error(errorMsg);
            }
            const result = await response.json();
            console.log('Submission success:', result);
            setModalVisible(true); // Show success modal
        } catch (error) {
            console.error('Submission error:', error);
            Alert.alert('Submission Failed', error.message || 'An unexpected error occurred.');
        } finally {
            setIsSubmitting(false); // Reset loading state
        }
    };


    // --- Render Component (Keep Original Structure) ---
    return (
        <ScreenWrapper
            showHeader={true}
            showFooter={true}
            enableScrollView={false}
            enableKeyboardAvoidingView={Platform.OS === 'ios'}
        >
            {/* Scrollable Content (Keep Original) */}
            <ScrollView
                style={originalStyles.scrollView}
                contentContainerStyle={originalStyles.scrollContentContainer}
                keyboardShouldPersistTaps="handled"
            >
                 {/* Page Header (Keep Original) */}
                <Text style={commonStyles.pageHeader}>PDI Summary</Text>

                {/* Car Info (Keep Original) */}
                <View style={themedStyles.infoBox}>
                     <Text style={themedStyles.carInfoText}><Text style={themedStyles.carInfoLabel}>Chassis:</Text> {carInfo?.chassis_no || 'N/A'}</Text>
                     <Text style={themedStyles.carInfoText}><Text style={themedStyles.carInfoLabel}>Model:</Text> {carInfo?.model || 'N/A'}</Text>
                     <Text style={themedStyles.carInfoText}><Text style={themedStyles.carInfoLabel}>Engine:</Text> {carInfo?.engine_no || 'N/A'}</Text>
                     <Text style={themedStyles.carInfoText}><Text style={themedStyles.carInfoLabel}>Color:</Text> {carInfo?.colour_code || 'N/A'}</Text>
                     <Text style={themedStyles.carInfoText}><Text style={themedStyles.carInfoLabel}>Entry:</Text> {carInfo?.entry_date || 'N/A'}</Text>
                </View>

                {/* Supervisor Picker (Keep Original) */}
                <Text style={originalStyles.label}>Final Inspection By:</Text>
                <Picker
                    selectedValue={selectedSupervisor}
                    onValueChange={(value) => setSelectedSupervisor(value)}
                    style={originalStyles.picker} // Keep original style reference
                >
                     <Picker.Item label="Select Supervisor" value="" />
                     <Picker.Item label="Bukhori" value="bukhori" />
                     {/* Keep original hardcoded items */}
                </Picker>

                {/* Checked & Defect Summary (Keep Original) */}
                <Text style={originalStyles.label}>Checked and Defect Summary:</Text>
                <View style={originalStyles.summaryContainerView}>
                    {summary.map(({ section, checkedCount, defectCount }) => (
                        <View key={section} style={originalStyles.summaryRow}>
                            <View style={originalStyles.summaryColumnSection}><Text style={originalStyles.summaryText}>Section {section}</Text></View>
                            <View style={originalStyles.summaryColumnCount}><Text style={originalStyles.checkedText}>Checked: {checkedCount}</Text></View>
                            <View style={originalStyles.summaryColumnCount}><Text style={originalStyles.defectText}>Defects: {defectCount}</Text></View>
                        </View>
                    ))}
                </View>

                {/* View Image Button (Keep Original) */}
                {defectSummary.length > 0 && (
                    <View style={originalStyles.viewCenter}>
                        <TouchableOpacity
                            style={originalStyles.viewImageButton}
                            onPress={() => {
                                setSelectedImageKeyForModal(imageKeys[0]);
                                setSummaryImageLayout(null); // Reset layout when opening
                                setImageModalVisible(true);
                            }}
                        >
                             <Text style={originalStyles.viewImageText}>View Image</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Defects Summary List (Keep Original) */}
                {defectSummary.length > 0 && (
                    <>
                        <Text style={originalStyles.label}>Defects Summary:</Text>
                        <View style={originalStyles.defectContainerView}>
                            {defectSummary.map((defect, index) => (
                                <View key={index} style={originalStyles.defectBox}>
                                    <Text style={originalStyles.defectItem}><Text style={originalStyles.boldText}>Section {defect.section} - {defect.name}</Text></Text>
                                    <Text style={originalStyles.defectDetail}>{defect.category} - {defect.type}</Text>
                                    <Text style={originalStyles.defectDetail}>Location: {defect.location}</Text>
                                    <Text style={originalStyles.remarksText}>Remarks: {defect.remarks}</Text>
                                    {/* You might want to add display of which image it was marked on here */}
                                    {defect.selectedImage && defect.marks && defect.marks.length > 0 && (
                                        <Text style={originalStyles.defectDetail}>Marked on: {defect.selectedImage}</Text>
                                    )}
                                </View>
                            ))}
                        </View>
                    </>
                )}
            </ScrollView>
            {/* End Scrollable Content Area */}


            {/* --- Fixed Footer Buttons (Keep Original Structure, add loading state) --- */}
            <View style={originalStyles.footer}>
                <TouchableOpacity
                    style={[originalStyles.buttonBack, isSubmitting && originalStyles.buttonDisabled]} // Optionally disable Back when submitting
                    onPress={() => navigation.goBack()}
                    disabled={isSubmitting} // Disable if submitting
                >
                    <Text style={[originalStyles.buttonText, originalStyles.buttonBackText, isSubmitting && originalStyles.buttonTextDisabled]}>Back</Text>
                     {/* Note: Added originalStyles.buttonBackText for specific text color if needed */}
                </TouchableOpacity>
                <TouchableOpacity
                    // Keep original disabled logic, add isSubmitting check
                    style={[ originalStyles.button, (!selectedSupervisor || isSubmitting) ? originalStyles.buttonDisabled : {} ]}
                    onPress={handleFinish}
                    disabled={!selectedSupervisor || isSubmitting} // Disable if no supervisor or submitting
                >
                    {isSubmitting ? (
                        <ActivityIndicator size="small" color={COLORS.black} /> // Use appropriate color
                    ) : (
                        <Text style={[ originalStyles.buttonText, (!selectedSupervisor || isSubmitting) ? originalStyles.buttonTextDisabled : {} ]}>
                            Finish
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
            {/* --- End Footer Buttons --- */}


            {/* --- Image Modal (Keep Original - Uses NEW Display Logic) --- */}
            <Modal
                visible={imageModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => {setImageModalVisible(false);}}
            >
                <View style={originalStyles.modalContainer}>
                     <Text style={originalStyles.modalHeader}>Defect Locations</Text>
                    {/* Image Navigation (Keep Original) */}
                    <View style={originalStyles.imageSelector}>
                        <TouchableOpacity onPress={handlePreviousImage} style={originalStyles.imageButton} disabled={imageKeys.length <= 1} >
                            <Text style={originalStyles.imageButtonText}>Back</Text>
                        </TouchableOpacity>
                        <Text style={{color:'white', fontSize: 16, fontWeight:'bold', marginHorizontal: 10}}>{currentImageKey}</Text>
                        <TouchableOpacity onPress={handleNextImage} style={originalStyles.imageButton} disabled={imageKeys.length <= 1} >
                            <Text style={originalStyles.imageButtonText}>Next</Text>
                        </TouchableOpacity>
                    </View>
                    {/* Image Wrapper (Keep Original) */}
                    <View style={originalStyles.imageWrapper}>
                        {/* Base Image (Keep Original) */}
                        <Image
                            key={currentImageKey}
                            source={getImageSource(currentImageKey)}
                            style={originalStyles.image} // Uses original hardcoded dimensions style
                            onLayout={onSummaryImageLayout}
                            resizeMode="contain" // Added for clarity, though style might handle it
                        />
                        {/* Loading Overlay (Keep Original) */}
                        {!summaryImageLayout && (
                            <View style={originalStyles.loadingOverlay}>
                                <ActivityIndicator size="large" color="#FFF" />
                                <Text style={originalStyles.loadingText}>Calculating Layout...</Text>
                            </View>
                        )}
                        {/* Render Marks Overlay (Keep Original - relies on renderableMarks) */}
                        {summaryImageLayout && renderableMarks.map((mark) => (
                            <View
                                key={mark.key}
                                style={[ originalStyles.markerContainer, { left: mark.pixelX, top: mark.pixelY } ]}
                            >
                                {mark.location === 'Interior' && <View style={originalStyles.circle} />}
                                <Text style={originalStyles.xMark}>X</Text>
                            </View>
                        ))}
                     </View>
                     {/* Close Button (Keep Original) */}
                     <TouchableOpacity style={originalStyles.closeButton} onPress={() => {setImageModalVisible(false);}} >
                        <Text style={originalStyles.closeText}>Close</Text>
                     </TouchableOpacity>
                </View>
            </Modal>
            {/* --- End Image Modal --- */}


            {/* --- Success Modal (Keep Original) --- */}
            <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => { /* Optional */ }}>
                <View style={themedStyles.successModalContainer}>
                    <View style={themedStyles.successModalContent}>
                        <Text style={themedStyles.successModalTitle}>Success!</Text>
                        <Text style={themedStyles.successModalText}>Job Card has been submitted.</Text>
                        <Text style={themedStyles.successModalTimeText}>Entry Time: {carInfo.startTime ? formatTime(carInfo.startTime) : 'N/A'}</Text>
                        <Text style={themedStyles.successModalTimeText}>Exit Time: {carInfo.endTime ? formatTime(carInfo.endTime) : 'N/A'}</Text>
                        <TouchableOpacity style={[commonStyles.actionButton, themedStyles.successModalButton]} onPress={() => { setModalVisible(false); navigation.navigate('Home'); }} >
                            <Text style={commonStyles.actionButtonPrimaryText}>Okay</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
            {/* --- End Success Modal --- */}

        </ScreenWrapper>
    );
}

// --- Styles (Keep Original Definitions) ---
const originalStyles = StyleSheet.create({
    scrollView: { flex: 1, backgroundColor: 'transparent', },
    scrollContentContainer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20, },
    label: { fontSize: 25, fontWeight: 'bold', color: COLORS.secondary }, // Added color from commonStyles assumption
    pickerContainer: { // Added container for picker styling consistency
        borderWidth: 1,
        borderColor: COLORS.lightGrey,
        borderRadius: 5,
        backgroundColor: COLORS.white,
        marginBottom: MARGIN.medium,
    },
    picker: { marginVertical: 0, height: 50, width: '100%' }, // Adjusted marginVertical
    summaryContainerView: { marginVertical: 20, },
    summaryRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 5, backgroundColor: '#f8f8f8', marginBottom: 5, borderRadius: 5, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center', },
    summaryColumnSection: { width: '50%', paddingRight: 5, }, // Adjusted width split
    summaryColumnCount: { width: '25%', paddingHorizontal: 5, },
    summaryText: { fontWeight: 'bold', color: COLORS.secondary }, // Added color
    checkedText: { color: 'green', },
    defectText: { color: 'red', },
    viewCenter: { alignItems: 'center', },
    viewImageButton: { backgroundColor: '#ef5b2d', padding: 10, borderRadius: 5, alignItems: 'center', marginVertical: 10, width: 150, }, // Keep original color/size
    viewImageText: { color: 'white', fontWeight: 'bold', },
    defectContainerView: { marginVertical: 10, },
    defectBox: { backgroundColor: '#ffe6e6', padding: 10, borderRadius: 5, marginBottom: 10, borderWidth: 1, borderColor: '#ffcccc', },
    defectItem: { fontSize: 16, fontWeight: 'bold', color: COLORS.secondary }, // Added color
    defectDetail: { fontSize: 14, color: '#d9534f', }, // Keep original color
    remarksText: { fontSize: 14, fontStyle: 'italic', color: '#555', },
    boldText: { fontWeight: 'bold', },
    modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)', }, // Keep original overlay darkness
    modalHeader: { fontSize: 20, fontWeight: 'bold', color: 'white', marginBottom: 10, },
    imageSelector: { flexDirection: 'row', justifyContent: 'space-around', width: '90%', marginBottom: 10, alignItems: 'center', paddingHorizontal: 10, },
    imageButton: { backgroundColor: '#ffe6cc', padding: 15, paddingHorizontal: 40, borderRadius: 5, }, // Keep original style
    imageButtonText: { fontWeight: 'bold', color: 'black', },
    imageWrapper: { position: 'relative', borderColor: 'grey', borderWidth: 1, marginVertical: 10, justifyContent: 'center', alignItems: 'center', },
    image: { width: OLD_MARK_MODAL_IMAGE_WIDTH, height: OLD_MARK_MODAL_IMAGE_HEIGHT, resizeMode: 'contain', backgroundColor: 'white', }, // Uses original hardcoded dimensions style
    markerContainer: { position: 'absolute', alignItems: 'center', justifyContent: 'center', width: MARKER_SIZE, height: MARKER_SIZE, },
    xMark: { fontSize: 16, fontWeight: 'bold', color: 'red', },
    circle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: 'black', position: 'absolute', },
    closeButton: { marginTop: 20, backgroundColor: 'maroon', padding: 15, paddingHorizontal: 40, borderRadius: 5, }, // Keep original style
    closeText: { fontWeight: 'bold', color: 'white', },
    footer: { flexDirection: 'row', justifyContent: 'space-evenly', paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 20 : 10, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: COLORS.divider, backgroundColor: COLORS.white, }, // Keep original padding/border/bg
    button: { backgroundColor: '#ffe6cc', paddingHorizontal: 50, paddingVertical: 20, borderRadius: 5, alignItems: 'center' }, // Keep original style, ensure centered content
    buttonBack: { backgroundColor: '#f5f5f5', paddingHorizontal: 50, paddingVertical: 20, borderRadius: 5, alignItems: 'center' }, // Keep original style, ensure centered content
    buttonText: { fontSize: 25, fontWeight: 'bold', color: COLORS.black, }, // Keep original style
    buttonBackText: { color: COLORS.black }, // Ensure back button text matches original button text color unless specified otherwise
    buttonDisabled: { backgroundColor: '#cccccc', }, // Keep original disabled style
    buttonTextDisabled: { color: '#888888', }, // Keep original disabled text style
    loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 10, },
    loadingText: { marginTop: 10, color: '#FFF', fontSize: 14, },
});

// Keep original Themed Styles definition
const themedStyles = StyleSheet.create({
    infoBox: { backgroundColor: COLORS.white, padding: PADDING.medium, borderRadius: 8, marginBottom: MARGIN.medium, borderWidth: 1, borderColor: COLORS.border, },
    carInfoText: { fontSize: FONT_SIZES.medium, color: COLORS.secondary, marginBottom: MARGIN.xsmall, lineHeight: FONT_SIZES.medium * 1.4, },
    carInfoLabel: { fontWeight: 'bold', color: COLORS.primary, },
    successModalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', padding: PADDING.medium, },
    successModalContent: { width: '80%', maxWidth: 400, padding: PADDING.large, backgroundColor: COLORS.white, borderRadius: 10, alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 2, }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, },
    successModalTitle: { fontSize: FONT_SIZES.xlarge, fontWeight: 'bold', marginBottom: MARGIN.small, color: COLORS.success, },
    successModalText: { fontSize: FONT_SIZES.medium, marginBottom: MARGIN.medium, color: COLORS.secondary, textAlign: 'center', },
    successModalTimeText: { fontSize: FONT_SIZES.medium, marginBottom: MARGIN.small, color: COLORS.grey, }, // Keep original grey color
    successModalButton: { marginTop: MARGIN.medium, width: '80%', paddingVertical: PADDING.medium, }, // Keep original definition referencing commonStyles
});