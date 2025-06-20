// screens/FinalInspectionListPage.js
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    ActivityIndicator, Platform, TextInput, FlatList, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenWrapper from '../styles/flowstudiosbg.js';
import commonStyles, { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/commonStyles';
import DateTimePicker from '@react-native-community/datetimepicker';

//Date Formatting
const formatDateToDDMMYYYY = (date) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        return 'N/A';
    }
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

const formatDateTimeToDDMMYYYYHHMM = (dateTimeString) => {
    if (!dateTimeString) return '-';
    try {
        const date = new Date(dateTimeString);
        if (isNaN(date.getTime())) return '-';

        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (error) {
        console.error("Error formatting date-time:", dateTimeString, error);
        return '-';
    }
};

//Configuration for Tabs
const TAB_CONFIG = {
    all: {
        label: 'Overview',
        type: 'summary',
        endpoint: 'http://pdi.flowstudios.com.my/api/jobcards/summary',
    },
    check: {
        label: 'To Check',
        type: 'list',
        endpoint: 'http://pdi.flowstudios.com.my/api/jobcards/filter/check',
        requiresDate: true,
        dateQueryParam: 'date',
    },
    completed: {
        label: 'Completed',
        type: 'list',
        endpoint: 'http://pdi.flowstudios.com.my/api/jobcards/filter/pdi',
        requiresDate: true,
        dateQueryParam: 'date',
    },
};

export default function FinalInspectionListPage({ navigation }) {
    // Common State
    const [activeTab, setActiveTab] = useState('all');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // State for Summary View
    const [summaryData, setSummaryData] = useState({
        noPdi: null, inRepair: null, okCompletedToday: null,
        okToCheck: null, rectifiedCompletedToday: null, rectifiedToCheck: null,
    });

    // State for List Views
    const [searchQuery, setSearchQuery] = useState('');
    const [inspections, setInspections] = useState([]);
    const [filteredInspections, setFilteredInspections] = useState([]);

    // State for Date Filters & Pickers
    const [checkTabDate, setCheckTabDate] = useState(new Date());
    const [completedTabDate, setCompletedTabDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [datePickerTargetTab, setDatePickerTargetTab] = useState(null);

    // Auth Token
    const getAuthToken = useCallback(async () => {
        try {
            const token = await AsyncStorage.getItem('authToken');
            if (!token) {
                console.warn("Auth token not found.");
                throw new Error("Authentication token not found.");
            }
            return token;
        } catch (error) {
            console.error('Error retrieving authToken:', error);
            throw error;
        }
    }, []);

    // Data Fetching Logic
    const fetchDataForActiveTab = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        const currentTabConfig = TAB_CONFIG[activeTab];

        if (currentTabConfig.type === 'summary') {
            setInspections([]); setFilteredInspections([]);
        } else {
            setSummaryData({ noPdi: null, inRepair: null, okCompletedToday: null, okToCheck: null, rectifiedCompletedToday: null, rectifiedToCheck: null });
        }

        try {
            const authToken = await getAuthToken();
            let url = currentTabConfig.endpoint;
            const queryParams = new URLSearchParams();

            if (currentTabConfig.type === 'summary') {
                console.log(`Fetching Summary: ${url}`);
            } else if (currentTabConfig.type === 'list') {
                if (currentTabConfig.requiresDate && currentTabConfig.dateQueryParam) {
                    let dateToUse;
                    if (activeTab === 'check') {
                        dateToUse = checkTabDate;
                    } else if (activeTab === 'completed') {
                        dateToUse = completedTabDate;
                    }

                    if (!dateToUse) {
                        setError(`Please select a date for '${currentTabConfig.label}' filter.`);
                        setIsLoading(false); setInspections([]); setFilteredInspections([]);
                        return;
                    }
                    const year = dateToUse.getFullYear();
                    const month = (dateToUse.getMonth() + 1).toString().padStart(2, '0');
                    const day = dateToUse.getDate().toString().padStart(2, '0');
                    queryParams.append(currentTabConfig.dateQueryParam, `${year}-${month}-${day}`);
                }
                if (queryParams.toString()) {
                    url = `${url}?${queryParams.toString()}`;
                }
                console.log(`Fetching List for tab '${activeTab}': ${url}`);
            }

            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json', 'Accept': 'application/json' }
            });

            if (!response.ok) {
                let errorMsg = `HTTP error (${currentTabConfig.type})! Status: ${response.status}`;
                try { const errorData = await response.json(); errorMsg = errorData.message || JSON.stringify(errorData); }
                catch (e) { errorMsg += `: ${await response.text().catch(() => '(Could not read error response body)')}`; }
                throw new Error(errorMsg);
            }
            const data = await response.json();

            if (currentTabConfig.type === 'summary') {
                console.log("Fetched Summary Data:", data);
                if (typeof data !== 'object' || data === null) throw new Error("Invalid summary data format.");
                setSummaryData({
                    noPdi: data.noPdi ?? 0, inRepair: data.inRepair ?? 0,
                    okCompletedToday: data.okCompletedToday ?? 0, okToCheck: data.okToCheck ?? 0,
                    rectifiedCompletedToday: data.rectifiedCompletedToday ?? 0, rectifiedToCheck: data.rectifiedToCheck ?? 0,
                });
            } else if (currentTabConfig.type === 'list') {
                console.log(`Fetched Inspections List Data for ${activeTab}:`, data);
                if (Array.isArray(data)) {
                    setInspections(data);
                } else if (data && Array.isArray(data.data)) {
                    setInspections(data.data);
                } else {
                    if (activeTab !== 'check' && activeTab !== 'completed') {
                        console.warn("Unexpected list data format, expected an array:", data);
                    }
                    setInspections([]);
                }
            }
        } catch (fetchError) {
            console.error(`Error fetching data for tab ${activeTab}:`, fetchError);
            setError(fetchError.message || `Failed to load data.`);
            if (currentTabConfig.type === 'list') { setInspections([]); }
            else { setSummaryData({ noPdi: null, inRepair: null, okCompletedToday: null, okToCheck: null, rectifiedCompletedToday: null, rectifiedToCheck: null }); }
        } finally {
            setIsLoading(false);
        }
    }, [activeTab, getAuthToken, checkTabDate, completedTabDate]);

    // Effects
    useEffect(() => {
        fetchDataForActiveTab();
    }, [fetchDataForActiveTab]);
    useEffect(() => {
        if (TAB_CONFIG[activeTab].type === 'list') {
            if (searchQuery.trim() === '') {
                setFilteredInspections(inspections);
            } else {
                const query = searchQuery.trim().toLowerCase();
                const filtered = inspections.filter(vehicle =>
                    (vehicle.vin && vehicle.vin.toLowerCase().includes(query)) ||
                    (vehicle.chassis_no && vehicle.chassis_no.toLowerCase().includes(query)) ||
                    (vehicle.model && vehicle.model.toLowerCase().includes(query))
                );
                setFilteredInspections(filtered);
            }
        } else {
            setFilteredInspections([]);
        }
    }, [searchQuery, inspections, activeTab]);

    // Event Handlers (Memoized with useCallback)
    const handleTabChange = useCallback((newTabKey) => {
        if (newTabKey !== activeTab) {
            setActiveTab(newTabKey);
            setSearchQuery('');
        }
    }, [activeTab]);

    const handleSearch = useCallback((text) => {
        setSearchQuery(text);
    }, []);

    const handleViewDetails = useCallback((item) => {
        const chassis = item.chassis_no || item.vin || 'N/A';
        const status = item.approval_status === null ? 'Pending' : (item.approval_status || 'N/A');
        Alert.alert("View Details", `Chassis: ${chassis}\nStatus: ${status}`);
    }, []);

    const handleRetry = useCallback(() => {
        fetchDataForActiveTab();
    }, [fetchDataForActiveTab]);

    const onDateChange = useCallback((event, selectedDate) => {
        const currentDate = selectedDate;
        if (Platform.OS === 'android') { setShowDatePicker(false); }
        if (event.type === 'set' && currentDate) {
            if (datePickerTargetTab === 'check') {
                setCheckTabDate(currentDate);
            } else if (datePickerTargetTab === 'completed') {
                setCompletedTabDate(currentDate);
            }
            
            if (Platform.OS === 'ios') { setShowDatePicker(false); }
        } else if (event.type === 'dismissed') {
             setShowDatePicker(false);
        }
    }, [datePickerTargetTab]);

    const triggerShowDatePicker = useCallback((targetTab) => {
        setDatePickerTargetTab(targetTab);
        setShowDatePicker(true);
    }, []);

    // Render Functions
    const renderTabs = () => (
        <View style={localStyles.tabContainerStyle}>
            {Object.keys(TAB_CONFIG).map((key) => (
                <TouchableOpacity
                    key={key}
                    style={[localStyles.tabRadioButtonContainer, activeTab === key ? localStyles.tabRadioButtonContainerSelected : {}]}
                    onPress={() => handleTabChange(key)} activeOpacity={0.7}>
                    <View style={[localStyles.tabRadioCircle, activeTab === key ? localStyles.tabRadioCircleSelected : {}]} />
                    <Text style={[localStyles.tabRadioText, activeTab === key ? localStyles.tabRadioTextSelected : {}]}>
                        {TAB_CONFIG[key].label}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    const renderSummaryView = () => (
        <>
            <View style={localStyles.section}>
                <Text style={localStyles.sectionTitle}>In Progress</Text>
                <View style={localStyles.summaryBox}>
                    <Text style={localStyles.summaryText}>No PDI: {summaryData.noPdi ?? 'N/A'}</Text>
                    <Text style={localStyles.summaryText}>In Repair: {summaryData.inRepair ?? 'N/A'}</Text>
                </View>
            </View>
            <View style={localStyles.section}>
                <Text style={localStyles.sectionTitle}>To Check</Text>
                <View style={localStyles.summaryBox}>
                    <Text style={localStyles.summaryText}>PDI OK: {summaryData.okToCheck ?? 'N/A'}</Text>
                    <Text style={localStyles.summaryText}>Rectified: {summaryData.rectifiedToCheck ?? 'N/A'}</Text>
                </View>
            </View>
            <View style={localStyles.section}>
                <Text style={localStyles.sectionTitle}>Completed (Today)</Text>
                <View style={localStyles.summaryBox}>
                    <Text style={localStyles.summaryText}>PDI OK: {summaryData.okCompletedToday ?? 'N/A'}</Text>
                    <Text style={localStyles.summaryText}>Rectified: {summaryData.rectifiedCompletedToday ?? 'N/A'}</Text>
                </View>
            </View>
        </>
    );

    const renderInspectionItem = useCallback(({ item }) => (
        <TouchableOpacity
            style={[commonStyles.listItemContainer, localStyles.inspectionItem]}
            onPress={() => handleViewDetails(item)}>
            <View style={{ flex: 1, marginRight: MARGIN.small }}>
                <Text style={[commonStyles.textBold, { fontSize: FONT_SIZES.large }]}>Chassis: {item.chassis_no || item.vin || 'N/A'}</Text>
                <Text style={commonStyles.textRegular}>Variant: {item.variant || 'N/A'}</Text>
                {(activeTab === 'check' || activeTab === 'completed') ? (
                    <>
                        <Text style={commonStyles.textSmall}>Engine: {item.engine_no || 'N/A'}</Text>
                        <Text style={commonStyles.textSmall}>Colour: {item.colour_code || 'N/A'}</Text>
                        <Text style={commonStyles.textSmall}>
                            PDI Plan: {item.pdi_plan ? formatDateToDDMMYYYY(new Date(item.pdi_plan)) : 'N/A'}
                        </Text>
                        <Text style={commonStyles.textSmall}>
                            Start: {formatDateTimeToDDMMYYYYHHMM(item.start_time)}
                        </Text>
                        <Text style={commonStyles.textSmall}>
                            End: {formatDateTimeToDDMMYYYYHHMM(item.end_time)}
                        </Text>
                    </>
                ) : (
                    <Text style={commonStyles.textSmall}>
                        Inspected: {item.inspectionDate ? formatDateToDDMMYYYY(new Date(item.inspectionDate)) :
                                   item.completed_at ? formatDateToDDMMYYYY(new Date(item.completed_at)) :
                                   item.updated_at ? formatDateToDDMMYYYY(new Date(item.updated_at)) : 'N/A'}
                    </Text>
                )}
            </View>
            {(item.approval_status !== undefined) && (
                <View style={[localStyles.statusBadge, { backgroundColor: getStatusColor(item.approval_status) }]}>
                    <Text style={localStyles.statusBadgeText}>{item.approval_status === null ? 'Pending' : item.approval_status}</Text>
                </View>
            )}
        </TouchableOpacity>
    ), [activeTab, handleViewDetails]);

    const getStatusColor = (approvalStatus) => {
        const normalizedStatus = approvalStatus === null ? 'pending' : String(approvalStatus).toLowerCase();
        switch (normalizedStatus) {
            case 'ok': return COLORS.success;
            case 'nok': return COLORS.danger;
            case 'pending':
            default: return COLORS.warning;
        }
    };

    const listHeaderElement = useMemo(() => {
        console.log("Re-creating List Header Element. SearchQuery:", searchQuery, "ActiveTab:", activeTab); 
        return (
            <>
                {TAB_CONFIG[activeTab]?.requiresDate && (
                    <View style={localStyles.dateFilterContainer}>
                        <Text style={localStyles.dateFilterLabel}>Inspection Date:</Text>
                        <TouchableOpacity
                            style={[commonStyles.textInput, localStyles.datePickerButton]}
                            onPress={() => triggerShowDatePicker(activeTab)}>
                            <Text style={commonStyles.textRegular}>
                                {activeTab === 'check' && checkTabDate ? formatDateToDDMMYYYY(checkTabDate) :
                                 activeTab === 'completed' && completedTabDate ? formatDateToDDMMYYYY(completedTabDate) :
                                 'Select Date'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
                <TextInput
                    style={[commonStyles.textInput, { marginBottom: MARGIN.medium }]}
                    placeholder="Search by Chassis no."
                    value={searchQuery}
                    onChangeText={handleSearch}
                    placeholderTextColor={COLORS.grey}
                />
                <View style={localStyles.unitsHeader}>
                    <Text style={localStyles.unitsText}>{TAB_CONFIG[activeTab].label}
                        {TAB_CONFIG[activeTab]?.requiresDate && (
                            activeTab === 'check' && checkTabDate ? ` (${formatDateToDDMMYYYY(checkTabDate)})` :
                            activeTab === 'completed' && completedTabDate ? ` (${formatDateToDDMMYYYY(completedTabDate)})` : ''
                        )}
                    </Text>
                    <Text style={localStyles.unitsText}>
                        {isLoading ? '...' : `${filteredInspections.length}${inspections.length !== filteredInspections.length ? ` of ${inspections.length}` : ''}`}
                    </Text>
                </View>
            </>
        );
    }, [
        activeTab,
        checkTabDate,
        completedTabDate,
        searchQuery,
        isLoading,
        filteredInspections.length,
        inspections.length,
        handleSearch,
        triggerShowDatePicker
    ]);

    const renderListView = () => (
        <FlatList
            data={filteredInspections}
            renderItem={renderInspectionItem}
            keyExtractor={(item, index) => item.id?.toString() || item.chassis_no || `item-${index}`}
            ListHeaderComponent={listHeaderElement}
            contentContainerStyle={{ paddingBottom: PADDING.medium, flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={!isLoading && !error ? (
                <View style={localStyles.centeredMessageContainerForList}>
                    <Text style={commonStyles.noDataText}>
                        {searchQuery.trim() !== '' ? `No results for "${searchQuery}".` : `No inspections found.`}
                    </Text>
                </View>
            ) : null}
            keyboardShouldPersistTaps="handled"
        />
    );

    const renderPageContent = () => {
        if (isLoading) {
            return (
                <View style={localStyles.centeredMessageContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={localStyles.loadingText}>Loading {TAB_CONFIG[activeTab].label.toLowerCase()}...</Text>
                </View>
            );
        }
        if (error) {
            return (
                <View style={localStyles.centeredMessageContainer}>
                    <Text style={commonStyles.errorText}>Error Loading Data</Text>
                    <Text style={localStyles.errorDetailText}>{error}</Text>
                    <TouchableOpacity
                         style={[commonStyles.actionButton, {backgroundColor: COLORS.primary, marginTop: MARGIN.large}]}
                         onPress={handleRetry}>
                         <Text style={[commonStyles.actionButtonText, {color: COLORS.white}]}>Retry</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (TAB_CONFIG[activeTab].type === 'summary') {
            return (
                <ScrollView
                    style={localStyles.contentScrollViewOnlyForSummary}
                    contentContainerStyle={localStyles.contentScrollContainer}
                    keyboardShouldPersistTaps="handled">
                    {renderSummaryView()}
                </ScrollView>
            );
        } else if (TAB_CONFIG[activeTab].type === 'list') {
            return renderListView();
        }
        return null;
    };

    return (
        <ScreenWrapper showHeader={true} showFooter={true} enableScrollView={false} enableKeyboardAvoidingView={Platform.OS === 'ios'}>
            <View style={localStyles.mainContentArea}>
                <Text style={[commonStyles.pageHeader, {marginBottom: MARGIN.small}]}>Final Inspection Status</Text>
                {renderTabs()}
                {showDatePicker && (
                     <DateTimePicker
                        testID="dateTimePicker"
                        value={
                            (datePickerTargetTab === 'check' ? checkTabDate : completedTabDate) || new Date()
                        }
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={onDateChange}
                        maximumDate={new Date()}
                    />
                )}
                <View style={localStyles.contentAreaWrapper}>
                    {renderPageContent()}
                </View>
            </View>
            <View style={commonStyles.footerActionContainer}>
                <TouchableOpacity style={commonStyles.actionButtonSecondary} onPress={() => navigation.goBack()}>
                    <Text style={commonStyles.actionButtonText}>Back</Text>
                </TouchableOpacity>
            </View>
        </ScreenWrapper>
    );
}

// Styles
const localStyles = StyleSheet.create({
    mainContentArea: {
        flex: 1,
        paddingHorizontal: PADDING.medium,
        paddingTop: PADDING.small,
    },
    contentAreaWrapper: { flex: 1 },
    contentScrollViewOnlyForSummary: { flex: 1 },
    contentScrollContainer: { flexGrow: 1 },
    tabContainerStyle: {
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        marginBottom: MARGIN.medium,
        paddingVertical: PADDING.xsmall,
        flexWrap: "wrap",
    },
    tabRadioButtonContainer: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: PADDING.small,
        paddingHorizontal: PADDING.medium - 4,
        marginHorizontal: MARGIN.xsmall / 2,
        marginVertical: MARGIN.xsmall / 2,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: COLORS.lightGrey,
        backgroundColor: COLORS.white,
    },
    tabRadioButtonContainerSelected: {
        backgroundColor: COLORS.primaryLight,
        borderColor: COLORS.primary,
    },
    tabRadioCircle: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: COLORS.lightGrey,
        marginRight: MARGIN.small - 2,
        justifyContent: "center",
        alignItems: "center",
    },
    tabRadioCircleSelected: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primary,
    },
    tabRadioText: {
        fontSize: FONT_SIZES.small,
        color: COLORS.grey,
        fontWeight: "500",
    },
    tabRadioTextSelected: { color: COLORS.primary, fontWeight: "bold" },
    centeredMessageContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: PADDING.large,
        minHeight: 200,
    },
    centeredMessageContainerForList: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: PADDING.large,
        minHeight: 150,
    },
    loadingText: {
        marginTop: MARGIN.medium,
        fontSize: FONT_SIZES.medium,
        color: COLORS.grey,
    },
    errorDetailText: {
        marginTop: MARGIN.small,
        fontSize: FONT_SIZES.small,
        color: COLORS.danger,
        textAlign: "center",
        paddingHorizontal: PADDING.medium,
    },
    section: { marginBottom: MARGIN.large },
    sectionTitle: {
        fontSize: FONT_SIZES.xlarge,
        fontWeight: "bold",
        marginBottom: MARGIN.small,
        color: COLORS.secondary,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.divider,
        paddingBottom: PADDING.xsmall,
    },
    summaryBox: {
        backgroundColor: COLORS.white,
        borderColor: COLORS.border,
        borderWidth: 1,
        borderRadius: 8,
        padding: PADDING.medium,
        marginTop: MARGIN.xsmall,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    summaryText: {
        fontSize: FONT_SIZES.large,
        color: COLORS.secondary,
        marginBottom: MARGIN.small,
        lineHeight: FONT_SIZES.large * 1.4,
    },
    unitsHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: MARGIN.small,
        paddingHorizontal: PADDING.xsmall + 2,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.divider,
        paddingBottom: PADDING.small,
    },
    unitsText: {
        fontSize: FONT_SIZES.medium,
        fontWeight: "600",
        color: COLORS.secondary,
    },
    inspectionItem: { marginBottom: MARGIN.small },
    statusBadge: {
        paddingHorizontal: PADDING.small,
        paddingVertical: PADDING.xsmall + 2,
        borderRadius: 12,
        marginLeft: MARGIN.small,
        minWidth: 70,
        alignItems: "center",
        justifyContent: "center",
    },
    statusBadgeText: {
        color: COLORS.white,
        fontSize: FONT_SIZES.xsmall,
        fontWeight: "bold",
        textAlign: "center",
    },
    dateFilterContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: MARGIN.medium,
        paddingHorizontal: PADDING.xsmall,
    },
    dateFilterLabel: {
        fontSize: FONT_SIZES.medium,
        color: COLORS.secondary,
        marginRight: MARGIN.small,
        fontWeight: "600",
    },
    datePickerButton: { flex: 1, height: 48, justifyContent: "center" },
});