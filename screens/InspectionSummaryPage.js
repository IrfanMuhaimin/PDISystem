// screens/InspectionSummaryPage.js
import React, { useEffect, useState } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    ActivityIndicator, Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenWrapper from '../styles/flowstudiosbg.js';
import commonStyles, { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/commonStyles.js';

export default function InspectionSummaryPage({ navigation }) {
    // State variables remain the same
    const [noPdi, setNoPdi] = useState(null);
    const [inRepair, setInRepair] = useState(null);
    const [okCompletedToday, setOkCompletedToday] = useState(null);
    const [okToCheck, setOkToCheck] = useState(null);
    const [rectifiedCompletedToday, setRectifiedCompletedToday] = useState(null);
    const [rectifiedToCheck, setRectifiedToCheck] = useState(null);
    // Added loading and error states
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchSummary(); // Fetch data on mount
    }, []);

    // getAuthToken remains the same
    const getAuthToken = async () => {
        try {
            const token = await AsyncStorage.getItem('authToken');
            if (!token) console.warn("Auth token not found.");
            return token;
        } catch (error) {
            console.error('Error retrieving authToken:', error);
            setError("Failed to get authentication token."); // Set error state
            return null;
        }
    };

    // fetchSummary updated with loading/error handling
    const fetchSummary = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const authToken = await getAuthToken();
            if (!authToken) { throw new Error("Authentication required."); }

            const url = `http://pdi.flowstudios.com.my/api/jobcards/summary`;
            console.log(`Fetching: ${url}`);
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json', // Good practice
                }
            });

            if (!response.ok) {
                let errorMsg = `HTTP error! Status: ${response.status}`;
                try { const errorData = await response.json(); errorMsg = errorData.message || errorMsg; }
                catch(e) { /* Ignore if response not json */ }
                throw new Error(errorMsg);
            }

            const data = await response.json();
            console.log("Fetched Summary Data:", data);

            // Basic data validation
            if (typeof data !== 'object' || data === null) {
                throw new Error("Invalid data format received from summary endpoint.");
            }

            // Set state (handle potentially missing keys gracefully)
            setNoPdi(data.noPdi ?? 0);
            setInRepair(data.inRepair ?? 0);
            setOkCompletedToday(data.okCompletedToday ?? 0);
            setOkToCheck(data.okToCheck ?? 0);
            setRectifiedCompletedToday(data.rectifiedCompletedToday ?? 0);
            setRectifiedToCheck(data.rectifiedToCheck ?? 0);

        } catch (error) {
            console.error('Error fetching summary:', error.message);
            setError(error.message || 'An unknown error occurred while fetching the summary.');
            // Reset counts on error? Optional.
            setNoPdi(null); setInRepair(null); setOkCompletedToday(null);
            setOkToCheck(null); setRectifiedCompletedToday(null); setRectifiedToCheck(null);
        } finally {
            setIsLoading(false);
        }
    };

    // Helper to render content based on loading/error state
    const renderSummaryContent = () => {
        if (isLoading) {
            return (
                <View style={localStyles.centeredMessageContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={localStyles.loadingText}>Loading Summary...</Text>
                </View>
            );
        }

        if (error) {
            return (
                <View style={localStyles.centeredMessageContainer}>
                    <Text style={commonStyles.errorText}>Error Loading Summary</Text>
                    <Text style={localStyles.errorDetailText}>{error}</Text>
                    {/* Optional: Add a retry button */}
                    <TouchableOpacity
                         style={[commonStyles.actionButton, {marginTop: MARGIN.large}]}
                         onPress={fetchSummary}>
                         <Text style={commonStyles.actionButtonPrimaryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        // Only render summary boxes if data is loaded successfully
        return (
            <>
                <View style={localStyles.section}>
                    <Text style={localStyles.sectionTitle}>In Progress</Text>
                    <View style={localStyles.summaryBox}>
                        <Text style={localStyles.summaryText}>No PDI: {noPdi ?? 'N/A'}</Text>
                        <Text style={localStyles.summaryText}>In Repair: {inRepair ?? 'N/A'}</Text>
                    </View>
                </View>

                <View style={localStyles.section}>
                    <Text style={localStyles.sectionTitle}>To Check</Text>
                    <View style={localStyles.summaryBox}>
                        <Text style={localStyles.summaryText}>PDI OK: {okToCheck ?? 'N/A'}</Text>
                        <Text style={localStyles.summaryText}>Rectified: {rectifiedToCheck ?? 'N/A'}</Text>
                    </View>
                </View>

                <View style={localStyles.section}>
                    <Text style={localStyles.sectionTitle}>Completed (Today)</Text>
                    <View style={localStyles.summaryBox}>
                        <Text style={localStyles.summaryText}>PDI OK: {okCompletedToday ?? 'N/A'}</Text>
                        <Text style={localStyles.summaryText}>Rectified: {rectifiedCompletedToday ?? 'N/A'}</Text>
                    </View>
                </View>
            </>
        );
    };


    return (
        <ScreenWrapper
            showHeader={true}
            showFooter={true}
            enableScrollView={false}
            enableKeyboardAvoidingView={Platform.OS === 'ios'}
        >
            <ScrollView
                style={localStyles.scrollView}
                contentContainerStyle={localStyles.scrollContentContainer}
                keyboardShouldPersistTaps="handled"
            >
                <Text style={commonStyles.pageHeader}>Final Inspection Summary</Text>
                {renderSummaryContent()}

            </ScrollView>
            <View style={commonStyles.footerActionContainer}>
                <TouchableOpacity
                    style={commonStyles.actionButtonSecondary}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={commonStyles.actionButtonText}>Back</Text>
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
    centeredMessageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: PADDING.large,
        minHeight: 200,
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
        textAlign: 'center',
        paddingHorizontal: PADDING.medium,
    },


    section: {
        marginBottom: MARGIN.large,
    },
    sectionTitle: {
        fontSize: FONT_SIZES.xlarge,
        fontWeight: 'bold',
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
});