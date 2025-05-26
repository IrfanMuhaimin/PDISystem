// BatteryTerminalInputModal.js
import React, { useState, useEffect } from 'react';
import { View, Text, Modal, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import commonStyles, { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/commonStyles'; 

export default function BatteryTerminalInputModal({ visible, onClose, onSubmit, item }) {
    const [inputValue, setInputValue] = useState('');

    useEffect(() => {
        if (visible) {
            const currentMeasurement = item?.measurementValue;
            setInputValue(currentMeasurement != null ? String(currentMeasurement) : '');
        }
    }, [visible, item]);

    const handleSubmit = () => {
        const trimmedValue = inputValue.trim();
        if (trimmedValue) {
            const floatVal = parseFloat(trimmedValue);
            if (isNaN(floatVal)) {
                Alert.alert('Invalid Input', 'Please enter a valid number (e.g., 12.6).');
                return;
            }
            onSubmit(floatVal);
        } else {
            Alert.alert('Input Required', 'Please enter a value to submit.');
        }
    };

    const isSubmitDisabled = () => {
        const trimmedValue = inputValue.trim();
        if (!trimmedValue) return true;
        if (isNaN(parseFloat(trimmedValue))) return true;
        return false;
    };

    if (!item) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={localStyles.modalContainer}>
                <View style={localStyles.modalContent}>
                    <Text style={localStyles.title}>Input Value</Text>
                    <View style={localStyles.infoBox}>
                        <Text style={localStyles.infoTitle}>{item.name}</Text>
                    </View>

                    <Text style={localStyles.label}>Enter Measured Value (e.g., 12.6):</Text>
                    <TextInput
                        style={[commonStyles.textInput, localStyles.valueInput]}
                        placeholder="e.g., 12.6" 
                        placeholderTextColor={COLORS.grey}
                        value={inputValue}
                        onChangeText={setInputValue}
                        keyboardType="numeric"
                        autoFocus={true}
                    />

                    <View style={commonStyles.footerActionContainer}>
                        <TouchableOpacity
                            style={[commonStyles.actionButtonSecondary, localStyles.modalButton]}
                            onPress={onClose}
                        >
                            <Text style={[commonStyles.actionButtonText, localStyles.modalButtonText]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                commonStyles.actionButton,
                                localStyles.modalButton,
                                isSubmitDisabled() ? commonStyles.actionButtonDisabled : {}
                            ]}
                            onPress={handleSubmit}
                            disabled={isSubmitDisabled()}
                        >
                            <Text style={[
                                commonStyles.actionButtonPrimaryText,
                                localStyles.modalButtonText,
                                isSubmitDisabled() ? commonStyles.actionButtonModalDisabled : {}
                            ]}>Submit</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const localStyles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    modalContent: {
        width: '90%',
        maxWidth: 500,
        padding: PADDING.large,
        backgroundColor: COLORS.white,
        borderRadius: 10,
        maxHeight: '90%',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2, },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    title: {
        fontSize: FONT_SIZES.xlarge,
        fontWeight: 'bold',
        marginBottom: MARGIN.medium,
        color: COLORS.primary,
        textAlign: 'center',
    },
    infoBox: {
        backgroundColor: COLORS.primaryLight,
        padding: PADDING.medium,
        marginBottom: MARGIN.medium,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    infoTitle: {
        fontSize: FONT_SIZES.large,
        fontWeight: '600',
        color: COLORS.secondary,
        textAlign: 'center',
    },
    label: {
        fontSize: FONT_SIZES.medium,
        fontWeight: 'bold',
        marginTop: MARGIN.medium,
        marginBottom: MARGIN.small,
        color: COLORS.secondary,
    },
    valueInput: {
        minHeight: 40, 
        textAlignVertical: 'center',
    },
    modalButton: {
        paddingVertical: PADDING.medium,
        paddingHorizontal: PADDING.large,
        minWidth: 100,
        flex: 0.45,
        alignItems: 'center',
    },
    modalButtonText: {
        fontSize: FONT_SIZES.large,
    },
});