// screens/QrPage.js
import React, { useState, useRef, useEffect, useContext, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Alert, TextInput,
    AppState, FlatList, Keyboard, ActivityIndicator, Platform
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ChecklistContext } from '../context/ChecklistContext'; // Ensure path is correct
import TimerModal from './TimerModal'; // Ensure path is correct
import AsyncStorage from '@react-native-async-storage/async-storage';
import { debounce } from 'lodash';
import ScreenWrapper from '../styles/flowstudiosbg.js';
import commonStyles, { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/commonStyles';

// --- Constants --- (Unchanged)
const API_BASE_URL = 'http://pdi.flowstudios.com.my/api';
const MIN_SEARCH_LENGTH = 5;
const SEARCH_DEBOUNCE_DELAY = 500;

// --- Helper function to format date --- (Unchanged)
const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) { return 'Invalid Date'; }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year}, ${hours}:${minutes}`;
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString;
  }
};


export default function QrPage({ navigation }) {
    // --- State & Context --- (Keep existing state, add one new state)
    const { updateCarInfo, carInfo } = useContext(ChecklistContext); // Original context usage
    const [chassisNumber, setChassisNumber] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();
    const qrLock = useRef(false);
    const appState = useRef(AppState.currentState);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [facing, setFacing] = useState('back');
    const [searchResults, setSearchResults] = useState([]);
    const [error, setError] = useState(null); // KEEP local error state for search etc.
    const [isSearching, setIsSearching] = useState(false); // KEEP local search state
    const [isCheckingJobCard, setIsCheckingJobCard] = useState(false); // *** NEW STATE ***

    // --- useEffect Hooks --- (Unchanged - includes original debounced search, app state, focus listener)
    const debouncedSearch = useCallback(debounce(async (query) => { await handleVehicleSearch(query); }, SEARCH_DEBOUNCE_DELAY), []);
    useEffect(() => {
        const query = chassisNumber.trim();
        if (query.length >= MIN_SEARCH_LENGTH) {
            setError(null); setIsSearching(true); setSearchResults([]); debouncedSearch(query);
        } else {
            debouncedSearch.cancel(); setIsSearching(false); setSearchResults([]); setError(null);
        }
        return () => { debouncedSearch.cancel(); };
    }, [chassisNumber, debouncedSearch]); // Keep original dependencies

    useEffect(() => {
        const subscription = AppState.addEventListener("change", (nextAppState) => {
            if ( appState.current.match(/inactive|background/) && nextAppState === "active" ) { qrLock.current = false; }
            appState.current = nextAppState;
        });
        return () => { subscription.remove(); };
    }, []);

    useEffect(() => { // Original focus listener
        const unsubscribe = navigation.addListener('focus', () => {
            // Original state clearing
            setChassisNumber('');
            setSearchResults([]);
            setIsSearching(false);
            setError(null);
            setIsCameraOpen(false);
            qrLock.current = false;
            setIsCheckingJobCard(false); // Reset new state too
            setModalVisible(false);
            // No context error clear needed as we are not using context error setter
        });
        return unsubscribe;
    }, [navigation]); // Original dependency


    // --- Helper Function to Check Job Card Existence --- (NEW FUNCTION)
    // This function performs the check and returns status without side effects like alerts here
    const checkJobCardExists = async (chassisToCheck) => {
        setIsCheckingJobCard(true); // Indicate check start
        let checkResult = { exists: null, error: null }; // Default result
        try {
            const token = await AsyncStorage.getItem('authToken');
            if (!token) { throw new Error("Auth token not found."); } // Let caller handle this specific error

            const url = `${API_BASE_URL}/jobcards/${chassisToCheck.trim()}`;
            console.log(`[checkJobCardExists] Checking URL: ${url}`);
            const response = await fetch(url, { method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } });
            console.log(`[checkJobCardExists] Status: ${response.status}`);

            if (response.ok) { // 200-299
                checkResult = { exists: true, error: null };
            } else if (response.status === 404) { // Exactly 404
                const body = await response.text(); // Read body to confirm message
                if (body.includes("Job Card not found")) { // Match server message
                    checkResult = { exists: false, error: null };
                } else {
                    checkResult = { exists: null, error: `Server check failed: ${body || 'Unexpected 404 response'}` };
                }
            } else { // Other errors
                let errorMsg = `Failed to check job card (${response.status})`;
                try { const eb = await response.json(); errorMsg = eb.message || eb.error || errorMsg; } catch (e) {/*ignore*/}
                checkResult = { exists: null, error: errorMsg };
            }
        } catch (error) {
            console.error("[checkJobCardExists] Exception:", error);
            checkResult = { exists: null, error: error.message || "Network error during check." };
        } finally {
            setIsCheckingJobCard(false); // Indicate check end
            return checkResult; // Return the result object
        }
    };


    // --- Core Functions ---

    // *** MODIFIED handleQRCodeScanned to include check ***
    const handleQRCodeScanned = async ({ data }) => { // Made async
        if (data && !qrLock.current && !isCheckingJobCard) { // Added check for isCheckingJobCard
            qrLock.current = true; setIsCameraOpen(false); console.log("Scanned Raw Data:", data);
            let chassisToFetch = null; let scannedData = {}; // Keep original parsing setup

            try {
                // Original parsing logic
                const lines = data.split("\n");
                lines.forEach((line) => { const parts = line.split(": "); if (parts.length >= 2) { const key = parts[0].trim(); const value = parts.slice(1).join(": ").trim(); if (key && value) { scannedData[key.toLowerCase().replace(/\s+/g, '_')] = value; } } });
                console.log("Parsed Scanned Data:", scannedData);
                chassisToFetch = scannedData['chassis_no']; // Assume chassis_no is key if parsed

                if (!chassisToFetch) { // If parsing failed or no chassis_no key
                    chassisToFetch = data.trim(); // Assume raw data is chassis
                    console.log("Could not parse chassis_no, using raw data:", chassisToFetch);
                    // Clear parsed data as it's incomplete/irrelevant now
                    scannedData = {};
                }
                 if (!chassisToFetch) { throw new Error("Could not determine chassis number from QR."); } // Final check


                // --- ADDED: Check if Job Card Exists ---
                const jobCardStatus = await checkJobCardExists(chassisToFetch);
                if (jobCardStatus.exists === true) {
                    Alert.alert("Job Card Exists", `An inspection job card already exists for chassis ${chassisToFetch}. Cannot start a new inspection.`);
                    qrLock.current = false; // Release lock
                    return; // Stop processing
                } else if (jobCardStatus.error) {
                    // Alert for check errors (like auth failure, server error)
                    Alert.alert("Error Checking Job Card", jobCardStatus.error);
                    qrLock.current = false; // Release lock
                    return; // Stop processing
                }
                // --- Job card does NOT exist or check passed -> Continue Original Flow ---


                // Original validation ONLY if data was parsed
                 if (Object.keys(scannedData).length > 0) {
                    const requiredFields = ['model', 'variant', 'engine_no', 'chassis_no', 'colour_code', 'entry_date'];
                    const missingFields = requiredFields.filter(field => !scannedData[field]);
                    if (missingFields.length > 0) {
                        // Keep original error alert for missing fields from QR
                        Alert.alert("Scan Error", `QR code missing: ${missingFields.join(', ')}`);
                        qrLock.current = false; return;
                    }
                 } else {
                      // If parsing failed and we only have chassis from raw data
                      // Throw error to match original behaviour (requires full details from QR)
                      throw new Error("Could not parse full vehicle details from QR Code.");
                  }

                // Original logic to format date and update context
                const formattedDate = formatDateTime(scannedData.entry_date);
                const carInfoFromScan = { model: scannedData.model, variant: scannedData.variant, engine_no: scannedData.engine_no, chassis_no: scannedData.chassis_no, colour_code: scannedData.colour_code, entry_date: formattedDate, };
                updateCarInfo(carInfoFromScan);
                setChassisNumber(carInfoFromScan.chassis_no); // Keep this update
                setModalVisible(true); // Show timer modal

            } catch (error) {
                // Keep original error handling for scan processing
                console.error("Scan Processing Error:", error);
                Alert.alert("Scan Error", error.message || "Invalid QR Code data format.");
                qrLock.current = false; // Release lock on error
            }
             // Remove fixed timeout, lock released by modal close or error
             // setTimeout(() => { qrLock.current = false; }, 500);
        }
        // Keep other checks for lock/empty data
        else if (isCheckingJobCard) { console.log("Scan ignored: Job card check in progress."); }
        else if (!data) { console.warn("QR Scan event fired with empty data."); qrLock.current = false; }
        else { console.log("QR Scan ignored: Lock active."); }
    };

    // Manual vehicle search (Unchanged Logic - uses local setError)
    const handleVehicleSearch = async (query) => {
        console.log(`Searching for: "${query}"`);
        try {
            const token = await AsyncStorage.getItem('authToken'); if (!token) throw new Error("Auth token not found."); // Original check
            const url = `${API_BASE_URL}/vehicles/search?query=${encodeURIComponent(query)}`;
            const response = await fetch(url, { method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } });
            let vehicleList = []; let errorMessage = null; // Use local error message var
            if (response.ok) { const data = await response.json(); vehicleList = Array.isArray(data) ? data : (data ? [data] : []); if (vehicleList.length === 0 && query.length >= MIN_SEARCH_LENGTH) { errorMessage = (`No vehicles found: "${query}"`); } } // Set local error message
            else { let failedMsg = `Search failed (${response.status})`; try { const errorBody = await response.text(); const parsed = JSON.parse(errorBody || '{}'); failedMsg = parsed.message || failedMsg; } catch (e) { /* ignore parse error */ } console.error("Search failed:", failedMsg); errorMessage = failedMsg; } // Set local error message
            setSearchResults(vehicleList);
            setError(errorMessage); // Update local error state
        } catch (e) {
            console.error("Search exception:", e);
            // Use Alert for critical token error, local setError for others
            if (e.message && e.message.includes("Auth token")) { Alert.alert("Authentication Error", e.message); }
            else { setError(e.message || "Search error."); }
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };


    // *** MODIFIED handleVehicleSelect to include check ***
    const handleVehicleSelect = async (selectedChassisNo) => { // Made async
        console.log(`Vehicle selected: ${selectedChassisNo}`); Keyboard.dismiss(); setChassisNumber(selectedChassisNo); setSearchResults([]); setError(null); setIsSearching(false);
        if (isCheckingJobCard) { console.log("Selection ignored: Job card check in progress."); return; } // Prevent action during check

        // --- ADDED: Check if Job Card Exists ---
        const jobCardStatus = await checkJobCardExists(selectedChassisNo);
        if (jobCardStatus.exists === true) {
            Alert.alert("Job Card Exists", `An inspection job card already exists for chassis ${selectedChassisNo}. Cannot start a new inspection.`);
            return; // Stop processing
        } else if (jobCardStatus.error) {
            // Alert for check errors (like auth failure, server error)
            Alert.alert("Error Checking Job Card", jobCardStatus.error);
            return; // Stop processing
        }
        // --- Job card does NOT exist or check passed -> Continue Original Flow ---
        console.log("Job card check passed. Fetching details for selected vehicle...");


        // Original logic to fetch full details
        try {
            const token = await AsyncStorage.getItem('authToken'); if (!token) throw new Error("Auth token not found."); // Original check
            const response = await fetch(`${API_BASE_URL}/vehicles/${selectedChassisNo}`, { method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } });
            if (!response.ok) { let errorMessage = `Failed fetch (${response.status})`; try { const errorBody = await response.text(); const parsedError = JSON.parse(errorBody || '{}'); errorMessage = parsedError.message || errorMessage; } catch(e) { /* ignore parse error */ } throw new Error(errorMessage); }
            const data = await response.json(); const vehicleData = data && data.length > 0 ? data[0] : null; console.log("Fetched Job Card:", vehicleData);
            if (!vehicleData) { throw new Error("Empty job card data."); } // Original check
            const formattedDate = formatDateTime(vehicleData.entry_date);
            const carDetails = { model: vehicleData.model_name || 'N/A', variant: vehicleData.variant_name || 'N/A', engine_no: vehicleData.engine_no || '', chassis_no: vehicleData.chassis_no || selectedChassisNo, colour_code: vehicleData.colour_code || '', entry_date: formattedDate, };
            updateCarInfo(carDetails); // Original context update
            setModalVisible(true); // Original modal trigger

        } catch (e) {
            // Original error handling for detail fetch
            console.error("Job Card Fetch Error:", e);
            // Use Alert for critical token error, otherwise Alert generic fetch error
            if (e.message && e.message.includes("Auth token")) { Alert.alert("Authentication Error", e.message); }
            else { Alert.alert("Job Card Error", e.message || "Fetch error."); }
        }
         // No finally block needed here as loading wasn't set in original code for this specific fetch
    };

    // --- Permissions Check --- (Unchanged from original)
    if (!permission) { return <View />; }
    if (!permission.granted) {
        return (
            <View style={localStyles.containerPermission}>
                <Text style={localStyles.permissionText}> We need your permission to show the camera </Text>
                <TouchableOpacity onPress={requestPermission} style={localStyles.permissionButton}>
                    <Text style={localStyles.permissionButtonText}>Grant Permission</Text>
                </TouchableOpacity>
                {/* Original code didn't have a Back button here, keeping it that way */}
            </View>
        );
    }

    // --- Main Render ---
    return (
        <ScreenWrapper
            showHeader={true}
            showFooter={true} // Keep original footer setting
            contentStyle={localStyles.content} // Use original style
            enableKeyboardAvoidingView={true}
            enableScrollView={false}
        >
             {/* *** ADDED: Overlay for Job Card Check *** */}
            {isCheckingJobCard && (
                <View style={localStyles.checkingOverlay}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={localStyles.checkingText}>Checking Job Card...</Text>
                </View>
            )}

            {/* Original JSX Structure */}
            <Text style={localStyles.qrTitle}>Scan QR Code</Text>

            {isCameraOpen ? (
                <View style={localStyles.qrBox}>
                    <CameraView
                        style={StyleSheet.absoluteFill}
                        facing={facing}
                        onBarcodeScanned={isCheckingJobCard || qrLock.current ? undefined : handleQRCodeScanned} // Disable scan during check/lock
                        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                    />
                    <TouchableOpacity style={localStyles.closeButton} onPress={() => setIsCameraOpen(false)}>
                        <Text style={localStyles.closeText}>Close</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={localStyles.qrBox}>
                     {/* *** ADDED: Disable touchable during check *** */}
                    <TouchableOpacity onPress={() => !isCheckingJobCard && setIsCameraOpen(true)} disabled={isCheckingJobCard}>
                        <MaterialCommunityIcons name="qrcode-scan" size={60} color={isCheckingJobCard ? COLORS.disabled : COLORS.secondary} />
                        <Text style={{color: isCheckingJobCard ? COLORS.disabled : COLORS.secondary}}>Tap to Scan</Text>
                    </TouchableOpacity>
                </View>
            )}

            <Text style={localStyles.orText}>OR</Text>
            <Text style={localStyles.subTitle}>Manual type chassis no.</Text>

            <View style={localStyles.inputContainer}>
                <TextInput
                    style={[commonStyles.textInput, localStyles.inputFullWidth]}
                    placeholder={`Enter at least ${MIN_SEARCH_LENGTH} characters`}
                    placeholderTextColor={COLORS.grey}
                    value={chassisNumber}
                    onChangeText={setChassisNumber}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    editable={!isCheckingJobCard} // *** ADDED: Disable input during check ***
                />
                {/* Original Error Display (uses local error state) */}
                {error && <Text style={[commonStyles.errorText, localStyles.errorTextStyleOverride]}>{error}</Text>}
                 {/* Original Searching Indicator */}
                {isSearching && !isCheckingJobCard && ( // Hide search loading during job card check
                    <View style={localStyles.searchingIndicator}>
                        <ActivityIndicator size="small" color={COLORS.primary} />
                        <Text style={localStyles.searchingText}>Searching...</Text>
                    </View>
                )}
                 {/* Original Search Results List */}
                {searchResults.length > 0 && !isSearching && !isCheckingJobCard && ( // Hide results during check
                    <View style={localStyles.resultsContainer}>
                        <FlatList
                            data={searchResults}
                            keyExtractor={(item, index) => item.id?.toString() || `result-${index}`}
                            renderItem={({ item }) => (
                                // *** ADDED: Disable touchable during check ***
                                <TouchableOpacity onPress={() => handleVehicleSelect(item.chassis_no)} style={localStyles.resultItem} disabled={isCheckingJobCard}>
                                    <Text style={localStyles.resultText}>Chassis: {item.chassis_no}</Text>
                                    {item.model_name && <Text style={localStyles.resultSubText}>Model: {item.model_name} {item.variant_name ? `(${item.variant_name})` : ''}</Text>}
                                    {item.colour_code && <Text style={localStyles.resultSubText}>Color: {item.colour_code}</Text>}
                                </TouchableOpacity>
                            )}
                            keyboardShouldPersistTaps='handled'
                            style={localStyles.resultsList}
                        />
                    </View>
                )}
            </View>

            {/* Original Button Container */}
            <View style={localStyles.buttonContainer}>
                 <TouchableOpacity
                    style={[commonStyles.actionButtonSecondary, isCheckingJobCard && commonStyles.actionButtonDisabled]} // *** ADDED: Disable button during check ***
                    onPress={() => navigation.goBack()}
                    disabled={isCheckingJobCard} // *** ADDED: Disable button during check ***
                 >
                    <Text style={[commonStyles.actionButtonText, isCheckingJobCard && commonStyles.actionButtonTextDisabled]}> Back</Text>
                 </TouchableOpacity>
                 {/* Enter button was commented out */}
            </View>

            {/* Original Timer Modal */}
            <TimerModal
                visible={modalVisible}
                onClose={() => { setModalVisible(false); qrLock.current = false; }} // Original logic
                carInfo={carInfo}
            />
        </ScreenWrapper>
    );
};

// --- Styles --- (Original styles + added checkingOverlay)
const localStyles = StyleSheet.create({
    content: { // Passed to ScreenWrapper's contentStyle
        justifyContent: 'center', // Center content vertically
        alignItems: 'center', // Center content horizontally
        paddingHorizontal: PADDING.large, // Horizontal padding for content edges
        paddingBottom: MARGIN.large, // Bottom padding inside content area
        flexGrow: 1, // Ensure vertical centering works
    },
    qrTitle: { fontSize: FONT_SIZES.xxlarge, fontWeight: 'bold', color: COLORS.primary, marginBottom: MARGIN.medium, textAlign: 'center', },
    qrBox: { width: 280, height: 280, borderWidth: 2, borderColor: COLORS.grey, alignItems: 'center', justifyContent: 'center', marginVertical: MARGIN.small, overflow: 'hidden', position: 'relative', backgroundColor: COLORS.white, },
    closeButton: { position: 'absolute', bottom: 10, alignSelf: 'center', backgroundColor: COLORS.danger, paddingVertical: PADDING.small, paddingHorizontal: PADDING.medium, borderRadius: 5, },
    closeText: { color: COLORS.white, fontWeight: 'bold', fontSize: FONT_SIZES.small, },
    orText: { fontSize: FONT_SIZES.medium, marginVertical: MARGIN.medium, fontWeight: 'bold', color: COLORS.secondary, },
    subTitle: { fontSize: FONT_SIZES.large, fontWeight: 'bold', color: COLORS.secondary, marginBottom: MARGIN.small, },
    inputContainer: { width: '100%', alignItems: 'center', marginBottom: MARGIN.small, },
    inputFullWidth: { width: '100%', },
    errorTextStyleOverride: { marginTop: MARGIN.xsmall, marginBottom: MARGIN.small, textAlign: 'center', width: '100%', },
    searchingIndicator: { flexDirection: 'row', alignItems: 'center', marginTop: MARGIN.small, marginBottom: MARGIN.small, },
    searchingText: { marginLeft: MARGIN.small, color: COLORS.grey, fontSize: FONT_SIZES.small, },
    resultsContainer: { width: '100%', maxHeight: 180, borderColor: COLORS.lightGrey, borderWidth: 1, borderRadius: 5, backgroundColor: COLORS.white, marginTop: MARGIN.xsmall, marginBottom: MARGIN.medium, zIndex: 1, },
    resultsList: { flexGrow: 0, },
    resultItem: { paddingVertical: PADDING.small, paddingHorizontal: PADDING.medium, borderBottomWidth: 1, borderBottomColor: COLORS.divider, },
    resultText: { fontSize: FONT_SIZES.medium, fontWeight: '500', color: COLORS.secondary, },
    resultSubText: { fontSize: FONT_SIZES.small, color: COLORS.grey, marginTop: MARGIN.xsmall / 2, },
    buttonContainer: { flexDirection: 'row', marginTop: MARGIN.medium, justifyContent: 'center', width: '100%', gap: PADDING.large, },
    containerPermission: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.7)', padding: PADDING.large, },
    permissionText: { textAlign: 'center', color: COLORS.white, fontSize: FONT_SIZES.medium, marginBottom: MARGIN.large, },
    permissionButton: { backgroundColor: COLORS.primary, paddingHorizontal: PADDING.large, paddingVertical: PADDING.medium, borderRadius: 5, },
    permissionButtonText: { color: COLORS.white, fontSize: FONT_SIZES.medium, fontWeight: 'bold', },
    // *** ADDED STYLE ***
    checkingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255, 255, 255, 0.75)', justifyContent: 'center', alignItems: 'center', zIndex: 1000, },
    checkingText: { marginTop: MARGIN.medium, fontSize: FONT_SIZES.medium, fontWeight: 'bold', color: COLORS.secondary, }
});