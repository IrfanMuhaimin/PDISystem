// screens/SummaryPage.js
import React, { useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
    View, Text, ScrollView, StyleSheet, Modal, Image,
    TouchableOpacity, Platform, Alert, ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { ChecklistContext } from '../context/ChecklistContext'; // Adjust path if needed
import { jwtDecode } from 'jwt-decode';
import ScreenWrapper from '../styles/flowstudiosbg.js'; // Adjust path if needed
import commonStyles, { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/commonStyles';

// --- Constants ---
const imageKeys = ['vehicle1', 'vehicle2', 'vehicle3'];
const baseImages = {
    'vehicle1': require('../assets/vehicle.png'),
    'vehicle2': require('../assets/vehicle2.png'),
    'vehicle3': require('../assets/vehicle3.png')
};
const MARKER_SIZE = 24;
const OLD_MARK_MODAL_IMAGE_WIDTH = 500;
const OLD_MARK_MODAL_IMAGE_HEIGHT = 600;

// --- API Endpoints ---
const API_BASE_URL = 'http://pdi.flowstudios.com.my/api';
const USERS_API_ENDPOINT = `${API_BASE_URL}/users`;
const JOBCARD_SUBMIT_ENDPOINT = `${API_BASE_URL}/jobcards`;

// --- Component ---
export default function SummaryPage({ navigation }) {
    // --- Context and State (Original) ---
    const { checklist, carInfo, updateCarInfo } = useContext(ChecklistContext);
    const [imageModalVisible, setImageModalVisible] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedImageKeyForModal, setSelectedImageKeyForModal] = useState('vehicle1');
    const [summaryImageLayout, setSummaryImageLayout] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedSupervisor, setSelectedSupervisor] = useState(null);
    const [supervisors, setSupervisors] = useState([]);
    const [isLoadingSupervisors, setIsLoadingSupervisors] = useState(true);
    const [supervisorFetchError, setSupervisorFetchError] = useState(null);
    // --- End Context and State ---


    // --- Memos (Original + Severity for Display) ---
    const summary = useMemo(() => {
        // Original summary calculation remains unchanged
        if (!checklist || typeof checklist !== 'object') { return []; }
        try {
            return Object.entries(checklist).map(([section, items]) => {
                const validItems = Array.isArray(items) ? items : [];
                return { section, checkedCount: validItems.filter(item => item?.checked).length, defectCount: validItems.filter(item => item?.defect).length };
            });
        } catch (error) { console.error("[Memo: summary] Error:", error); return []; }
    }, [checklist]);

    const defectSummary = useMemo(() => {
        // Extracts severity for display purposes
        console.log("[Memo] Calculating defectSummary...");
        if (!checklist || typeof checklist !== 'object') { return []; }
        try {
            return Object.entries(checklist).flatMap(([section, items]) => {
                const validItems = Array.isArray(items) ? items : [];
                return validItems
                    .filter(item => item?.defect && item?.defectDetails) // Ensure defectDetails exists
                    .map(item => {
                        // --- ADDED: severity extraction for display ---
                        return {
                            section,
                            name: item.name,
                            category: item.defectDetails?.category || 'N/A',
                            type: item.defectDetails?.type || 'N/A',
                            severity: item.defectDetails?.severity || 'N/A', // <-- SEVERITY FOR DISPLAY
                            remarks: item.defectDetails?.remarks || 'No remarks',
                            location: item.defectDetails?.location || 'N/A',
                            marks: item.defectDetails?.marks || [],
                            selectedImage: item.defectDetails?.selectedImage || 'vehicle1',
                         };
                        // --- END ADDITION ---
                    });
            });
        } catch (error) { console.error("[Memo: defectSummary] Error:", error); return []; }
    }, [checklist]);
    // --- End Memos ---


    // --- useEffect for supervisors (Original) ---
    useEffect(() => {
        if (isSubmitting) { console.log("[SupervisorFetch - SummaryPage] Skipping fetch: isSubmitting is true."); return; }
        let isMounted = true;
        setIsLoadingSupervisors(true);
        setSupervisors([]);
        setSupervisorFetchError(null);
        console.log("[SupervisorFetch - SummaryPage] Initializing fetch state.");

        const fetchAndFilterSupervisors = async () => {
            console.log("[SupervisorFetch - SummaryPage] Starting fetch...");
            try {
                const token = await AsyncStorage.getItem('authToken');
                if (!token) { console.error("[SupervisorFetch - SummaryPage] Auth token missing."); throw new Error("Token missing."); }
                const response = await fetch(USERS_API_ENDPOINT, { method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } });
                const status = response.status;
                console.log(`[SupervisorFetch - SummaryPage] Fetch Status: ${status}`);
                if (!response.ok) {
                    const txt = await response.text();
                    console.error(`[SupervisorFetch - SummaryPage] Fetch Error ${status}:`, txt);
                    if (status === 403) throw new Error("Permission denied (403).");
                    throw new Error(`Fetch users failed (${status}). Server response: ${txt.substring(0, 100)}...`);
                }
                const data = await response.json();
                if (!Array.isArray(data)) { console.error("[SupervisorFetch - SummaryPage] Invalid data format received, expected array:", data); throw new Error("Invalid data format received for users."); }
                const filtered = data.filter(u => u && typeof u.type === 'string' && u.type.toLowerCase() === 'supervisor');
                console.log(`[SupervisorFetch - SummaryPage] Found ${filtered.length} supervisors.`);
                if (isMounted) { setSupervisors(filtered); setSupervisorFetchError(null); console.log("[SupervisorFetch - SummaryPage] State updated with supervisors."); } else { console.log("[SupervisorFetch - SummaryPage] Component unmounted before state update."); }
            } catch (error) {
                if (isMounted) { console.error("[SupervisorFetch - SummaryPage] Catch Block Error:", error); setSupervisorFetchError(error.message || 'Load failed.'); setSupervisors([]); console.log("[SupervisorFetch - SummaryPage] State updated with fetch error."); } else { console.log("[SupervisorFetch - SummaryPage] Component unmounted before error state update."); }
            } finally {
                if (isMounted) { setIsLoadingSupervisors(false); console.log("[SupervisorFetch - SummaryPage] Loading set false."); } else { console.log("[SupervisorFetch - SummaryPage] Component unmounted before finally block."); }
            }
        };
        fetchAndFilterSupervisors();
        return () => { isMounted = false; console.log("[SupervisorFetch - SummaryPage] Unmounting, fetch cancelled/ignored."); };
    }, [isSubmitting]);
    // --- End useEffect ---


    // --- Helper Functions (Original) ---
    const getImageSource = (selectedImageKey) => baseImages[selectedImageKey] || baseImages['vehicle1'];
    const handleNextImage = () => { const currentIndex = imageKeys.indexOf(selectedImageKeyForModal); const nextIndex = (currentIndex + 1) % imageKeys.length; setSummaryImageLayout(null); setSelectedImageKeyForModal(imageKeys[nextIndex]); };
    const handlePreviousImage = () => { const currentIndex = imageKeys.indexOf(selectedImageKeyForModal); const previousIndex = (currentIndex - 1 + imageKeys.length) % imageKeys.length; setSummaryImageLayout(null); setSelectedImageKeyForModal(imageKeys[previousIndex]); };
    const formatTime = (date) => { if (!date) return 'N/A'; const dateObj = date instanceof Date ? date : new Date(date); if (isNaN(dateObj.getTime())) return 'Invalid Date'; try { return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }); } catch { return 'Error'; } };
    const onSummaryImageLayout = useCallback((event) => { console.log("[Summary Layout] onLayout fired"); const { width, height } = event.nativeEvent.layout; if (width > 0 && height > 0) { if (!summaryImageLayout || summaryImageLayout.width !== width || summaryImageLayout.height !== height) { console.log(`[Summary Layout] *** Setting layout state: ${width}x${height} ***`); setSummaryImageLayout({ width, height }); } } else { console.warn(`[Summary Layout] Invalid dimensions: ${width}x${height}`); } }, [summaryImageLayout]);
    // --- End Helper Functions ---


    // --- Mark Calculation for DISPLAY (Original) ---
    const currentImageKey = selectedImageKeyForModal || imageKeys[0];
    const defectsForCurrentImage = useMemo(() => { if (!Array.isArray(defectSummary)) return []; return defectSummary.filter(defect => defect.selectedImage === currentImageKey); }, [defectSummary, currentImageKey]);
    const renderableMarks = useMemo(() => { console.log("[Memo] Calculating renderable marks for DISPLAY. Layout:", summaryImageLayout ? 'Yes' : 'No', "Defect count:", defectsForCurrentImage.length); if (!summaryImageLayout || !Array.isArray(defectsForCurrentImage) || defectsForCurrentImage.length === 0) { return []; } const marks = []; defectsForCurrentImage.forEach((defect, index) => { const defectMarks = Array.isArray(defect.marks) ? defect.marks : []; defectMarks.forEach((mark, j) => { if (mark && typeof mark.nx === 'number' && typeof mark.ny === 'number') { const pixelX = mark.nx * summaryImageLayout.width; const pixelY = mark.ny * summaryImageLayout.height; marks.push({ key: `${defect.name}-${index}-${j}`, pixelX: pixelX - MARKER_SIZE / 2, pixelY: pixelY - MARKER_SIZE / 2, location: defect.location }); } else { console.warn(`[Mark Calc Display] Expected {nx, ny} but found:`, mark); } }); }); console.log("[Memo] Calculated marks for display:", marks.length); return marks; }, [summaryImageLayout, defectsForCurrentImage]);
    // --- End Mark Calculation ---


    // --- handleFinish Function - MUST INCLUDE SEVERITY ---
    const handleFinish = async () => {
        if (!selectedSupervisor) { Alert.alert('Supervisor Required', 'Please select the supervisor who checked the final inspection.'); return; }
        if (isSubmitting) return;
        setIsSubmitting(true);
        const endTime = new Date();
        updateCarInfo({ ...carInfo, endTime });
        let staffUsername = 'unknown';
        try { const staffToken = await AsyncStorage.getItem('authToken'); if (staffToken) { const decoded = jwtDecode(staffToken); staffUsername = decoded?.username || 'unknown'; } } catch (e) { console.error("Error decoding token:", e); }
        const supervisorObject = Array.isArray(supervisors) ? supervisors.find(sv => sv.id === selectedSupervisor) : null;
        const supervisorUsername = supervisorObject?.username || 'unknown_supervisor';
        console.log(`Selected Supervisor ID: ${selectedSupervisor}, Found Username: ${supervisorUsername}`);
        const requestBody = {
            chassis_no: carInfo.chassis_no, staff_username: staffUsername, supervisor_username: supervisorUsername,
            start_time: carInfo.startTime?.toISOString().slice(0, 19).replace('T', ' ') || null,
            end_time: endTime.toISOString().slice(0, 19).replace('T', ' '),
            defect: defectSummary.length > 0 ? 1 : 0, items: [],
        };
        Object.entries(checklist || {}).forEach(([section, items], index) => {
             const validItems = Array.isArray(items) ? items : [];
             validItems.forEach(item => {
                 if (!item || !item.name) return;
                 let itemDefects = [];
                 if (item.defect && item.defectDetails) {
                    const normalizedMarksFromContext = item.defectDetails.marks || [];
                    const selectedImage = item.defectDetails.selectedImage || 'vehicle1';
                    const imageId = parseInt(selectedImage.replace('vehicle', '') || '1', 10) || 1;
                    const locationFromContext = item.defectDetails.location || 'N/A';
                    let formattedMarkObject = null;
                    const firstValidMark = normalizedMarksFromContext.find( mark => mark && typeof mark.nx === 'number' && typeof mark.ny === 'number' );
                    if (firstValidMark) { formattedMarkObject = { x: firstValidMark.nx, y: firstValidMark.ny, image_id: imageId }; }

                    // --- MODIFIED: Payload NOW INCLUDES severity ---
                    const defectPayload = {
                        category: item.defectDetails.category || 'N/A',
                        type: item.defectDetails.type || 'N/A',
                        // --- THIS LINE IS NOW ADDED BACK ---
                        severity: item.defectDetails.severity || 'N/A', // Provide a valid value ('Major'/'Minor' or a default if needed)
                        // --- END ADDITION ---
                        location: locationFromContext.toLowerCase(), // Check API spec for casing
                        mark: formattedMarkObject,
                        remarks: item.defectDetails.remarks || '',
                        repaired: false, // Initial submission default
                    };
                    // --- END MODIFICATION ---

                    // --- Important Check ---
                    if (!defectPayload.severity || defectPayload.severity === 'N/A') {
                        console.warn(`Defect item '${item.name}' is missing severity or has 'N/A'. Ensure a valid value ('Major'/'Minor') is always saved in DefectInfoModal.`);
                    }
                    // --- End Check ---

                    itemDefects.push(defectPayload);
                 }
                 const formattedItem = { section: index + 1, name: item.name, pass: !!item.checked, defect: itemDefects, };
                 requestBody.items.push(formattedItem);
            });
        });
        console.log('--- Submitting Checklist Payload (WITH Severity) ---'); // Log message updated
        console.log(JSON.stringify(requestBody, null, 2));
        console.log('--- End Payload ---');
        try {
            const currentToken = await AsyncStorage.getItem('authToken'); if (!currentToken) throw new Error("Authentication token missing.");
            const response = await fetch(JOBCARD_SUBMIT_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', Authorization: `Bearer ${currentToken}` }, body: JSON.stringify(requestBody), });
            if (!response.ok) {
                 let errorMsg = `Submit Failed (${response.status})`; let errorData = null;
                 try { errorData = await response.json(); errorMsg = errorData?.message || errorData?.error || JSON.stringify(errorData) || errorMsg; console.error("Server Error (JSON):", errorData); } catch (e) { try { const textError = await response.text(); errorMsg = textError || errorMsg; console.error("Server Error (Non-JSON):", textError); } catch (textE) { console.error("Failed to read error response body:", textE) } }
                 console.error("Submission failed with message:", errorMsg);
                 throw new Error(errorMsg); // Throw the specific error message
            }
            const result = await response.json(); console.log('Submission success:', result);
            setModalVisible(true);
        } catch (error) { console.error('Submission error:', error); Alert.alert('Submission Failed', error.message || 'An unexpected error occurred.'); } finally { setIsSubmitting(false); }
    };
    // --- End handleFinish Function ---


    // --- Render Component Structure ---
    return (
        <ScreenWrapper
            showHeader={true}
            showFooter={true}
            enableScrollView={false}
            enableKeyboardAvoidingView={Platform.OS === 'ios'}
        >
            <ScrollView
                style={originalStyles.scrollView}
                contentContainerStyle={originalStyles.scrollContentContainer}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <Text style={[commonStyles.pageHeader, { marginBottom: MARGIN.small }]}>PDI Summary</Text>

                {/* Car Info */}
                <View style={themedStyles.infoBox}>
                     <Text style={themedStyles.carInfoText}><Text style={themedStyles.carInfoLabel}>Chassis:</Text> {carInfo?.chassis_no || 'N/A'}</Text>
                     <Text style={themedStyles.carInfoText}><Text style={themedStyles.carInfoLabel}>Model:</Text> {carInfo?.model || 'N/A'}</Text>
                     <Text style={themedStyles.carInfoText}><Text style={themedStyles.carInfoLabel}>Engine:</Text> {carInfo?.engine_no || 'N/A'}</Text>
                     <Text style={themedStyles.carInfoText}><Text style={themedStyles.carInfoLabel}>Color:</Text> {carInfo?.colour_code || 'N/A'}</Text>
                     <Text style={themedStyles.carInfoText}><Text style={themedStyles.carInfoLabel}>Entry:</Text> {carInfo?.entry_date || 'N/A'}</Text>
                </View>

                {/* Supervisor Picker */}
                <Text style={originalStyles.label}>Final Inspection By:</Text>
                <View style={[originalStyles.pickerContainer, (isLoadingSupervisors || !!supervisorFetchError || supervisors.length === 0) && themedStyles.pickerContainerDisabled]}>
                     {isLoadingSupervisors ? (
                        <View style={themedStyles.loadingOverlay}><ActivityIndicator size="small" color={COLORS.primary} /><Text style={themedStyles.loadingText}>Loading Supervisors...</Text></View>
                    ) : supervisorFetchError ? (
                        <Text style={[themedStyles.pickerPlaceholder, commonStyles.errorText]}>Error: {supervisorFetchError}</Text>
                    ) : supervisors.length === 0 ? (
                        <Text style={themedStyles.pickerPlaceholder}>No supervisors found</Text>
                    ) : (
                        <Picker
                            selectedValue={selectedSupervisor}
                            onValueChange={(itemValue) => setSelectedSupervisor(itemValue)}
                            style={originalStyles.picker}
                            enabled={!isSubmitting && supervisors.length > 0}
                            mode="dropdown"
                            prompt="Select Supervisor"
                        >
                            <Picker.Item label="Select Supervisor" value={null} style={themedStyles.pickerPlaceholderItem} enabled={false} />
                            {supervisors.map((sv) => (
                                <Picker.Item key={sv.id} label={`${sv.name}`} value={sv.id} style={themedStyles.pickerItem} />
                            ))}
                        </Picker>
                    )}
                </View>

                {/* Checked & Defect Summary */}
                <Text style={originalStyles.label}>Checked and Defect Summary:</Text>
                <View style={originalStyles.summaryContainerView}>
                    {summary.map(({ section, checkedCount, defectCount }, index) => (
                        <View key={section} style={[originalStyles.summaryRow, index === 0 && themedStyles.firstSummaryRow]}>
                            <View style={originalStyles.summaryColumnSection}><Text style={originalStyles.summaryText}>Section {section}</Text></View>
                            <View style={originalStyles.summaryColumnCount}><Text style={originalStyles.checkedText}>Checked: {checkedCount}</Text></View>
                            <View style={originalStyles.summaryColumnCount}><Text style={originalStyles.defectText}>Defects: {defectCount}</Text></View>
                        </View>
                    ))}
                </View>

                {/* View Image Button */}
                {defectSummary.length > 0 && (
                    <View style={originalStyles.viewCenter}>
                        <TouchableOpacity
                            style={originalStyles.viewImageButton}
                            onPress={() => { setSelectedImageKeyForModal(imageKeys[0]); setSummaryImageLayout(null); setImageModalVisible(true); }}
                        >
                             <Text style={originalStyles.viewImageText}>View Defect Locations</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Defects Summary List */}
                {defectSummary.length > 0 && (
                    <>
                        <Text style={originalStyles.label}>Defects Summary:</Text>
                        <View style={originalStyles.defectContainerView}>
                            {defectSummary.map((defect, index) => (
                                // Added key for list rendering
                                <View key={`${defect.section}-${defect.name}-${index}`} style={originalStyles.defectBox}>
                                    <Text style={originalStyles.defectItem}><Text style={originalStyles.boldText}>Section {defect.section} - {defect.name}</Text></Text>
                                    <Text style={originalStyles.defectDetail}>{defect.category} - {defect.type}</Text>
                                    {/* --- Display Severity using existing style --- */}
                                    <Text style={originalStyles.defectDetail}>Severity: {defect.severity}</Text>
                                    {/* --- End Display --- */}
                                    <Text style={originalStyles.defectDetail}>Location: {defect.location}</Text>
                                    <Text style={originalStyles.remarksText}>Remarks: {defect.remarks}</Text>
                                    {defect.selectedImage && defect.marks && defect.marks.length > 0 && (
                                        <Text style={originalStyles.defectDetail}>Marked on: {defect.selectedImage}</Text>
                                    )}
                                </View>
                            ))}
                        </View>
                    </>
                )}
                 <View style={{ height: MARGIN.large }} />{/* Scroll bottom padding */}
            </ScrollView>
            {/* --- End Scrollable Content Area --- */}


            {/* --- Fixed Footer Buttons (Original) --- */}
            <View style={originalStyles.footer}>
                <TouchableOpacity
                    style={[originalStyles.buttonBack, isSubmitting && originalStyles.buttonDisabled]}
                    onPress={() => navigation.goBack()}
                    disabled={isSubmitting}
                >
                    <Text style={[originalStyles.buttonText, originalStyles.buttonBackText, isSubmitting && originalStyles.buttonTextDisabled]}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[ originalStyles.button,
                           ( !selectedSupervisor || isSubmitting || isLoadingSupervisors || !!supervisorFetchError || supervisors.length === 0)
                           && originalStyles.buttonDisabled ]}
                    onPress={handleFinish}
                    disabled={ !selectedSupervisor || isSubmitting || isLoadingSupervisors || !!supervisorFetchError || supervisors.length === 0 }
                >
                    {isSubmitting ? (
                        <ActivityIndicator size="small" color={COLORS.black} /> // Color adjusted for visibility on primaryLight bg
                    ) : (
                        <Text style={[ originalStyles.buttonText,
                                     ( !selectedSupervisor || isLoadingSupervisors || !!supervisorFetchError || supervisors.length === 0)
                                     && originalStyles.buttonTextDisabled ]}>
                            Finish
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
            {/* --- End Fixed Footer Buttons --- */}


            {/* --- Modals (Original) --- */}
            {/* Image Modal */}
            <Modal
                visible={imageModalVisible}
                transparent animationType="slide"
                onRequestClose={() => {setImageModalVisible(false);}}
            >
                <View style={originalStyles.modalContainer}>
                     <Text style={originalStyles.modalHeader}>Defect Locations</Text>
                    <View style={originalStyles.imageSelector}>
                        <TouchableOpacity onPress={handlePreviousImage} style={originalStyles.imageButton} disabled={imageKeys.length <= 1} >
                            <Text style={originalStyles.imageButtonText}>Back</Text>
                        </TouchableOpacity>
                        <Text style={{color: COLORS.white, fontSize: FONT_SIZES.medium, fontWeight:'bold', marginHorizontal: MARGIN.small, flexShrink: 1, textAlign: 'center'}}>
                            {currentImageKey}
                        </Text>
                        <TouchableOpacity onPress={handleNextImage} style={originalStyles.imageButton} disabled={imageKeys.length <= 1} >
                            <Text style={originalStyles.imageButtonText}>Next</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={originalStyles.imageWrapper}>
                        <Image
                            key={currentImageKey} source={getImageSource(currentImageKey)}
                            style={originalStyles.image}
                            onLayout={onSummaryImageLayout} resizeMode="contain"
                        />
                        {!summaryImageLayout && (
                            <View style={originalStyles.loadingOverlay}>
                                <ActivityIndicator size="large" color={COLORS.white} />
                                <Text style={originalStyles.loadingText}>Calculating Layout...</Text>
                            </View>
                        )}
                        {summaryImageLayout && renderableMarks.map((mark) => (
                            <View key={mark.key} style={[ originalStyles.markerContainer, { left: mark.pixelX, top: mark.pixelY } ]} >
                                {mark.location === 'Interior' && <View style={originalStyles.circle} />}
                                <Text style={originalStyles.xMark}>X</Text>
                            </View>
                        ))}
                     </View>
                     <TouchableOpacity style={originalStyles.closeButton} onPress={() => {setImageModalVisible(false);}} >
                        <Text style={originalStyles.closeText}>Close</Text>
                     </TouchableOpacity>
                </View>
            </Modal>

            {/* Success Modal */}
            <Modal
                visible={modalVisible}
                transparent animationType="fade"
                onRequestClose={() => { /* Prevent closing */ }}>
                <View style={themedStyles.successModalContainer}>
                    <View style={themedStyles.successModalContent}>
                        <Text style={themedStyles.successModalTitle}>Success!</Text>
                        <Text style={themedStyles.successModalText}>Job Card has been submitted.</Text>
                        <Text style={themedStyles.successModalTimeText}>Entry Time: {carInfo.startTime ? formatTime(carInfo.startTime) : 'N/A'}</Text>
                        <Text style={themedStyles.successModalTimeText}>Exit Time: {carInfo.endTime ? formatTime(carInfo.endTime) : 'N/A'}</Text>
                        <TouchableOpacity
                            style={[commonStyles.actionButton, themedStyles.successModalButton]}
                            onPress={() => { setModalVisible(false); navigation.navigate('Home'); }} >
                            <Text style={commonStyles.actionButtonPrimaryText}>Okay</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
            {/* --- End Modals --- */}

        </ScreenWrapper>
    );
}


// --- Styles (Original - Unchanged) ---
const originalStyles = StyleSheet.create({
    scrollView: { flex: 1, backgroundColor: 'transparent', },
    scrollContentContainer: { paddingHorizontal: PADDING.medium, paddingTop: PADDING.small, paddingBottom: PADDING.large, },
    label: { fontSize: FONT_SIZES.xlarge, fontWeight: 'bold', color: COLORS.secondary, marginBottom: MARGIN.medium, },
    pickerContainer: { borderWidth: 1, borderColor: COLORS.lightGrey, borderRadius: 5, backgroundColor: COLORS.white, marginBottom: MARGIN.medium, minHeight: 50, justifyContent: 'center', },
    picker: { marginVertical: 0, height: 55, width: '100%', color: COLORS.secondary, },
    summaryContainerView: { marginVertical: MARGIN.large, },
    summaryRow: { flexDirection: 'row', paddingVertical: PADDING.small, paddingHorizontal: PADDING.xsmall, backgroundColor: COLORS.veryLightGrey, marginBottom: MARGIN.xsmall, borderRadius: 5, borderBottomWidth: 1, borderBottomColor: COLORS.divider, alignItems: 'center', },
    summaryColumnSection: { width: '50%', paddingRight: PADDING.xsmall, },
    summaryColumnCount: { width: '25%', paddingHorizontal: PADDING.xsmall, alignItems: 'center', },
    summaryText: { fontWeight: 'bold', color: COLORS.secondary, fontSize: FONT_SIZES.medium, },
    checkedText: { color: COLORS.success, fontSize: FONT_SIZES.medium, textAlign: 'center', },
    defectText: { color: COLORS.danger, fontSize: FONT_SIZES.medium, textAlign: 'center', },
    viewCenter: { alignItems: 'center', marginVertical: MARGIN.medium, },
    viewImageButton: { backgroundColor: COLORS.primary, paddingVertical: PADDING.medium, paddingHorizontal: PADDING.large, borderRadius: 5, alignItems: 'center', width: 'auto', },
    viewImageText: { color: COLORS.white, fontWeight: 'bold', fontSize: FONT_SIZES.small, },
    defectContainerView: { marginVertical: MARGIN.small, },
    defectBox: { backgroundColor: COLORS.redinfo, padding: PADDING.medium, borderRadius: 5, marginBottom: MARGIN.small, borderWidth: 1, borderColor: COLORS.danger, },
    defectItem: { fontSize: FONT_SIZES.medium, fontWeight: 'bold', color: COLORS.secondary, marginBottom: MARGIN.xsmall, },
    defectDetail: { fontSize: FONT_SIZES.small, color: COLORS.danger, marginBottom: MARGIN.xsmall, }, // Reusing this style for severity display
    remarksText: { fontSize: FONT_SIZES.small, fontStyle: 'italic', color: COLORS.grey, },
    boldText: { fontWeight: 'bold', },
    modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.7)', padding: PADDING.large, },
    modalHeader: { fontSize: FONT_SIZES.large, fontWeight: 'bold', color: COLORS.white, marginBottom: MARGIN.medium, },
    imageSelector: { flexDirection: 'row', justifyContent: 'space-around', width: '90%', marginBottom: MARGIN.medium, alignItems: 'center', paddingHorizontal: PADDING.small, },
    imageButton: { backgroundColor: COLORS.primaryLight, paddingVertical: PADDING.medium, paddingHorizontal: PADDING.large, borderRadius: 5, },
    imageButtonText: { fontWeight: 'bold', color: COLORS.secondary, fontSize: FONT_SIZES.medium, },
    imageWrapper: { position: 'relative', borderColor: COLORS.grey, borderWidth: 1, marginVertical: MARGIN.medium, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white, width: OLD_MARK_MODAL_IMAGE_WIDTH, height: OLD_MARK_MODAL_IMAGE_HEIGHT, },
    image: { width: OLD_MARK_MODAL_IMAGE_WIDTH, height: OLD_MARK_MODAL_IMAGE_HEIGHT, resizeMode: 'contain', },
    markerContainer: { position: 'absolute', alignItems: 'center', justifyContent: 'center', width: MARKER_SIZE, height: MARKER_SIZE, },
    xMark: { fontSize: FONT_SIZES.large, fontWeight: 'bold', color: COLORS.danger, },
    circle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.black, position: 'absolute', },
    closeButton: { marginTop: MARGIN.large, backgroundColor: COLORS.danger, paddingVertical: PADDING.medium, paddingHorizontal: PADDING.large, borderRadius: 5, },
    closeText: { fontWeight: 'bold', color: COLORS.white, fontSize: FONT_SIZES.medium, },
    footer: { flexDirection: 'row', justifyContent: 'space-evenly', paddingTop: PADDING.small, paddingBottom: Platform.OS === 'ios' ? PADDING.large : PADDING.small, paddingHorizontal: PADDING.large, borderTopWidth: 1, borderTopColor: 'transparent', backgroundColor: COLORS.footer, },
    button: { backgroundColor: COLORS.primaryLight, paddingHorizontal: PADDING.buttonHorizontalOriginal, paddingVertical: PADDING.large, borderRadius: 5, alignItems: 'center', justifyContent: 'center', flex: 0.45, },
    buttonBack: { backgroundColor: COLORS.veryLightGrey, paddingHorizontal: PADDING.buttonHorizontalOriginal, paddingVertical: PADDING.large, borderRadius: 5, alignItems: 'center', justifyContent: 'center', flex: 0.45, },
    buttonText: { fontSize: FONT_SIZES.xlarge, fontWeight: 'bold', color: COLORS.secondary, },
    buttonBackText: { color: COLORS.secondary, },
    buttonDisabled: { backgroundColor: COLORS.disabled, opacity: 0.7, },
    buttonTextDisabled: { color: COLORS.grey, },
    loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 10, },
    loadingText: { marginTop: MARGIN.small, color: COLORS.white, fontSize: FONT_SIZES.small, },
});

const themedStyles = StyleSheet.create({
    infoBox: { backgroundColor: COLORS.white, padding: PADDING.medium, borderRadius: 8, marginBottom: MARGIN.medium, borderWidth: 1, borderColor: COLORS.border, },
    carInfoText: { fontSize: FONT_SIZES.medium, color: COLORS.secondary, marginBottom: MARGIN.xsmall, lineHeight: FONT_SIZES.medium * 1.4, },
    carInfoLabel: { fontWeight: 'bold', color: COLORS.primary, },
    successModalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', padding: PADDING.medium, },
    successModalContent: { width: '80%', maxWidth: 400, padding: PADDING.large, backgroundColor: COLORS.white, borderRadius: 10, alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 2, }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, },
    successModalTitle: { fontSize: FONT_SIZES.xlarge, fontWeight: 'bold', marginBottom: MARGIN.small, color: COLORS.success, },
    successModalText: { fontSize: FONT_SIZES.medium, marginBottom: MARGIN.medium, color: COLORS.secondary, textAlign: 'center', },
    successModalTimeText: { fontSize: FONT_SIZES.medium, marginBottom: MARGIN.small, color: COLORS.grey, },
    successModalButton: { marginTop: MARGIN.medium, width: '80%', paddingVertical: PADDING.medium, },
    pickerContainerDisabled: { backgroundColor: COLORS.veryLightGrey, borderColor: COLORS.lightGrey, },
    loadingOverlay: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 50, },
    loadingText: { marginLeft: MARGIN.small, color: COLORS.grey, fontSize: FONT_SIZES.medium, },
    pickerPlaceholder: { fontSize: FONT_SIZES.medium, color: COLORS.grey, textAlign: 'left', paddingVertical: PADDING.medium, paddingHorizontal: PADDING.medium, },
    pickerPlaceholderItem: { color: COLORS.lightGrey, fontSize: FONT_SIZES.medium, },
    pickerItem: { fontSize: FONT_SIZES.medium, color: COLORS.secondary, },
     summaryHeaderRow: { backgroundColor: COLORS.lightGrey, borderTopWidth: 0, borderBottomWidth: 1, borderBottomColor: COLORS.lightGrey, },
     summaryHeaderText: { fontWeight: 'bold', color: COLORS.secondary, textAlign: 'center', fontSize: FONT_SIZES.medium, },
      firstSummaryRow: { borderTopWidth: 0, },
});
// --- End Styles ---