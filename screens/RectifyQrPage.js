// screens/RectifyQrPage.js
import React, { useState, useRef, useEffect, useContext, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Alert,
    TextInput, AppState, ActivityIndicator, FlatList,
    Keyboard, Platform // Added Platform
} from 'react-native'; // Removed SafeAreaView
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RectifyContext } from '../context/RectifyContext'; // Ensure path is correct
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

export default function RectifyQrPage({ navigation }) {
    // State from Context - UNCHANGED
    const { setRectifyData, setLoading, setError, clearRectifyData, loading, error } = useContext(RectifyContext);

    // Component State - UNCHANGED
    const [chassisNumberInput, setChassisNumberInput] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [facing, setFacing] = useState('back');

    // Refs - UNCHANGED
    const qrLock = useRef(false);
    const appState = useRef(AppState.currentState);

    // --- Effect Hooks --- UNCHANGED (Removed setError call from focus listener as it's reset in fetch anyway)
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            clearRectifyData(); setChassisNumberInput(''); setSearchResults([]); setIsSearching(false); /*setError(null);*/ setIsCameraOpen(false); qrLock.current = false;
        });
        return unsubscribe;
    }, [navigation, clearRectifyData /*, setError*/]); // setError removed from deps

    useEffect(() => {
        const subscription = AppState.addEventListener("change", (nextAppState) => {
            if (appState.current.match(/inactive|background/) && nextAppState === "active") { qrLock.current = false; }
            appState.current = nextAppState;
        });
        return () => { subscription.remove(); };
    }, []);

    const debouncedSearch = useCallback(debounce(async (query) => { await handleVehicleSearch(query); }, SEARCH_DEBOUNCE_DELAY), []);

    useEffect(() => {
        const query = chassisNumberInput.trim();
        if (query.length >= MIN_SEARCH_LENGTH) { setError(null); setIsSearching(true); setSearchResults([]); debouncedSearch(query); }
        else { debouncedSearch.cancel(); setIsSearching(false); setSearchResults([]); setError(null); } // Clear error on short input too
        return () => { debouncedSearch.cancel(); };
    }, [chassisNumberInput, debouncedSearch, setError]);


    // --- Core Functions --- UNCHANGED (Keeping original logic as requested)
    const fetchAndProcessJobCard = async (chassisNo) => {
        setChassisNumberInput(''); setSearchResults([]); setIsSearching(false); setError(null); Keyboard.dismiss();
        if (!chassisNo || chassisNo.trim() === '') { Alert.alert('Internal Error', 'Chassis number is missing.'); return; }
        console.log(`Fetching job card data for selected chassis: ${chassisNo}`); setLoading(true);
        try {
            const token = await AsyncStorage.getItem('authToken'); if (!token) throw new Error("Authentication token not found.");
            const fetchUrl = `${API_BASE_URL}/jobcards/${chassisNo.trim()}`;
            const response = await fetch(fetchUrl, { method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } });
            if (!response.ok) { const errorBody = await response.text(); let parsedError = {}; try { parsedError = JSON.parse(errorBody); } catch (e) { /* ignore */ } console.error("Fetch Job Card Error Body:", errorBody); if (response.status === 404) throw new Error(`Job card not found for: ${chassisNo}`); if (response.status === 401 || response.status === 403) throw new Error(parsedError.message || 'Authorization failed.'); throw new Error(parsedError.message || `Failed to fetch job card. Status: ${response.status}.`); }
            const data = await response.json();
            const carInfo = { id: data.id, chassis_no: data.chassis_no || chassisNo, model: data.model || 'N/A', variant: data.variant || 'N/A', engine_no: data.engine_no || 'N/A', colour_code: data.colour_code || 'N/A' };
            const fetchedImages = data.images || [];
            const defectItems = [];
            if (Array.isArray(data.types)) {
                data.types.forEach(typeObject => {
                    if (Array.isArray(typeObject.items)) {
                        typeObject.items.forEach(item => {
                             if (item && item.pass === false && Array.isArray(item.defect)) {
                                let itemIdForRectify = item.id ?? null; if (itemIdForRectify === null && item.defect[0] && item.defect[0].id != null) { itemIdForRectify = item.defect[0].id; }
                                if (itemIdForRectify === null || itemIdForRectify === undefined) { console.warn("Skipping defect item due to missing ID:", item); return; }
                                const newItem = { id: itemIdForRectify, section: item.section, name: item.name ?? 'Unnamed Item', appear: item.appear ?? false, originalValue: item.value, originalPass: item.pass ?? false, originalNames: item.originalNames ?? [], allDefects: item.defect };
                                defectItems.push(newItem);
                            }
                        });
                    }
                });
            }
            if (defectItems.length === 0) { Alert.alert('No Defects Found', `No items marked with defects for: ${chassisNo}.`); setLoading(false); return; }
            setRectifyData(carInfo, defectItems, fetchedImages); navigation.navigate('RectifyChecklist');
        } catch (error) { console.error("Error in fetchAndProcessJobCard:", error); Alert.alert('Error Fetching Job Card', error.message || 'Unexpected error.'); setError(error.message); }
        finally { setLoading(false); qrLock.current = false; }
    };

    const handleVehicleSearch = async (query) => {
        console.log(`Searching vehicles with query: ${query}`);
        try {
            const token = await AsyncStorage.getItem('authToken'); if (!token) throw new Error("Authentication token not found.");
            const searchUrl = `${API_BASE_URL}/vehicles/search?query=${encodeURIComponent(query)}`; const response = await fetch(searchUrl, { method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } });
            let vehicleList = [];
            if (response.ok) { const results = await response.json(); if (results && !Array.isArray(results)) vehicleList = [results]; else if (Array.isArray(results)) vehicleList = results; if (vehicleList.length === 0 && query.length >= MIN_SEARCH_LENGTH) setError(`No vehicles found matching "${query}".`); setSearchResults(vehicleList); }
            else { const errorBody = await response.text(); let parsedError = {}; try { parsedError = JSON.parse(errorBody); } catch (e) { } console.error("Search Error Body:", errorBody); let errorMessage = parsedError.message || `Search failed. Status: ${response.status}.`; if (response.status === 400) errorMessage = parsedError.message || `Search query invalid (min ${MIN_SEARCH_LENGTH} chars).`; if (response.status === 401) errorMessage = parsedError.message || `Authorization failed.`; if (response.status === 404) errorMessage = `No vehicles found matching "${query}".`; setError(errorMessage); setSearchResults([]); }
        } catch (error) { console.error("Error during vehicle search fetch:", error); setError(error.message || 'An network or unexpected error occurred during search.'); setSearchResults([]); }
        finally { setIsSearching(false); }
    };

    const handleQRCodeScanned = ({ data }) => {
        if (data && !qrLock.current) { qrLock.current = true; setIsCameraOpen(false); setChassisNumberInput(''); setSearchResults([]); setIsSearching(false); setError(null); console.log("Rectify Scanned Data Raw:", data); try { let chassisFromQr = null; if (data.includes(':') && data.includes('\n')) { const lines = data.split("\n"); const scannedData = {}; lines.forEach((line) => { const parts = line.split(": "); if (parts.length === 2 && parts[0] && parts[1]) { scannedData[parts[0].trim().toLowerCase().replace(/\s+/g, '_')] = parts[1].trim(); } }); chassisFromQr = scannedData['chassis_no']; } if (chassisFromQr) fetchAndProcessJobCard(chassisFromQr); else fetchAndProcessJobCard(data.trim()); } catch (error) { console.error("QR Scan Parse Error:", error); Alert.alert("Scan Error", "Could not read QR data. Assuming content is chassis number."); fetchAndProcessJobCard(data.trim()); } }
    };

    const handleVehicleSelect = (selectedChassisNo) => {
        console.log(`Vehicle selected from search results: ${selectedChassisNo}`); fetchAndProcessJobCard(selectedChassisNo);
    };

    // --- Permissions Check --- Render permission UI within ScreenWrapper if needed
    if (!permission) {
        return ( // Render a simple loading state within ScreenWrapper
            <ScreenWrapper showHeader={true} showFooter={true}>
                <View style={localStyles.centeredMessageContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            </ScreenWrapper>
        );
    }
    if (!permission.granted) {
        return ( // Render permission request within ScreenWrapper
            <ScreenWrapper showHeader={true} showFooter={true} contentStyle={localStyles.content}>
                <View style={localStyles.containerPermission}>
                    <Text style={localStyles.permissionText}>We need camera permission for scanning.</Text>
                    <TouchableOpacity onPress={requestPermission} style={localStyles.permissionButton}>
                        <Text style={localStyles.permissionButtonText}>Grant Permission</Text>
                    </TouchableOpacity>
                </View>
            </ScreenWrapper>
        );
    }


    // --- Render Component UI ---
    return (
        <ScreenWrapper
            showHeader={true} // Show Header
            showFooter={true} // Show Footer
            contentStyle={localStyles.content} // Apply local content centering/padding
            enableKeyboardAvoidingView={true} // Enable KAV
            enableScrollView={false} // Content likely fits screen, no scroll needed
        >
            {/* --- Unique Rectify QR Page Content START --- */}

            {/* Loading Overlay - Placed early to cover content */}
            {loading && (
                <View style={localStyles.mainLoadingOverlay}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={localStyles.mainLoadingText}>Fetching Job Card Data...</Text>
                </View>
            )}

            {/* Conditional rendering of content only when not loading */}
            {!loading && (
                <>
                    {/* QR Section */}
                    <Text style={localStyles.qrTitle}>Scan QR for Rectification</Text>
                    {isCameraOpen ? (
                        <View style={localStyles.qrBox}>
                            <CameraView
                                style={StyleSheet.absoluteFillObject} // Fill container
                                facing={facing}
                                onBarcodeScanned={handleQRCodeScanned}
                                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                            />
                            <TouchableOpacity
                                style={localStyles.closeButton}
                                onPress={() => setIsCameraOpen(false)}
                            >
                                <Text style={localStyles.closeText}>Close Camera</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity onPress={() => setIsCameraOpen(true)} style={localStyles.qrBox}>
                            <MaterialCommunityIcons name="qrcode-scan" size={60} color={COLORS.secondary} />
                            <Text style={{ marginTop: 5, color: COLORS.secondary }}>Tap to Scan</Text>
                        </TouchableOpacity>
                    )}
                    <Text style={localStyles.orText}>OR</Text>

                    {/* Manual Search Section */}
                    <Text style={localStyles.subTitle}>Manually Enter Chassis No.</Text>
                    <View style={localStyles.inputContainer}>
                        <TextInput
                            style={[commonStyles.textInput, localStyles.inputFullWidth]} // Use common style + width override
                            placeholder={`Enter min ${MIN_SEARCH_LENGTH} characters to search`}
                            placeholderTextColor={COLORS.grey}
                            value={chassisNumberInput}
                            onChangeText={setChassisNumberInput}
                            autoCapitalize="characters"
                            autoCorrect={false}
                            editable={!loading} // Keep original logic
                            onSubmitEditing={Keyboard.dismiss}
                        />
                    </View>

                    {/* Error Display */}
                    {/* Use common style, overrides applied via localStyles.errorTextStyleOverride */}
                    {error && <Text style={[commonStyles.errorText, localStyles.errorTextStyleOverride]}>{error}</Text>}

                    {/* Searching Indicator */}
                    {isSearching && (
                        <View style={localStyles.searchingIndicator}>
                            <ActivityIndicator size="small" color={COLORS.grey} />
                            <Text style={localStyles.searchingText}> Searching...</Text>
                        </View>
                    )}

                    {/* Search Results */}
                    {searchResults.length > 0 && !isSearching && (
                        <View style={localStyles.resultsContainer}>
                            <FlatList
                                data={searchResults}
                                keyExtractor={(item) => item.id?.toString() ?? `item-${item.chassis_no}`} // Robust key
                                renderItem={({ item }) => (
                                    <TouchableOpacity style={localStyles.resultItem} onPress={() => handleVehicleSelect(item.chassis_no)}>
                                        <Text style={localStyles.resultText}>Chassis: {item.chassis_no}</Text>
                                        {item.model_name && <Text style={localStyles.resultSubText}>Model: {item.model_name} {item.variant_name ? `(${item.variant_name})` : ''}</Text>}
                                        {item.colour_code && <Text style={localStyles.resultSubText}>Colour: {item.colour_code}</Text>}
                                    </TouchableOpacity>
                                )}
                                style={localStyles.resultsList} // Keep original style
                                keyboardShouldPersistTaps="handled"
                            />
                        </View>
                    )}

                    {/* --- Back Button --- */}
                    <View style={localStyles.buttonContainer}>
                        <TouchableOpacity
                            style={commonStyles.actionButtonSecondary}
                            onPress={() => navigation.goBack()}
                            disabled={loading}
                        >
                            {/* Use common text style */}
                            <Text style={commonStyles.actionButtonText}>Back</Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </ScreenWrapper>
    );
};

// --- Styles --- (Adopted from QrPage.js structure, generalized values)
const localStyles = StyleSheet.create({
    content: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: PADDING.large,
        paddingBottom: MARGIN.large,
    },
    // Centered container for initial loading/permission messages
    centeredMessageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Titles and Text
    qrTitle: {
        fontSize: FONT_SIZES.xxlarge,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginBottom: MARGIN.medium,
        textAlign: 'center',
    },
    orText: {
        fontSize: FONT_SIZES.medium,
        marginVertical: MARGIN.medium,
        fontWeight: 'bold',
        color: COLORS.secondary,
    },
    subTitle: {
        fontSize: FONT_SIZES.large,
        fontWeight: 'bold',
        color: COLORS.secondary,
        marginBottom: MARGIN.small,
    },
    // QR Code Box
    qrBox: {
        width: 280,
        height: 280,
        borderWidth: 2,
        borderColor: COLORS.grey,
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: MARGIN.small,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: COLORS.white,
    },
    closeButton: {
        position: 'absolute',
        bottom: 10,
        alignSelf: 'center',
        backgroundColor: COLORS.danger,
        paddingVertical: PADDING.small,
        paddingHorizontal: PADDING.medium,
        borderRadius: 5,
    },
    closeText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: FONT_SIZES.small,
    },
    // Input and Search Results
    inputContainer: {
        width: '100%',
        alignItems: 'center',
        marginBottom: MARGIN.small,
    },
    inputFullWidth: {
        width: '100%',
    },
    errorTextStyleOverride: {
        marginTop: MARGIN.xsmall,
        marginBottom: MARGIN.medium,
        textAlign: 'center',
        width: '100%',
    },
    searchingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: MARGIN.small,
        marginBottom: MARGIN.medium,
    },
    searchingText: {
        marginLeft: MARGIN.small,
        fontSize: FONT_SIZES.small,
        color: COLORS.grey,

    },
    resultsContainer: {
        width: '100%',
        maxHeight: 180,
        borderColor: COLORS.lightGrey,
        borderWidth: 1,
        borderRadius: 5,
        backgroundColor: COLORS.white,
        marginTop: MARGIN.xsmall,
        marginBottom: MARGIN.medium,
        zIndex: 1,
    },
    resultsList: {
        flexGrow: 0,
    },
    resultItem: {
        paddingVertical: PADDING.small,
        paddingHorizontal: PADDING.medium,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.divider,
    },
    resultText: {
        fontSize: FONT_SIZES.medium,
        fontWeight: '500',
        color: COLORS.secondary,
    },
    resultSubText: {
        fontSize: FONT_SIZES.small,
        color: COLORS.grey,
        marginTop: MARGIN.xsmall,
    },
    // Loading Overlay
    mainLoadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
    },
    mainLoadingText: {
        marginTop: MARGIN.medium,
        fontSize: FONT_SIZES.large,
        fontWeight: 'bold',
        color: COLORS.secondary,
    },
    // Button Container (for centering the single button)
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        width: '100%',
        marginTop: MARGIN.large,
    },
    // --- Permission Screen Styles (Adapted) ---
    containerPermission: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: PADDING.large,
    },
    permissionText: {
        textAlign: 'center',
        color: COLORS.secondary,
        fontSize: FONT_SIZES.medium,
        marginBottom: MARGIN.large,
    },
    permissionButton: {
        backgroundColor: COLORS.primary,
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