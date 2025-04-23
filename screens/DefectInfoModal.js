// screens/DefectInfoModal.js
import React, { useState, useContext, useEffect } from 'react';
import { View, Text, Modal, StyleSheet, TextInput, Alert, TouchableOpacity, FlatList, LayoutAnimation, Platform, UIManager } from 'react-native';
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

    const numColumns = 3;
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
                    style={localStyles.dropdownOptionsContainer}
                    data={formattedOptions}
                    keyExtractor={(item, index) => item.key || String(index)}
                    renderItem={({ item }) => {
                        if (item.empty === true) {
                            return <View style={[localStyles.option, localStyles.itemInvisible]} />;
                        }
                        return (
                            <TouchableOpacity
                                style={localStyles.option}
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

    // State Initialization (initial values from potentially existing defectDetails)
    // Note: Using defect.item.defectDetails?.category || '' assumes category is stored as "PAINTING", "MECHANICAL" etc.
    const [category, setCategory] = useState(defect.item.defectDetails?.category || '');
    const [type, setType] = useState(defect.item.defectDetails?.type || '');
    const [location, setLocation] = useState(defect.item.defectDetails?.location || '');
    const [remarks, setRemarks] = useState(defect.item.defectDetails?.remarks || '');
    const [marking, setMarking] = useState(false); // State for MarkModal visibility

    // State to control which dropdown is open
    const [activeDropdown, setActiveDropdown] = useState(category ? 'type' : 'category'); // Open type if category exists, else category

    // --- Remove Hardcoded Data ---
    // const defectTypes = { ... }; // This is now removed

    // Define location options (remains the same)
    const locationOptions = [
        { label: "Exterior", value: "Exterior" },
        { label: "Interior", value: "Interior" },
    ];

    // --- Use Context Helpers ---
    // Category options are directly from context: `categoryOptions`
    // Function to get type options based on selected category, using context helper
    const getTypeOptions = () => {
        return getTypeOptionsByCategory(category);
    };

    // --- Handlers (Logic remains similar, data source changes) ---
    const handleCategoryChange = (newCategory) => {
        setCategory(newCategory);
        setType(''); // Reset type when category changes
        setActiveDropdown('type'); // Open type dropdown next
    };

    const handleTypeChange = (newType) => {
        setType(newType);
        setActiveDropdown('location'); // Open Location dropdown next
    };

    const handleLocationChange = (newLocation) => {
        setLocation(newLocation);
        setActiveDropdown('none'); // Close Location dropdown after selection
    };

    const handleDropdownHeaderPress = (dropdownName) => {
        setActiveDropdown(current => (current === dropdownName ? 'none' : dropdownName));
    };

    const handleMark = () => {
        if (!category || !type || !location) {
            Alert.alert('Missing Information', 'Please select Category, Type, and Location before marking.');
            return;
        }
        // Use the correct item identifier (ID is better if available)
        // Assuming you updated ChecklistContext as suggested before to use item.id
        const itemId = defect.item.id; // Or defect.item.name if you didn't change it
        const identifier = defect.item.id ? 'id' : 'name'; // Determine which identifier is used

        updateDefectDetails(defect.section, defect.item[identifier], { // Use item.id or item.name
            category, // Store the category key (e.g., "PAINTING")
            type,
            location,
            remarks,
            marks: defect.item.defectDetails?.marks || [],
        });
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

                    {/* Category Dropdown - uses options from context */}
                    <CustomDropdown
                        label="Category"
                        options={categoryOptions}
                        selectedValue={category}
                        onValueChange={handleCategoryChange}
                        isOpen={activeDropdown === 'category'}
                        onHeaderPress={() => handleDropdownHeaderPress('category')}
                    />

                    {/* Type Dropdown - uses options generated via context helper */}
                    {category && (
                        <>
                            {/* <Text style={localStyles.label}>Type:</Text> */}
                            <CustomDropdown
                                label="Type"
                                options={getTypeOptions()} // Use updated function
                                selectedValue={type}
                                onValueChange={handleTypeChange}
                                isOpen={activeDropdown === 'type'}
                                onHeaderPress={() => handleDropdownHeaderPress('type')}
                            />
                        </>
                    )}

                    {/* Location Dropdown - remains the same */}
                    {type && (
                        <>
                            {/* <Text style={localStyles.label}>Location:</Text> */}
                            <CustomDropdown
                                label="Location"
                                options={locationOptions}
                                selectedValue={location}
                                onValueChange={handleLocationChange}
                                isOpen={activeDropdown === 'location'}
                                onHeaderPress={() => handleDropdownHeaderPress('location')}
                            />
                        </>
                    )}

                     {/* Remarks Input - remains the same */}
                    {location && (
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

                    {/* Action Buttons - remain the same */}
                    <View style={commonStyles.footerActionContainer}>
                        <TouchableOpacity
                            style={[commonStyles.actionButtonSecondary, localStyles.modalButton]}
                            onPress={onClose}
                        >
                            <Text style={[commonStyles.actionButtonText, localStyles.modalButtonText]}>Back</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                commonStyles.actionButton,
                                localStyles.modalButton,
                                (!category || !type || !location) ? commonStyles.actionButtonDisabled : {}
                            ]}
                            onPress={handleMark}
                            disabled={!category || !type || !location}
                        >
                            <Text style={[
                                commonStyles.actionButtonPrimaryText, // Assuming primary text style for main action
                                localStyles.modalButtonText,
                                (!category || !type || !location) ? commonStyles.actionButtonTextDisabled : {}
                                ]}>Mark</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Mark Modal - remains the same */}
            {marking && (
                <MarkModal
                    visible={marking}
                    onClose={() => setMarking(false)}
                    selectedItem={{
                        ...defect.item,
                        defectDetails: { category, type, location, remarks, marks: defect.item.defectDetails?.marks || [] },
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