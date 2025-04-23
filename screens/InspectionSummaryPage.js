// screens/InspectionSummaryPage.js
import React, { useEffect, useState } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    ActivityIndicator, Platform // Removed SafeAreaView, Button, Modal
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Import ScreenWrapper ---
// *** ADJUST PATH IF NEEDED ***
import ScreenWrapper from '../styles/flowstudiosbg.js';

// --- Import Common Styles & Constants ---
// *** ADJUST PATH IF NEEDED ***
import commonStyles, { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/commonStyles.js';

// Removed DefectInfoModal import as it wasn't used in the provided code

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
            showHeader={true} // Use the standard header from ScreenWrapper
            showFooter={true} // Use the standard footer from ScreenWrapper
            enableScrollView={false} // We will use our own ScrollView below
            enableKeyboardAvoidingView={Platform.OS === 'ios'} // Good practice
        >
            {/* --- Main Scrollable Content --- */}
            <ScrollView
                style={localStyles.scrollView}
                contentContainerStyle={localStyles.scrollContentContainer}
                keyboardShouldPersistTaps="handled"
            >
                {/* Page Header */}
                <Text style={commonStyles.pageHeader}>Final Inspection Summary</Text>

                {/* Render Loading/Error or Summary Content */}
                {renderSummaryContent()}

            </ScrollView>
            {/* --- End Scrollable Content --- */}

            {/* --- Fixed Footer Action Buttons --- */}
            <View style={commonStyles.footerActionContainer}>
                {/* Only one button needed here */}
                <TouchableOpacity
                    style={commonStyles.actionButtonSecondary} // Use common style for Back
                    onPress={() => navigation.goBack()}
                >
                    <Text style={commonStyles.actionButtonText}>Back</Text>
                </TouchableOpacity>
                {/* Add another button here if needed, using commonStyles.actionButton */}
            </View>
            {/* --- End Footer Action Buttons --- */}

        </ScreenWrapper>
    );
}

// --- Local Styles (Generalized with Theme Constants) ---
const localStyles = StyleSheet.create({
    // --- Layout & Core ---
    scrollView: {
        flex: 1, // Takes available space
    },
    scrollContentContainer: {
        paddingHorizontal: PADDING.medium,
        paddingTop: PADDING.small, // Less top padding as header is above
        paddingBottom: PADDING.large, // Space at bottom of scroll
    },
    centeredMessageContainer: { // For Loading/Error states
        flex: 1, // Ensure it takes height if ScrollView is empty
        justifyContent: 'center',
        alignItems: 'center',
        padding: PADDING.large,
        minHeight: 200, // Give it some minimum height
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

    // --- Summary Sections & Boxes ---
    section: {
        marginBottom: MARGIN.large, // Was 10 -> use theme large margin
    },
    sectionTitle: {
        fontSize: FONT_SIZES.xlarge, // Was 22/25 -> use theme xl
        fontWeight: 'bold',
        marginBottom: MARGIN.small, // Was 5 -> use theme small margin
        color: COLORS.secondary, // Use theme secondary color
        borderBottomWidth: 1,
        borderBottomColor: COLORS.divider,
        paddingBottom: PADDING.xsmall,
    },
    summaryBox: {
        backgroundColor: COLORS.white, // Was #fff
        borderColor: COLORS.border,    // Was #000 -> use theme border
        borderWidth: 1,
        borderRadius: 8,               // Was 5 -> use slightly rounded
        padding: PADDING.medium,       // Was 10 -> use theme medium padding
        marginTop: MARGIN.xsmall,      // Was 5
        shadowColor: COLORS.black,     // Add subtle shadow
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    summaryText: {
        fontSize: FONT_SIZES.large, // Was 16 -> use theme large
        color: COLORS.secondary,    // Use theme text color
        marginBottom: MARGIN.small, // Was 5 -> use theme small margin
        lineHeight: FONT_SIZES.large * 1.4, // Improve line height
    },
    // Removed redundant styles: appBar, appBarTitle, container, header, button, buttonBack, buttonText, footer
});