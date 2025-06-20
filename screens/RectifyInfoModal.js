// screens/RectifyInfoModal.js
import React, { useState, useEffect } from 'react';
import {
    Modal, View, Text, TextInput, TouchableOpacity,
    StyleSheet, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/FontAwesome';
import { Picker } from '@react-native-picker/picker';
import { Checkbox } from 'react-native-paper';

import commonStyles, { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/commonStyles';

const RectifyInfoModal = ({ visible, item, onClose, onConfirm }) => {
    const [staffName, setStaffName] = useState('');
    const [staffNo, setStaffNo] = useState('');
    const [date, setDate] = useState(new Date());
    const [showPicker, setShowPicker] = useState(false);
    const [remark, setRemark] = useState('');
    const [tempOrganization, setTempOrganization] = useState('');
    const [otherOrganization, setOtherOrganization] = useState('');

    const [closed, setClosed] = useState(false);

    useEffect(() => {
        if (tempOrganization === 'Others') {
            setOtherOrganization(''); 
        }
    }, [tempOrganization]);

    useEffect(() => {
        if (visible) {
            setStaffName('');
            setStaffNo('');
            setDate(new Date());
            setRemark('');
            setShowPicker(false);
        }
    }, [visible]);

    const isFormValid = staffName.trim() && staffNo.trim() && remark.trim();

    const handleConfirmPress = () => {
        if (!isFormValid) {
            Alert.alert("Missing Information", "Please enter Staff Name, Staff No, and Remark.");
            return;
        }
        console.log(`Closed in handleConfirmPress: ${closed}`);
        onConfirm(staffName.trim(), staffNo.trim(), remark.trim(), date.toISOString(), closed);
    };

    const formatDateForDisplay = (dateObj) => {
        try { return dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
        catch { return 'Invalid Date'; }
    };

    const onDateChange = (event, selectedDate) => {
        const currentDate = selectedDate || date;
        setShowPicker(false);
        if (event.type === 'set') {
            setDate(currentDate);
        }
    };

    if (!visible || !item) {
        return null;
    }

    const defectInfo = item.allDefects?.[0];

    // Picker items
    const organizationOptions = [
        "HAMM", "HTS", "MMCMM", "MKM", "STMM", "PECCA", "JVC", "MMM", "Others"
    ];

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.rectifyModalOverlay}
            >
                <View style={styles.rectifyModalContent}>
                    <Text style={styles.rectifyModalHeader}>Rectification Information</Text>

                    {/* Defect Info (Keep as is) */}
                    <View style={styles.defectInfoSection}>
                        <Text style={styles.defectInfoLabel}>Defect:</Text>
                        <Text style={styles.defectInfoText}> {(item.section ? `${getSectionLetter(item.section)} - ` : '') + item.name} </Text>
                        {defectInfo && (
                            <>
                                <Text style={styles.defectInfoText}>Category: {defectInfo.category || 'N/A'}</Text>
                                <Text style={styles.defectInfoText}>Type: {defectInfo.type || 'N/A'}</Text>
                                <Text style={styles.defectInfoText}>Severity: {defectInfo.severity || 'N/A'}</Text>
                            </>
                        )}
                    </View>

                    {/* Staff Name Input (Keep as is) */}
                    <Text style={styles.inputLabel}>Staff Name (Staff No):</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g Haris (12345)"
                        placeholderTextColor={COLORS.lightGrey}
                        value={staffName}
                        onChangeText={setStaffName}
                        autoCapitalize="words"
                    />

                    {/* Staff No Input (Keep as is) */}

                    <Text style={styles.inputLabel}>Organization:</Text>
                    <View style={styles.pickerContainer}>
                        <Picker
                            selectedValue={tempOrganization}
                            onValueChange={(value) => {
                                setTempOrganization(value);
                                if (value !== 'Others') {
                                    setStaffNo(value);        // ✅ Only update the real state here
                                    setOtherOrganization('');
                                }
                            }}
                            style={styles.picker}
                        >
                            <Picker.Item label="Choose Organization" value="" enabled={false} />
                            <Picker.Item label="HAMM" value="HAMM" />
                            <Picker.Item label="HTS" value="HTS" />
                            <Picker.Item label="MMCMM" value="MMCMM" />
                            <Picker.Item label="MKM" value="MKM" />
                            <Picker.Item label="STMM" value="STMM" />
                            <Picker.Item label="PECCA" value="PECCA" />
                            <Picker.Item label="JVC" value="JVC" />
                            <Picker.Item label="MMM" value="MMM" />
                            <Picker.Item label="Others" value="Others" />
                        </Picker>
                    </View>

                    {tempOrganization === 'Others' && (
                        <TextInput
                            style={styles.input}
                            placeholder="Enter organization"
                            placeholderTextColor="#aaa"
                            value={otherOrganization}
                            onChangeText={(text) => {
                                setOtherOrganization(text);
                                setStaffNo(text);  // ✅ Real org name only set here, once stable
                            }}
                        />
                    )}

                    {defectInfo.severity === 'Minor' && (
                        <>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 5 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 5 }}>
                                    <Text style={styles.inputLabel}>Closed:</Text>
                                    <Checkbox
                                        status={closed ? 'checked' : 'unchecked'}
                                        onPress={() => setClosed(!closed)}
                                        color="#ef5b2d"
                                    />
                                </View>
                            </View>
                        </>
                    )}

                    {/* Date Section (Keep as is) */}
                    <Text style={styles.inputLabel}>Rectification Date:</Text>
                    <TouchableOpacity
                        style={styles.datePickerButton}
                        onPress={() => setShowPicker(true)}
                    >
                        <Icon name="calendar" size={20} color={COLORS.primary} style={styles.calendarIcon} />
                        <Text style={styles.datePickerButtonText}>
                            {formatDateForDisplay(date)}
                        </Text>
                    </TouchableOpacity>

                    {/* Remark Input (Keep as is - but now required) */}
                    {/* --- MODIFICATION START --- */}
                    <Text style={styles.inputLabel}>Remark:</Text>
                    {/* --- MODIFICATION END --- */}
                    <TextInput
                        style={[styles.input, styles.remarkInput]}
                        placeholder="Enter remarks" // Changed placeholder slightly
                        placeholderTextColor={COLORS.lightGrey}
                        value={remark}
                        onChangeText={setRemark}
                        multiline={true}
                        numberOfLines={3}
                    />

                    {/* DateTimePicker (Keep as is) */}
                    {showPicker && (
                        <DateTimePicker
                            testID="dateTimePicker"
                            value={date}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={onDateChange}
                            maximumDate={new Date()}
                        />
                    )}

                    {/* Action Buttons */}
                    <View style={styles.rectifyModalButtons}>
                        <TouchableOpacity style={[styles.modalButtonBase, styles.cancelButton]} onPress={onClose}>
                            <Text style={[styles.modalButtonTextBase, styles.cancelButtonText]}>Cancel</Text>
                        </TouchableOpacity>

                        {/* --- MODIFICATION START --- */}
                        <TouchableOpacity
                            style={[
                                styles.modalButtonBase,
                                { backgroundColor: isFormValid ? COLORS.primary : COLORS.disabled }
                            ]}
                            onPress={handleConfirmPress}
                            disabled={!isFormValid}
                        >
                            <Text style={[
                                styles.modalButtonTextBase,
                                { color: isFormValid ? COLORS.white : COLORS.grey }
                            ]}>
                                Confirm
                            </Text>
                        </TouchableOpacity>
                        {/* --- MODIFICATION END --- */}
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    rectifyModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: PADDING.large,
    },
    rectifyModalContent: {
        backgroundColor: COLORS.white,
        borderRadius: 10,
        padding: PADDING.large,
        width: '95%',
        maxWidth: 500,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    rectifyModalHeader: {
        fontSize: FONT_SIZES.large,
        fontWeight: 'bold',
        marginBottom: MARGIN.large,
        textAlign: 'center',
        color: COLORS.secondary,
    },
    defectInfoSection: {
        marginBottom: MARGIN.medium,
        padding: PADDING.medium,
        backgroundColor: COLORS.redinfo,
        borderRadius: 8,
    },
    defectInfoLabel: {
        fontSize: FONT_SIZES.small,
        fontWeight: 'bold',
        color: COLORS.black,
        marginBottom: MARGIN.xsmall,
    },
    defectInfoText: {
        fontSize: FONT_SIZES.medium,
        marginBottom: MARGIN.xsmall,
        color: COLORS.secondary,
    },
    inputLabel: {
        fontSize: FONT_SIZES.medium,
        fontWeight: '600',
        color: COLORS.secondary,
        marginBottom: MARGIN.small,
        marginTop: MARGIN.small,
    },
    input: {
        ...commonStyles.textInput,
    },
    pickerContainer: { borderWidth: 1, borderColor: COLORS.lightGrey, borderRadius: 5, backgroundColor: COLORS.white, marginBottom: MARGIN.medium, minHeight: 50, justifyContent: 'center', },
    picker: { marginVertical: 0, height: 55, width: '100%', color: COLORS.secondary, },
    remarkInput: {
        height: 90,
        textAlignVertical: 'top',
        paddingTop: PADDING.small,
    },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 48,
        borderColor: COLORS.lightGrey,
        borderWidth: 1,
        borderRadius: 8,
        marginBottom: MARGIN.medium,
        paddingHorizontal: PADDING.medium,
        backgroundColor: COLORS.white,
    },
    calendarIcon: {
        marginRight: MARGIN.small,
    },
    datePickerButtonText: {
        fontSize: FONT_SIZES.medium,
        color: COLORS.secondary,
    },
    rectifyModalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        marginTop: MARGIN.large,
    },
    modalButtonBase: { // Base styles - applied always
        borderRadius: 8,
        paddingVertical: PADDING.medium,
        paddingHorizontal: PADDING.xlarge,
        minWidth: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        backgroundColor: COLORS.veryLightGrey,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    modalButtonTextBase: { 
        fontSize: FONT_SIZES.medium,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    cancelButtonText: {
        color: COLORS.grey,
    },
});

const getSectionLetter = (sectionNumberInput) => {
    const sectionNumber = parseInt(sectionNumberInput, 10);
    const map = { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'F', 7: 'Others', };
    if (!isNaN(sectionNumber) && map.hasOwnProperty(sectionNumber)) { return map[sectionNumber]; }
    return sectionNumberInput;
};

export default RectifyInfoModal;