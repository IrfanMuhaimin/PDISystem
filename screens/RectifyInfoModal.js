// components/RectifyInfoModal.js (or screens/RectifyInfoModal.js)
import React, { useState, useEffect } from 'react';
import {
    Modal, View, Text, TextInput, TouchableOpacity,
    StyleSheet, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/FontAwesome'; // Using FontAwesome

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
                style={styles.rectifyModalOverlay}
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
                        style={styles.input}
                        placeholder="Enter Staff Name"
                        value={staffName}
                        onChangeText={setStaffName}
                        autoCapitalize="words"
                    />

                    {/* Staff No Input */}
                    <Text style={styles.inputLabel}>Staff No:</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter Staff No"
                        value={staffNo}
                        onChangeText={setStaffNo}
                     />

                    {/* Date Section */}
                    <Text style={styles.inputLabel}>Rectification Date:</Text>
                    <TouchableOpacity
                        style={styles.datePickerButton}
                        onPress={() => setShowPicker(true)}
                    >
                        <Icon name="calendar" size={20} color="#ef5b2d" style={styles.calendarIcon} />
                        <Text style={styles.datePickerButtonText}>
                            {formatDateForDisplay(date)}
                        </Text>
                    </TouchableOpacity>


                    {/* Remark Input */}
                    <Text style={styles.inputLabel}>Remark (Optional):</Text>
                    <TextInput
                        style={[styles.input, styles.remarkInput]}
                        placeholder="Enter any remarks"
                        value={remark}
                        onChangeText={setRemark}
                        multiline={true}
                        numberOfLines={3}
                    />

                    {/* Conditionally render the DateTimePicker */}
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
                        <TouchableOpacity style={[styles.rectifyModalButton, styles.cancelButton]} onPress={onClose}>
                            <Text style={[styles.rectifyButtonText, styles.cancelButtonText]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.rectifyModalButton, styles.confirmButton]} onPress={handleConfirmPress}>
                            <Text style={styles.rectifyButtonText}>Confirm</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

// --- Styles for RectifyInfoModal ---
const styles = StyleSheet.create({
    rectifyModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 20, },
    rectifyModalContent: { backgroundColor: '#fff', borderRadius: 10, padding: 25, width: '90%', maxWidth: 500, shadowColor: "#000", shadowOffset: { width: 0, height: 2, }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, },
    rectifyModalHeader: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#333', },
    defectInfoSection: { marginBottom: 15, padding: 10, backgroundColor: '#f0f0f0', borderRadius: 5, },
    defectInfoLabel: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 3, },
    defectInfoText: { fontSize: 15, marginBottom: 3, color: '#444', },
    inputLabel: { fontSize: 16, fontWeight: '600', color: '#444', marginBottom: 5, marginTop: 8, },
    input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, marginBottom: 10, backgroundColor: '#fff', },
    remarkInput: { height: 80, textAlignVertical: 'top', },
    datePickerButton: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ccc', borderRadius: 5, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 15, backgroundColor: '#fff', },
    calendarIcon: { marginRight: 10, },
    datePickerButtonText: { fontSize: 16, color: '#333', },
    rectifyModalButtons: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10, },
    rectifyModalButton: { borderRadius: 5, paddingVertical: 12, paddingHorizontal: 30, minWidth: 100, alignItems: 'center', },
    cancelButton: { backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#ddd', },
    confirmButton: { backgroundColor: '#ef5b2d', },
    rectifyButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff', textAlign: 'center', },
    cancelButtonText: { color: '#555', },
});

// Helper function used inside the modal
const getSectionLetter = (sectionNumberInput) => {
    const sectionNumber = parseInt(sectionNumberInput, 10);
    const map = { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'F', 7: 'Others', };
    if (!isNaN(sectionNumber) && map.hasOwnProperty(sectionNumber)) { return map[sectionNumber]; }
    return sectionNumberInput; // Return original if not mappable
};

export default RectifyInfoModal;