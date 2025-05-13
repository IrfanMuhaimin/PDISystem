// screens/InspectionConfirm.js
import React from 'react';
import {
    Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator
} from 'react-native';

const InspectionConfirm = ({
    visible,
    onClose,
    onConfirm,
    decision,
    vehicleData,
    pdiStaffName,           // The supervisor logged in who is CONFIRMING
    pdiPerformerName,       // The staff who originally performed the PDI
    rectifiedItemsCount,
    isSubmitting
}) => {

    if (!vehicleData) {
        console.error("InspectionConfirm Modal requires vehicleData prop.");
        return null;
    }

    const decisionText = decision === 'OK' ? 'PDI OK' : 'PDI NOK';
    const confirmButtonStyle = styles.confirmButtonPrimary;
    const confirmButtonTextStyle = styles.buttonTextWhite;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={onClose}>
                <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                    <Text style={styles.modalTitle}>Confirm Final Inspection</Text>
                    <View style={styles.separator} />

                    <Text style={styles.confirmationText}>
                        Are you sure you want to mark this unit's final inspection as <Text style={{ fontWeight: 'bold' }}>{decisionText}</Text>?
                    </Text>

                    {/* Vehicle Info */}
                    <View style={styles.infoSection}><Text style={styles.infoLabel}>Chassis No:</Text><Text style={styles.infoValue}>{vehicleData.chassis_no ?? 'N/A'}</Text></View>
                    <View style={styles.infoSection}><Text style={styles.infoLabel}>Colour:</Text><Text style={styles.infoValue}>{vehicleData.colour_code ?? 'N/A'}</Text></View>
                    <View style={styles.infoSection}><Text style={styles.infoLabel}>Engine No:</Text><Text style={styles.infoValue}>{vehicleData.engine_no ?? 'N/A'}</Text></View>

                    <View style={styles.separator} />

                    {/* Inspection Info */}
                    <View style={styles.infoSection}>
                        <Text style={styles.infoLabel}>PDI By:</Text>
                        {/* *** DISPLAY THE NEW PROP HERE *** */}
                        <Text style={styles.infoValue}>{pdiPerformerName ?? 'N/A'}</Text>
                        {/* *** END DISPLAY CHANGE *** */}
                    </View>
                    <View style={styles.infoSection}>
                        <Text style={styles.infoLabel}>Rectified Previous Defects:</Text>
                        <Text style={styles.infoValue}>{rectifiedItemsCount ?? 0}</Text>
                    </View>
                    {/* Optional: If you still want to show who is confirming */}
                    {/* <View style={styles.infoSection}>
                        <Text style={styles.infoLabel}>Confirming As:</Text>
                        <Text style={styles.infoValue}>{pdiStaffName ?? 'N/A'}</Text>
                    </View> */}


                    <View style={styles.separator} />

                    {/* Action Buttons */}
                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose} disabled={isSubmitting} >
                            <Text style={styles.buttonTextCancel}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.button, confirmButtonStyle, isSubmitting && styles.buttonDisabled]} onPress={onConfirm} disabled={isSubmitting} >
                            {isSubmitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={confirmButtonTextStyle}>Confirm</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    modalContent: {
        width: '90%',
        maxWidth: 400,
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 25,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
        color: '#333',
    },
    separator: {
        height: 1,
        backgroundColor: '#eee',
        width: '100%',
        marginVertical: 15,
    },
    confirmationText: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
        color: '#444',
        lineHeight: 22,
    },
    infoSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 10,
    },
    infoLabel: {
        fontSize: 15,
        color: '#555',
        fontWeight: '600',
        marginRight: 10,
    },
    infoValue: {
        fontSize: 15,
        color: '#111',
        fontWeight: '500',
        textAlign: 'right',
        flexShrink: 1,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 20,
    },
    button: {
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 20,
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 45,
    },
    cancelButton: {
        backgroundColor: '#f0f0f0',
        borderWidth: 1,
        borderColor: '#ccc',
        marginRight: 10,
    },
    confirmButtonPrimary: { // Generic confirm style
        backgroundColor: '#ef5b2d', 
        marginLeft: 10,
    },
    buttonTextCancel: {
        color: '#555',
        fontWeight: 'bold',
        fontSize: 16,
    },
    buttonTextWhite: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    buttonDisabled: {
        opacity: 0.6,
        backgroundColor: '#cccccc',
    },
});

export default InspectionConfirm;