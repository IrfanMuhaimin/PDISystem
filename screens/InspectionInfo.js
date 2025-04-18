// screens/InspectionInfo.js
import React, { useState, useEffect, useMemo } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    Alert, ActivityIndicator, Modal, Image, Platform // Removed SafeAreaView
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Import ScreenWrapper ---
// *** ADJUST PATH IF NEEDED ***
import ScreenWrapper from '../styles/flowstudiosbg.js';

// --- Import Common Styles & Constants ---
// *** ADJUST PATH IF NEEDED ***
import commonStyles, { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/commonStyles.js';

// --- Import Custom Components ---
// *** ADJUST PATH IF NEEDED ***
import InspectionConfirm from '../screens/InspectionConfirm';

// --- API Endpoints / Constants / Helpers --- (Unchanged)
const API_BASE_URL = 'http://pdi.flowstudios.com.my/api';
const JOB_CARD_DETAIL_ENDPOINT = `${API_BASE_URL}/jobcards`;
const PDI_APPROVAL_BASE_ENDPOINT = `${API_BASE_URL}/approvals`;
const IMAGE_CONTAINER_WIDTH = 340;
const IMAGE_CONTAINER_HEIGHT = 450;
const sectionNumberToNameMap = { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'F', 7: 'Others' };
const getSectionNameFromNumber = (number) => number === null || number === undefined ? 'Uncategorized' : sectionNumberToNameMap[number] || `Unknown Section (${number})`;
const isItemRectified = (item) => item && Array.isArray(item.defect) && item.defect.length > 0 && item.defect.some(d => d && d.rectify && typeof d.rectify === 'object');
const formatDate = (date) => { if (!date) return 'N/A'; try { const dateObj = new Date(date); return isNaN(dateObj.getTime()) ? 'Invalid Date' : dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch (error) { console.error("Error formatting date:", date, error); return 'Error Date'; } };

// --- Component Definition ---
export default function InspectionInfo({ navigation }) {
    // --- State & Route --- (Unchanged)
    const route = useRoute();
    const { chassisNo } = route.params || {};
    const [detailedVehicleData, setDetailedVehicleData] = useState(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    const [imageModalVisible, setImageModalVisible] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [imageLoadingInModal, setImageLoadingInModal] = useState(false);
    const [showPdiConfirmModal, setShowPdiConfirmModal] = useState(false);
    const [pdiDecisionToConfirm, setPdiDecisionToConfirm] = useState(null);
    const [isConfirmingPdi, setIsConfirmingPdi] = useState(false);
    const [supervisorName, setSupervisorName] = useState('N/A');

    // --- useEffect to Fetch Supervisor Name --- (Unchanged)
    useEffect(() => { const fetchUserName = async () => { try { const name = await AsyncStorage.getItem('userFullName'); if (name) { setSupervisorName(name); } else { console.warn("'userFullName' not found in AsyncStorage."); } } catch (e) { console.error("Failed to fetch supervisor name:", e); } }; fetchUserName(); }, []);

    // --- useEffect to Fetch Job Card Details --- (Unchanged)
    useEffect(() => {
        const fetchJobCardDetails = async () => {
            if (!chassisNo) { setFetchError("No chassis number provided."); setIsLoadingDetails(false); return; } setIsLoadingDetails(true); setFetchError(null); setDetailedVehicleData(null);
            try { const token = await AsyncStorage.getItem('authToken'); if (!token) throw new Error("Auth token missing."); const url = `${JOB_CARD_DETAIL_ENDPOINT}/${chassisNo}`; console.log(`Fetching Job Card: ${url}`); const response = await fetch(url, { method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } }); console.log(`Fetch Status: ${response.status}`); if (!response.ok) { let errorMsg = `Fetch failed (${response.status})`; if (response.status === 404) { errorMsg = `Job card not found for Chassis: ${chassisNo}. (${response.status})`; } else { try { const eb = await response.json(); errorMsg = eb.message || eb.error || errorMsg; } catch (e) {/*ignore*/ } } throw new Error(errorMsg); } const data = await response.json(); console.log(`Fetch Success.`); if (!data || typeof data !== 'object' || !data.chassis_no || !Array.isArray(data.types)) { console.error("Invalid data format:", JSON.stringify(data).substring(0, 500)); throw new Error("Invalid data format received."); } setDetailedVehicleData(data); } catch (error) { console.error("Fetch Job Card Error:", error); setFetchError(error.message || "An unknown error occurred."); } finally { setIsLoadingDetails(false); } }; fetchJobCardDetails();
    }, [chassisNo]);

    // --- Memoized Calculations --- (Unchanged)
    const allItemsFromTypes = useMemo(() => { if (!detailedVehicleData?.types) return []; let collected = []; detailedVehicleData.types.forEach(t => { if (Array.isArray(t.items)) collected = collected.concat(t.items); }); return collected; }, [detailedVehicleData]);
    const rectifiedItemsOnly = useMemo(() => allItemsFromTypes.filter(isItemRectified), [allItemsFromTypes]);
    const { groupedItemsForDisplay, sortedSectionsForDisplay, groupingError } = useMemo(() => { if (!rectifiedItemsOnly) return { groupedItemsForDisplay: {}, sortedSectionsForDisplay: [], groupingError: "Data unavailable." }; const grouped = {}; try { rectifiedItemsOnly.forEach(item => { if (!item?.id) return; const sectionName = getSectionNameFromNumber(item.section); if (!grouped[sectionName]) grouped[sectionName] = []; grouped[sectionName].push(item); }); const order = ['A', 'B', 'C', 'D', 'E', 'F', 'Others']; const sortedKeys = Object.keys(grouped).sort((a, b) => { const iA = order.indexOf(a), iB = order.indexOf(b); if (iA !== -1 && iB !== -1) return iA - iB; if (iA !== -1) return -1; if (iB !== -1) return 1; if (a === 'Uncategorized') return 1; if (b === 'Uncategorized') return -1; return String(a).localeCompare(String(b)); }); return { groupedItemsForDisplay: grouped, sortedSectionsForDisplay: sortedKeys, groupingError: null }; } catch (err) { console.error("Grouping Error:", err); return { groupedItemsForDisplay: {}, sortedSectionsForDisplay: [], groupingError: "Grouping failed." }; } }, [rectifiedItemsOnly]);
    const { sectionSummary, sectionSummaryError } = useMemo(() => { if (!allItemsFromTypes || isLoadingDetails || fetchError) return { sectionSummary: [], sectionSummaryError: null }; const summaryMap = {}; try { allItemsFromTypes.forEach(item => { if (!item?.id) return; const sectionName = getSectionNameFromNumber(item.section); if (!summaryMap[sectionName]) summaryMap[sectionName] = { section: sectionName, totalDefectsReported: 0, rectifiedCount: 0 }; const hadDefect = Array.isArray(item.defect) && item.defect.length > 0; if (hadDefect) { summaryMap[sectionName].totalDefectsReported++; if (isItemRectified(item)) summaryMap[sectionName].rectifiedCount++; } }); const summaryArray = Object.values(summaryMap).filter(s => s.totalDefectsReported > 0); const order = ['A', 'B', 'C', 'D', 'E', 'F', 'Others']; summaryArray.sort((a, b) => { const iA = order.indexOf(a.section), iB = order.indexOf(b.section); if (iA !== -1 && iB !== -1) return iA - iB; if (iA !== -1) return -1; if (iB !== -1) return 1; if (a.section === 'Uncategorized') return 1; if (b.section === 'Uncategorized') return -1; return String(a.section).localeCompare(String(b.section)); }); return { sectionSummary: summaryArray, sectionSummaryError: null }; } catch (err) { console.error("Summary Error:", err); return { sectionSummary: [], sectionSummaryError: "Summary calculation failed." }; } }, [allItemsFromTypes, isLoadingDetails, fetchError]);

    // --- Handlers --- (Unchanged)
    const handleNextImage = () => { const images = detailedVehicleData?.images || []; if (images.length <= 1) return; setImageLoadingInModal(true); setCurrentImageIndex(prev => (prev + 1) % images.length); };
    const handlePreviousImage = () => { const images = detailedVehicleData?.images || []; if (images.length <= 1) return; setImageLoadingInModal(true); setCurrentImageIndex(prev => (prev - 1 + images.length) % images.length); };
    const handleOpenImageModal = () => { const images = detailedVehicleData?.images || []; if (images.length > 0) { setCurrentImageIndex(0); setImageLoadingInModal(true); setImageModalVisible(true); } else { Alert.alert("No Images", "No defect location images found."); } };
    const handleOpenPdiConfirmModal = (decision) => { if (isConfirmingPdi || isLoadingDetails || !!fetchError) return; setPdiDecisionToConfirm(decision); setShowPdiConfirmModal(true); };
    const handleClosePdiConfirmModal = () => { if (isConfirmingPdi) return; setShowPdiConfirmModal(false); setPdiDecisionToConfirm(null); };

    // --- PDI Confirmation API Call --- (Unchanged)
    const handleConfirmPdiFromModal = async () => {
        if (!pdiDecisionToConfirm || !detailedVehicleData?.chassis_no) { Alert.alert("Error", "Missing decision or chassis number."); return; } const currentChassisNo = detailedVehicleData.chassis_no; console.log(`CONFIRMING PDI: ${pdiDecisionToConfirm} for ${currentChassisNo} by ${supervisorName}`); setIsConfirmingPdi(true);
        try { const token = await AsyncStorage.getItem('authToken'); if (!token) throw new Error("Token missing."); const endpoint = `${PDI_APPROVAL_BASE_ENDPOINT}/${currentChassisNo}`; console.log("API:", endpoint); const body = { approval: pdiDecisionToConfirm }; console.log("Body:", body); const response = await fetch(endpoint, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(body) }); if (!response.ok) { let errorMsg = `Submission failed (${response.status})`; try { const ed = await response.json(); errorMsg = ed.message || ed.error || `Status ${response.status}`; } catch (e) {/*ignore*/} if (response.status === 404) errorMsg += `\n(Check API endpoint/method)`; throw new Error(errorMsg); } const result = await response.json(); console.log("Success:", result); Alert.alert("Success", `Inspection status updated to ${pdiDecisionToConfirm} for ${currentChassisNo}.`); handleClosePdiConfirmModal(); navigation.goBack(); } catch (error) { console.error("API Error:", error); Alert.alert("Submission Failed", `Could not update status.\nError: ${error.message}`); } finally { setIsConfirmingPdi(false); }
    };

    // --- RENDER LOGIC ---

    // --- Loading / Error States (Render within ScreenWrapper) ---
    if (isLoadingDetails || fetchError || groupingError || sectionSummaryError || !detailedVehicleData) {
        const errorMsg = fetchError || groupingError || sectionSummaryError || (!detailedVehicleData && !isLoadingDetails ? "No inspection data found." : null);
        const title = errorMsg ? (fetchError ? "Error Loading Data" : "Data Processing Error") : "Loading...";

        return (
            <ScreenWrapper showHeader={true} showFooter={true}>
                <View style={localStyles.centeredMessageContainer}>
                    {isLoadingDetails ? (
                        <>
                            <ActivityIndicator size="large" color={COLORS.primary} />
                            <Text style={localStyles.loadingText}>{title}</Text>
                        </>
                    ) : (
                        <>
                            <Text style={commonStyles.errorText}>{title}</Text>
                            {errorMsg && <Text style={localStyles.errorDetailText}>{errorMsg}</Text>}
                            <TouchableOpacity
                                style={[commonStyles.actionButtonSecondary, { marginTop: MARGIN.large }]}
                                onPress={() => navigation.goBack()} >
                                <Text style={commonStyles.actionButtonText}>Go Back</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </ScreenWrapper>
        );
    }

    // --- Prepare Data for Render ---
     const images = detailedVehicleData.images || [];
     const currentImageData = images.length > 0 ? images[currentImageIndex] : null;
     const imageUrl = currentImageData?.file_path ? (String(currentImageData.file_path).trim().startsWith('http') ? String(currentImageData.file_path).trim() : `http://${String(currentImageData.file_path).trim()}`) : null;
     const vehicleInfoForPdiModal = { chassis_no: detailedVehicleData?.chassis_no, colour_code: detailedVehicleData?.colour_code, engine_no: detailedVehicleData?.engine_no, model: detailedVehicleData?.model, variant: detailedVehicleData?.variant };
     const originalPdiStaffName = detailedVehicleData?.inspection?.name ?? 'Unknown';


    // --- Main Content Render ---
    return (
        <ScreenWrapper
            showHeader={true}
            showFooter={true}
            enableScrollView={false} // ScrollView handled internally
            enableKeyboardAvoidingView={true}
        >
            {/* --- Scrollable Content Area --- */}
            <ScrollView
                style={localStyles.scrollView}
                contentContainerStyle={localStyles.scrollContentContainer}
                keyboardShouldPersistTaps="handled"
            >
                {/* Page Header */}
                <Text style={commonStyles.pageHeader}>Final Inspection Information</Text>

                {/* Car Info Box */}
                <View style={localStyles.carInfoBox}>
                    <Text style={localStyles.carInfo}>Chassis: <Text style={localStyles.carInfoValue}>{detailedVehicleData.chassis_no}</Text></Text>
                    <Text style={localStyles.carInfo}>Colour: <Text style={localStyles.carInfoValue}>{detailedVehicleData.colour_code}</Text></Text>
                    <Text style={localStyles.carInfo}>Engine: <Text style={localStyles.carInfoValue}>{detailedVehicleData.engine_no}</Text></Text>
                    <Text style={localStyles.carInfo}>Model: <Text style={localStyles.carInfoValue}>{detailedVehicleData.model}</Text></Text>
                    <Text style={localStyles.carInfo}>Variant: <Text style={localStyles.carInfoValue}>{detailedVehicleData.variant}</Text></Text>
                    <Text style={localStyles.carInfo}>PDI By: <Text style={localStyles.carInfoValue}>{originalPdiStaffName}</Text></Text>
                </View>

                {/* View Images Button */}
                <View style={localStyles.viewImageButtonContainer}>
                     <TouchableOpacity
                        style={[localStyles.viewImageButton, images.length === 0 && localStyles.disabledButton]}
                        onPress={handleOpenImageModal}
                        disabled={images.length === 0 || imageLoadingInModal} >
                         <Text style={localStyles.viewImageButtonText}> {images.length > 0 ? `View Defect Locations` : 'No Defect Images Available'} </Text>
                     </TouchableOpacity>
                 </View>

                 {/* Section Summary */}
                <Text style={localStyles.sectionSummaryTitle}>Section Summary (Reported Defects):</Text>
                <View style={localStyles.sectionSummaryContainer}>
                    {sectionSummary.length > 0 ? ( sectionSummary.map(summary => (
                        <View key={summary.section} style={localStyles.sectionSummaryItem}>
                            <Text style={localStyles.sectionSummaryHeader}>Section {summary.section}</Text>
                            <View style={localStyles.summaryDetailRow}>
                                <Text style={localStyles.summaryDetailLabel}>Total Defects Reported</Text><Text style={localStyles.summaryDetailSeparator}>:</Text><Text style={localStyles.summaryDetailValue}>{summary.totalDefectsReported}</Text>
                            </View>
                            <View style={localStyles.summaryDetailRow}>
                                <Text style={localStyles.summaryDetailLabel}>Items Rectified</Text><Text style={localStyles.summaryDetailSeparator}>:</Text><Text style={localStyles.summaryDetailValue}>{summary.rectifiedCount}</Text>
                            </View>
                        </View>
                     )) ) : ( <Text style={commonStyles.noDataText}>No defects were reported.</Text> )}
                </View>

                {/* Detailed List: ONLY RECTIFIED ITEMS */}
                <Text style={localStyles.itemsListTitle}>Rectified Item Details ({rectifiedItemsOnly.length}):</Text>
                {rectifiedItemsOnly.length > 0 ? ( sortedSectionsForDisplay.map(sectionName => (
                    <View key={sectionName} style={localStyles.groupedSectionContainer}>
                        <Text style={localStyles.sectionHeaderItemsList}>Section {sectionName}</Text>
                        {groupedItemsForDisplay[sectionName]?.map((item, index) => {
                            const firstDefect = item.defect?.[0];
                            const rectificationInfo = firstDefect?.rectify;
                            if (!firstDefect || !rectificationInfo) return null; // Skip if no defect/rectification info
                            return (
                                <View key={`${item.id}-${index}`} style={localStyles.summaryItem}>
                                    <Text style={localStyles.itemText}>{`${index + 1}. ${item.name || 'Unknown Item'}`}</Text>
                                    <View style={localStyles.detailsContainer}>
                                        <View style={localStyles.detailRow}><Text style={localStyles.detailLabel}>Defect Category</Text><Text style={localStyles.detailSeparator}>:</Text><Text style={localStyles.detailValue}>{firstDefect.category || 'N/A'}</Text></View>
                                        <View style={localStyles.detailRow}><Text style={localStyles.detailLabel}>Defect Type</Text><Text style={localStyles.detailSeparator}>:</Text><Text style={localStyles.detailValue}>{firstDefect.type || 'N/A'}</Text></View>
                                        <View style={localStyles.detailRow}><Text style={localStyles.detailLabel}>Rectified By</Text><Text style={localStyles.detailSeparator}>:</Text><Text style={localStyles.detailValue}>{rectificationInfo.staff_name || 'N/A'} ({rectificationInfo.staff_no || 'N/A'})</Text></View>
                                        <View style={localStyles.detailRow}><Text style={localStyles.detailLabel}>Date Rectified</Text><Text style={localStyles.detailSeparator}>:</Text><Text style={localStyles.detailValue}>{formatDate(rectificationInfo.date)}</Text></View>
                                        {rectificationInfo.remarks && (<View style={localStyles.detailRow}><Text style={localStyles.detailLabel}>Rect. Remark</Text><Text style={localStyles.detailSeparator}>:</Text><Text style={[localStyles.detailValue, localStyles.remarkText]}>{rectificationInfo.remarks}</Text></View>)}
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                 )) ) : ( <Text style={commonStyles.noDataText}>No items found marked as rectified.</Text> )}
            </ScrollView>
            {/* --- End Scrollable Content Area --- */}

            {/* --- Fixed Footer Buttons --- */}
            {/* Using local layout container, but applying common visual styles to buttons */}
            <View style={localStyles.footerActionContainer}>
                 <TouchableOpacity
                     style={[
                         commonStyles.actionButtonSecondary, // Base style from common (grey bg, padding, radius)
                         localStyles.footerButtonFlex,     // Local style for flex behavior in 3-button layout
                         (isLoadingDetails || isConfirmingPdi) && commonStyles.actionButtonDisabled // Common disabled style
                     ]}
                     onPress={() => !isConfirmingPdi && navigation.goBack()}
                     disabled={isLoadingDetails || isConfirmingPdi}
                 >
                     {/* Use common text style */}
                     <Text style={[
                         commonStyles.actionButtonText,
                         (isLoadingDetails || isConfirmingPdi) && commonStyles.actionButtonTextDisabled
                     ]}>Back</Text>
                 </TouchableOpacity>
                 <TouchableOpacity
                    style={[
                        commonStyles.actionButton,      // Base style from common (primary bg - overridden below, padding, radius)
                        localStyles.footerButtonFlex,   // Local style for flex behavior
                        localStyles.buttonActionNokStyle, // Local override for NOK specific color
                        (isLoadingDetails || isConfirmingPdi) && commonStyles.actionButtonDisabled // Common disabled style
                    ]}
                    disabled={isLoadingDetails || isConfirmingPdi}
                    onPress={() => handleOpenPdiConfirmModal('NOK')}
                 >
                     {/* Use common text style, override color */}
                     <Text style={[
                         commonStyles.actionButtonPrimaryText, // Base text style (size, weight)
                         localStyles.buttonActionTextWhite,    // Local override for white color
                         (isLoadingDetails || isConfirmingPdi) && commonStyles.actionButtonTextDisabled
                     ]}>PDI NOK</Text>
                 </TouchableOpacity>
                 <TouchableOpacity
                     style={[
                        commonStyles.actionButton,       // Base style from common (primary bg - overridden below, padding, radius)
                        localStyles.footerButtonFlex,    // Local style for flex behavior
                        localStyles.buttonActionOkStyle, // Local override for OK specific color
                        (isLoadingDetails || isConfirmingPdi) && commonStyles.actionButtonDisabled // Common disabled style
                     ]}
                     disabled={isLoadingDetails || isConfirmingPdi}
                     onPress={() => handleOpenPdiConfirmModal('OK')}
                 >
                     {/* Use common text style, override color */}
                      <Text style={[
                         commonStyles.actionButtonPrimaryText, // Base text style (size, weight)
                         localStyles.buttonActionTextWhite,    // Local override for white color
                         (isLoadingDetails || isConfirmingPdi) && commonStyles.actionButtonTextDisabled
                     ]}>PDI OK</Text>
                 </TouchableOpacity>
            </View>
             {/* --- End Fixed Footer Buttons --- */}

            {/* --- Modals --- */}
            {imageModalVisible && currentImageData && imageUrl && (
                 <Modal
                    visible={imageModalVisible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => { if (!imageLoadingInModal) { setImageModalVisible(false); setImageLoadingInModal(false); } }} >
                   <View style={localStyles.modalContainer}>
                        <Text style={localStyles.modalHeader}>Defect Location Images</Text>
                        <Text style={localStyles.modalSubHeader}>{`Image ${currentImageIndex + 1} of ${images.length}${currentImageData.description ? `: ${currentImageData.description}` : ''}`}</Text>
                        <View style={localStyles.imageSelector}>
                            <TouchableOpacity onPress={handlePreviousImage} style={[localStyles.imageButton, (images.length <= 1 || imageLoadingInModal) && localStyles.disabledButton]} disabled={images.length <= 1 || imageLoadingInModal}><Text style={localStyles.imageButtonText}>Prev</Text></TouchableOpacity>
                            <TouchableOpacity onPress={handleNextImage} style={[localStyles.imageButton, (images.length <= 1 || imageLoadingInModal) && localStyles.disabledButton]} disabled={images.length <= 1 || imageLoadingInModal}><Text style={localStyles.imageButtonText}>Next</Text></TouchableOpacity>
                        </View>
                        <View style={localStyles.imageContainer}>
                            {imageLoadingInModal && <ActivityIndicator size="large" color={COLORS.primary} style={localStyles.imageLoadingIndicator}/>}
                            <Image source={{ uri: imageUrl }} style={[localStyles.image, imageLoadingInModal && localStyles.imageHidden]} onLoadStart={() => setImageLoadingInModal(true)} onLoadEnd={() => setImageLoadingInModal(false)} onError={(e) => { console.error("Image Load Error:", e.nativeEvent.error, "URL:", imageUrl); Alert.alert("Image Load Error", `Failed to load image.`); setImageLoadingInModal(false); }} resizeMode="contain" />
                        </View>
                        <TouchableOpacity style={localStyles.closeButton} onPress={() => { if (!imageLoadingInModal) { setImageModalVisible(false); setImageLoadingInModal(false); } }}><Text style={localStyles.closeText}>Close Viewer</Text></TouchableOpacity>
                   </View>
                </Modal>
            )}

            <InspectionConfirm
                visible={showPdiConfirmModal}
                onClose={handleClosePdiConfirmModal}
                onConfirm={handleConfirmPdiFromModal}
                decision={pdiDecisionToConfirm}
                vehicleData={vehicleInfoForPdiModal}
                pdiStaffName={supervisorName}
                pdiPerformerName={originalPdiStaffName}
                rectifiedItemsCount={rectifiedItemsOnly.length}
                isSubmitting={isConfirmingPdi}
            />
             {/* --- End Modals --- */}

        </ScreenWrapper>
    );
} // End of Component


// --- Local Styles (Generalized with Theme Constants, using Common Styles for Buttons) ---
const localStyles = StyleSheet.create({
    // --- Core & Layout Styles ---
    scrollView: { flex: 1, },
    scrollContentContainer: { paddingHorizontal: PADDING.medium, paddingTop: PADDING.medium, paddingBottom: PADDING.large, },
    centeredMessageContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: PADDING.large, },
    loadingText: { marginTop: MARGIN.medium, fontSize: FONT_SIZES.medium, color: COLORS.grey, },
    // --- Page Specific Content ---
    carInfoBox: { backgroundColor: COLORS.white, padding: PADDING.large, borderRadius: 8, marginBottom: MARGIN.large, borderWidth: 1, borderColor: COLORS.border, shadowColor: COLORS.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3.00, elevation: 2, },
    carInfo: { fontSize: FONT_SIZES.medium, marginBottom: MARGIN.small, color: COLORS.secondary, },
    carInfoValue: { fontWeight: '600', color: COLORS.secondary, },
    viewImageButtonContainer: { alignItems: 'center', marginVertical: MARGIN.medium, },
    viewImageButton: { backgroundColor: COLORS.primaryLight, paddingVertical: PADDING.small, paddingHorizontal: PADDING.large, borderRadius: 6, alignItems: 'center', flexDirection: 'row', minWidth: 220, justifyContent: 'center', minHeight: 45, elevation: 2, shadowColor: COLORS.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, },
    viewImageButtonText: { color: COLORS.secondary, fontSize: FONT_SIZES.medium, fontWeight: 'bold', },
    sectionSummaryTitle: { fontSize: FONT_SIZES.large, fontWeight: '600', marginTop: MARGIN.large, marginBottom: MARGIN.small, color: COLORS.secondary, borderBottomWidth: 1, borderBottomColor: COLORS.divider, paddingBottom: PADDING.xsmall, },
    sectionSummaryContainer: { marginVertical: MARGIN.xsmall, padding: PADDING.medium, backgroundColor: COLORS.veryLightGrey, borderRadius: 8, borderWidth: 1, borderColor: COLORS.lightGrey, marginBottom: MARGIN.large, },
    sectionSummaryItem: { marginBottom: MARGIN.small, paddingBottom: MARGIN.small, borderBottomWidth: 1, borderBottomColor: COLORS.lightGrey, },
    sectionSummaryHeader: { fontSize: FONT_SIZES.medium, fontWeight: 'bold', color: COLORS.primary, marginBottom: MARGIN.small, },
    summaryDetailRow: { flexDirection: 'row', marginBottom: MARGIN.xsmall, alignItems: 'flex-start', },
    summaryDetailLabel: { fontSize: FONT_SIZES.small, color: COLORS.grey, fontWeight: '600', width: 160, },
    summaryDetailSeparator: { fontSize: FONT_SIZES.small, color: COLORS.grey, fontWeight: '600', marginHorizontal: MARGIN.xsmall / 2, },
    summaryDetailValue: { flex: 1, fontSize: FONT_SIZES.small, color: COLORS.secondary, lineHeight: FONT_SIZES.small * 1.3, fontWeight: 'bold' },
    itemsListTitle: { fontSize: FONT_SIZES.large, fontWeight: '600', marginTop: MARGIN.medium, marginBottom: MARGIN.small, color: COLORS.secondary, borderBottomWidth: 1, borderBottomColor: COLORS.divider, paddingBottom: PADDING.xsmall, },
    groupedSectionContainer: { marginBottom: MARGIN.medium, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.white, overflow: 'hidden', shadowColor: COLORS.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2.50, elevation: 1, },
    sectionHeaderItemsList: { fontSize: FONT_SIZES.medium, fontWeight: 'bold', paddingVertical: PADDING.small, paddingHorizontal: PADDING.medium, backgroundColor: COLORS.success, color: COLORS.white, },
    summaryItem: { backgroundColor: COLORS.white, paddingVertical: PADDING.medium, paddingHorizontal: PADDING.medium, borderBottomWidth: 1, borderBottomColor: COLORS.veryLightGrey, },
    itemText: { fontSize: FONT_SIZES.medium, fontWeight: 'bold', color: COLORS.secondary, marginBottom: MARGIN.small, },
    detailsContainer: { marginLeft: MARGIN.small, paddingLeft: MARGIN.small, borderLeftWidth: 2, borderLeftColor: COLORS.veryLightGrey, },
    detailRow: { flexDirection: 'row', marginBottom: MARGIN.xsmall, alignItems: 'flex-start', },
    detailLabel: { fontSize: FONT_SIZES.xsmall, color: COLORS.grey, fontWeight: '600', width: 100, },
    detailSeparator: { fontSize: FONT_SIZES.xsmall, color: COLORS.grey, fontWeight: '600', marginHorizontal: MARGIN.xsmall / 2, },
    detailValue: { flex: 1, fontSize: FONT_SIZES.xsmall, color: COLORS.secondary, lineHeight: FONT_SIZES.xsmall * 1.3, },
    remarkText: { fontStyle: 'italic', color: COLORS.grey, backgroundColor: COLORS.veryLightGrey, padding: PADDING.xsmall, borderRadius: 3 },
    // --- Error Text ---
    errorDetailText: { color: COLORS.danger, fontSize: FONT_SIZES.small, textAlign: 'center', lineHeight: FONT_SIZES.small * 1.4, },
    // --- Modal Styles ---
    modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.9)', padding: PADDING.medium, },
    modalHeader: { fontSize: FONT_SIZES.xlarge, fontWeight: 'bold', color: COLORS.white, marginBottom: MARGIN.small, marginTop: MARGIN.medium, },
    modalSubHeader: { fontSize: FONT_SIZES.medium, color: COLORS.lightGrey, marginBottom: MARGIN.large, textAlign: 'center', paddingHorizontal: PADDING.medium, },
    imageSelector: { flexDirection: 'row', justifyContent: 'space-between', width: '90%', marginBottom: MARGIN.large, },
    imageButton: { backgroundColor: COLORS.veryLightGrey, paddingVertical: PADDING.small, paddingHorizontal: PADDING.large, borderRadius: 6, elevation: 2, shadowColor: COLORS.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, },
    imageButtonText: { fontWeight: 'bold', color: COLORS.secondary, fontSize: FONT_SIZES.medium, },
    imageContainer: { width: IMAGE_CONTAINER_WIDTH, height: IMAGE_CONTAINER_HEIGHT, position: 'relative', justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.black, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.grey, marginBottom: MARGIN.small, },
    imageLoadingIndicator: { position: 'absolute', },
    image: { width: '100%', height: '100%', },
    imageHidden: { opacity: 0, },
    closeButton: { marginTop: MARGIN.large, backgroundColor: COLORS.danger, paddingVertical: PADDING.medium, paddingHorizontal: PADDING.xlarge, borderRadius: 6, elevation: 2, shadowColor: COLORS.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, },
    closeText: { fontWeight: 'bold', color: COLORS.white, fontSize: FONT_SIZES.medium, },
    disabledButton: { opacity: 0.5, backgroundColor: COLORS.disabled, }, // Shared disabled for image buttons

    // --- Styles for Fixed Footer Action Buttons (3 Buttons, using Common Styles) ---
    footerActionContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between', // Space out buttons
        paddingVertical: PADDING.small, // Reduced padding for 3 buttons
        paddingHorizontal: PADDING.small, // Reduced padding for 3 buttons
        borderTopWidth: 1,
        borderTopColor: 'transparent', // Use theme border color
        backgroundColor: 'transparent', // Use theme white
    },
    // Added style to manage flex distribution for 3 buttons
    footerButtonFlex: {
        flex: 1, // Distribute space equally
        marginHorizontal: MARGIN.xsmall, // Add small gap between buttons
        // Height, Alignment, Padding, Radius are inherited from commonStyles.actionButton/Secondary
    },
    // Specific overrides for NOK/OK colors and text
    buttonActionNokStyle: { // Only need to override background
        backgroundColor: COLORS.danger,
        // Other visual styles come from commonStyles.actionButton applied in JSX
    },
    buttonActionOkStyle: { // Only need to override background
        backgroundColor: COLORS.success,
         // Other visual styles come from commonStyles.actionButton applied in JSX
    },
    buttonActionTextWhite: { // Override text color for NOK/OK buttons
        color: COLORS.white,
        // Size, weight come from commonStyles.actionButtonPrimaryText applied in JSX
    },
});