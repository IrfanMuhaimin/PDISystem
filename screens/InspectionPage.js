// screens/InspectionPage.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TextInput,
  TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform, Modal} from 'react-native';
import { jwtDecode } from 'jwt-decode';
import ScreenWrapper from '../styles/flowstudiosbg.js';
import commonStyles, { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/commonStyles.js';
import InspectionConfirm from './InspectionConfirm';

const API_BASE_URL = 'http://pdi.flowstudios.com.my/api'; // Reuse or define base URL
const FINAL_INSPECTION_API_ENDPOINT = `${API_BASE_URL}/jobcards/approvals`; // Adjust endpoint name if different

export default function InspectionPage({ navigation }) {
  // --- State --- (Keep original + add modal/submission state) ---
  const [vehicles, setVehicles] = useState([]);
  const [filteredVehicles, setFilteredVehicles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- New State for Confirmation Modal ---
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [selectedVehicleForConfirm, setSelectedVehicleForConfirm] = useState(null);
  const [decisionForConfirm, setDecisionForConfirm] = useState(null); // 'OK' or 'NOK'
  const [isSubmittingConfirm, setIsSubmittingConfirm] = useState(false);
  const [loggedInUsername, setLoggedInUsername] = useState('N/A'); // Store logged-in user's name
  // --- End New State ---

  // --- useEffects --- (Keep original) ---
  useEffect(() => {
    fetchVehicles();
    fetchLoggedInUsername(); // Fetch username on mount/focus
    const unsubscribe = navigation.addListener('focus', () => {
       console.log("InspectionPage focused, refetching vehicles and username...");
       fetchVehicles();
       fetchLoggedInUsername();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    applyFilterAndSearch(vehicles, filter, searchQuery);
  }, [vehicles, filter, searchQuery]);

  // --- Functions --- (Keep original + add new ones) ---
  const getAuthToken = async () => {
    // ... (original getAuthToken function - no changes) ...
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) console.warn("Auth token not found in AsyncStorage");
      return token;
    } catch (error) {
      console.error('Error retrieving authToken:', error);
      setError('Failed to get authentication token.');
      return null;
    }
  };

  // --- New function to get logged-in username ---
  const fetchLoggedInUsername = async () => {
    try {
        const token = await getAuthToken();
        if (token) {
            const decoded = jwtDecode(token);
            setLoggedInUsername(decoded?.username || 'N/A');
            console.log("Logged in username:", decoded?.username);
        } else {
            setLoggedInUsername('N/A');
        }
    } catch (e) {
        console.error("Error decoding token for username:", e);
        setLoggedInUsername('Error');
    }
  };

  const fetchVehicles = useCallback(async () => {
    // ... (original fetchVehicles function - no changes) ...
    setIsLoading(true); setError(null); setFilteredVehicles([]); setVehicles([]);
    const authToken = await getAuthToken();
    if (!authToken) { setError("Authentication Token not found..."); setIsLoading(false); return; }
    try {
      const apiUrl = `${API_BASE_URL}/jobcards/filter`; // Use base URL constant
      console.log(`Fetching list: ${apiUrl}`);
      const response = await fetch(apiUrl, { method: 'GET', headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json', 'Accept': 'application/json' } });
      if (!response.ok) { let errorText = `HTTP error! Status: ${response.status}`; try { const errorData = await response.json(); errorText += `: ${errorData.message || JSON.stringify(errorData)}`; } catch (e) { errorText += `: ${await response.text()}`; } console.error(errorText); throw new Error(`Failed to fetch vehicles...`); }
      const data = await response.json();
      console.log("Fetched List Data:", data.length, "items");
      if (!Array.isArray(data)) { console.error("API list endpoint did not return an array:", data); throw new Error("Received invalid data format..."); }
      if (data.length > 0 && (data[0].chassis_no === undefined || data[0].rectified === undefined)) { console.warn("Warning: List data might be missing 'chassis_no' or 'rectified'."); }
      setVehicles(data);
    } catch (error) { console.error('Error fetching vehicle list:', error.message); setError(error.message || 'An unknown error occurred...'); setVehicles([]); setFilteredVehicles([]); }
    finally { setIsLoading(false); }
  }, []);

  const applyFilterAndSearch = useCallback((sourceData, currentFilter, currentSearchQuery) => {
    // ... (original applyFilterAndSearch function - no changes) ...
    console.log(`Applying filter: ${currentFilter}, Search: "${currentSearchQuery}"`);
    let tempVehicles = [...sourceData];
    if (currentFilter === 'ok') { tempVehicles = tempVehicles.filter(vehicle => vehicle.rectified === false || vehicle.rectified === 0); }
    else if (currentFilter === 'rectified') { tempVehicles = tempVehicles.filter(vehicle => vehicle.rectified === true || vehicle.rectified === 1); }
    const query = currentSearchQuery.trim().toLowerCase();
    if (query) { tempVehicles = tempVehicles.filter(vehicle => vehicle.chassis_no && vehicle.chassis_no.toLowerCase().includes(query)); }
    setFilteredVehicles(tempVehicles);
    console.log(`Filtered down to ${tempVehicles.length} vehicles.`);
  }, []);

  const handleSearch = (text) => { setSearchQuery(text); };
  const handleFilterChange = (type) => { setFilter(type); };

  // --- MODIFIED: Trigger Confirmation Modal ---
  const handlePdiNok = (chassisNo) => {
    const vehicle = vehicles.find(v => v.chassis_no === chassisNo);
    if (vehicle) {
        console.log(`Triggering PDI NOK confirmation for ${chassisNo}`);
        setSelectedVehicleForConfirm(vehicle);
        setDecisionForConfirm('NOK');
        setIsConfirmModalVisible(true);
        setIsSubmittingConfirm(false); // Ensure submit state is reset
    } else {
        Alert.alert("Error", "Could not find vehicle data to confirm.");
    }
  };

  // --- MODIFIED: Trigger Confirmation Modal ---
  const handlePdiOk = (chassisNo) => {
     const vehicle = vehicles.find(v => v.chassis_no === chassisNo);
     if (vehicle) {
         console.log(`Triggering PDI OK confirmation for ${chassisNo}`);
         setSelectedVehicleForConfirm(vehicle);
         setDecisionForConfirm('OK');
         setIsConfirmModalVisible(true);
         setIsSubmittingConfirm(false); // Ensure submit state is reset
     } else {
         Alert.alert("Error", "Could not find vehicle data to confirm.");
     }
  };

  // --- NEW: Function to handle the actual submission after modal confirmation ---
  const handleConfirmFinalInspection = async () => {
    if (!selectedVehicleForConfirm || !decisionForConfirm || !loggedInUsername || loggedInUsername === 'N/A' || loggedInUsername === 'Error') {
        Alert.alert("Error", "Cannot submit. Missing vehicle data, decision, or supervisor information.");
        return;
    }

    setIsSubmittingConfirm(true); // Show loading in modal
    const authToken = await getAuthToken();
    if (!authToken) {
        setIsSubmittingConfirm(false);
        setIsConfirmModalVisible(false);
        return;
    }

    // --- Construct the CORRECT URL Dynamically ---
    const url = `${API_BASE_URL}/approvals/${selectedVehicleForConfirm.chassis_no}`;

    // --- Prepare the CORRECT Request Body ---
    const requestBody = {
        approval: decisionForConfirm // Send { "approval": "OK" } or { "approval": "NOK" }
    };

    console.log(`[handleConfirm] Submitting PDI Approval to: ${url}`); // Updated log
    console.log("[handleConfirm] Request Body:", JSON.stringify(requestBody, null, 2)); // Log the new body

    let response;

    try {
        console.log("[handleConfirm] Initiating fetch...");
        response = await fetch(url, { // Use the dynamically constructed URL
            method: 'POST', // Method is POST as per InspectionInfo.js
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody), // Send the new body structure
        });
        console.log(`[handleConfirm] Fetch completed. Status: ${response.status}`);

        console.log("[handleConfirm] Attempting to read response body as text...");
        const responseText = await response.text();
        console.log(`[handleConfirm] Successfully read response body. Length: ${responseText.length}`);

        if (response.ok) {
            console.log("[handleConfirm] Response OK. Processing success...");
            let result = {};
            try { if (responseText) { result = JSON.parse(responseText); console.log("[handleConfirm] Success JSON Parsed:", result); } else { console.log("[handleConfirm] Success response body is empty."); }
            } catch (jsonError) { console.warn("[handleConfirm] Success response was OK, but body was not valid JSON:", jsonError.message); }

            Alert.alert("Success", `Vehicle ${selectedVehicleForConfirm.chassis_no} PDI status set to ${decisionForConfirm}.`); // Updated success message
            setIsConfirmModalVisible(false);
            fetchVehicles(); // Refresh list

        } else {
            // Handle API error (non-2xx status)
            console.log("[handleConfirm] Response NOT OK. Processing error...");
            let errorDetail = `Status Code: ${response.status}`;
            try { if (responseText) { const errorData = JSON.parse(responseText); errorDetail += ` - ${errorData.message || JSON.stringify(errorData)}`; console.log("[handleConfirm] Error JSON Parsed:", errorData); } else { errorDetail += " - (Empty Response Body)"; }
            } catch (jsonError) { console.warn("[handleConfirm] Error response body was not valid JSON:", jsonError.message); errorDetail += ` - (Raw Body: ${responseText.substring(0, 100)}${responseText.length > 100 ? '...' : ''})`; }
            const errorMsg = `API Error: ${errorDetail}`;
            console.error(errorMsg);
            throw new Error(errorMsg); // Throw error with details
        }

    } catch (submissionError) {
        console.error('[handleConfirm] Caught Error:', submissionError);
        if (submissionError.message.includes("Already read")) { console.error(">>> FATAL: 'Already read' error occurred unexpectedly!"); Alert.alert('Critical Error', 'Failed to process response. [Code: RN-FETCH-READ]');
        } else { Alert.alert('Submission Failed', submissionError.message || 'An unexpected network error occurred.'); }
    } finally {
        console.log("[handleConfirm] Finally block executing.");
        setIsSubmittingConfirm(false); // Ensure loading stops
    }
  };
  // --- End New Functions ---


  // --- Render Content --- (Original renderContent with minor key adjustment) ---
  const renderContent = () => {
    if (isLoading) { /* ... */ return <ActivityIndicator size="large" color={COLORS.primary} style={commonStyles.loadingIndicator} />; }
    if (error) { /* ... */ return <Text style={commonStyles.errorText}>Error: {error}</Text>; }
     if (!isLoading && filteredVehicles.length === 0) { /* ... */ const message = "..."; return <Text style={commonStyles.noDataText}>{message}</Text>; }
     return (
         <ScrollView style={localStyles.listScrollView} contentContainerStyle={localStyles.listScrollViewContent} keyboardShouldPersistTaps="handled" >
             {filteredVehicles.map((vehicle) => (
                 // Use jobcard_id if available and unique, otherwise chassis_no is okay if unique in the list
                 <View key={vehicle.jobcard_id || vehicle.chassis_no} style={localStyles.vehicleBox}>
                     <Text style={localStyles.vehicleTextBold}>Chassis No: <Text style={localStyles.vehicleText}>{vehicle.chassis_no || 'N/A'}</Text></Text>
                     <Text style={localStyles.vehicleTextBold}>Colour: <Text style={localStyles.vehicleText}>{vehicle.colour_code || 'N/A'}</Text></Text>
                     <Text style={localStyles.vehicleTextBold}>Engine No: <Text style={localStyles.vehicleText}>{vehicle.engine_no || 'N/A'}</Text></Text>
                     {/* Check if 'items' exists and is an array before accessing length */}
                     <Text style={[ localStyles.vehicleTextBold, Array.isArray(vehicle.items) && vehicle.items.length > 0 ? localStyles.defectsText : {} ]}>
                         Reported Defects: <Text style={localStyles.vehicleText}>{Array.isArray(vehicle.items) ? vehicle.items.length : 'N/A'}</Text>
                     </Text>

                     <View style={localStyles.buttonContainer}>
                         {/* Logic assumes 'rectified' means final decision already made */}
                         {/* If 'rectified' only refers to defect fixing, adjust this logic */}
                         {vehicle.rectified === true || vehicle.rectified === 1 ? (
                             <TouchableOpacity style={localStyles.viewButton} onPress={() => navigation.navigate('InspectionInfo', { chassisNo: vehicle.chassis_no })} >
                                 <Text style={localStyles.buttonTextWhite}>View Details</Text>
                             </TouchableOpacity>
                         ) : (
                             <>
                                 <TouchableOpacity style={localStyles.nokButton} onPress={() => handlePdiNok(vehicle.chassis_no)} >
                                     <Text style={localStyles.buttonTextWhite}>PDI NOK</Text>
                                 </TouchableOpacity>
                                 <TouchableOpacity style={localStyles.okButton} onPress={() => handlePdiOk(vehicle.chassis_no)} >
                                     <Text style={localStyles.buttonTextWhite}>PDI OK</Text>
                                 </TouchableOpacity>
                             </>
                         )}
                     </View>
                 </View>
             ))}
         </ScrollView>
     );
 }

  // --- RETURN JSX ---
  return (
    <ScreenWrapper showHeader={true} showFooter={true} enableScrollView={false} enableKeyboardAvoidingView={true} >
        <View style={localStyles.mainContentArea}>
            <Text style={commonStyles.pageHeader}>Final Inspection</Text>
            <TextInput style={commonStyles.textInput} placeholder="Search by Chassis No." value={searchQuery} onChangeText={handleSearch} /* ... other props ... */ />

            {/* Filter Radios */}
            <View style={localStyles.filterContainer}>
                {['all', 'ok', 'rectified'].map((type) => (
                    <TouchableOpacity key={type} style={[ localStyles.radioButtonContainer, filter === type ? localStyles.radioButtonContainerSelected : {} ]} onPress={() => handleFilterChange(type)} activeOpacity={0.7} >
                        <View style={[localStyles.radioCircle, filter === type ? localStyles.radioCircleSelected : {}]} />
                        <Text style={[localStyles.radioText, filter === type ? localStyles.radioTextSelected : {}]}>
                            {type === 'all' ? 'All' : type === 'ok' ? 'Ready/OK' : 'Rectified'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Units Header */}
            <View style={localStyles.unitsHeader}>
                 <Text style={localStyles.unitsText}>Vehicles Displayed</Text>
                 <Text style={localStyles.unitsText}>Total: {isLoading ? '...' : filteredVehicles.length}</Text>
             </View>

            {/* List Content Area */}
            <View style={localStyles.listContainer}>
                {renderContent()}
            </View>
        </View>

        {/* Footer Buttons */}
        <View style={commonStyles.footerActionContainer}>
             <TouchableOpacity style={commonStyles.actionButtonSecondary} onPress={() => navigation.goBack()} activeOpacity={0.7} >
                 <Text style={commonStyles.actionButtonText}>Back</Text>
             </TouchableOpacity>
             <TouchableOpacity style={commonStyles.actionButton} onPress={() => navigation.navigate('InspectionSummary')} activeOpacity={0.7} >
                 <Text style={commonStyles.actionButtonPrimaryText}>Summary</Text>
             </TouchableOpacity>
         </View>

        {/* --- Render Confirmation Modal --- */}
        {selectedVehicleForConfirm && (
            <InspectionConfirm
                visible={isConfirmModalVisible}
                onClose={() => { if (!isSubmittingConfirm) setIsConfirmModalVisible(false); }}
                onConfirm={handleConfirmFinalInspection}
                decision={decisionForConfirm}
                vehicleData={selectedVehicleForConfirm}
                pdiStaffName={loggedInUsername}
                pdiPerformerName={selectedVehicleForConfirm?.staff_username || loggedInUsername}
                rectifiedItemsCount={selectedVehicleForConfirm?.items?.length || 0}
                isSubmitting={isSubmittingConfirm}
            />
        )}
        {/* --- End Modal Rendering --- */}

    </ScreenWrapper>
  );
}

// --- Local Styles (Keep original, no changes needed) ---
const localStyles = StyleSheet.create({
    mainContentArea: { flex: 1, paddingHorizontal: PADDING.medium, paddingTop: PADDING.small, },
    filterContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: MARGIN.medium, paddingVertical: PADDING.xsmall, flexWrap: 'wrap', },
    radioButtonContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: PADDING.small, paddingHorizontal: PADDING.medium - 2, margin: MARGIN.xsmall, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.lightGrey, backgroundColor: COLORS.white, },
    radioButtonContainerSelected: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary, },
    radioCircle: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: COLORS.lightGrey, marginRight: MARGIN.small, justifyContent: 'center', alignItems: 'center', },
    radioCircleSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary, },
    radioText: { fontSize: FONT_SIZES.small, color: COLORS.grey, fontWeight: '500', },
    radioTextSelected: { color: COLORS.primary, fontWeight: 'bold', },
    unitsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: MARGIN.small, paddingHorizontal: PADDING.xsmall + 2, borderBottomWidth: 1, borderBottomColor: COLORS.divider, paddingBottom: PADDING.small, },
    unitsText: { fontSize: FONT_SIZES.medium, fontWeight: '600', color: COLORS.secondary, },
    listContainer: { flex: 1, },
    listScrollView: { flex: 1, },
    listScrollViewContent: { paddingBottom: PADDING.medium, },
    vehicleBox: { backgroundColor: COLORS.white, padding: PADDING.medium, marginVertical: MARGIN.small, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, shadowColor: COLORS.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3, },
    vehicleTextBold: { fontSize: FONT_SIZES.medium, marginBottom: MARGIN.xsmall, fontWeight: '600', color: COLORS.secondary, lineHeight: FONT_SIZES.medium * 1.4, },
    vehicleText: { fontSize: FONT_SIZES.medium, fontWeight: 'normal', color: COLORS.grey, lineHeight: FONT_SIZES.medium * 1.4, },
    defectsText: { color: COLORS.danger, fontWeight: 'bold', marginTop: MARGIN.xsmall, },
    buttonContainer: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: MARGIN.medium, borderTopWidth: 1, borderTopColor: COLORS.divider, paddingTop: PADDING.medium, },
    viewButton: { backgroundColor: COLORS.primary, paddingVertical: PADDING.small, paddingHorizontal: PADDING.medium, borderRadius: 5, marginLeft: MARGIN.small, minHeight: 36, justifyContent: 'center', },
    nokButton: { backgroundColor: COLORS.danger, paddingVertical: PADDING.small, paddingHorizontal: PADDING.medium, borderRadius: 5, marginLeft: MARGIN.small, minHeight: 36, justifyContent: 'center', },
    okButton: { backgroundColor: COLORS.success, paddingVertical: PADDING.small, paddingHorizontal: PADDING.medium, borderRadius: 5, marginLeft: MARGIN.small, minHeight: 36, justifyContent: 'center', },
    buttonTextWhite: { color: COLORS.white, fontWeight: 'bold', fontSize: FONT_SIZES.small, textAlign: 'center', },
});