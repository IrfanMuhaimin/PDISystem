// screens/RectifyQrPage.js
import React, { useState, useRef, useEffect, useContext, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Alert,
    TextInput, AppState, ActivityIndicator, FlatList,
    Keyboard, Platform 
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RectifyContext } from '../context/RectifyContext';
import { debounce } from 'lodash';
import ScreenWrapper from '../styles/flowstudiosbg.js';
import commonStyles, { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/commonStyles';

const API_BASE_URL = 'http://pdi.flowstudios.com.my/api';
const MIN_SEARCH_LENGTH = 5;
const SEARCH_DEBOUNCE_DELAY = 500;

export default function RectifyQrPage({ navigation }) {
    const { setRectifyData, setLoading, setError, clearRectifyData, loading, error } = useContext(RectifyContext);
    const [chassisNumberInput, setChassisNumberInput] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [facing, setFacing] = useState('back'); // Camera facing state

    const qrLock = useRef(false); // Lock to prevent multiple scans
    const appState = useRef(AppState.currentState); // Track app state for QR lock reset

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            console.log("RectifyQrPage focused: Clearing state.");
            clearRectifyData();
            setChassisNumberInput('');
            setSearchResults([]);
            setIsSearching(false);
            setError(null);
            setIsCameraOpen(false);
            qrLock.current = false;
        });
        return unsubscribe;
    }, [navigation, clearRectifyData, setError]);


    useEffect(() => {
        const subscription = AppState.addEventListener("change", (nextAppState) => {
            if (appState.current.match(/inactive|background/) && nextAppState === "active") {
                console.log("App returned to active state, resetting QR lock.");
                qrLock.current = false;
            }
            appState.current = nextAppState;
        });
        return () => {
            subscription.remove();
        };
    }, []);

    const debouncedSearch = useCallback(
        debounce(async (query) => {
            await handleVehicleSearch(query);
        }, SEARCH_DEBOUNCE_DELAY),
        []
    );

    useEffect(() => {
        const query = chassisNumberInput.trim();
        if (query.length >= MIN_SEARCH_LENGTH) {
            setError(null);
            setIsSearching(true);
            setSearchResults([]);
            console.log(`Input length >= ${MIN_SEARCH_LENGTH}, triggering debounced search for: "${query}"`);
            debouncedSearch(query);
        } else {
            debouncedSearch.cancel();
            setIsSearching(false);
            setSearchResults([]);
        }
        return () => {
            debouncedSearch.cancel();
        };
    }, [chassisNumberInput, debouncedSearch, setError]);

    const fetchAndProcessJobCard = async (chassisNo) => {
        setChassisNumberInput('');
        setSearchResults([]);
        setIsSearching(false);
        setError(null);
        Keyboard.dismiss();

        if (!chassisNo || chassisNo.trim() === '') {
            Alert.alert('Internal Error', 'Chassis number is missing.');
            return;
        }

        console.log(`Fetching job card data for selected chassis: ${chassisNo.trim()}`);
        setLoading(true);

        try {
            const token = await AsyncStorage.getItem('authToken');
            if (!token) throw new Error("Authentication token not found. Please log in again.");

            const fetchUrl = `${API_BASE_URL}/jobcards/rectify/${chassisNo.trim()}`;
            console.log(`[fetchAndProcessJobCard] Fetching URL: ${fetchUrl}`);

            const response = await fetch(fetchUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                const errorBody = await response.text();
                let parsedError = {};
                try { parsedError = JSON.parse(errorBody); } catch (e) {  }
                console.error(`[fetchAndProcessJobCard] Fetch Error ${response.status}:`, errorBody);
                if (response.status === 404) throw new Error(`Job card not found for chassis: ${chassisNo}`);
                if (response.status === 401) throw new Error(parsedError.message || 'Authorization failed (401).');
                if (response.status === 403) throw new Error(parsedError.message || 'Permission denied (403).');
                throw new Error(parsedError.message || `Failed to fetch job card. Status: ${response.status}.`);
            }


            const data = await response.json();
            console.log("[fetchAndProcessJobCard] Successfully fetched job card data.");

            // Extract car info and images
            const carInfo = {
                id: data.id,
                chassis_no: data.chassis_no || chassisNo, // Fallback to input chassis
                model: data.model || 'N/A',
                variant: data.variant || 'N/A',
                engine_no: data.engine_no || 'N/A',
                colour_code: data.colour_code || 'N/A'
            };
            const fetchedImages = data.images || []; // Default to empty array if missing
            const defectItems = []; // Initialize empty array for defects

            // --- PROCESS DEFECTS FROM data.sections ---
            console.log("[fetchAndProcessJobCard] Processing data.sections for defects...");
            if (Array.isArray(data.sections)) {
                data.sections.forEach((sectionObject, sectionIndex) => {
                    if (sectionObject && Array.isArray(sectionObject.items)) {
                        console.log(`[fetchAndProcessJobCard] Processing Section ${sectionObject.section} with ${sectionObject.items.length} items.`);
                        sectionObject.items.forEach((item, itemIndex) => {
                            // Identify defect items: pass === false AND defect array exists
                            if (item && item.pass === false && item.hasOwnProperty('defect') && Array.isArray(item.defect)) {
                                let itemIdForRectify = item.id;
                                if (itemIdForRectify === null || itemIdForRectify === undefined) {
                                    console.warn(`[fetchAndProcessJobCard] Skipping defect item at section ${sectionObject.section}, index ${itemIndex} due to missing item ID:`, item.name || 'Unnamed');
                                    return; // Skip this item if its own ID is missing
                                }

                                // Create the object for RectifyContext
                                const newItem = {
                                    id: itemIdForRectify,
                                    section: item.section, // Store the raw section number (e.g., 1, 2, 7)
                                    name: item.name ?? 'Unnamed Item',
                                    appear: item.appear ?? false,
                                    originalValue: item.value, // Keep original value if needed later
                                    originalPass: item.pass, // Should be false
                                    originalNames: item.originalNames ?? [], // Keep original names if needed later
                                    allDefects: item.defect // Assign the defect array associated with this item
                                };
                                defectItems.push(newItem);
                                console.log(`[fetchAndProcessJobCard] Added defect item: ID=${newItem.id}, Name=${newItem.name}, Section=${newItem.section}, NumDefects=${newItem.allDefects.length}`);
                            }
                        });
                    } else {
                        console.warn(`[fetchAndProcessJobCard] Invalid section object or missing items array at section index ${sectionIndex}.`);
                    }
                });
            } else {
                 console.warn("[fetchAndProcessJobCard] API response structure warning: 'data.sections' is not an array or is missing.");
            }
            // --- END PROCESSING data.sections ---

            // Check if any actual defects were found and processed
            if (defectItems.length === 0) {
                // Check if the API response had items marked as pass:false, even if they weren't processed (e.g., missing defect array)
                const anyFailedItemsReported = data.sections?.flatMap(s => s.items ?? []).some(i => i && i.pass === false);
                if (anyFailedItemsReported) {
                    Alert.alert('Processing Issue', `Defects were reported for chassis ${chassisNo}, but could not be processed into the rectification list. This might indicate an issue with the data structure received from the server.`);
                } else {
                    Alert.alert('No Defects Found', `No items marked with defects requiring rectification were found for chassis: ${chassisNo}.`);
                }
                setLoading(false); // Stop loading
                return; // Stop execution
            }

            // Set data in context and navigate
            console.log(`[fetchAndProcessJobCard] Found ${defectItems.length} defect items to rectify. Navigating to RectifyChecklist...`);
            setRectifyData(carInfo, defectItems, fetchedImages);
            navigation.navigate('RectifyChecklist');

        } catch (error) {
            // Handle any error during fetch or processing
            console.error("Error in fetchAndProcessJobCard:", error);
            Alert.alert('Error Fetching Job Card', error.message || 'An unexpected error occurred.');
            setError(error.message); // Update context error state
        }
        finally {
            // Always stop loading and reset QR lock
            setLoading(false);
            qrLock.current = false;
        }
    };

    // Handles searching for vehicles based on text input
    const handleVehicleSearch = async (query) => {
        if (!query || query.length < MIN_SEARCH_LENGTH) {
            setSearchResults([]); // Clear results if query is too short
            setIsSearching(false);
            return;
        }
        console.log(`Searching vehicles with query: "${query}"`);
        // Note: setIsSearching(true) is typically called in the useEffect triggering this

        try {
            const token = await AsyncStorage.getItem('authToken');
            if (!token) throw new Error("Authentication token not found.");

            const searchUrl = `${API_BASE_URL}/vehicles/search?query=${encodeURIComponent(query)}`;
            console.log(`[handleVehicleSearch] Fetching URL: ${searchUrl}`);

            const response = await fetch(searchUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            let vehicleList = [];
            let errorMessage = null;

            if (response.ok) {
                const results = await response.json();
                console.log("[handleVehicleSearch] Search successful.");
                // Ensure results are an array, handle single object response if necessary
                if (results && !Array.isArray(results)) {
                    vehicleList = [results];
                } else if (Array.isArray(results)) {
                    vehicleList = results;
                }
                if (vehicleList.length === 0) {
                     // Set error message if search was valid but returned no results
                     errorMessage = `No vehicles found matching "${query}".`;
                }
                setSearchResults(vehicleList);
            } else {
                // Handle search API errors
                const errorBody = await response.text();
                let parsedError = {};
                try { parsedError = JSON.parse(errorBody); } catch (e) { /* ignore */ }
                console.error(`[handleVehicleSearch] Search Error ${response.status}:`, errorBody);
                errorMessage = parsedError.message || `Search failed. Status: ${response.status}.`;
                // More specific error messages based on status
                if (response.status === 400) errorMessage = parsedError.message || `Search query invalid (min ${MIN_SEARCH_LENGTH} chars).`;
                if (response.status === 401) errorMessage = parsedError.message || `Authorization failed.`;
                if (response.status === 404) errorMessage = `No vehicles found matching "${query}".`; // Treat 404 as no results
                setSearchResults([]); // Clear results on error
            }
            setError(errorMessage); // Update context error state (null if successful)

        } catch (error) {
            console.error("Error during vehicle search fetch:", error);
            setError(error.message || 'A network or unexpected error occurred during search.');
            setSearchResults([]);
        } finally {
            setIsSearching(false); // Hide searching indicator
        }
    };

    // Handles the data received from the QR code scanner
    const handleQRCodeScanned = ({ data }) => {
        if (data && !qrLock.current) {
            qrLock.current = true; // Prevent immediate re-scans
            setIsCameraOpen(false); // Close camera UI
            // Clear search state immediately after scan
            setChassisNumberInput('');
            setSearchResults([]);
            setIsSearching(false);
            setError(null);
            console.log("Rectify Scanned QR Data Raw:", data);

            try {
                // Attempt to parse structured data (e.g., key: value\nkey: value)
                let chassisFromQr = null;
                if (typeof data === 'string' && data.includes(':') && data.includes('\n')) {
                    console.log("Attempting to parse structured QR data...");
                    const lines = data.split("\n");
                    const scannedData = {};
                    lines.forEach((line) => {
                        const parts = line.split(":"); // Split only on the first colon
                        if (parts.length >= 2 && parts[0] && parts[1]) {
                            const key = parts[0].trim().toLowerCase().replace(/\s+/g, '_');
                            const value = parts.slice(1).join(':').trim(); // Join remaining parts back for value
                            scannedData[key] = value;
                        }
                    });
                    console.log("Parsed QR Data:", scannedData);
                    // Look for 'chassis_no' specifically
                    chassisFromQr = scannedData['chassis_no'];
                }

                // If parsing yielded a chassis number, use it. Otherwise, assume the whole data is the chassis number.
                const chassisToFetch = chassisFromQr || data.trim();
                if (chassisToFetch) {
                    console.log(`Fetching job card from QR scan for chassis: ${chassisToFetch}`);
                    fetchAndProcessJobCard(chassisToFetch);
                } else {
                     // Should not happen if data exists, but handle defensively
                     console.error("QR Scan: Could not determine chassis number from data.");
                     Alert.alert("Scan Error", "Could not extract chassis number from QR code.");
                     qrLock.current = false; // Release lock if fetch fails immediately
                }

            } catch (error) {
                // Fallback if parsing logic itself fails
                console.error("QR Scan Parse Logic Error:", error);
                Alert.alert("Scan Error", "Could not read QR data structure. Assuming entire content is the chassis number.");
                fetchAndProcessJobCard(data.trim()); // Attempt fetch with raw data
            }
        } else if (!data) {
            console.warn("QR Scan event fired with empty data.");
        } else {
             console.log("QR Scan ignored, lock is active.");
        }
    };

    // Handles selection of a vehicle from the search results list
    const handleVehicleSelect = (selectedChassisNo) => {
        console.log(`Vehicle selected from search results: ${selectedChassisNo}`);
        // Fetch the full data for the selected vehicle
        fetchAndProcessJobCard(selectedChassisNo);
    };

    // --- Permissions Check --- Render permission UI if needed
    if (!permission) {
        // Render a simple loading state while waiting for permission status
        return (
            <ScreenWrapper showHeader={true} showFooter={true}>
                <View style={localStyles.centeredMessageContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            </ScreenWrapper>
        );
    }
    if (!permission.granted) {
        // Render permission request UI
        return (
            <ScreenWrapper showHeader={true} showFooter={true} contentStyle={localStyles.content}>
                <View style={localStyles.containerPermission}>
                    <Text style={localStyles.permissionText}>Camera permission is required to scan QR codes.</Text>
                    <TouchableOpacity onPress={requestPermission} style={localStyles.permissionButton}>
                        <Text style={localStyles.permissionButtonText}>Grant Permission</Text>
                    </TouchableOpacity>
                     {/* Optional: Add a button to go back if permission is denied */}
                     <TouchableOpacity style={[commonStyles.actionButtonSecondary, {marginTop: MARGIN.large}]} onPress={() => navigation.goBack()}>
                         <Text style={commonStyles.actionButtonText}>Back</Text>
                     </TouchableOpacity>
                </View>
            </ScreenWrapper>
        );
    }


    // --- Render Component UI ---
    return (
        <ScreenWrapper
            showHeader={true}
            showFooter={false} // Footer removed as Back button is included in content now
            contentStyle={localStyles.content}
            enableKeyboardAvoidingView={true} // Enable KAV for text input
            enableScrollView={false} // Content should fit, avoid double scroll with FlatList
        >
            {/* Loading Overlay for fetchAndProcessJobCard */}
            {loading && (
                <View style={localStyles.mainLoadingOverlay}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={localStyles.mainLoadingText}>Fetching Job Card Data...</Text>
                </View>
            )}

            {/* Main Content (Render only when not doing full job card load) */}
            {!loading && (
                <>
                    {/* QR Section */}
                    <Text style={localStyles.qrTitle}>Scan QR for Rectification</Text>
                    {isCameraOpen ? (
                        // Camera View
                        <View style={localStyles.qrBox}>
                            <CameraView
                                style={StyleSheet.absoluteFillObject}
                                facing={facing}
                                onBarcodeScanned={qrLock.current ? undefined : handleQRCodeScanned} // Prevent scan if lock active
                                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                            />
                            {/* Consider adding a button to flip camera if needed */}
                            {/* <TouchableOpacity style={localStyles.flipButton} onPress={toggleCameraFacing}> ... </TouchableOpacity> */}
                            <TouchableOpacity
                                style={localStyles.closeButton}
                                onPress={() => setIsCameraOpen(false)}
                            >
                                <Text style={localStyles.closeText}>Close Camera</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        // Tap to Scan placeholder
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
                            style={[commonStyles.textInput, localStyles.inputFullWidth]}
                            placeholder={`Enter min ${MIN_SEARCH_LENGTH} characters to search`}
                            placeholderTextColor={COLORS.grey}
                            value={chassisNumberInput}
                            onChangeText={setChassisNumberInput}
                            autoCapitalize="characters" // Common for chassis numbers
                            autoCorrect={false}
                            editable={!loading} // Disable input during full load
                            onSubmitEditing={Keyboard.dismiss} // Dismiss keyboard on submit
                            returnKeyType="search" // Suggest search action on keyboard
                        />
                    </View>

                    {/* Error Display Area */}
                    {/* Use common style, specific overrides applied via localStyles.errorTextStyleOverride */}
                    {error && <Text style={[commonStyles.errorText, localStyles.errorTextStyleOverride]}>{error}</Text>}

                    {/* Searching Indicator (shows during debounced search) */}
                    {isSearching && (
                        <View style={localStyles.searchingIndicator}>
                            <ActivityIndicator size="small" color={COLORS.grey} />
                            <Text style={localStyles.searchingText}> Searching vehicles...</Text>
                        </View>
                    )}

                    {/* Search Results List */}
                    {searchResults.length > 0 && !isSearching && (
                        <View style={localStyles.resultsContainer}>
                            <FlatList
                                data={searchResults}
                                keyExtractor={(item) => item.id?.toString() ?? `item-${item.chassis_no}`} // Robust key
                                renderItem={({ item }) => (
                                    <TouchableOpacity style={localStyles.resultItem} onPress={() => handleVehicleSelect(item.chassis_no)}>
                                        <Text style={localStyles.resultText}>Chassis: {item.chassis_no}</Text>
                                        {/* Display other relevant info if available */}
                                        {item.model_name && <Text style={localStyles.resultSubText}>Model: {item.model_name} {item.variant_name ? `(${item.variant_name})` : ''}</Text>}
                                        {item.colour_code && <Text style={localStyles.resultSubText}>Colour: {item.colour_code}</Text>}
                                    </TouchableOpacity>
                                )}
                                style={localStyles.resultsList}
                                keyboardShouldPersistTaps="handled" // Allow tapping results while keyboard might be up
                            />
                        </View>
                    )}

                    {/* Back Button (Placed within content area now) */}
                    <View style={localStyles.buttonContainer}>
                        <TouchableOpacity
                            style={commonStyles.actionButtonSecondary}
                            onPress={() => navigation.goBack()}
                            disabled={loading} // Disable if full load active
                        >
                            <Text style={commonStyles.actionButtonText}>Back</Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </ScreenWrapper>
    );
};

const localStyles = StyleSheet.create({
    content: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: PADDING.large,
        paddingBottom: MARGIN.large,
    },
    centeredMessageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
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
        marginTop: MARGIN.xsmall / 2,
    },
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
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        width: '100%',
        marginTop: MARGIN.large,
    },
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