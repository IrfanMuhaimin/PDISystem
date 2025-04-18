// ChecklistPage.js
import React, { useContext, useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import CheckBox from 'react-native-checkbox';
import { ChecklistContext } from '../context/ChecklistContext';
import DefectInfoModal from './DefectInfoModal';

// --- Import ScreenWrapper ---
// *** ADJUST PATH IF NEEDED ***
import ScreenWrapper from '../styles/flowstudiosbg.js';

// --- Import Common Styles & Constants ---
// *** ADJUST PATH IF NEEDED ***
// Re-import constants needed for padding/margin in wrapperContent
import { COLORS, PADDING, MARGIN } from '../styles/commonStyles';

// Helper function to format date (Keep as is)
const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) { return 'Invalid Date'; }
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day}-${month}-${year}, ${hours}:${minutes}`;
    } catch (error) { console.error("Error formatting date:", error); return dateString; }
};


export default function ChecklistPage({ navigation }) {
    const { checklist, toggleCheck, toggleDefect, carInfo, toggleCheckAll } = useContext(ChecklistContext);
    const [selectedDefect, setSelectedDefect] = useState(null);
    const [collapsedSections, setCollapsedSections] = useState({});

    const toggleSection = (section) => {
        setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    // isChecklistComplete logic (Keep as is)
    const isChecklistComplete = useMemo(() => {
        if (!checklist || Object.keys(checklist).length === 0) return false;
        const allItems = Object.values(checklist).flat();
        if (allItems.length === 0) return false;
        return allItems.every(item => item.checked || item.defect);
    }, [checklist]);

    return (
        // Use ScreenWrapper instead of SafeAreaView
        <ScreenWrapper
            showHeader={true} // Show Header from Wrapper
            showFooter={true} // Show Footer from Wrapper
            // Pass the wrapperContent style to ScreenWrapper's inner content area
            contentStyle={styles.wrapperContent}
            enableKeyboardAvoidingView={Platform.OS === 'ios'}
            enableScrollView={false} // Use own ScrollView below
        >
            {/* Content below uses the original styles object */}

            <Text style={styles.header}>PDI Checklist</Text>
            <Text style={styles.subHeader}>Chassis Number: {carInfo.chassis_no}</Text>
            <Text style={styles.carInfo}>Model/Variant: {carInfo.model} / {carInfo.variant}</Text>
            <Text style={styles.carInfo}>Engine No: {carInfo.engine_no}</Text>
            <Text style={styles.carInfo}>Color Code: {carInfo.colour_code}</Text>
            <Text style={styles.carInfo}>Entry Date: {carInfo.entry_date || 'N/A'}</Text>

            {/* Ensure this ScrollView style allows background through */}
            <ScrollView style={styles.scrollViewContainer}>
                {Object.entries(checklist).map(([section, items], sectionIndex) => (
                    <View key={section} style={styles.section}>
                        <TouchableOpacity
                            style={styles.sectionHeader}
                            onPress={() => toggleSection(section)}
                        >
                            <Text style={styles.sectionTitle}>
                                {collapsedSections[section] ? '▶︎' : '▼'} Section {section}
                            </Text>
                            <CheckBox
                                label="Select All"
                                checked={items.every(item => item.checked)}
                                onChange={() => {
                                    const isAllChecked = items.every(item => item.checked);
                                    toggleCheckAll(section, !isAllChecked);
                                }}
                                labelStyle={{ color: 'black' }}
                            />
                        </TouchableOpacity>

                        {!collapsedSections[section] && (
                            items.map((item, itemIndex) => (
                                <View key={item.id} style={styles.item}>
                                    <Text style={styles.itemName}>
                                        {`${sectionIndex + 1}.${itemIndex + 1}. `} {item.name}
                                    </Text>
                                    <CheckBox
                                        label="Check"
                                        checked={item.checked}
                                        onChange={() => toggleCheck(section, item.id)}
                                        labelStyle={{ color: item.checked ? 'green' : 'black' }}
                                    />
                                    <CheckBox
                                        label="Defect"
                                        checked={item.defect}
                                        onChange={() => {
                                            const isBecomingDefect = !item.defect;
                                            toggleDefect(section, item.id);
                                            if (isBecomingDefect) {
                                                setSelectedDefect({ section, item });
                                            }
                                        }}
                                        labelStyle={{ color: item.defect ? 'red' : 'black' }}
                                    />
                                </View>
                            ))
                        )}
                    </View>
                ))}
            </ScrollView>

            {/* Original Footer View and Button styles */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.buttonBack} onPress={() => navigation.goBack()}>
                    <Text style={styles.buttonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.button, !isChecklistComplete && styles.buttonDisabled]}
                    onPress={() => navigation.navigate('Summary')}
                    disabled={!isChecklistComplete}
                >
                    <Text style={[styles.buttonText, !isChecklistComplete && styles.buttonTextDisabled]}>Next</Text>
                </TouchableOpacity>
            </View>

            {/* Modal remains the same */}
            {selectedDefect && (
                <DefectInfoModal
                    defect={selectedDefect}
                    onClose={() => setSelectedDefect(null)}
                />
            )}
        </ScreenWrapper>
    );
}

// --- ORIGINAL Styles with minimal changes ---
const styles = StyleSheet.create({
    // This style is passed to ScreenWrapper's contentStyle prop
    wrapperContent: {
        flex: 1, // Allow content area to fill space
        backgroundColor: 'transparent', // <-- Ensure transparency to see ScreenWrapper's background
        paddingHorizontal: PADDING.medium, // Add horizontal padding (using imported constant)
        paddingBottom: PADDING.small, // Add bottom padding (using imported constant)
    },
    // This style is for the ScrollView component itself
    scrollViewContainer: {
       flex: 1, // Allow scroll view to take available space within wrapperContent
       backgroundColor: 'transparent', // <-- Ensure transparency
    },
    // --- Styles below are kept as original ---
    header: { fontSize: 30, fontWeight: 'bold', textAlign: 'center', marginBottom: 5 },
    subHeader: { fontSize: 20, textAlign: 'center', marginBottom: 20 },
    carInfo: { fontSize: 16, marginBottom: 5, textAlign: 'center' },
    section: { marginBottom: 10, marginLeft: 16 },
    sectionTitle: { fontSize: 25, fontWeight: 'bold', marginRight: 15 },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginRight: 16,
        marginBottom: 20,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f8f8f8', // Keep original color
        padding: 10,
        marginVertical: 5,
        marginRight: 16,
        borderRadius: 5
    },
    itemName: { flex: 1, fontSize: 16, marginRight: 8 },
    button: {
        backgroundColor: '#ffe6cc',
        paddingHorizontal: 50,
        paddingVertical: 20,
        borderRadius: 5,
    },
    buttonBack: {
        backgroundColor: '#f5f5f5',
        paddingHorizontal: 50,
        paddingVertical: 20,
        borderRadius: 5,
    },
    buttonText: {
        fontSize: 25,
        fontWeight: 'bold',
        color: '#333',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        marginTop: 10,
        // Removed paddingBottom, handled by wrapperContent padding
    },
    buttonDisabled: {
        backgroundColor: '#cccccc',
    },
    buttonTextDisabled: {
        color: '#888888',
    }
    // Removed original 'container' style as ScreenWrapper handles the outermost layer
});