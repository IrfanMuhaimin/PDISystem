// screens/QrPage.js
import React, { useState, useRef, useEffect, useContext, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Alert, TextInput,
    AppState, FlatList, Keyboard, ActivityIndicator, Platform // Removed SafeAreaView
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ChecklistContext } from '../context/ChecklistContext';
import TimerModal from './TimerModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { debounce } from 'lodash';

// --- Import ScreenWrapper ---
// *** ADJUST PATH IF NEEDED ***
import ScreenWrapper from '../styles/flowstudiosbg.js';

// --- Import Common Styles & Constants ---
// *** ADJUST PATH IF NEEDED ***
import commonStyles, { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/commonStyles';

const API_BASE_URL = 'http://pdi.flowstudios.com.my/api';
const MIN_SEARCH_LENGTH = 5;
const SEARCH_DEBOUNCE_DELAY = 500;

// --- Helper function to format date ---
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

    // Debounced search function
    const debouncedSearch = useCallback(
        debounce(async (query) => {
            await handleVehicleSearch(query);
        }, SEARCH_DEBOUNCE_DELAY), []
    );

    // useEffect for triggering search based on chassisNumber input
    useEffect(() => {
        const query = chassisNumber.trim();
        if (query.length >= MIN_SEARCH_LENGTH) {
            setError(null); setIsSearching(true); setSearchResults([]); debouncedSearch(query);
        } else {
            debouncedSearch.cancel(); setIsSearching(false); setSearchResults([]); setError(null);
        }
        return () => { debouncedSearch.cancel(); };
    }, [chassisNumber, debouncedSearch]);

    // useEffect for handling app state changes
    useEffect(() => {
        const subscription = AppState.addEventListener("change", (nextAppState) => {
            if ( appState.current.match(/inactive|background/) && nextAppState === "active" ) { qrLock.current = false; }
            appState.current = nextAppState;
        });
        return () => { subscription.remove(); };
    }, []);

    // --- Functions ---
    const handleQRCodeScanned = ({ data }) => {
        if (data && !qrLock.current) {
            qrLock.current = true; setIsCameraOpen(false); console.log("Scanned Raw Data:", data);
            try {
                const lines = data.split("\n"); const scannedData = {};
                lines.forEach((line) => { const parts = line.split(": "); if (parts.length >= 2) { const key = parts[0].trim(); const value = parts.slice(1).join(": ").trim(); if (key && value) { scannedData[key] = value; } } });
                console.log("Parsed Scanned Data:", scannedData);
                const requiredFields = ['model', 'variant', 'engine_no', 'chassis_no', 'colour_code', 'entry_date']; const missingFields = requiredFields.filter(field => !scannedData[field]);
                if (missingFields.length > 0) { Alert.alert("Scan Error", `QR code missing: ${missingFields.join(', ')}`); qrLock.current = false; return; }
                const formattedDate = formatDateTime(scannedData.entry_date);
                const carInfoFromScan = { model: scannedData.model, variant: scannedData.variant, engine_no: scannedData.engine_no, chassis_no: scannedData.chassis_no, colour_code: scannedData.colour_code, entry_date: formattedDate, };
                updateCarInfo(carInfoFromScan); setChassisNumber(carInfoFromScan.chassis_no); setModalVisible(true);
            } catch (error) { console.error("Scan Processing Error:", error); Alert.alert("Scan Error", "Invalid QR Code data format."); qrLock.current = false; }
            setTimeout(() => { qrLock.current = false; }, 500);
        }
    };

    // toggleCameraFacing function is not used in the current JSX, but kept just in case
    const toggleCameraFacing = () => { setFacing(current => (current === 'back' ? 'front' : 'back')); };

    const handleVehicleSearch = async (query) => {
        console.log(`Searching for: "${query}"`);
        try {
            const token = await AsyncStorage.getItem('authToken'); if (!token) throw new Error("Auth token not found.");
            const url = `${API_BASE_URL}/vehicles/search?query=${encodeURIComponent(query)}`;
            const response = await fetch(url, { method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } });
            let vehicleList = []; let errorMessage = `Search failed (${response.status})`;
            if (response.ok) { const data = await response.json(); vehicleList = Array.isArray(data) ? data : (data ? [data] : []); if (vehicleList.length === 0) { if(query.length >= MIN_SEARCH_LENGTH) setError(`No vehicles found: "${query}"`); } else { setError(null); } setSearchResults(vehicleList); }
            else { try { const errorBody = await response.text(); const parsed = JSON.parse(errorBody || '{}'); errorMessage = parsed.message || errorMessage; } catch (e) { /* ignore parse error */ } console.error("Search failed:", errorMessage); setError(errorMessage); setSearchResults([]); }
        } catch (e) { console.error("Search exception:", e); setError(e.message || "Search error."); setSearchResults([]); }
        finally { setIsSearching(false); }
    };

    const handleVehicleSelect = async (selectedChassisNo) => {
        console.log(`Vehicle selected: ${selectedChassisNo}`); Keyboard.dismiss(); setChassisNumber(selectedChassisNo); setSearchResults([]); setError(null); setIsSearching(false);
        try {
            const token = await AsyncStorage.getItem('authToken'); if (!token) throw new Error("Auth token not found.");
            const response = await fetch(`${API_BASE_URL}/vehicles/${selectedChassisNo}`, { method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } });
            if (!response.ok) { let errorMessage = `Failed fetch (${response.status})`; try { const errorBody = await response.text(); const parsedError = JSON.parse(errorBody || '{}'); errorMessage = parsedError.message || errorMessage; } catch(e) { /* ignore parse error */ } throw new Error(errorMessage); }
            const data = await response.json(); const vehicleData = data && data.length > 0 ? data[0] : null; console.log("Fetched Job Card:", vehicleData);
            if (!vehicleData) { throw new Error("Empty job card data."); }
            const formattedDate = formatDateTime(vehicleData.entry_date);
            const carDetails = { model: vehicleData.model_name || 'N/A', variant: vehicleData.variant_name || 'N/A', engine_no: vehicleData.engine_no || '', chassis_no: vehicleData.chassis_no || selectedChassisNo, colour_code: vehicleData.colour_code || '', entry_date: formattedDate, };
            updateCarInfo(carDetails); setModalVisible(true);
        } catch (e) { console.error("Job Card Fetch Error:", e); Alert.alert("Job Card Error", e.message || "Fetch error."); }
    };
    // --- End Functions ---

    // Permission Check
    if (!permission) { return <View />; } // Initial render before permission state is known
    if (!permission.granted) {
        return (
            <View style={localStyles.containerPermission}>
                <Text style={localStyles.permissionText}>
                    We need your permission to show the camera
                </Text>
                <TouchableOpacity onPress={requestPermission} style={localStyles.permissionButton}>
                    <Text style={localStyles.permissionButtonText}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Main Render
    return (
        <ScreenWrapper
            showHeader={true} // Show Header
            showFooter={true} // Show Footer
            contentStyle={localStyles.content} // Apply local content centering/padding
            enableKeyboardAvoidingView={true} // Enable KAV
            enableScrollView={false} // Content likely fits screen, no scroll needed
        >
            {/* --- Unique QR Page Content START --- */}

            <Text style={localStyles.qrTitle}>Scan QR Code</Text>

            {isCameraOpen ? (
                <View style={localStyles.qrBox}>
                    <CameraView
                        style={StyleSheet.absoluteFill} // Fill the container
                        facing={facing}
                        onBarcodeScanned={handleQRCodeScanned}
                        barcodeScannerSettings={{
                            barcodeTypes: ["qr"], // Optimize for QR
                        }}
                    />
                    <TouchableOpacity
                        style={localStyles.closeButton}
                        onPress={() => setIsCameraOpen(false)}
                    >
                        <Text style={localStyles.closeText}>Close</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={localStyles.qrBox}>
                    <TouchableOpacity onPress={() => setIsCameraOpen(true)}>
                        <MaterialCommunityIcons name="qrcode-scan" size={60} color={COLORS.secondary} />
                        <Text style={{color: COLORS.secondary}}>Tap to Scan</Text>
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
                />
                {error && <Text style={[commonStyles.errorText, localStyles.errorTextStyleOverride]}>{error}</Text>}
                {isSearching && (
                    <View style={localStyles.searchingIndicator}>
                        <ActivityIndicator size="small" color={COLORS.primary} />
                        <Text style={localStyles.searchingText}>Searching...</Text>
                    </View>
                )}
                {searchResults.length > 0 && !isSearching && (
                    <View style={localStyles.resultsContainer}>
                        <FlatList
                            data={searchResults}
                            keyExtractor={(item, index) => item.id?.toString() || `result-${index}`}
                            renderItem={({ item }) => (
                                <TouchableOpacity onPress={() => handleVehicleSelect(item.chassis_no)} style={localStyles.resultItem}>
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
                    style={commonStyles.actionButtonSecondary} // Apply common secondary button style
                    onPress={() => navigation.goBack()}
                 >
                    <Text style={commonStyles.actionButtonText}> Back</Text>
                 </TouchableOpacity>
                 {/* Enter button is commented out in original code */}
            </View>

             {/* --- Unique QR Page Content END --- */}

            {/* Timer Modal */}
            <TimerModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                carInfo={carInfo}
            />
        </ScreenWrapper>
    );
};

// --- Styles ---
const localStyles = StyleSheet.create({
    content: { // Passed to ScreenWrapper's contentStyle
        justifyContent: 'center', // Center content vertically
        alignItems: 'center', // Center content horizontally
        paddingHorizontal: PADDING.large, // Horizontal padding for content edges
        paddingBottom: MARGIN.large, // Bottom padding inside content area
        flexGrow: 1, // Ensure vertical centering works
    },
    qrTitle: {
        fontSize: FONT_SIZES.xxlarge,
        fontWeight: 'bold',
        color: COLORS.primary, // Use theme color
        marginBottom: MARGIN.medium,
        textAlign: 'center',
    },
    qrBox: {
        width: 280,
        height: 280,
        borderWidth: 2,
        borderColor: COLORS.grey, // Use theme color
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: MARGIN.small,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: COLORS.white, // Use theme color
    },
    closeButton: {
        position: 'absolute',
        bottom: 10,
        alignSelf: 'center',
        backgroundColor: COLORS.danger, // Use theme color
        paddingVertical: PADDING.small,
        paddingHorizontal: PADDING.medium,
        borderRadius: 5,
    },
    closeText: {
        color: COLORS.white, // Use theme color
        fontWeight: 'bold',
        fontSize: FONT_SIZES.small,
    },
    orText: {
        fontSize: FONT_SIZES.medium,
        marginVertical: MARGIN.medium,
        fontWeight: 'bold',
        color: COLORS.secondary, // Use theme color
    },
    subTitle: {
        fontSize: FONT_SIZES.large,
        fontWeight: 'bold',
        color: COLORS.secondary, // Use theme color
        marginBottom: MARGIN.small,
    },
    inputContainer: {
        width: '100%', // Container takes full width (respecting parent padding)
        alignItems: 'center',
        marginBottom: MARGIN.small,
    },
    inputFullWidth: { // Applied to the TextInput component itself
        width: '100%',
    },
    errorTextStyleOverride: { // Specific tweaks for error text on this page
        marginTop: MARGIN.xsmall,
        marginBottom: MARGIN.small,
        textAlign: 'center',
        width: '100%',
        // Inherits base style (like color) from commonStyles.errorText
    },
    searchingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: MARGIN.small,
        marginBottom: MARGIN.small,
    },
    searchingText: {
        marginLeft: MARGIN.small,
        color: COLORS.grey, // Use theme color
        fontSize: FONT_SIZES.small,
    },
    resultsContainer: {
        width: '100%', // Results box takes full width
        maxHeight: 180,
        borderColor: COLORS.lightGrey, // Use theme color
        borderWidth: 1,
        borderRadius: 5,
        backgroundColor: COLORS.white, // Use theme color
        marginTop: MARGIN.xsmall,
        marginBottom: MARGIN.medium,
        zIndex: 1,
    },
    resultsList: {
        flexGrow: 0, // Prevent list from growing too tall inside container
    },
    resultItem: {
        paddingVertical: PADDING.small,
        paddingHorizontal: PADDING.medium,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.divider, // Use theme color
    },
    resultText: {
        fontSize: FONT_SIZES.medium,
        fontWeight: '500',
        color: COLORS.secondary, // Use theme color
    },
    resultSubText: {
        fontSize: FONT_SIZES.small,
        color: COLORS.grey, // Use theme color
        marginTop: MARGIN.xsmall,
    },
    buttonContainer: {
        flexDirection: 'row',
        marginTop: MARGIN.medium,
        justifyContent: 'center', // Center the button(s) horizontally
        width: '100%', // Container spans full width
        gap: PADDING.large, // Space between buttons if more than one
    },
    // --- Permission Screen Styles (kept local) ---
    containerPermission: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)', // Dark overlay
        padding: PADDING.large,
    },
    permissionText: {
        textAlign: 'center',
        color: COLORS.white, // White text
        fontSize: FONT_SIZES.medium,
        marginBottom: MARGIN.large,
    },
    permissionButton: {
        backgroundColor: COLORS.primary, // Theme primary color
        paddingHorizontal: PADDING.large,
        paddingVertical: PADDING.medium,
        borderRadius: 5,
    },
    permissionButtonText: {
        color: COLORS.white,
        fontSize: FONT_SIZES.medium,
        fontWeight: 'bold',
    },
});