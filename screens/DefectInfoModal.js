// screens/DefectInfoModal.js
import React, { useState, useContext, useEffect } from 'react';
import {
    View, Text, Modal, StyleSheet, TextInput, Alert,
    TouchableOpacity, FlatList, LayoutAnimation, Platform, UIManager
} from 'react-native';
import CheckBox from 'react-native-checkbox'; // Ensure this is the checkbox component you intend to use
import MarkModal from './MarkModal';
import { ChecklistContext } from '../context/ChecklistContext';
import { DefectTypeContext } from '../context/defectTypeContext'; // Import the new context
import commonStyles, { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/commonStyles';

if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

// --- CustomDropdown Component (Keep As Is) ---
const CustomDropdown = ({
    label, options, selectedValue, onValueChange, isOpen, onHeaderPress
}) => {
    useEffect(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }, [isOpen]);

    const handleOptionPress = (itemValue) => {
        onValueChange(itemValue);
    };

    const selectedLabel = options.find(opt => opt.value === selectedValue)?.label || 'Select';

    const formatRows = (data, numColumns) => {
        if (!data || data.length === 0) return [];
        const rows = [...data];
        const numberOfFullRows = Math.floor(rows.length / numColumns);
        let numberOfElementsLastRow = rows.length - (numberOfFullRows * numColumns);
        while (numberOfElementsLastRow !== numColumns && numberOfElementsLastRow !== 0) {
            rows.push({ key: `blank-${numberOfElementsLastRow}-${Math.random()}`, empty: true });
            numberOfElementsLastRow++;
        }
        return rows;
    };

    // Use 2 columns for Major/Minor for better layout
    const numColumns = label === 'Severity' ? 2 : 3;
    const formattedOptions = formatRows(options, numColumns);

    return (
        <View style={localStyles.dropdownContainer}>
            <TouchableOpacity style={localStyles.dropdownHeader} onPress={onHeaderPress}>
                <Text style={localStyles.dropdownHeaderText}>
                    {label}: {selectedLabel} {isOpen ? '▲' : '▼'}
                </Text>
            </TouchableOpacity>
            {isOpen && (
                <FlatList
                    // Adjust style for fewer options if needed
                    style={[localStyles.dropdownOptionsContainer, label === 'Severity' && { maxHeight: 80 } ]}
                    data={formattedOptions}
                    keyExtractor={(item, index) => item.key || String(index)}
                    renderItem={({ item }) => {
                        if (item.empty === true) {
                            return <View style={[localStyles.option, localStyles.itemInvisible]} />;
                        }
                        return (
                            <TouchableOpacity
                                style={[localStyles.option, label === 'Severity' && { alignItems: 'center' }]} // Center Severity options
                                onPress={() => handleOptionPress(item.value)}
                            >
                                <CheckBox
                                    label={item.label}
                                    checked={selectedValue === item.value}
                                    onChange={() => handleOptionPress(item.value)}
                                    labelStyle={localStyles.optionLabel}
                                />
                            </TouchableOpacity>
                        );
                    }}
                    numColumns={numColumns}
                />
            )}
        </View>
    );
};
// --- End CustomDropdown Component ---

export default function DefectInfoModal({ defect, onClose }) {
    // Use both contexts
    const { updateDefectDetails } = useContext(ChecklistContext);
    const { categoryOptions, getTypeOptionsByCategory } = useContext(DefectTypeContext); // Get data/helpers from DefectTypeContext

    // --- State Initialization ---
    const [category, setCategory] = useState(defect.item.defectDetails?.category || '');
    const [type, setType] = useState(defect.item.defectDetails?.type || '');
    const [location, setLocation] = useState(defect.item.defectDetails?.location || '');
    // --- NEW: State for Severity ---
    const [severity, setSeverity] = useState(defect.item.defectDetails?.severity || '');
    // --- END NEW ---
    const [remarks, setRemarks] = useState(defect.item.defectDetails?.remarks || '');
    const [marking, setMarking] = useState(false); // State for MarkModal visibility

    // --- State to control which dropdown is open ---
    const getInitialActiveDropdown = () => {
        if (!category) return 'category';
        if (!type) return 'type';
        if (!location) return 'location';
        // --- NEW: Check severity ---
        if (!severity) return 'severity';
        // --- END NEW ---
        return 'none'; // If all are filled, open none initially
    };
    const [activeDropdown, setActiveDropdown] = useState(getInitialActiveDropdown());

    // --- Options Definitions ---
    const locationOptions = [
        { label: "Exterior", value: "Exterior" },
        { label: "Interior", value: "Interior" },
    ];
    // --- NEW: Severity Options ---
    const severityOptions = [
        { label: "Major", value: "Major" },
        { label: "Minor", value: "Minor" },
    ];
    // --- END NEW ---

    const getTypeOptions = () => {
        return getTypeOptionsByCategory(category);
    };

    // --- Handlers ---
    const handleCategoryChange = (newCategory) => {
        setCategory(newCategory);
        setType(''); // Reset subsequent fields
        setLocation('');
        setSeverity('');
        setActiveDropdown('type'); // Open type dropdown next
    };

    const handleTypeChange = (newType) => {
        setType(newType);
        setLocation(''); // Reset subsequent fields
        setSeverity('');
        setActiveDropdown('location'); // Open Location dropdown next
    };

    const handleLocationChange = (newLocation) => {
        setLocation(newLocation);
        setSeverity(''); // Reset subsequent fields
        setActiveDropdown('severity'); // --- MODIFIED: Open Severity dropdown next ---
    };

    // --- NEW: Handler for Severity Change ---
    const handleSeverityChange = (newSeverity) => {
        setSeverity(newSeverity);
        setActiveDropdown('none'); // Close Severity dropdown after selection (or focus remarks)
    };
    // --- END NEW ---

    const handleDropdownHeaderPress = (dropdownName) => {
        setActiveDropdown(current => (current === dropdownName ? 'none' : dropdownName));
    };

    const handleMark = () => {
        // --- MODIFIED: Added severity check ---
        if (!category || !type || !location || !severity) {
            Alert.alert('Missing Information', 'Please select Category, Type, Location, and Severity before marking.');
            return;
        }
        // --- END MODIFIED ---

        const itemId = defect.item.id;
        const identifier = defect.item.id ? 'id' : 'name';

        // --- MODIFIED: Added severity to the details object ---
        updateDefectDetails(defect.section, defect.item[identifier], {
            category,
            type,
            location,
            severity, // <-- ADDED
            remarks,
            marks: defect.item.defectDetails?.marks || [],
        });
        // --- END MODIFIED ---
        setMarking(true);
    };

    return (
        <Modal
            visible={true}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={localStyles.modalContainer}>
                <View style={localStyles.modalContent}>

                    <Text style={localStyles.title}>Defect Information</Text>
                    <View style={localStyles.infoBox}>
                        <Text style={localStyles.infoTitle}>Section {defect.section} - {defect.item.name}</Text>
                    </View>

                    {/* Category Dropdown */}
                    <CustomDropdown
                        label="Category"
                        options={categoryOptions}
                        selectedValue={category}
                        onValueChange={handleCategoryChange}
                        isOpen={activeDropdown === 'category'}
                        onHeaderPress={() => handleDropdownHeaderPress('category')}
                    />

                    {/* Type Dropdown */}
                    {category && (
                        <CustomDropdown
                            label="Type"
                            options={getTypeOptions()}
                            selectedValue={type}
                            onValueChange={handleTypeChange}
                            isOpen={activeDropdown === 'type'}
                            onHeaderPress={() => handleDropdownHeaderPress('type')}
                        />
                    )}

                    {/* Location Dropdown */}
                    {type && (
                         <CustomDropdown
                             label="Location"
                             options={locationOptions}
                             selectedValue={location}
                             onValueChange={handleLocationChange}
                             isOpen={activeDropdown === 'location'}
                             onHeaderPress={() => handleDropdownHeaderPress('location')}
                        />
                    )}

                    {/* --- NEW: Severity Dropdown --- */}
                    {location && ( // Show after Location is selected
                        <CustomDropdown
                            label="Severity"
                            options={severityOptions}
                            selectedValue={severity}
                            onValueChange={handleSeverityChange}
                            isOpen={activeDropdown === 'severity'}
                            onHeaderPress={() => handleDropdownHeaderPress('severity')}
                        />
                    )}
                    {/* --- END NEW --- */}

                     {/* Remarks Input */}
                    {/* --- MODIFIED: Show after Severity is selected --- */}
                    {severity && (
                       <>
                         <Text style={localStyles.label}>Remarks:</Text>
                         <TextInput
                            style={[commonStyles.textInput, localStyles.remarksInput]}
                            placeholder="Enter remarks (optional)"
                            placeholderTextColor={COLORS.grey}
                            value={remarks}
                            onChangeText={setRemarks}
                            multiline={true}
                            numberOfLines={3}
                        />
                      </>
                    )}
                    {/* --- END MODIFIED --- */}

                    {/* Action Buttons */}
                    <View style={commonStyles.footerActionContainer}>
                        <TouchableOpacity
                            style={[commonStyles.actionButtonSecondary, localStyles.modalButton]}
                            onPress={onClose}
                        >
                            <Text style={[commonStyles.actionButtonText, localStyles.modalButtonText]}>Back</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            // --- MODIFIED: Added severity check to disabled condition ---
                            style={[
                                commonStyles.actionButton,
                                localStyles.modalButton,
                                (!category || !type || !location || !severity) ? commonStyles.actionButtonDisabled : {}
                            ]}
                            onPress={handleMark}
                            disabled={!category || !type || !location || !severity}
                            // --- END MODIFIED ---
                        >
                            <Text style={[
                                commonStyles.actionButtonPrimaryText,
                                localStyles.modalButtonText,
                                // --- MODIFIED: Added severity check to disabled text style ---
                                (!category || !type || !location || !severity) ? FONT_SIZES.large : {}
                                // --- END MODIFIED ---
                                ]}>Mark</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Mark Modal */}
            {marking && (
                <MarkModal
                    visible={marking}
                    onClose={() => setMarking(false)}
                    selectedItem={{
                        ...defect.item,
                        // --- MODIFIED: Include severity in data passed to MarkModal if needed ---
                        defectDetails: { category, type, location, severity, remarks, marks: defect.item.defectDetails?.marks || [] },
                        // --- END MODIFIED ---
                    }}
                    closeDefectModal={onClose}
                />
            )}
        </Modal>
    );
}

// --- Styles (Keep As Is) ---
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
    remarksInput: {
        minHeight: 80,
        height: 'auto',
        textAlignVertical: 'top',
        // Make sure textInput style from commonStyles includes border, padding etc.
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
    dropdownContainer: {
        marginBottom: MARGIN.medium,
    },
    dropdownHeader: {
        borderWidth: 1,
        borderColor: COLORS.lightGrey,
        borderRadius: 5,
        padding: PADDING.medium,
        backgroundColor: COLORS.white,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dropdownHeaderText: {
        fontSize: FONT_SIZES.medium,
        fontWeight: '600',
        color: COLORS.secondary,
        flexShrink: 1,
        marginRight: MARGIN.small,
    },
    dropdownOptionsContainer: {
        maxHeight: 150, // Adjust as needed
        borderWidth: 1,
        borderColor: COLORS.lightGrey,
        backgroundColor: COLORS.white,
        borderRadius: 5,
        marginTop: MARGIN.xsmall,
    },
    option: {
        paddingVertical: PADDING.small,
        paddingHorizontal: PADDING.small,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.divider,
        flex: 1,
        alignItems: 'flex-start', // Align checkbox+label to the left
        margin: 2, // Small margin around each item
        backgroundColor: COLORS.white, // Ensure background for touchable area
        borderRadius: 3,
    },
    optionLabel: {
        fontSize: FONT_SIZES.medium,
        color: COLORS.secondary,
        marginLeft: MARGIN.small, // Space between checkbox and label
    },
    itemInvisible: {
        backgroundColor: 'transparent',
        borderBottomWidth: 0,
    },
});