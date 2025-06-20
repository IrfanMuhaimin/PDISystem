// screens/RectifySummaryPage.js
import React, { useContext, useState, useEffect, useMemo } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    ActivityIndicator, Platform, Alert 
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RectifyContext } from '../context/RectifyContext';
import { jwtDecode } from 'jwt-decode'; // Keep if used
import ScreenWrapper from '../styles/flowstudiosbg.js';
import commonStyles, { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/commonStyles.js';

const API_BASE_URL = 'http://pdi.flowstudios.com.my/api';
const USERS_API_ENDPOINT = `${API_BASE_URL}/users`;
const RECTIFY_API_ENDPOINT = `${API_BASE_URL}/jobcards/rectify`;

const sectionNumberToNameMap = { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'F', 7: 'Others', };
const getSectionLetter = (sectionNumberInput) => {
    const sectionNumber = parseInt(sectionNumberInput, 10);
    if (!isNaN(sectionNumber) && sectionNumberToNameMap.hasOwnProperty(sectionNumber)) { return sectionNumberToNameMap[sectionNumber]; }
    console.warn(`[getSectionLetter - Summary] Invalid section number: "${sectionNumberInput}".`);
    return 'Others';
};

export default function RectifySummaryPage({ navigation }) {
    const { rectifyItems, carInfo, clearRectifyData } = useContext(RectifyContext);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedSupervisor, setSelectedSupervisor] = useState(null);
    const [supervisors, setSupervisors] = useState([]);
    const [isLoadingSupervisors, setIsLoadingSupervisors] = useState(true);
    const [supervisorFetchError, setSupervisorFetchError] = useState(null);
    const [validationError, setValidationError] = useState(null);
    const [submitError, setSubmitError] = useState(null);

    useEffect(() => {
        if (isSubmitting) { setValidationError(null); return; } let isMounted = true; setSupervisorFetchError(null);
        const fetchAndFilterSupervisors = async () => { if (isMounted) { setIsLoadingSupervisors(true); setSupervisors([]); setSupervisorFetchError(null); } else { return; } try { const token = await AsyncStorage.getItem('authToken'); if (!token) throw new Error("Token missing."); const response = await fetch(USERS_API_ENDPOINT, { method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } }); const status = response.status; console.log(`[SupervisorFetch] Status: ${status}`); if (!response.ok) { const txt = await response.text(); console.error(`[SupervisorFetch] Error ${status}:`, txt); if (status === 403) throw new Error("Permission denied (403)."); throw new Error(`Fetch users failed (${status})`); } const data = await response.json(); if (!Array.isArray(data)) throw new Error("Invalid data format."); const filtered = data.filter(u => u?.type === 'Supervisor'); console.log(`[SupervisorFetch] Found ${filtered.length} supervisors.`); if (isMounted) { setSupervisors(filtered); setSupervisorFetchError(null); } } catch (error) { if (isMounted) { console.error("[SupervisorFetch] Error:", error); setSupervisorFetchError(error.message || 'Load failed.'); setSupervisors([]); } } finally { if (isMounted) { setIsLoadingSupervisors(false); console.log("[SupervisorFetch] Loading set false."); } } }; fetchAndFilterSupervisors();
        return () => { isMounted = false; };
    }, [isSubmitting]);

    // Validation effect remains the same
    useEffect(() => { if (isSubmitting) return; const carOk = !!carInfo; const itemsOk = Array.isArray(rectifyItems); let errorMsg = null; if (!carOk) errorMsg = "Required 'Car Info' not found."; else if (!itemsOk) errorMsg = "Required 'Rectification Items List' not found."; setValidationError(errorMsg); }, [carInfo, rectifyItems, isSubmitting]);

    // Grouping memo remains the same (logic is correct)
    const { sectionSummary, groupedRectifiedItems, sortedRectifiedSections, calculationError } = useMemo(() => {
        if (!Array.isArray(rectifyItems)) { return { sectionSummary: [], groupedRectifiedItems: {}, sortedRectifiedSections: [], calculationError: "Items missing" }; }
        try { const allItemsSummaryMap = {}; rectifyItems.forEach(item => { if (!item?.id) return; const sectionNumber = item.section; let sectionKey = 'Uncategorized'; if (sectionNumber !== null && sectionNumber !== undefined) { const parsedNumber = parseInt(sectionNumber, 10); if (!isNaN(parsedNumber)) sectionKey = getSectionLetter(parsedNumber); } if (!allItemsSummaryMap[sectionKey]) allItemsSummaryMap[sectionKey] = { section: sectionKey, total: 0, rectified: 0 }; allItemsSummaryMap[sectionKey].total++; if (item.rectified) allItemsSummaryMap[sectionKey].rectified++; }); const groupedItems = {}; rectifyItems.filter(item => item?.id && item.rectified).forEach(item => { const sectionNumber = item.section; let sectionKey = 'Uncategorized'; if (sectionNumber !== null && sectionNumber !== undefined) { const parsedNumber = parseInt(sectionNumber, 10); if (!isNaN(parsedNumber)) { sectionKey = getSectionLetter(parsedNumber); } else { console.warn(`Invalid section number for rectified item ${item.id}: ${sectionNumber}`); } } if (!groupedItems[sectionKey]) groupedItems[sectionKey] = []; groupedItems[sectionKey].push(item); }); const summaryOrder = ['A', 'B', 'C', 'D', 'E', 'F', 'Others', 'Uncategorized']; const summaryArray = Object.values(allItemsSummaryMap).sort((a, b) => { const iA = summaryOrder.indexOf(a.section), iB = summaryOrder.indexOf(b.section); return (iA === -1 ? 99 : iA) - (iB === -1 ? 99 : iB); }); const sortedSections = Object.keys(groupedItems).sort((a, b) => { const iA = summaryOrder.indexOf(a), iB = summaryOrder.indexOf(b); return (iA === -1 ? 99 : iA) - (iB === -1 ? 99 : iB); }); return { sectionSummary: summaryArray, groupedRectifiedItems: groupedItems, sortedRectifiedSections: sortedSections, calculationError: null }; } catch (error) { console.error("Grouping error:", error); return { sectionSummary: [], groupedRectifiedItems: {}, sortedRectifiedSections: [], calculationError: "Calculation failed" }; }
    }, [rectifyItems]);

    // formatDate helper remains the same
    const formatDate = (date) => { if (!date) return 'N/A'; try { const dateObj = new Date(date); return isNaN(dateObj.getTime()) ? 'Invalid Date' : dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch (error) { return 'Error Date'; } };

    // handleFinishRectification remains the same (API logic is specific)
    const handleFinishRectification = async () => {
        if (!carInfo?.chassis_no || !selectedSupervisor) { Alert.alert('Error', !carInfo?.chassis_no ? 'Missing Chassis Number.' : 'Please select supervisor.'); return; } if (typeof groupedRectifiedItems !== 'object' || !groupedRectifiedItems) { Alert.alert('Error', 'Internal error: Data invalid.'); return; } let flatRectifiedItems = []; try { flatRectifiedItems = Object.values(groupedRectifiedItems).flat(); } catch (error) { Alert.alert('Error', 'Failed to prepare items.'); return; } setIsSubmitting(true); setSubmitError(null); console.log("Submitting rectification..."); try { const token = await AsyncStorage.getItem('authToken'); if (!token) throw new Error("Token missing."); const apiPayload = { chassis_no: carInfo.chassis_no, supervisor_id: selectedSupervisor, rectify_items: flatRectifiedItems.map(item => { const defectInfo = item.allDefects?.[0]; return { id: item.id, staff_name: item.rectifierName || null, staff_no: item.rectifierNo || null, date: item.rectificationDate ? new Date(item.rectificationDate).toISOString().split('T')[0] : null, remarks: item.remark || null, closed: item.closed || false, defect_id: defectInfo?.id || null }; }), }; console.log("Payload:", JSON.stringify(apiPayload, null, 2)); const response = await fetch(RECTIFY_API_ENDPOINT, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json', 'Content-Type': 'application/json', }, body: JSON.stringify(apiPayload), }); console.log(`Submit Status: ${response.status}`); if (!response.ok) { const errorBody = await response.text(); let parsedError = { message: `Failed (${response.status})` }; try { parsedError = JSON.parse(errorBody) } catch (e) { } console.error("Submit Error:", errorBody); const errorMsg = parsedError.message || `Failed. Status: ${response.status}.`; if (response.status === 422 && parsedError.errors) { throw new Error(`Failed:\n${Object.values(parsedError.errors).flat().join('\n')}`); } throw new Error(errorMsg); } const data = await response.json(); console.log("Submit Success:", data); Alert.alert('Success', 'Rectification data submitted.'); clearRectifyData(); navigation.reset({ index: 0, routes: [{ name: 'Home' }], }); } catch (error) { console.error("Submit Error:", error); Alert.alert('Error Submitting', error.message || 'Unexpected error.'); setSubmitError(error.message); setIsSubmitting(false); }
    };

    // --- Render Component JSX ---

    // Use ScreenWrapper for base layout
    return (
        <ScreenWrapper
            showHeader={true}
            showFooter={true}
            enableScrollView={false} // Internal ScrollView used
            enableKeyboardAvoidingView={Platform.OS === 'ios'}
        >
            {/* --- Scrollable Content Area --- */}
            <ScrollView
                style={localStyles.scrollView}
                contentContainerStyle={localStyles.scrollContentContainer}
                keyboardShouldPersistTaps="handled"
            >
                {/* Page Header */}
                <Text style={commonStyles.pageHeader}>Rectification Summary</Text>

                {/* Display validation errors first */}
                {validationError && !isSubmitting && (
                    <View style={localStyles.errorBox}>
                        <Text style={commonStyles.errorText}>{validationError}</Text>
                    </View>
                )}
                {calculationError && !isSubmitting && (
                    <View style={localStyles.errorBox}>
                        <Text style={commonStyles.errorText}>Processing Error: {calculationError}</Text>
                    </View>
                )}
                {submitError && !isSubmitting && (
                    <View style={localStyles.errorBox}>
                        <Text style={commonStyles.errorText}>Submit Error: {submitError}</Text>
                    </View>
                )}

                {/* Only show content if no validation/calculation errors */}
                {!validationError && !calculationError && (
                    <>
                        {/* Car Info */}
                        {carInfo ? (
                            <View style={localStyles.carInfoBox}>
                                <Text style={localStyles.carInfo}>Chassis: <Text style={localStyles.carInfoValue}>{carInfo.chassis_no}</Text></Text>
                                <Text style={localStyles.carInfo}>Model: <Text style={localStyles.carInfoValue}>{carInfo.model}</Text></Text>
                            </View>
                        ) : (
                            <ActivityIndicator color={COLORS.primary} style={{ marginVertical: MARGIN.large }} />
                        )}

                        {/* Supervisor Picker */}
                        <Text style={localStyles.label}>Checked By (Supervisor):</Text>
                        <View style={[localStyles.pickerContainer, (isLoadingSupervisors || !!supervisorFetchError || supervisors.length === 0) && localStyles.pickerContainerDisabled]}>
                            {isLoadingSupervisors ? (
                                <View style={localStyles.loadingOverlay}><ActivityIndicator size="small" color={COLORS.primary} /><Text style={localStyles.loadingText}>Loading...</Text></View>
                            ) : supervisorFetchError ? (
                                <Text style={[localStyles.pickerPlaceholder, commonStyles.errorText]}>Error: {supervisorFetchError}</Text>
                            ) : supervisors.length === 0 ? (
                                <Text style={localStyles.pickerPlaceholder}>No supervisors found</Text>
                            ) : (
                                <Picker
                                    selectedValue={selectedSupervisor}
                                    onValueChange={(itemValue) => setSelectedSupervisor(itemValue)}
                                    style={localStyles.picker}
                                    enabled={!isSubmitting && supervisors.length > 0}
                                    mode="dropdown" // Or "dialog"
                                    prompt="Select Supervisor" // Android only
                                >
                                    {/* Placeholder Item */}
                                    <Picker.Item label="Select Supervisor" value={null} style={localStyles.pickerPlaceholderItem} enabled={false} />
                                    {/* Supervisor List */}
                                    {supervisors.map((sv) => (<Picker.Item key={sv.id} label={`${sv.name}`} value={sv.id} />))}
                                </Picker>
                            )}
                        </View>

                        {/* Section Summary */}
                        <Text style={localStyles.label}>Section Summary (Reported Defects):</Text>
                        <View style={localStyles.sectionSummaryContainer}>
                            {sectionSummary.length > 0 ? (
                                sectionSummary.map(summary => (
                                    <View key={summary.section} style={localStyles.sectionSummaryItem}>
                                        <Text style={localStyles.sectionSummaryHeader}>Section {summary.section}</Text>
                                        <View style={localStyles.detailRow}><Text style={localStyles.detailLabel}>Total Defects</Text><Text style={localStyles.detailSeparator}>:</Text><Text style={localStyles.detailValue}>{summary.total}</Text></View>
                                        <View style={localStyles.detailRow}><Text style={localStyles.detailLabel}>Items Rectified</Text><Text style={localStyles.detailSeparator}>:</Text><Text style={localStyles.detailValue}>{summary.rectified}</Text></View>
                                    </View>
                                ))
                            ) : (<Text style={commonStyles.noDataText}>No defects reported.</Text>)}
                        </View>

                        {/* Rectified Items List */}
                        <Text style={localStyles.label}>Items Marked as Rectified ({Object.values(groupedRectifiedItems || {}).flat().length}):</Text>
                        {sortedRectifiedSections.length > 0 ? (
                            sortedRectifiedSections.map(sectionKey => (
                                <View key={sectionKey} style={localStyles.groupedSectionContainer}>
                                    <Text style={localStyles.sectionHeader}>Section {sectionKey}</Text>
                                    {Array.isArray(groupedRectifiedItems?.[sectionKey]) ? groupedRectifiedItems[sectionKey].map((item, index) => {
                                        if (!item || item.id === undefined) return null;
                                        const defectInfo = item.allDefects?.[0];
                                        return (
                                            <View key={`${item.id}-${index}`} style={localStyles.summaryItem}>
                                                <Text style={localStyles.itemText}>{`${index + 1}. ${item.name || 'Unknown Item'}`}</Text>
                                                <View style={localStyles.detailsContainer}>
                                                    {defectInfo && (<>
                                                        <View style={localStyles.detailRow}><Text style={localStyles.detailLabel}>Defect Category</Text><Text style={localStyles.detailSeparator}>:</Text><Text style={localStyles.detailValue}>{defectInfo.category || 'N/A'}</Text></View>
                                                        <View style={localStyles.detailRow}><Text style={localStyles.detailLabel}>Defect Type</Text><Text style={localStyles.detailSeparator}>:</Text><Text style={localStyles.detailValue}>{defectInfo.type || 'N/A'}</Text></View>
                                                        <View style={localStyles.detailRow}><Text style={localStyles.detailLabel}>Defect Severity</Text><Text style={localStyles.detailSeparator}>:</Text><Text style={localStyles.detailValue}>{defectInfo.severity || 'N/A'}</Text></View>
                                                    </>)}
                                                    <View style={localStyles.detailRow}><Text style={localStyles.detailLabel}>Rectified By</Text><Text style={localStyles.detailSeparator}>:</Text><Text style={localStyles.detailValue}>{item.rectifierName || 'N/A'} ({item.rectifierNo || 'N/A'})</Text></View>
                                                    {defectInfo?.severity === 'Minor' && (
                                                        <View style={localStyles.detailRow}>
                                                            <Text style={localStyles.detailLabel}>Closed</Text>
                                                            <Text style={localStyles.detailSeparator}>:</Text>
                                                            <Text style={localStyles.detailValue}>
                                                                {item.closed === true ? 'Yes' : 'No'}
                                                            </Text>
                                                        </View>
                                                    )}<View style={localStyles.detailRow}><Text style={localStyles.detailLabel}>Date Rectified</Text><Text style={localStyles.detailSeparator}>:</Text><Text style={localStyles.detailValue}>{formatDate(item.rectificationDate)}</Text></View>
                                                    {item.remark && (<View style={localStyles.detailRow}><Text style={localStyles.detailLabel}>Remark</Text><Text style={localStyles.detailSeparator}>:</Text><Text style={[localStyles.detailValue, localStyles.remarkText]}>{item.remark}</Text></View>)}
                                                </View>
                                            </View>
                                        );
                                    }) : <Text style={commonStyles.noDataText}>Error displaying items.</Text>}
                                </View>
                            ))
                        ) : (<Text style={commonStyles.noDataText}>No items marked as rectified.</Text>)}
                    </>
                )}
            </ScrollView>
            {/* --- End Scrollable Content --- */}


            {/* --- Fixed Footer Buttons --- */}
            <View style={commonStyles.footerActionContainer}>
                <TouchableOpacity
                    style={[
                        commonStyles.actionButtonSecondary, // Common style for Back
                        isSubmitting && commonStyles.actionButtonDisabled // Common disabled style
                    ]}
                    onPress={() => navigation.goBack()}
                    disabled={isSubmitting} >
                    <Text style={[
                        commonStyles.actionButtonText,
                        isSubmitting && commonStyles.actionButtonTextDisabled
                    ]}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        commonStyles.actionButton, // Common style for primary action
                        // Complex disabled condition
                        (isSubmitting || isLoadingSupervisors || !!supervisorFetchError || !selectedSupervisor || supervisors.length === 0 || !!calculationError || !!validationError) && commonStyles.actionButtonDisabled
                    ]}
                    onPress={handleFinishRectification}
                    disabled={isSubmitting || isLoadingSupervisors || !!supervisorFetchError || !selectedSupervisor || supervisors.length === 0 || !!calculationError || !!validationError} >
                    {isSubmitting
                        ? <ActivityIndicator size="small" color={COLORS.white} />
                        : <Text style={[
                            commonStyles.actionButtonPrimaryText,
                            // Also disable text color if button is disabled
                            (isLoadingSupervisors || !!supervisorFetchError || !selectedSupervisor || supervisors.length === 0 || !!calculationError || !!validationError) && commonStyles.actionButtonTextDisabled
                        ]}>Finish</Text>
                    }
                </TouchableOpacity>
            </View>

        </ScreenWrapper>
    );
}

const localStyles = StyleSheet.create({
    scrollView: {
        flex: 1,
    },
    scrollContentContainer: {
        paddingHorizontal: PADDING.medium,
        paddingTop: PADDING.small,
        paddingBottom: PADDING.large,
    },
    centeredMessage: {
        flex: 1, justifyContent: 'center', alignItems: 'center', padding: PADDING.large,
    },

    carInfoBox: {
        backgroundColor: COLORS.white,
        paddingVertical: PADDING.small,
        paddingHorizontal: PADDING.medium,
        borderRadius: 8,
        marginBottom: MARGIN.medium,
        borderColor: COLORS.border,
    },
    carInfo: {
        fontSize: FONT_SIZES.medium,
        marginBottom: MARGIN.xsmall,
        textAlign: 'center',
        color: COLORS.secondary,
    },
     carInfoValue: { 
        fontWeight: '600',
        color: COLORS.secondary,
    },
    label: {
        fontSize: FONT_SIZES.large,
        fontWeight: '600',
        marginTop: MARGIN.medium,
        marginBottom: MARGIN.small,
        color: COLORS.secondary,
    },
    pickerContainer: {
        minHeight: 50,
        borderWidth: 1,
        borderColor: COLORS.lightGrey,
        borderRadius: 8,
        justifyContent: 'center',
        marginBottom: MARGIN.medium,
        backgroundColor: COLORS.white,
        overflow: 'hidden', 
    },
    pickerContainerDisabled: {
        backgroundColor: COLORS.veryLightGrey, 
        borderColor: COLORS.lightGrey, 
    },
    loadingOverlay: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 50, 
    },
    loadingText: {
        marginLeft: MARGIN.small,
        color: COLORS.grey,
        fontSize: FONT_SIZES.medium,
    },
    picker: {
        height: 55,
        width: '100%',
        color: COLORS.secondary,
        backgroundColor: 'transparent',
        marginBottom: MARGIN.xsmall,
    },
    pickerPlaceholder: {
        fontSize: FONT_SIZES.medium,
        color: COLORS.grey,
        textAlign: 'left',
        paddingVertical: PADDING.medium,
        paddingHorizontal: PADDING.medium,
    },
    pickerPlaceholderItem: { 
        color: COLORS.grey,
        fontSize: FONT_SIZES.medium,
    },
    // --- Summaries & Lists ---
    sectionSummaryContainer: {
        marginVertical: MARGIN.small,
        padding: PADDING.medium,
        backgroundColor: COLORS.veryLightGrey,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    sectionSummaryItem: {
        marginBottom: MARGIN.small,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.divider,
    },
    sectionSummaryHeader: {
        fontSize: FONT_SIZES.medium,
        fontWeight: 'bold',
        color: COLORS.secondary,
        marginBottom: MARGIN.small,
    },
    groupedSectionContainer: {
        marginBottom: MARGIN.medium,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        backgroundColor: COLORS.white,
        overflow: 'hidden',
    },
    sectionHeader: {
        fontSize: FONT_SIZES.medium,
        fontWeight: 'bold',
        paddingVertical: PADDING.small,
        paddingHorizontal: PADDING.medium,
        backgroundColor: COLORS.success,
        color: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    summaryItem: {
        backgroundColor: COLORS.white,
        paddingVertical: PADDING.medium,
        paddingHorizontal: PADDING.medium,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.divider,
    },
    itemText: {
        fontSize: FONT_SIZES.medium,
        fontWeight: 'bold',
        color: COLORS.secondary,
        marginBottom: MARGIN.small,
    },
    detailsContainer: {
        marginLeft: MARGIN.xsmall,
    },
    detailRow: {
        flexDirection: 'row',
        marginBottom: MARGIN.xsmall,
        alignItems: 'flex-start',
    },
    detailLabel: {
        fontSize: FONT_SIZES.xsmall,
        color: COLORS.grey,
        fontWeight: '600',
        width: 95,
    },
    detailSeparator: {
        fontSize: FONT_SIZES.xsmall,
        color: COLORS.grey,
        fontWeight: '600',
        marginHorizontal: MARGIN.xsmall,
    },
    detailValue: {
        flex: 1,
        fontSize: FONT_SIZES.xsmall,
        color: COLORS.secondary,
        lineHeight: FONT_SIZES.xsmall * 1.3,
    },
    remarkText: {
        fontStyle: 'italic',
        color: COLORS.grey,
        backgroundColor: COLORS.veryLightGrey,
        paddingHorizontal: PADDING.xsmall,
        borderRadius: 3,
    },
    // --- Error Box ---
    errorBox: {
        borderColor: COLORS.danger,
        borderWidth: 1,
        borderRadius: 8,
        padding: PADDING.medium,
        marginVertical: MARGIN.medium,
    },
    errorDetailText: {
        color: COLORS.danger,
        fontSize: FONT_SIZES.small,
        marginTop: MARGIN.xsmall,
    },
});