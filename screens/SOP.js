// screens/SOP.js
import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform,
    Alert,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenWrapper from '../styles/flowstudiosbg.js';
import commonStyles, { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/commonStyles.js';

const getAuthToken = async () => {
    try {
        const token = await AsyncStorage.getItem('authToken');
        if (token !== null) {
            return token;
        } else {
            console.error("Auth token not found in AsyncStorage.");
            return null;
        }
    } catch (e) {
        console.error("Failed to fetch auth token from AsyncStorage", e);
        return null;
    }
};

export default function SOP({ navigation }) { 

    const [selectedModel, setSelectedModel] = useState(null);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [showModelDropdown, setShowModelDropdown] = useState(false);
    const [showVariantDropdown, setShowVariantDropdown] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const models = ['Xpander'];
    const variants = ['BASE', 'PLUS'];

    const handleViewPDF = async () => {
        if (!selectedModel || !selectedVariant) {
            Alert.alert('Selection Required', 'Please select both model and variant.');
            return;
        }
        if (isDownloading) return;

        setIsDownloading(true);
        let localUri = null;

        try {
            const token = await getAuthToken();
             console.log("Token retrieved for download:", token);
            if (!token) {
                Alert.alert('Authentication Error', 'Could not retrieve authentication token. Please log in again.');
                setIsDownloading(false);
                return;
            }

            const apiUrl = `http://pdi.flowstudios.com.my/api/sop/download`;
            const filename = `SOP_General_${Date.now()}.pdf`;
            const directory = FileSystem.documentDirectory;
            localUri = directory + filename;

            console.log('Downloading Generic SOP PDF');
            console.log('API URL:', apiUrl);
            console.log('Local URI:', localUri);

            if (apiUrl.startsWith('http://')) {
                console.warn("SECURITY WARNING: Sending Authorization token over insecure HTTP!");
            }

            const downloadResult = await FileSystem.downloadAsync(
                apiUrl,
                localUri,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            console.log('Download Result:', JSON.stringify(downloadResult, null, 2));

            if (downloadResult.status === 200) {
                console.log('Download finished:', downloadResult.uri);

                if (!(await Sharing.isAvailableAsync())) {
                    Alert.alert(
                        'Sharing Not Available',
                        'Cannot open PDF viewer automatically. The file is downloaded.'
                        );
                     setIsDownloading(false);
                     return;
                }

                console.log('Attempting to share URI:', downloadResult.uri);
                await Sharing.shareAsync(downloadResult.uri, {
                    mimeType: 'application/pdf',
                    dialogTitle: 'Open SOP PDF with...',
                    UTI: 'com.adobe.pdf'
                });

            } else {
                 let errorMessage = `Server responded with status: ${downloadResult.status}`;
                 try {
                     const errorBody = await FileSystem.readAsStringAsync(localUri);
                     if (errorBody && errorBody.trim().startsWith('{')) {
                        const errorJson = JSON.parse(errorBody);
                        errorMessage = errorJson.message || errorJson.error || errorMessage;
                     } else if (errorBody) {
                         errorMessage = `${errorMessage} - ${errorBody.substring(0, 100)}`;
                     }
                     await FileSystem.deleteAsync(localUri, { idempotent: true });
                 } catch (readError) {
                    console.log("Could not read or parse error response body:", readError);
                    await FileSystem.deleteAsync(localUri, { idempotent: true });
                 }
                 if (downloadResult.status === 401) { errorMessage = "Unauthorized: Invalid or expired token."; }
                 else if (downloadResult.status === 403) { errorMessage = "Forbidden: Permission denied."; }
                 throw new Error(errorMessage);
            }

        } catch (error) {
            console.error('Error downloading or sharing PDF:', error);
            if (localUri) {
                try { await FileSystem.deleteAsync(localUri, { idempotent: true }); }
                catch (deleteError) { console.error("Error cleaning up failed download:", deleteError); }
            }

            let alertMessage = `Could not download or open the SOP PDF.\n\nError: ${error.message}`;
            if (error.message.includes('usesCleartextTraffic') || error.message.includes('App Transport Security')) {
                 alertMessage += '\n\nNote: Using HTTP might require platform configuration.';
            } else if (error.message.includes('ETIMEDOUT') || error.message.includes('failed to connect')) {
                 alertMessage += '\n\nThe server could not be reached.';
            } else if (error.message.includes('Unauthorized') || error.message.includes('401')) {
                alertMessage = "Operation Failed: Unauthorized. Please log in again.";
            }
            Alert.alert('Operation Failed', alertMessage);

        } finally {
            setIsDownloading(false);
        }
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

    // --- JSX ---
    return (
        <ScreenWrapper
            showHeader={true}
            showFooter={true}
            enableScrollView={false}
            enableKeyboardAvoidingView={true}
            navigation={navigation}
            title="PDI SOP"
        >
            {/* Scrollable Content Area */}
            <ScrollView
                style={localStyles.scrollView}
                contentContainerStyle={localStyles.scrollContentContainer}
                keyboardShouldPersistTaps="handled"
            >
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
                        size={24}
                        color={COLORS.grey}
                    />
                </TouchableOpacity>
                {showModelDropdown && (
                    <View style={localStyles.dropdownOptions}>
                        {models.map((model) => (
                            <TouchableOpacity key={model} style={localStyles.dropdownOption} onPress={() => selectModel(model)}>
                                <Text style={localStyles.dropdownOptionText}>{model}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Variant Selection */}
                <Text style={localStyles.sectionTitle}>Select Variant</Text>
                <TouchableOpacity
                    style={[localStyles.dropdownHeader, !selectedModel && localStyles.dropdownHeaderDisabled]}
                    onPress={toggleVariantDropdown}
                    disabled={!selectedModel}
                    activeOpacity={selectedModel ? 0.7 : 1}
                >
                    <Text style={[localStyles.dropdownHeaderText, !selectedModel && localStyles.disabledText]}>
                        {selectedVariant || (selectedModel ? 'Select Variant' : 'Select Model First')}
                    </Text>
                    {selectedModel && (
                        <Ionicons name={showVariantDropdown ? 'chevron-up' : 'chevron-down'} size={24} color={COLORS.grey} />
                    )}
                </TouchableOpacity>
                {showVariantDropdown && selectedModel && (
                    <View style={localStyles.dropdownOptions}>
                        {variants.map((variant) => (
                            <TouchableOpacity key={variant} style={localStyles.dropdownOption} onPress={() => selectVariant(variant)}>
                                <Text style={localStyles.dropdownOptionText}>{variant}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </ScrollView>

            {/* Fixed Footer Action Buttons */}
            <View style={commonStyles.footerActionContainer}>
                <TouchableOpacity
                    style={commonStyles.actionButtonSecondary}
                    onPress={() => navigation.goBack()}
                    disabled={isDownloading}
                >
                    <Text style={commonStyles.actionButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[commonStyles.actionButton, (!selectedModel || !selectedVariant || isDownloading) && commonStyles.actionButtonDisabled]}
                    onPress={handleViewPDF} // Calls download and share
                    disabled={!selectedModel || !selectedVariant || isDownloading}
                >
                    {isDownloading ? (
                        <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                        <Text style={[commonStyles.actionButtonPrimaryText, (!selectedModel || !selectedVariant) && commonStyles.actionButtonTextDisabled]}>View SOP</Text>
                    )}
                </TouchableOpacity>
            </View>
        </ScreenWrapper>
    );
}

const localStyles = StyleSheet.create({
    scrollView: { flex: 1 },
    scrollContentContainer: { paddingHorizontal: PADDING.medium, paddingTop: PADDING.small, paddingBottom: PADDING.large },
    sectionTitle: { fontSize: FONT_SIZES.large, fontWeight: 'bold', color: COLORS.secondary, marginBottom: MARGIN.small, marginTop: MARGIN.medium },
    dropdownHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: PADDING.medium, borderWidth: 1, borderColor: COLORS.lightGrey, borderRadius: 8, backgroundColor: COLORS.white, marginBottom: MARGIN.xsmall, minHeight: 50 },
    dropdownHeaderDisabled: { backgroundColor: COLORS.veryLightGrey, borderColor: COLORS.lightGrey },
    dropdownHeaderText: { fontSize: FONT_SIZES.medium, color: COLORS.secondary },
    disabledText: { color: COLORS.grey },
    dropdownOptions: { borderWidth: 1, borderColor: COLORS.lightGrey, borderRadius: 8, marginTop: -1, borderTopWidth: 0, marginBottom: MARGIN.medium, backgroundColor: COLORS.white, elevation: 3, shadowColor: COLORS.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, maxHeight: 200 },
    dropdownOption: { paddingVertical: PADDING.medium, paddingHorizontal: PADDING.medium, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
    dropdownOptionLast: { borderBottomWidth: 0 },
    dropdownOptionText: { fontSize: FONT_SIZES.medium, color: COLORS.secondary },
});