// screens/InspectionPage.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput,
  TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform // Removed SafeAreaView
} from 'react-native';

// --- Import ScreenWrapper ---
// *** ADJUST PATH IF NEEDED ***
import ScreenWrapper from '../styles/flowstudiosbg.js';

// --- Import Common Styles & Constants ---
// *** ADJUST PATH IF NEEDED ***
import commonStyles, { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/commonStyles.js';

// --- (Keep API/Modal imports if needed) ---
// import FinalInspectionConfirmModal from '../components/FinalInspectionConfirmModal';
// const FINAL_INSPECTION_API_ENDPOINT = ...;

export default function InspectionPage({ navigation }) {
  // --- State --- (Keep all original state) ---
  const [vehicles, setVehicles] = useState([]);
  const [filteredVehicles, setFilteredVehicles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  // --- (Keep modal/submission state IF used) ---
  // const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  // ... other modal state ...

  // --- useEffects --- (Keep all original useEffects) ---
  useEffect(() => {
    fetchVehicles();
    const unsubscribe = navigation.addListener('focus', () => {
       console.log("InspectionPage focused, refetching vehicles...");
       fetchVehicles();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    applyFilterAndSearch(vehicles, filter, searchQuery);
  }, [vehicles, filter, searchQuery]);

  // --- Functions --- (Keep all original functions) ---
  const getAuthToken = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) console.warn("Auth token not found in AsyncStorage");
      return token;
    } catch (error) {
      console.error('Error retrieving authToken:', error);
      setError('Failed to get authentication token.'); // Show error to user
      return null;
    }
  };

  const fetchVehicles = useCallback(async () => {
    setIsLoading(true); setError(null); setFilteredVehicles([]); setVehicles([]);
    const authToken = await getAuthToken();
    if (!authToken) { setError("Authentication Token not found. Please log in again."); setIsLoading(false); return; }
    try {
      const apiUrl = `http://pdi.flowstudios.com.my/api/jobcards/filter`;
      console.log(`Fetching list: ${apiUrl}`);
      const response = await fetch(apiUrl, { method: 'GET', headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json', 'Accept': 'application/json' } });
      if (!response.ok) { let errorText = `HTTP error! Status: ${response.status}`; try { const errorData = await response.json(); errorText += `: ${errorData.message || JSON.stringify(errorData)}`; } catch (e) { errorText += `: ${await response.text()}`; } console.error(errorText); throw new Error(`Failed to fetch vehicles. ${response.status === 401 ? 'Unauthorized - check token.' : ''}`); }
      const data = await response.json();
      console.log("Fetched List Data:", data.length, "items");
      if (!Array.isArray(data)) { console.error("API list endpoint did not return an array:", data); throw new Error("Received invalid data format from server."); }
      if (data.length > 0 && (data[0].chassis_no === undefined || data[0].rectified === undefined)) { console.warn("Warning: List data might be missing 'chassis_no' or 'rectified'."); }
      setVehicles(data);
    } catch (error) { console.error('Error fetching vehicle list:', error.message); setError(error.message || 'An unknown error occurred while fetching vehicles.'); setVehicles([]); setFilteredVehicles([]); }
    finally { setIsLoading(false); }
  }, []);

  const applyFilterAndSearch = useCallback((sourceData, currentFilter, currentSearchQuery) => {
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

  const handlePdiNok = (chassisNo) => { Alert.alert('PDI NOK Action', `Simulating NOK action for chassis ${chassisNo}. (Implement API call)`); /* TODO */ };
  const handlePdiOk = (chassisNo) => { Alert.alert('PDI OK Action', `Simulating OK action for chassis ${chassisNo}. (Implement API call)`); /* TODO */ };
  // --- (Keep original PDI OK/NOK or Modal handlers IF used) ---


  // --- Render Content ---
  const renderContent = () => {
    if (isLoading) {
        return <ActivityIndicator size="large" color={COLORS.primary} style={commonStyles.loadingIndicator} />;
    }
    if (error) {
        return <Text style={commonStyles.errorText}>Error: {error}</Text>;
    }
     if (!isLoading && filteredVehicles.length === 0) {
        const message = searchQuery || filter !== 'all'
            ? "No vehicles match the current filter/search."
            : "No vehicles available for inspection.";
        return <Text style={commonStyles.noDataText}>{message}</Text>;
     }
     return (
         <ScrollView
             style={localStyles.listScrollView}
             contentContainerStyle={localStyles.listScrollViewContent}
             keyboardShouldPersistTaps="handled"
         >
             {filteredVehicles.map((vehicle) => (
                 <View key={vehicle.chassis_no} style={localStyles.vehicleBox}>
                     <Text style={localStyles.vehicleTextBold}>Chassis No: <Text style={localStyles.vehicleText}>{vehicle.chassis_no || 'N/A'}</Text></Text>
                     <Text style={localStyles.vehicleTextBold}>Colour: <Text style={localStyles.vehicleText}>{vehicle.colour_code || 'N/A'}</Text></Text>
                     <Text style={localStyles.vehicleTextBold}>Engine No: <Text style={localStyles.vehicleText}>{vehicle.engine_no || 'N/A'}</Text></Text>
                     {Array.isArray(vehicle.items) && vehicle.items.length > 0 ? (
                         <Text style={[localStyles.vehicleTextBold, localStyles.defectsText]}>Reported Defects: <Text style={localStyles.vehicleText}>{vehicle.items.length}</Text></Text>
                     ) : (
                         <Text style={localStyles.vehicleTextBold}>Defects: <Text style={localStyles.vehicleText}>None Reported</Text></Text>
                     )}
                     <View style={localStyles.buttonContainer}>
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
    <ScreenWrapper
        showHeader={true}
        showFooter={true}
        enableScrollView={false} // Use internal ScrollView for list
        enableKeyboardAvoidingView={true}
    >
        {/* --- Main Content Area (Excluding Fixed Footer Buttons) --- */}
        {/* Use a View to apply padding and flex:1 */}
        <View style={localStyles.mainContentArea}>
            {/* Page Header */}
            <Text style={commonStyles.pageHeader}>Final Inspection</Text>

            {/* Search Input */}
            <TextInput
                style={commonStyles.textInput}
                placeholder="Search by Chassis No."
                value={searchQuery}
                onChangeText={handleSearch}
                placeholderTextColor={COLORS.grey}
                clearButtonMode="while-editing"
                autoCapitalize="characters"
                autoCorrect={false}
            />

            {/* Filter Radios */}
            <View style={localStyles.filterContainer}>
                {['all', 'ok', 'rectified'].map((type) => (
                <TouchableOpacity
                    key={type}
                    style={[ localStyles.radioButtonContainer, filter === type ? localStyles.radioButtonContainerSelected : {} ]}
                    onPress={() => handleFilterChange(type)}
                    activeOpacity={0.7}
                >
                    <View style={[localStyles.radioCircle, filter === type ? localStyles.radioCircleSelected : {}]} />
                    <Text style={[localStyles.radioText, filter === type ? localStyles.radioTextSelected : {}]}>
                    {type === 'all' ? 'All Vehicles' : type === 'ok' ? 'Ready / OK' : 'Rectified'}
                    </Text>
                </TouchableOpacity>
                ))}
            </View>

            {/* Units Header */}
            <View style={localStyles.unitsHeader}>
                <Text style={localStyles.unitsText}>Vehicles Displayed</Text>
                <Text style={localStyles.unitsText}>Total: {isLoading ? '...' : filteredVehicles.length}</Text>
            </View>

            {/* List Content Area (Takes remaining space) */}
            <View style={localStyles.listContainer}>
                {renderContent()}
            </View>
        </View>
        {/* --- End Main Content Area --- */}

        {/* --- Fixed Footer Action Buttons --- */}
        <View style={commonStyles.footerActionContainer}>
            <TouchableOpacity
                style={commonStyles.actionButtonSecondary}
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
            >
            <Text style={commonStyles.actionButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={commonStyles.actionButton}
                onPress={() => navigation.navigate('InspectionSummary')} // Ensure route exists
                activeOpacity={0.7}
            >
            <Text style={commonStyles.actionButtonPrimaryText}>Summary</Text>
            </TouchableOpacity>
        </View>
        {/* --- End Fixed Footer Buttons --- */}


        {/* --- (Keep Modal Rendering if using it) --- */}
        {/* ... */}

    </ScreenWrapper>
  );
}

// --- Local Styles (Generalized with Theme Constants) ---
const localStyles = StyleSheet.create({
    // New style for the main content area above the fixed footer
    mainContentArea: {
        flex: 1, // Make this View take up all space between ScreenWrapper's header and the fixed footer buttons
        paddingHorizontal: PADDING.medium,
        paddingTop: PADDING.small,
        // paddingBottom: 0, // No bottom padding needed here, list container handles it
    },

    // Filter/Radio Styles (Keep specific UI, use constants)
    filterContainer: {
        flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
        marginBottom: MARGIN.medium, paddingVertical: PADDING.xsmall, flexWrap: 'wrap',
    },
    radioButtonContainer: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: PADDING.small,
        paddingHorizontal: PADDING.medium - 2, margin: MARGIN.xsmall, borderRadius: 20,
        borderWidth: 1.5, borderColor: COLORS.lightGrey, backgroundColor: COLORS.white,
    },
    radioButtonContainerSelected: {
        backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary,
    },
    radioCircle: {
        width: 18, height: 18, borderRadius: 9, borderWidth: 2,
        borderColor: COLORS.lightGrey, marginRight: MARGIN.small,
        justifyContent: 'center', alignItems: 'center',
    },
    radioCircleSelected: {
        borderColor: COLORS.primary, backgroundColor: COLORS.primary,
    },
    radioText: {
        fontSize: FONT_SIZES.small, color: COLORS.grey, fontWeight: '500',
    },
    radioTextSelected: {
        color: COLORS.primary, fontWeight: 'bold',
    },

    // Units Header Styles (Keep specific UI, use constants)
    unitsHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: MARGIN.small, paddingHorizontal: PADDING.xsmall + 2,
        borderBottomWidth: 1, borderBottomColor: COLORS.divider,
        paddingBottom: PADDING.small,
    },
    unitsText: {
        fontSize: FONT_SIZES.medium, fontWeight: '600', color: COLORS.secondary,
    },

    // List Container and ScrollView (Ensure it fills space)
    listContainer: {
        flex: 1, // *** CRUCIAL: takes remaining vertical space in mainContentArea ***
        // Removed borders/padding, handled by unitsHeader and scrollview content
    },
    listScrollView: {
       flex: 1, // Ensure ScrollView fills listContainer
    },
    listScrollViewContent: {
        paddingBottom: PADDING.medium, // Padding at the very bottom of the scrolled content
    },

    // Vehicle Item Box Styles (Keep specific UI, use constants)
    vehicleBox: {
        backgroundColor: COLORS.white, padding: PADDING.medium,
        marginVertical: MARGIN.small, borderRadius: 8, borderWidth: 1,
        borderColor: COLORS.border, shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08,
        shadowRadius: 4, elevation: 3,
    },
    vehicleTextBold: {
        fontSize: FONT_SIZES.medium, marginBottom: MARGIN.xsmall,
        fontWeight: '600', color: COLORS.secondary,
        lineHeight: FONT_SIZES.medium * 1.4,
    },
    vehicleText: {
        fontSize: FONT_SIZES.medium, fontWeight: 'normal', color: COLORS.grey,
        lineHeight: FONT_SIZES.medium * 1.4,
    },
    defectsText: {
        color: COLORS.danger, fontWeight: 'bold', marginTop: MARGIN.xsmall,
    },

    // Button Container within Vehicle Box (Keep specific UI, use constants)
    buttonContainer: {
        flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center',
        marginTop: MARGIN.medium, borderTopWidth: 1, borderTopColor: COLORS.divider,
        paddingTop: PADDING.medium,
    },
    viewButton: {
        backgroundColor: COLORS.primary, paddingVertical: PADDING.small,
        paddingHorizontal: PADDING.medium, borderRadius: 5, marginLeft: MARGIN.small,
        minHeight: 36, justifyContent: 'center',
    },
    nokButton: {
        backgroundColor: COLORS.danger, paddingVertical: PADDING.small,
        paddingHorizontal: PADDING.medium, borderRadius: 5, marginLeft: MARGIN.small,
        minHeight: 36, justifyContent: 'center',
    },
    okButton: {
        backgroundColor: COLORS.success, paddingVertical: PADDING.small,
        paddingHorizontal: PADDING.medium, borderRadius: 5, marginLeft: MARGIN.small,
        minHeight: 36, justifyContent: 'center',
    },
    buttonTextWhite: {
        color: COLORS.white, fontWeight: 'bold', fontSize: FONT_SIZES.small,
        textAlign: 'center',
    },
    // Removed buttonDisabled as commonStyles handles the main action buttons
});