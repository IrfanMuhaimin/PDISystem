// screens/SOP.js
import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform // Removed SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Make sure to install expo vector icons

// --- Import ScreenWrapper ---
// *** ADJUST PATH IF NEEDED ***
import ScreenWrapper from '../styles/flowstudiosbg.js';

// --- Import Common Styles & Constants ---
// *** ADJUST PATH IF NEEDED ***
import commonStyles, { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/commonStyles.js';

// Removed Header and Footer imports as ScreenWrapper handles them

export default function SOP({ navigation }) {
    // State remains the same
    const [selectedModel, setSelectedModel] = useState(null);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [showModelDropdown, setShowModelDropdown] = useState(false);
    const [showVariantDropdown, setShowVariantDropdown] = useState(false);

    // Data remains the same
    const models = ['Xpander'];
    const variants = ['BASE', 'CLASS'];

    // Handlers remain the same
    const handleViewPDF = () => {
        if (!selectedModel || !selectedVariant) {
            console.warn('Please select both model and variant.');
            // Consider Alert.alert('Selection Required', 'Please select both model and variant.');
            return;
        }
        console.log('Viewing SOP PDF for:', selectedModel, selectedVariant);
        // TODO: Implement PDF download/viewing logic
    };

    const toggleModelDropdown = () => {
        setShowModelDropdown(!showModelDropdown);
        setShowVariantDropdown(false);
    };

    const toggleVariantDropdown = () => {
        if (!selectedModel) return;
        setShowVariantDropdown(!showVariantDropdown);
        setShowModelDropdown(false);
    };

    const selectModel = (model) => {
        setSelectedModel(model);
        setShowModelDropdown(false);
        setSelectedVariant(null);
        setShowVariantDropdown(false);
    };

    const selectVariant = (variant) => {
        setSelectedVariant(variant);
        setShowVariantDropdown(false);
    };

    return (
        <ScreenWrapper
            showHeader={true}
            showFooter={true}
            enableScrollView={false} // Use internal ScrollView for dropdowns
            enableKeyboardAvoidingView={true}
        >
            {/* --- Scrollable Content Area --- */}
            <ScrollView
                 style={localStyles.scrollView}
                 contentContainerStyle={localStyles.scrollContentContainer}
                 keyboardShouldPersistTaps="handled" // Good for dropdowns
            >
                {/* Page Header */}
                <Text style={commonStyles.pageHeader}>PDI SOP</Text>

                {/* Model Selection */}
                <Text style={localStyles.sectionTitle}>Select Vehicle Model</Text>
                <TouchableOpacity
                    style={localStyles.dropdownHeader}
                    onPress={toggleModelDropdown}
                    activeOpacity={0.7}
                >
                    <Text style={localStyles.dropdownHeaderText}>
                        {selectedModel || 'Select Vehicle Model'}
                    </Text>
                    <Ionicons
                        name={showModelDropdown ? 'chevron-up' : 'chevron-down'}
                        size={24} // Slightly larger icon
                        color={COLORS.grey} // Use theme color
                    />
                </TouchableOpacity>

                {showModelDropdown && (
                    <View style={localStyles.dropdownOptions}>
                        {models.map((model) => (
                            <TouchableOpacity
                                key={model}
                                style={localStyles.dropdownOption}
                                onPress={() => selectModel(model)}
                            >
                                <Text style={localStyles.dropdownOptionText}>{model}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Variant Selection */}
                <Text style={localStyles.sectionTitle}>Select Variant</Text>
                <TouchableOpacity
                    style={[
                        localStyles.dropdownHeader,
                        !selectedModel && localStyles.dropdownHeaderDisabled // Apply disabled style to header
                    ]}
                    onPress={toggleVariantDropdown}
                    disabled={!selectedModel}
                    activeOpacity={selectedModel ? 0.7 : 1} // Reduce opacity only if enabled
                >
                    <Text style={[
                        localStyles.dropdownHeaderText,
                        !selectedModel && localStyles.disabledText // Keep disabled text style
                    ]}>
                        {selectedVariant || (selectedModel ? 'Select Variant' : 'Select Model First')}
                    </Text>
                    {selectedModel && ( // Only show icon if enabled
                        <Ionicons
                            name={showVariantDropdown ? 'chevron-up' : 'chevron-down'}
                            size={24} // Slightly larger icon
                            color={COLORS.grey} // Use theme color
                        />
                    )}
                </TouchableOpacity>

                {showVariantDropdown && selectedModel && (
                    <View style={localStyles.dropdownOptions}>
                        {variants.map((variant) => (
                            <TouchableOpacity
                                key={variant}
                                style={localStyles.dropdownOption}
                                onPress={() => selectVariant(variant)}
                            >
                                <Text style={localStyles.dropdownOptionText}>{variant}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

            </ScrollView>
            {/* --- End Scrollable Content Area --- */}

            {/* --- Fixed Footer Action Buttons --- */}
            <View style={commonStyles.footerActionContainer}>
                <TouchableOpacity
                    style={commonStyles.actionButtonSecondary} // Use common style for Back
                    onPress={() => navigation.goBack()}
                >
                    <Text style={commonStyles.actionButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        commonStyles.actionButton, // Use common style for primary action
                        (!selectedModel || !selectedVariant) && commonStyles.actionButtonDisabled // Apply common disabled style
                    ]}
                    onPress={handleViewPDF}
                    disabled={!selectedModel || !selectedVariant}
                >
                    <Text style={[
                         commonStyles.actionButtonPrimaryText, // Use common text style
                         (!selectedModel || !selectedVariant) && commonStyles.actionButtonTextDisabled // Apply common disabled text style
                    ]}>View SOP</Text>
                </TouchableOpacity>
            </View>
            {/* --- End Fixed Footer Action Buttons --- */}

        </ScreenWrapper>
    );
}

// --- Local Styles (Generalized with Theme Constants) ---
const localStyles = StyleSheet.create({
    // --- Layout & Core ---
    scrollView: {
        flex: 1, // Takes up available space
    },
    scrollContentContainer: {
        paddingHorizontal: PADDING.medium,
        paddingTop: PADDING.small, // Less top padding needed
        paddingBottom: PADDING.large, // Space at bottom of scroll
    },
    // --- Page Specific Content ---
    sectionTitle: {
        fontSize: FONT_SIZES.large, // Was 18
        fontWeight: 'bold',
        color: COLORS.secondary, // Use theme color
        marginBottom: MARGIN.small, // Was 10
        marginTop: MARGIN.medium, // Was 15 -> Adjusted for consistency
    },
    dropdownHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: PADDING.medium, // Was 15 -> use theme padding
        borderWidth: 1,
        borderColor: COLORS.lightGrey, // Was #ccc
        borderRadius: 8, // Use common border radius
        backgroundColor: COLORS.white, // Was #fff
        marginBottom: MARGIN.xsmall, // Was 5 -> Reduced space before options appear
        minHeight: 50, // Ensure a decent touch target size
    },
    dropdownHeaderDisabled: { // Style for when the dropdown header itself is disabled
        backgroundColor: COLORS.veryLightGrey, // Lighter background
        borderColor: COLORS.lightGrey, // Match border
    },
    dropdownHeaderText: {
        fontSize: FONT_SIZES.medium, // Was 16
        color: COLORS.secondary, // Was #333
    },
    disabledText: {
        color: COLORS.grey, // Was #999 -> Use theme grey
    },
    dropdownOptions: {
        borderWidth: 1,
        borderColor: COLORS.lightGrey, // Was #ccc
        borderRadius: 8, // Match header radius
        marginTop: -1, // Overlap slightly
        borderTopWidth: 0, // Hide top border
        marginBottom: MARGIN.medium, // Was 15 -> Adjusted space after dropdown
        backgroundColor: COLORS.white, // Was #fff
        // Optional Shadow
        elevation: 3,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        maxHeight: 200, // Prevent dropdown from becoming too tall
    },
    dropdownOption: {
        paddingVertical: PADDING.medium, // Was 15
        paddingHorizontal: PADDING.medium, // Was 15
        borderBottomWidth: 1,
        borderBottomColor: COLORS.divider, // Was #eee
    },
    // Ensure last item doesn't have a bottom border
    dropdownOptionLast: {
        borderBottomWidth: 0,
    },
    dropdownOptionText: {
        fontSize: FONT_SIZES.medium, // Was 16
        color: COLORS.secondary, // Was #333
    },
    // Removed original buttonContainer, actionButton, backButton, viewButton, disabledButton, buttonText styles
    // Common styles handle the footer buttons now.
});