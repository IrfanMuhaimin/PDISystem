// screens/RectifyInfoModal.js
import React, { useState, useEffect } from 'react';
import {
    Modal, View, Text, TextInput, TouchableOpacity,
    StyleSheet, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/FontAwesome'; // Using FontAwesome

// Import theme constants and common styles
import commonStyles, { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/commonStyles';

const RectifyInfoModal = ({ visible, item, onClose, onConfirm }) => {
    const [staffName, setStaffName] = useState('');
    const [staffNo, setStaffNo] = useState('');
    const [date, setDate] = useState(new Date());
    const [showPicker, setShowPicker] = useState(false);
    const [remark, setRemark] = useState('');

    useEffect(() => {
        // Reset form when modal becomes visible or item changes
        if (visible) {
            setStaffName('');
            setStaffNo('');
            setDate(new Date());
            setRemark('');
            setShowPicker(false);
        }
    }, [visible]); // Only depend on visibility to reset

    const handleConfirmPress = () => {
        if (!staffName.trim() || !staffNo.trim()) {
            Alert.alert("Missing Information", "Please enter Staff Name and Staff No.");
            return;
        }
        // Pass data to the onConfirm prop received from parent
        onConfirm(staffName.trim(), staffNo.trim(), remark.trim(), date.toISOString());
    };

    const formatDateForDisplay = (dateObj) => {
        try { return dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
        catch { return 'Invalid Date'; }
    };

    const onDateChange = (event, selectedDate) => {
        const currentDate = selectedDate || date;
        setShowPicker(false); // Hide picker after interaction on both platforms
        if (event.type === 'set') {
             setDate(currentDate);
        }
    };

    // Render nothing if not visible or no item
    if (!visible || !item) {
        return null;
    }

    // Extract defect info safely
    const defectInfo = item.allDefects?.[0];

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.rectifyModalOverlay} // Uses themed background color
            >
                <View style={styles.rectifyModalContent}>
                    <Text style={styles.rectifyModalHeader}>Rectification Information</Text>

                    {/* Defect Info */}
                    <View style={styles.defectInfoSection}>
                       <Text style={styles.defectInfoLabel}>Defect:</Text>
                       {/* Display item section and name */}
                       <Text style={styles.defectInfoText}> {(item.section ? `${getSectionLetter(item.section)} - ` : '') + item.name} </Text>
                       {/* Display defect category and type if available */}
                       {defectInfo && (
                            <>
                               <Text style={styles.defectInfoText}>Category: {defectInfo.category || 'N/A'}</Text>
                               <Text style={styles.defectInfoText}>Type: {defectInfo.type || 'N/A'}</Text>
                            </>
                       )}
                    </View>

                    {/* Staff Name Input */}
                    <Text style={styles.inputLabel}>Staff Name:</Text>
                    <TextInput
                        style={styles.input} // Uses themed input style
                        placeholder="Enter Staff Name"
                        placeholderTextColor={COLORS.lightGrey} // Added for consistency
                        value={staffName}
                        onChangeText={setStaffName}
                        autoCapitalize="words"
                    />

                    {/* Staff No Input */}
                    <Text style={styles.inputLabel}>Staff No:</Text>
                    <TextInput
                        style={styles.input} // Uses themed input style
                        placeholder="Enter Staff No"
                        placeholderTextColor={COLORS.lightGrey} // Added for consistency
                        value={staffNo}
                        onChangeText={setStaffNo}
                     />

                    {/* Date Section */}
                    <Text style={styles.inputLabel}>Rectification Date:</Text>
                    <TouchableOpacity
                        style={styles.datePickerButton} // Style resembles input but is touchable
                        onPress={() => setShowPicker(true)}
                    >
                        <Icon name="calendar" size={20} color={COLORS.primary} style={styles.calendarIcon} />
                        <Text style={styles.datePickerButtonText}>
                            {formatDateForDisplay(date)}
                        </Text>
                    </TouchableOpacity>

                    {/* Remark Input */}
                    <Text style={styles.inputLabel}>Remark (Optional):</Text>
                    <TextInput
                        style={[styles.input, styles.remarkInput]} // Based on themed input, adds multiline props
                        placeholder="Enter any remarks"
                        placeholderTextColor={COLORS.lightGrey} // Added for consistency
                        value={remark}
                        onChangeText={setRemark}
                        multiline={true}
                        numberOfLines={3} // Suggestion, might not be strictly enforced visually
                    />

                    {/* Conditionally render the DateTimePicker */}
                    {showPicker && (
                        <DateTimePicker
                            testID="dateTimePicker"
                            value={date}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={onDateChange}
                            maximumDate={new Date()} // Keep max date logic
                             // Apply theme color if possible (might depend on picker implementation)
                            // accentColor={COLORS.primary} // This prop might not exist or work universally
                        />
                    )}

                    {/* Action Buttons */}
                    <View style={styles.rectifyModalButtons}>
                        <TouchableOpacity style={[styles.modalButtonBase, styles.cancelButton]} onPress={onClose}>
                            <Text style={[styles.modalButtonTextBase, styles.cancelButtonText]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.modalButtonBase, styles.confirmButton]} onPress={handleConfirmPress}>
                            <Text style={[styles.modalButtonTextBase, styles.confirmButtonText]}>Confirm</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

// --- Styles for RectifyInfoModal using Theme ---
const styles = StyleSheet.create({
    rectifyModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)', // Using black with opacity for overlay
        justifyContent: 'center',
        alignItems: 'center',
        padding: PADDING.large, // Use theme padding
    },
    rectifyModalContent: {
        backgroundColor: COLORS.white,
        borderRadius: 10, // Consistent moderate rounding
        padding: PADDING.large, // Use theme padding
        width: '95%', // Slightly wider for smaller screens
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
        color: COLORS.grey,
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
    modalButtonBase: {
        borderRadius: 8, 
        paddingVertical: PADDING.small,
        paddingHorizontal: PADDING.large,
        minWidth: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        backgroundColor: COLORS.veryLightGrey, 
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    confirmButton: {
        backgroundColor: COLORS.primary, 
    },
    modalButtonTextBase: {
        fontSize: FONT_SIZES.medium,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    cancelButtonText: {
        color: COLORS.grey,
    },
    confirmButtonText: {
        color: COLORS.white,
    },
});

// Helper function used inside the modal (remains unchanged)
const getSectionLetter = (sectionNumberInput) => {
    const sectionNumber = parseInt(sectionNumberInput, 10);
    const map = { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'F', 7: 'Others', };
    if (!isNaN(sectionNumber) && map.hasOwnProperty(sectionNumber)) { return map[sectionNumber]; }
    return sectionNumberInput; // Return original if not mappable
};

export default RectifyInfoModal;