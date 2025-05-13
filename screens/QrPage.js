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
    // --- State & Context --- (Unchanged)
    const { updateCarInfo, carInfo } = useContext(ChecklistContext);
    const [chassisNumber, setChassisNumber] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();
    const qrLock = useRef(false);
    const appState = useRef(AppState.currentState);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [facing, setFacing] = useState('back');
    const [searchResults, setSearchResults] = useState([]);
    const [error, setError] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isCheckingJobCard, setIsCheckingJobCard] = useState(false);

    // --- useEffect Hooks --- (Unchanged)
    const debouncedSearch = useCallback(debounce(async (query) => { await handleVehicleSearch(query); }, SEARCH_DEBOUNCE_DELAY), []);
    useEffect(() => {
        const query = chassisNumber.trim();
        if (query.length >= MIN_SEARCH_LENGTH) {
            setError(null); setIsSearching(true); setSearchResults([]); debouncedSearch(query);
        } else {
            debouncedSearch.cancel(); setIsSearching(false); setSearchResults([]); setError(null);
        }
        return () => { debouncedSearch.cancel(); };
    }, [chassisNumber, debouncedSearch]);

    useEffect(() => {
        const subscription = AppState.addEventListener("change", (nextAppState) => {
            if ( appState.current.match(/inactive|background/) && nextAppState === "active" ) { qrLock.current = false; }
            appState.current = nextAppState;
        });
        return () => { subscription.remove(); };
    }, []);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            setChassisNumber('');
            setSearchResults([]);
            setIsSearching(false);
            setError(null);
            setIsCameraOpen(false);
            qrLock.current = false;
            setIsCheckingJobCard(false);
            setModalVisible(false);
        });
        return unsubscribe;
    }, [navigation]);


    // --- Helper Function to Check Job Card Existence --- (Unchanged)
    const checkJobCardExists = async (chassisToCheck) => {
        setIsCheckingJobCard(true);
        let checkResult = { exists: null, error: null };
        try {
            const token = await AsyncStorage.getItem('authToken');
            if (!token) { throw new Error("Auth token not found."); }

            const url = `${API_BASE_URL}/jobcards/${chassisToCheck.trim()}`;
            console.log(`[checkJobCardExists] Checking URL: ${url}`);
            const response = await fetch(url, { method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } });
            console.log(`[checkJobCardExists] Status: ${response.status}`);

            if (response.ok) {
                checkResult = { exists: true, error: null };
            } else if (response.status === 404) {
                const body = await response.text();
                if (body.includes("Job Card not found")) {
                    checkResult = { exists: false, error: null };
                } else {
                    checkResult = { exists: null, error: `Server check failed: ${body || 'Unexpected 404 response'}` };
                }
            } else {
                let errorMsg = `Failed to check job card (${response.status})`;
                try { const eb = await response.json(); errorMsg = eb.message || eb.error || errorMsg; } catch (e) {/*ignore*/}
                checkResult = { exists: null, error: errorMsg };
            }
        } catch (error) {
            console.error("[checkJobCardExists] Exception:", error);
            checkResult = { exists: null, error: error.message || "Network error during check." };
        } finally {
            setIsCheckingJobCard(false);
            return checkResult;
        }
    };


    // --- Core Functions --- (Unchanged)

    // handleQRCodeScanned
     const handleQRCodeScanned = async ({ data }) => {
        if (data && !qrLock.current && !isCheckingJobCard) {
            qrLock.current = true; setIsCameraOpen(false); console.log("Scanned Raw Data:", data);
            let chassisToFetch = null; let scannedData = {};

            try {
                const lines = data.split("\n");
                lines.forEach((line) => { const parts = line.split(": "); if (parts.length >= 2) { const key = parts[0].trim(); const value = parts.slice(1).join(": ").trim(); if (key && value) { scannedData[key.toLowerCase().replace(/\s+/g, '_')] = value; } } });
                console.log("Parsed Scanned Data:", scannedData);
                chassisToFetch = scannedData['chassis_no'];

                if (!chassisToFetch) {
                    chassisToFetch = data.trim();
                    console.log("Could not parse chassis_no, using raw data:", chassisToFetch);
                    scannedData = {};
                }
                 if (!chassisToFetch) { throw new Error("Could not determine chassis number from QR."); }


                const jobCardStatus = await checkJobCardExists(chassisToFetch);
                if (jobCardStatus.exists === true) {
                    Alert.alert("Job Card Exists", `An inspection job card already exists for chassis ${chassisToFetch}. Cannot start a new inspection.`);
                    qrLock.current = false;
                    return;
                } else if (jobCardStatus.error) {
                    Alert.alert("Error Checking Job Card", jobCardStatus.error);
                    qrLock.current = false;
                    return;
                }


                 if (Object.keys(scannedData).length > 0) {
                    const requiredFields = ['model', 'variant', 'engine_no', 'chassis_no', 'colour_code', 'entry_date'];
                    const missingFields = requiredFields.filter(field => !scannedData[field]);
                    if (missingFields.length > 0) {
                        Alert.alert("Scan Error", `QR code missing: ${missingFields.join(', ')}`);
                        qrLock.current = false; return;
                    }
                 } else {
                      throw new Error("Could not parse full vehicle details from QR Code.");
                  }

                const formattedDate = formatDateTime(scannedData.entry_date);
                const carInfoFromScan = { model: scannedData.model, variant: scannedData.variant, engine_no: scannedData.engine_no, chassis_no: scannedData.chassis_no, colour_code: scannedData.colour_code, entry_date: formattedDate, };
                updateCarInfo(carInfoFromScan);
                setChassisNumber(carInfoFromScan.chassis_no);
                setModalVisible(true);

            } catch (error) {
                console.error("Scan Processing Error:", error);
                Alert.alert("Scan Error", error.message || "Invalid QR Code data format.");
                qrLock.current = false;
            }
        }
        else if (isCheckingJobCard) { console.log("Scan ignored: Job card check in progress."); }
        else if (!data) { console.warn("QR Scan event fired with empty data."); qrLock.current = false; }
        else { console.log("QR Scan ignored: Lock active."); }
    };

    // handleVehicleSearch
    const handleVehicleSearch = async (query) => {
        console.log(`Searching for: "${query}"`);
        try {
            const token = await AsyncStorage.getItem('authToken'); if (!token) throw new Error("Auth token not found.");
            const url = `${API_BASE_URL}/vehicles/search?query=${encodeURIComponent(query)}`;
            const response = await fetch(url, { method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } });
            let vehicleList = []; let errorMessage = null;
            if (response.ok) { const data = await response.json(); vehicleList = Array.isArray(data) ? data : (data ? [data] : []); if (vehicleList.length === 0 && query.length >= MIN_SEARCH_LENGTH) { errorMessage = (`No vehicles found: "${query}"`); } }
            else { let failedMsg = `Search failed (${response.status})`; try { const errorBody = await response.text(); const parsed = JSON.parse(errorBody || '{}'); failedMsg = parsed.message || failedMsg; } catch (e) { /* ignore parse error */ } console.error("Search failed:", failedMsg); errorMessage = failedMsg; }
            setSearchResults(vehicleList);
            setError(errorMessage);
        } catch (e) {
            console.error("Search exception:", e);
            if (e.message && e.message.includes("Auth token")) { Alert.alert("Authentication Error", e.message); }
            else { setError(e.message || "Search error."); }
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    // handleVehicleSelect
    const handleVehicleSelect = async (selectedChassisNo) => {
        console.log(`Vehicle selected: ${selectedChassisNo}`); Keyboard.dismiss(); setChassisNumber(selectedChassisNo); setSearchResults([]); setError(null); setIsSearching(false);
        if (isCheckingJobCard) { console.log("Selection ignored: Job card check in progress."); return; }

        const jobCardStatus = await checkJobCardExists(selectedChassisNo);
        if (jobCardStatus.exists === true) {
            Alert.alert("Job Card Exists", `An inspection job card already exists for chassis ${selectedChassisNo}. Cannot start a new inspection.`);
            return;
        } else if (jobCardStatus.error) {
            Alert.alert("Error Checking Job Card", jobCardStatus.error);
            return;
        }
        console.log("Job card check passed. Fetching details for selected vehicle...");

        try {
            const token = await AsyncStorage.getItem('authToken'); if (!token) throw new Error("Auth token not found.");
            const response = await fetch(`${API_BASE_URL}/vehicles/${selectedChassisNo}`, { method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } });
            if (!response.ok) { let errorMessage = `Failed fetch (${response.status})`; try { const errorBody = await response.text(); const parsedError = JSON.parse(errorBody || '{}'); errorMessage = parsedError.message || errorMessage; } catch(e) { /* ignore parse error */ } throw new Error(errorMessage); }
            const data = await response.json(); const vehicleData = data && data.length > 0 ? data[0] : null; console.log("Fetched Job Card:", vehicleData);
            if (!vehicleData) { throw new Error("Empty job card data."); }
            const formattedDate = formatDateTime(vehicleData.entry_date);
            const carDetails = { model: vehicleData.model_name || 'N/A', variant: vehicleData.variant_name || 'N/A', engine_no: vehicleData.engine_no || '', chassis_no: vehicleData.chassis_no || selectedChassisNo, colour_code: vehicleData.colour_code || '', entry_date: formattedDate, };
            updateCarInfo(carDetails);
            setModalVisible(true);

        } catch (e) {
            console.error("Job Card Fetch Error:", e);
            if (e.message && e.message.includes("Auth token")) { Alert.alert("Authentication Error", e.message); }
            else { Alert.alert("Job Card Error", e.message || "Fetch error."); }
        }
    };

    if (!permission) { return <View />; }
    if (!permission.granted) {
        return (
            <View style={localStyles.containerPermission}>
                <Text style={localStyles.permissionText}> We need your permission to show the camera </Text>
                <TouchableOpacity onPress={requestPermission} style={localStyles.permissionButton}>
                    <Text style={localStyles.permissionButtonText}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // --- Main Render ---
    return (
        <ScreenWrapper
            showHeader={true}
            showFooter={true}
            contentStyle={localStyles.content}
            enableKeyboardAvoidingView={true}
            enableScrollView={false}
        >
            {isCheckingJobCard && (
                <View style={localStyles.checkingOverlay}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={localStyles.checkingText}>Checking Job Card...</Text>
                </View>
            )}

            <Text style={localStyles.qrTitle}>Scan QR Code</Text>

            {isCameraOpen ? (
                <View style={localStyles.qrBox}>
                    <CameraView
                        style={StyleSheet.absoluteFill}
                        facing={facing}
                        onBarcodeScanned={isCheckingJobCard || qrLock.current ? undefined : handleQRCodeScanned}
                        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                    />
                    <TouchableOpacity style={localStyles.closeButton} onPress={() => setIsCameraOpen(false)}>
                        <Text style={localStyles.closeText}>Close</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={localStyles.qrBox}>
                    <TouchableOpacity
                        style={localStyles.qrPlaceholderContainer}
                        onPress={() => !isCheckingJobCard && setIsCameraOpen(true)}
                        disabled={isCheckingJobCard}
                    >
                        <MaterialCommunityIcons
                             name="qrcode-scan"
                             size={60}
                             color={isCheckingJobCard ? COLORS.disabled : COLORS.secondary} />
                        <Text style={[
                            localStyles.qrPlaceholderText, // Base style
                            { color: isCheckingJobCard ? COLORS.disabled : COLORS.secondary } // Conditional color
                        ]}>
                            Tap to Scan
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Rest of the component remains unchanged... */}
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
                    editable={!isCheckingJobCard}
                />
                {error && <Text style={[commonStyles.errorText, localStyles.errorTextStyleOverride]}>{error}</Text>}
                {isSearching && !isCheckingJobCard && (
                    <View style={localStyles.searchingIndicator}>
                        <ActivityIndicator size="small" color={COLORS.primary} />
                        <Text style={localStyles.searchingText}>Searching...</Text>
                    </View>
                )}
                {searchResults.length > 0 && !isSearching && !isCheckingJobCard && (
                    <View style={localStyles.resultsContainer}>
                        <FlatList
                            data={searchResults}
                            keyExtractor={(item, index) => item.id?.toString() || `result-${index}`}
                            renderItem={({ item }) => (
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

            <View style={localStyles.buttonContainer}>
                 <TouchableOpacity
                    style={[commonStyles.actionButtonSecondary, isCheckingJobCard && commonStyles.actionButtonDisabled]}
                    onPress={() => navigation.goBack()}
                    disabled={isCheckingJobCard}
                 >
                    <Text style={[commonStyles.actionButtonText, isCheckingJobCard && commonStyles.actionButtonTextDisabled]}> Back</Text>
                 </TouchableOpacity>
            </View>

            <TimerModal
                visible={modalVisible}
                onClose={() => { setModalVisible(false); qrLock.current = false; }}
                carInfo={carInfo}
            />
        </ScreenWrapper>
    );
};
const TINY_MARGIN = MARGIN.xsmall / 2 || 5;

const localStyles = StyleSheet.create({
    content: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: PADDING.large,
        paddingBottom: MARGIN.large,
        flexGrow: 1,
    },
    qrTitle: { fontSize: FONT_SIZES.xxlarge, fontWeight: 'bold', color: COLORS.primary, marginBottom: MARGIN.medium, textAlign: 'center', },
    qrBox: {
        width: 400,
        height: 400,
        borderWidth: 2,
        borderColor: COLORS.grey,
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: MARGIN.small,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: COLORS.white,
    },
    qrPlaceholderContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    qrPlaceholderText: {
        marginTop: TINY_MARGIN,
        fontSize: FONT_SIZES.medium,
        textAlign: 'center',
    },
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
    resultSubText: { fontSize: FONT_SIZES.small, color: COLORS.grey, marginTop: TINY_MARGIN, }, // Used TINY_MARGIN here too
    buttonContainer: { flexDirection: 'row', marginTop: MARGIN.medium, justifyContent: 'center', width: '100%', gap: PADDING.large, },
    containerPermission: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.7)', padding: PADDING.large, },
    permissionText: { textAlign: 'center', color: COLORS.white, fontSize: FONT_SIZES.medium, marginBottom: MARGIN.large, },
    permissionButton: { backgroundColor: COLORS.primary, paddingHorizontal: PADDING.large, paddingVertical: PADDING.medium, borderRadius: 5, },
    permissionButtonText: { color: COLORS.white, fontSize: FONT_SIZES.medium, fontWeight: 'bold', },
    checkingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255, 255, 255, 0.75)', justifyContent: 'center', alignItems: 'center', zIndex: 1000, },
    checkingText: { marginTop: MARGIN.medium, fontSize: FONT_SIZES.medium, fontWeight: 'bold', color: COLORS.secondary, }
});