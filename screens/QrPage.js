// screens/QrPage.js
import React, { useState, useRef, useEffect, useContext, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Alert, TextInput,
    AppState, FlatList, Keyboard, ActivityIndicator, Platform, Modal
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ChecklistContext } from '../context/ChecklistContext';
import TimerModal from './TimerModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { debounce } from 'lodash';
import ScreenWrapper from '../styles/flowstudiosbg.js';
import commonStyles, { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/commonStyles';

const API_BASE_URL = 'http://pdi.flowstudios.com.my/api';
const MIN_SEARCH_LENGTH = 5;
const SEARCH_DEBOUNCE_DELAY = 500;

const LOGIN_ENDPOINT_FOR_VERIFICATION = `${API_BASE_URL}/login`;
const USERNAME_KEY = 'currentUsername';


//Helper: formatDateTime
const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A'; 
    try { 
        const date = new Date(dateString); 
        if (isNaN(date.getTime())) { return 'Invalid Date'; } 
        const day = String(date.getDate()).padStart(2, '0'); 
        const month = String(date.getMonth() + 1).padStart(2, '0'); 
        const year = date.getFullYear(); 
        const hours = String(date.getHours()).padStart(2, '0'); 
        const minutes = String(date.getMinutes()).padStart(2, '0'); 
        return `${day}-${month}-${year}, ${hours}:${minutes}`; 
    } catch (error) { 
        console.error("Error formatting date:", error); 
        return dateString; 
    }
};

//Helper: fetchVehicleDetailsApi
const fetchVehicleDetailsApi = async (chassisNoToFetch) => {
    try { 
        const token = await AsyncStorage.getItem('authToken'); 
        if (!token) { throw new Error("Auth token not found. Please login again."); } 
        const url = `${API_BASE_URL}/vehicles/${chassisNoToFetch.trim()}`; 
        const response = await fetch(url, { method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } }); 
        if (!response.ok) { 
            let errorMessage = `Failed to fetch vehicle details for chassis ${chassisNoToFetch} (Status: ${response.status})`; 
            try { 
                const errorBodyText = await response.text();
                const errorBody = JSON.parse(errorBodyText || '{}'); 
                errorMessage = errorBody.message || errorMessage; 
            } catch (e) {  } 
            throw new Error(errorMessage); 
        } 
        const data = await response.json(); 
        const vehicleData = Array.isArray(data) && data.length > 0 ? data[0] : (data && !Array.isArray(data) ? data : null); 
        if (!vehicleData) { throw new Error(`No vehicle details found for chassis ${chassisNoToFetch}.`); } 
        const formattedDate = formatDateTime(vehicleData.entry_date); 
        return { 
            model: vehicleData.model_name || 'N/A', 
            variant: vehicleData.variant_name || 'N/A', 
            engine_no: vehicleData.engine_no || '', 
            chassis_no: vehicleData.chassis_no || chassisNoToFetch, 
            colour_code: vehicleData.colour_code || '', 
            entry_date: formattedDate, 
        }; 
    } catch (error) { throw error; }
};

//PasswordOverrideModal Component
const PasswordOverrideModal = ({ visible, onClose, onSubmit, chassisNo }) => {
    const [password, setPassword] = useState(''); 
    const handleSubmit = () => { onSubmit(password); setPassword(''); }; 
    const handleClose = () => { setPassword(''); onClose(); }; 
    return ( 
        <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={handleClose}> 
            <View style={localStyles.modalCenteredView}> 
                <View style={localStyles.modalView}> 
                    <Text style={localStyles.modalTitle}>Override Job Card</Text> 
                    <Text style={localStyles.modalText}>Chassis No: <Text style={{ fontWeight: 'bold' }}>{chassisNo}</Text></Text> 
                    <Text style={localStyles.modalText}>Enter your login password to override:</Text> 
                    <TextInput 
                        style={[commonStyles.textInput, localStyles.modalPasswordInput]} 
                        placeholder="Enter Your Password" 
                        placeholderTextColor={COLORS.grey} 
                        secureTextEntry 
                        value={password} 
                        onChangeText={setPassword} 
                        autoCapitalize="none" 
                    /> 
                    <View style={localStyles.modalButtonContainer}> 
                        <TouchableOpacity 
                            style={[commonStyles.actionButtonSecondary, localStyles.modalButton]} 
                            onPress={handleClose}
                        > 
                            <Text style={localStyles.overideButtonText}>Cancel</Text> 
                        </TouchableOpacity> 
                        <TouchableOpacity 
                            style={[commonStyles.actionButton, localStyles.modalButton]} 
                            onPress={handleSubmit}
                        > 
                            <Text style={localStyles.overideButtonText}>Confirm Override</Text> 
                        </TouchableOpacity> 
                    </View> 
                </View> 
            </View> 
        </Modal> 
    );
};

//ConfirmationOverridePromptModal Component
const ConfirmationOverridePromptModal = ({ visible, onClose, onConfirm, chassisNo }) => {
    return ( 
        <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={() => onClose()} > 
            <View style={localStyles.modalCenteredView}> 
                <View style={localStyles.modalView}> 
                    <Text style={localStyles.modalTitle}>Job Card Exists</Text> 
                    <Text style={localStyles.modalText}>An inspection job card already exists for chassis:</Text> 
                    <Text style={[localStyles.modalChassisText]}> 
                        {chassisNo} 
                    </Text> 
                    <Text style={localStyles.modalText}>Do you want to override it and start a new inspection?</Text> 
                    <View style={localStyles.modalButtonContainer}> 
                        <TouchableOpacity 
                            style={[commonStyles.actionButtonSecondary, localStyles.modalButton]} 
                            onPress={() => onClose()} 
                        > 
                            <Text style={localStyles.overideButtonText}>No</Text> 
                        </TouchableOpacity> 
                        <TouchableOpacity 
                            style={[commonStyles.actionButton, localStyles.modalButton]} 
                            onPress={() => onConfirm()} 
                        > 
                            <Text style={localStyles.overideButtonText}>Yes, Override</Text> 
                        </TouchableOpacity> 
                    </View> 
                </View> 
            </View> 
        </Modal> 
    );
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
    const [isProcessing, setIsProcessing] = useState(false);

    const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
    const [chassisForPasswordOverride, setChassisForPasswordOverride] = useState(null);
    const [dataForPasswordOverride, setDataForPasswordOverride] = useState(null);

    const [isConfirmationPromptVisible, setIsConfirmationPromptVisible] = useState(false);
    const [confirmationContext, setConfirmationContext] = useState({ chassis: null, qrData: null, source: null });

    // --- useEffects ---
    const debouncedSearch = useCallback(debounce(async (query) => { await handleVehicleSearch(query); }, SEARCH_DEBOUNCE_DELAY), []);
    useEffect(() => { 
        const query = chassisNumber.trim(); 
        if (query.length >= MIN_SEARCH_LENGTH) { 
            setError(null); 
            setIsSearching(true); 
            setSearchResults([]); 
            debouncedSearch(query); 
        } else { 
            debouncedSearch.cancel(); 
            setIsSearching(false); 
            setSearchResults([]); 
            setError(null); 
        } 
        return () => { debouncedSearch.cancel(); }; 
    }, [chassisNumber, debouncedSearch]);

    useEffect(() => { 
        const sub = AppState.addEventListener("change", (next) => { 
            if (appState.current.match(/inactive|background/) && next === "active") { 
                qrLock.current = false; 
            } 
            appState.current = next; 
        }); 
        return () => { sub.remove(); }; 
    }, []);

    useEffect(() => { 
        const unsub = navigation.addListener('focus', () => { 
            setChassisNumber(''); 
            setSearchResults([]); 
            setIsSearching(false); 
            setError(null); 
            setIsCameraOpen(false); 
            qrLock.current = false; 
            setIsProcessing(false); 
            setModalVisible(false); 
            setIsPasswordModalVisible(false); 
            setChassisForPasswordOverride(null); 
            setDataForPasswordOverride(null); 
            setIsConfirmationPromptVisible(false); 
            setConfirmationContext({ chassis: null, qrData: null, source: null }); 
        }); 
        return unsub; 
    }, [navigation]);

    //checkJobCardExists
    const checkJobCardExists = async (chassisToCheck) => {
        let checkResult = { exists: null, error: null }; 
        try { 
            const token = await AsyncStorage.getItem('authToken'); 
            if (!token) { throw new Error("Auth token not found. Please login again."); } 
            const url = `${API_BASE_URL}/jobcards/${chassisToCheck.trim()}`; 
            const response = await fetch(url, { method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } }); 
            if (response.ok) { 
                checkResult = { exists: true, error: null }; 
            } else if (response.status === 404) { 
                const body = await response.text(); 
                checkResult = { 
                    exists: body.includes("Job Card not found") ? false : null, 
                    error: body.includes("Job Card not found") ? null : `Server check failed: ${body || 'Unexpected 404 response'}` 
                }; 
            } else { 
                let errorMsg = `Failed to check job card (Status: ${response.status})`; 
                try { 
                    const errorBodyText = await response.text();
                    const eb = JSON.parse(errorBodyText || '{}'); 
                    errorMsg = eb.message || eb.error || errorMsg; 
                } catch (e) {} 
                checkResult = { exists: null, error: errorMsg }; 
            } 
        } catch (error) { 
            checkResult = { exists: null, error: error.message || "A network error occurred." }; 
        } 
        return checkResult;
    };

    //processAndDisplayVehicle
    const processAndDisplayVehicle = async (chassisToProcess, isOverride = false, optionalQrData = null) => {
        if (!isProcessing) setIsProcessing(true); 
        try { 
            let carDetailsResult; 
            let useParsedQrDirectly = false; 
            if (optionalQrData && optionalQrData['chassis_no']) { 
                const requiredFields = ['model', 'variant', 'engine_no', 'chassis_no', 'colour_code', 'entry_date']; 
                const missingFields = requiredFields.filter(field => !optionalQrData[field]); 
                if (missingFields.length === 0) { 
                    useParsedQrDirectly = true; 
                } else { 
                    chassisToProcess = optionalQrData.chassis_no || chassisToProcess; 
                } 
            } 
            if (useParsedQrDirectly) { 
                const formattedDate = formatDateTime(optionalQrData.entry_date); 
                carDetailsResult = { 
                    model: optionalQrData.model, 
                    variant: optionalQrData.variant, 
                    engine_no: optionalQrData.engine_no, 
                    chassis_no: optionalQrData.chassis_no, 
                    colour_code: optionalQrData.colour_code, 
                    entry_date: formattedDate 
                }; 
            } else { 
                carDetailsResult = await fetchVehicleDetailsApi(chassisToProcess); 
            } 
            updateCarInfo(carDetailsResult); 
            setModalVisible(true); 
            if (isOverride) { 
                Alert.alert("Override Successful", `New inspection can now start for chassis ${chassisToProcess}.`); 
            } 
        } catch (error) { 
            Alert.alert(isOverride ? "Override Failed" : "Processing Failed", error.message || `Could not process vehicle ${chassisToProcess}.`); 
            if (qrLock.current && !modalVisible) { qrLock.current = false; } 
        } finally { 
            if (!modalVisible) {
                setIsProcessing(false); 
            }
        }
    };

    //handlePasswordSubmit (Uses Login endpoint for verification)
    const handlePasswordSubmit = async (enteredPasswordForOverride) => {
        setIsPasswordModalVisible(false);
        if (!isProcessing) setIsProcessing(true);

        if (!chassisForPasswordOverride) {
            console.error("handlePasswordSubmit called without a target chassis.");
            setIsProcessing(false); 
            if (qrLock.current) qrLock.current = false;
            return;
        }

        try {
            const storedUsername = await AsyncStorage.getItem(USERNAME_KEY);
            if (!storedUsername) {
                Alert.alert("Verification Error", "Your username could not be retrieved for password verification. Please log out and log in again.",
                    [{text: "OK", onPress: () => {
                        setIsProcessing(false);
                        if(qrLock.current) qrLock.current = false;
                    }}]
                );
                return;
            }

            console.log(`Attempting to verify password for user: ${storedUsername} by re-logging in.`);
            const verificationResponse = await fetch(LOGIN_ENDPOINT_FOR_VERIFICATION, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ username: storedUsername, password: enteredPasswordForOverride }),
            });

            if (verificationResponse.ok) {
                console.log(`Password verified for ${storedUsername} (used for chassis ${chassisForPasswordOverride}). Proceeding with override.`);
                await processAndDisplayVehicle(chassisForPasswordOverride, true, dataForPasswordOverride);
            } else {
                let errorMessage = "Incorrect password entered.";
                try {
                    const errorData = await verificationResponse.json();
                    if (errorData && errorData.message) { 
                        errorMessage = errorData.message;
                    } else {
                        errorMessage = `Password verification failed (Status: ${verificationResponse.status}).`;
                    }
                } catch (e) {
                     errorMessage = `Password verification failed (Status: ${verificationResponse.status}). Please try again.`;
                }
                Alert.alert("Override Failed", errorMessage, 
                    [{text: "OK", onPress: () => setIsProcessing(false) }]
                );
                if (qrLock.current) qrLock.current = false;
            }

        } catch (error) {
            console.error("Error during password verification (re-login attempt):", error);
            Alert.alert("Error", "Could not verify password due to a network or server error.",
                [{text: "OK", onPress: () => setIsProcessing(false)}]
            );
            if (qrLock.current) qrLock.current = false;
        } finally {
            setChassisForPasswordOverride(null);
            setDataForPasswordOverride(null);
        }
    };
    
    //handleInitialOverrideConfirm
    const handleInitialOverrideConfirm = (userConfirmed) => {
        setIsConfirmationPromptVisible(false); 
        const { chassis, qrData, source } = confirmationContext; 
        if (userConfirmed) { 
            console.log(`User confirmed initial override for ${chassis} (source: ${source}). Opening password modal.`); 
            setChassisForPasswordOverride(chassis); 
            setDataForPasswordOverride(qrData); 
            setIsPasswordModalVisible(true); 
            if(!isProcessing) setIsProcessing(true); 
        } else { 
            console.log(`User declined initial override for ${chassis} (source: ${source}).`); 
            setIsProcessing(false); 
            if (source === 'qr' && qrLock.current) { qrLock.current = false; } 
        } 
        setConfirmationContext({ chassis: null, qrData: null, source: null });
    };

    // --- handleQRCodeScanned ---
    const handleQRCodeScanned = async ({ data }) => {
        if (isProcessing || qrLock.current || !data) { return; } 
        qrLock.current = true; 
        setIsCameraOpen(false); 
        let chassisToProcess = null; 
        let parsedQrData = {}; 
        try { 
            const lines = data.split("\n"); 
            lines.forEach((line) => { 
                const parts = line.split(": "); 
                if (parts.length >= 2) { 
                    const key = parts[0].trim().toLowerCase().replace(/\s+/g, '_'); 
                    const value = parts.slice(1).join(": ").trim(); 
                    if (key && value) parsedQrData[key] = value; 
                } 
            }); 
            chassisToProcess = parsedQrData['chassis_no'] || data.trim(); 
            if (!chassisToProcess || chassisToProcess.length === 0) { throw new Error("Could not determine chassis number from QR."); } 
            
            setChassisNumber(chassisToProcess); 
            setIsProcessing(true); 

            const jobCardStatus = await checkJobCardExists(chassisToProcess); 

            if (jobCardStatus.exists === true) {
                console.log(`Job card exists for QR chassis ${chassisToProcess}. Showing confirmation prompt.`); 
                setConfirmationContext({ chassis: chassisToProcess, qrData: parsedQrData, source: 'qr' }); 
                setIsConfirmationPromptVisible(true); 
                return; 
            } else if (jobCardStatus.error) { 
                Alert.alert("Error Checking Job Card", jobCardStatus.error); 
                throw new Error("Job card check error"); 
            } 
            await processAndDisplayVehicle(chassisToProcess, false, parsedQrData); 
        } catch (error) { 
            console.error("Error during QR Scan Processing:", error); 
            if (!isConfirmationPromptVisible && !isPasswordModalVisible && error.message !== "Job card check error") { 
                Alert.alert("Scan Error", error.message || "Invalid QR Code data or processing error."); 
            }
            if (!isConfirmationPromptVisible && !isPasswordModalVisible) {
                qrLock.current = false; 
                setIsProcessing(false);
            } else if (error.message === "Job card check error" && !isConfirmationPromptVisible) {
                qrLock.current = false;
                setIsProcessing(false);
            }
        }
    };

    //handleVehicleSearch
    const handleVehicleSearch = async (query) => {
        setIsSearching(true); 
        try { 
            const token = await AsyncStorage.getItem('authToken'); 
            if (!token) throw new Error("Auth token not found."); 
            const url = `${API_BASE_URL}/vehicles/search?query=${encodeURIComponent(query)}`; 
            const response = await fetch(url, { method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } }); 
            let vehicleList = []; 
            let errorMessage = null; 
            if (response.ok) { 
                const data = await response.json(); 
                vehicleList = Array.isArray(data) ? data : (data && Object.keys(data).length > 0 ? [data] : []); 
                if (vehicleList.length === 0 && query.length >= MIN_SEARCH_LENGTH) { 
                    errorMessage = (`No vehicles found: "${query}"`); 
                } 
            } else { 
                let failedMsg = `Search failed (${response.status})`; 
                try { 
                    const errorBodyText = await response.text();
                    const errorBody = JSON.parse(errorBodyText || '{}'); 
                    failedMsg = errorBody.message || failedMsg; 
                } catch (e) { } 
                errorMessage = failedMsg; 
            } 
            setSearchResults(vehicleList); 
            setError(errorMessage); 
        } catch (e) { 
            if (e.message && e.message.toLowerCase().includes("auth token")) { 
                Alert.alert("Authentication Error", e.message); 
            } else { 
                setError(e.message || "Search error."); 
            } 
            setSearchResults([]); 
        } finally { 
            setIsSearching(false); 
        }
    };

    //handleVehicleSelect
    const handleVehicleSelect = async (selectedChassisNo) => {
        Keyboard.dismiss(); 
        setError(null); 
        setSearchResults([]); 
        if (isProcessing) { return; } 
        setChassisNumber(selectedChassisNo); 
        setIsProcessing(true); 
        try { 
            const jobCardStatus = await checkJobCardExists(selectedChassisNo); 
            if (jobCardStatus.exists === true) { 
                console.log(`Job card exists for selected chassis ${selectedChassisNo}. Showing confirmation prompt.`); 
                setConfirmationContext({ chassis: selectedChassisNo, qrData: null, source: 'manual' }); 
                setIsConfirmationPromptVisible(true); 
                return; 
            } else if (jobCardStatus.error) { 
                Alert.alert("Error Checking Job Card", jobCardStatus.error); 
                throw new Error("Job card check error"); 
            } 
            await processAndDisplayVehicle(selectedChassisNo, false, null); 
        } catch (e) { 
            console.error("Error in handleVehicleSelect:", e); 
            if (!isConfirmationPromptVisible && !isPasswordModalVisible && e.message !== "Job card check error") { 
                Alert.alert("Operation Failed", e.message || "Could not process vehicle selection."); 
            }
            if (!isConfirmationPromptVisible && !isPasswordModalVisible) {
                setIsProcessing(false);
            } else if (e.message === "Job card check error" && !isConfirmationPromptVisible) {
                setIsProcessing(false);
            }
        }
    };

    //Permission Check
    if (!permission) { return <View style={localStyles.centeredLoading}><ActivityIndicator size="large" color={COLORS.primary} /></View>; }
    if (!permission.granted) { return ( <View style={localStyles.containerPermission}><Text style={localStyles.permissionText}>We need camera permission to scan QR codes.</Text><TouchableOpacity onPress={requestPermission} style={localStyles.permissionButton}><Text style={localStyles.permissionButtonText}>Grant Permission</Text></TouchableOpacity></View> ); }

    //JSX Structure
    return (
        <ScreenWrapper 
            showHeader={true} 
            showFooter={true} 
            contentStyle={localStyles.content} 
            enableKeyboardAvoidingView={true} 
            enableScrollView={false} 
        >
            {isProcessing && !isPasswordModalVisible && !isConfirmationPromptVisible && ( 
                <View style={localStyles.checkingOverlay}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={localStyles.checkingText}>Processing...</Text>
                </View> 
            )}

            <Text style={localStyles.qrTitle}>Scan QR Code</Text>
            {isCameraOpen ? ( 
                <View style={localStyles.qrBox}>
                    <CameraView 
                        style={StyleSheet.absoluteFill} 
                        facing={facing} 
                        onBarcodeScanned={isProcessing || qrLock.current ? undefined : handleQRCodeScanned} 
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
                        onPress={() => !isProcessing && setIsCameraOpen(true)} 
                        disabled={isProcessing} 
                    >
                        <MaterialCommunityIcons 
                            name="qrcode-scan" 
                            size={60} 
                            color={isProcessing ? COLORS.disabled : COLORS.secondary} 
                        />
                        <Text style={[
                            localStyles.qrPlaceholderText, 
                            { color: isProcessing ? COLORS.disabled : COLORS.secondary }
                        ]}>
                            Tap to Scan
                        </Text>
                    </TouchableOpacity>
                </View> 
            )}

            <Text style={localStyles.orText}>OR</Text>
            <Text style={localStyles.subTitle}>Manual type chassis no.</Text>
            <View style={localStyles.inputContainer}>
                <TextInput 
                    style={[commonStyles.textInput, localStyles.inputFullWidth]} 
                    placeholder={`Enter min ${MIN_SEARCH_LENGTH} characters`} 
                    placeholderTextColor={COLORS.grey} 
                    value={chassisNumber} 
                    onChangeText={setChassisNumber} 
                    autoCapitalize="characters" 
                    autoCorrect={false} 
                    editable={!isProcessing && !isSearching} 
                />
                {error && <Text style={[commonStyles.errorText, localStyles.errorTextStyleOverride]}>{error}</Text>}
                {isSearching && !isProcessing && ( 
                    <View style={localStyles.searchingIndicator}>
                        <ActivityIndicator size="small" color={COLORS.primary} />
                        <Text style={localStyles.searchingText}>Searching...</Text>
                    </View> 
                )}
                {searchResults.length > 0 && !isSearching && !isProcessing && (
                    <View style={localStyles.resultsContainer}>
                        <FlatList 
                            data={searchResults} 
                            keyExtractor={(item, index) => item.id?.toString() || `result-${index}`} 
                            renderItem={({ item }) => ( 
                                <TouchableOpacity 
                                    onPress={() => handleVehicleSelect(item.chassis_no)} 
                                    style={localStyles.resultItem} 
                                    disabled={isProcessing}
                                >
                                    <Text style={localStyles.resultText}>Chassis: {item.chassis_no}</Text>
                                    {item.model_name && 
                                        <Text style={localStyles.resultSubText}>
                                            Model: {item.model_name} {item.variant_name ? `(${item.variant_name})` : ''}
                                        </Text>
                                    }
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
                    style={[commonStyles.actionButtonSecondary, isProcessing && commonStyles.actionButtonDisabled]} 
                    onPress={() => navigation.goBack()} 
                    disabled={isProcessing} 
                >
                    <Text style={[commonStyles.actionButtonText, isProcessing && commonStyles.actionButtonTextDisabled]}>
                        Back
                    </Text>
                </TouchableOpacity>
            </View>

            <TimerModal 
                visible={modalVisible} 
                onClose={() => { 
                    setModalVisible(false); 
                    qrLock.current = false; 
                    setIsProcessing(false); 
                }} 
                carInfo={carInfo} 
            />
            
            <ConfirmationOverridePromptModal 
                visible={isConfirmationPromptVisible} 
                chassisNo={confirmationContext.chassis}
                onClose={() => { 
                    setIsConfirmationPromptVisible(false); 
                    setIsProcessing(false); 
                    if (confirmationContext.source === 'qr' && qrLock.current) { qrLock.current = false; } 
                    setConfirmationContext({ chassis: null, qrData: null, source: null }); 
                }}
                onConfirm={() => { 
                    handleInitialOverrideConfirm(true); 
                }}
            />
            
            <PasswordOverrideModal 
                visible={isPasswordModalVisible} 
                chassisNo={chassisForPasswordOverride}
                onClose={() => { 
                    setIsPasswordModalVisible(false); 
                    setIsProcessing(false); 
                    if (qrLock.current) qrLock.current = false; 
                    setChassisForPasswordOverride(null); 
                    setDataForPasswordOverride(null); 
                }}
                onSubmit={handlePasswordSubmit}
            />
        </ScreenWrapper>
    );
};

// --- Consolidated localStyles ---
const TINY_MARGIN = MARGIN.xsmall / 2 || 5;

const localStyles = StyleSheet.create({
    content: { 
        flexGrow: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        paddingHorizontal: PADDING.large, 
        paddingBottom: MARGIN.large 
    },
    centeredLoading: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    qrTitle: { 
        fontSize: FONT_SIZES.xxlarge, 
        fontWeight: 'bold', 
        color: COLORS.primary, 
        marginBottom: MARGIN.medium, 
        textAlign: 'center' 
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
        backgroundColor: COLORS.white 
    },
    qrPlaceholderContainer: { 
        alignItems: 'center', 
        justifyContent: 'center' 
    },
    qrPlaceholderText: { 
        marginTop: TINY_MARGIN, 
        fontSize: FONT_SIZES.medium, 
        textAlign: 'center' 
    },
    closeButton: { 
        position: 'absolute', 
        bottom: 10, 
        alignSelf: 'center', 
        backgroundColor: COLORS.danger, 
        paddingVertical: PADDING.small, 
        paddingHorizontal: PADDING.medium, 
        borderRadius: 5 
    },
    closeText: { 
        color: COLORS.white, 
        fontWeight: 'bold', 
        fontSize: FONT_SIZES.small 
    },
    orText: { 
        fontSize: FONT_SIZES.medium, 
        marginVertical: MARGIN.medium, 
        fontWeight: 'bold', 
        color: COLORS.secondary 
    },
    subTitle: { 
        fontSize: FONT_SIZES.large, 
        fontWeight: 'bold', 
        color: COLORS.secondary, 
        marginBottom: MARGIN.small 
    },
    inputContainer: { 
        width: '100%', 
        alignItems: 'center', 
        marginBottom: MARGIN.small 
    },
    inputFullWidth: { 
        width: '100%' 
    },
    errorTextStyleOverride: { 
        marginTop: MARGIN.xsmall, 
        marginBottom: MARGIN.small, 
        textAlign: 'center', 
        width: '100%' 
    },
    searchingIndicator: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        marginTop: MARGIN.small, 
        marginBottom: MARGIN.small 
    },
    searchingText: { 
        marginLeft: MARGIN.small, 
        color: COLORS.grey, 
        fontSize: FONT_SIZES.small 
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
        zIndex: 1 
    },
    resultsList: { 
        flexGrow: 0 
    },
    resultItem: { 
        paddingVertical: PADDING.small, 
        paddingHorizontal: PADDING.medium, 
        borderBottomWidth: 1, 
        borderBottomColor: COLORS.divider 
    },
    resultText: { 
        fontSize: FONT_SIZES.medium, 
        fontWeight: '500', 
        color: COLORS.secondary 
    },
    resultSubText: { 
        fontSize: FONT_SIZES.small, 
        color: COLORS.grey, 
        marginTop: TINY_MARGIN 
    },
    buttonContainer: { 
        flexDirection: 'row', 
        marginTop: MARGIN.medium, 
        justifyContent: 'center', 
        width: '100%', 
        gap: PADDING.large 
    },
    containerPermission: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: 'rgba(0,0,0,0.7)', 
        padding: PADDING.large 
    },
    permissionText: { 
        textAlign: 'center', 
        color: COLORS.white, 
        fontSize: FONT_SIZES.medium, 
        marginBottom: MARGIN.large 
    },
    permissionButton: { 
        backgroundColor: COLORS.primary, 
        paddingHorizontal: PADDING.large, 
        paddingVertical: PADDING.medium, 
        borderRadius: 5 
    },
    permissionButtonText: { 
        color: COLORS.white, 
        fontSize: FONT_SIZES.medium, 
        fontWeight: 'bold' 
    },
    checkingOverlay: { 
        ...StyleSheet.absoluteFillObject, 
        backgroundColor: 'rgba(255, 255, 255, 0.75)', 
        justifyContent: 'center', 
        alignItems: 'center', 
        zIndex: 1000 
    },
    checkingText: { 
        marginTop: MARGIN.medium, 
        fontSize: FONT_SIZES.medium, 
        fontWeight: 'bold', 
        color: COLORS.secondary 
    },
    // Styles for Modals (PasswordOverrideModal & ConfirmationOverridePromptModal)
    modalCenteredView: { 
        flex: 1, 
        justifyContent: "center", 
        alignItems: "center", 
        backgroundColor: 'rgba(0,0,0,0.5)'
    },
    modalView: { 
        margin: MARGIN.medium, 
        backgroundColor: COLORS.white, 
        borderRadius: 10, 
        padding: PADDING.large, 
        alignItems: "center", 
        shadowColor: "#000", 
        shadowOffset: { width: 0, height: 2 }, 
        shadowOpacity: 0.25, 
        shadowRadius: 4, 
        elevation: 5, 
        width: '90%', 
        maxWidth: 500 
    },
    modalTitle: { 
        fontSize: FONT_SIZES.xlarge, 
        fontWeight: 'bold', 
        color: COLORS.primary, 
        marginBottom: MARGIN.medium, 
        textAlign: 'center' 
    },
    modalText: { 
        fontSize: FONT_SIZES.medium, 
        color: COLORS.secondary, 
        marginBottom: MARGIN.small, 
        textAlign: 'center', 
        lineHeight: FONT_SIZES.medium * 1.4 
    },
    modalChassisText: { // Specific for Confirmation Modal's chassis display
        fontSize: FONT_SIZES.large,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginBottom: MARGIN.medium,
        textAlign: 'center',
    },
    modalPasswordInput: { // Specific for Password Modal's input
        width: '100%', 
        marginBottom: MARGIN.large, 
        marginTop: MARGIN.medium, 
        textAlign: 'center' 
    },
    modalButtonContainer: { 
        flexDirection: 'row', 
        justifyContent: 'space-around', 
        width: '100%', 
        marginTop: MARGIN.large 
    },
    modalButton: { 
        flex: 1, 
        marginHorizontal: MARGIN.xsmall, 
        paddingVertical: PADDING.medium // Made padding consistent for modal buttons
    },
    overideButtonText: {
    fontSize: FONT_SIZES.large,
    color: COLORS.secondary,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});