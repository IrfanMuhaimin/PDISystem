// DefectInfoModal.js
import React, { useState, useContext, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TextInput,
    Alert,
    TouchableOpacity,
    FlatList,
    LayoutAnimation,
    Platform,
    UIManager,
} from 'react-native';
import CheckBox from 'react-native-checkbox'; // Using the import from the original code
import MarkModal from './MarkModal'; // Ensure this path is correct
import { ChecklistContext } from '../context/ChecklistContext'; // Ensure this path is correct

// --- Import Common Styles & Constants ---
import commonStyles, { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/commonStyles';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

// --- Custom Dropdown Component (Controlled by Parent) ---
const CustomDropdown = ({
    label,
    options,
    selectedValue,
    onValueChange,
    isOpen, // Controlled by parent
    onHeaderPress, // Callback for manual toggle
}) => {

    useEffect(() => {
        // Animate layout changes when isOpen prop changes
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }, [isOpen]);

    const handleOptionPress = (itemValue) => {
        onValueChange(itemValue);
        // Parent controls opening/closing next dropdown
    };

    // Find label for the selected value, default to 'Select'
    const selectedLabel = options.find(opt => opt.value === selectedValue)?.label || 'Select';

    // Function to format options into rows for grid layout
    const formatRows = (data, numColumns) => {
        if (!data || data.length === 0) return [];
        const rows = [...data]; // Create a copy
        const numberOfFullRows = Math.floor(rows.length / numColumns);
        let numberOfElementsLastRow = rows.length - (numberOfFullRows * numColumns);
        while (numberOfElementsLastRow !== numColumns && numberOfElementsLastRow !== 0) {
            rows.push({ key: `blank-${numberOfElementsLastRow}-${Math.random()}`, empty: true }); // Add unique key part
            numberOfElementsLastRow++;
        }
        return rows;
    };

    const numColumns = 3;
    const formattedOptions = formatRows(options, numColumns);

    return (
        <View style={localStyles.dropdownContainer}>
            {/* Dropdown Header - Toggles via parent */}
            <TouchableOpacity style={localStyles.dropdownHeader} onPress={onHeaderPress}>
                <Text style={localStyles.dropdownHeaderText}>
                    {label}: {selectedLabel} {isOpen ? '▲' : '▼'}
                </Text>
            </TouchableOpacity>
            {/* Options List - Conditionally rendered based on isOpen prop */}
            {isOpen && (
                <FlatList
                    style={localStyles.dropdownOptionsContainer}
                    data={formattedOptions}
                    keyExtractor={(item, index) => item.key || String(index)}
                    renderItem={({ item }) => {
                        // Render blank view for placeholder items
                        if (item.empty === true) {
                            return <View style={[localStyles.option, localStyles.itemInvisible]} />;
                        }
                        // Render actual option item
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
                                    // Add specific styling props for your Checkbox library if needed
                                    // e.g., checkboxStyle={{...}} tintColors={{...}} for @react-native-community/checkbox
                                    // e.g., color={selectedValue === item.value ? COLORS.primary : undefined} for expo-checkbox
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
// --- End CustomDropdown ---


// --- Main DefectInfoModal Component ---
export default function DefectInfoModal({ defect, onClose }) {
    const { updateDefectDetails } = useContext(ChecklistContext);

    // State Initialization
    const [category, setCategory] = useState(defect.item.defectDetails?.category || '');
    const [type, setType] = useState(defect.item.defectDetails?.type || '');
    const [location, setLocation] = useState(defect.item.defectDetails?.location || '');
    const [remarks, setRemarks] = useState(defect.item.defectDetails?.remarks || '');
    const [marking, setMarking] = useState(false); // State for MarkModal visibility

    // State to control which dropdown is open ('category', 'type', 'location', 'none')
    const [activeDropdown, setActiveDropdown] = useState('category'); // Start with category open

    // Data Definitions
    const defectTypes = {
        Mechanical: ['Hinge', 'Gap', 'Jammed'],
        Painting: ['Scratch', 'Chipping', 'Dent'],
        Electrical: ['Wiring', 'Fuse', 'Malfunction'],
    };
    const categoryOptions = [
        { label: "Mechanical", value: "Mechanical" },
        { label: "Painting", value: "Painting" },
        { label: "Electrical", value: "Electrical" },
    ];
    const locationOptions = [
        { label: "Exterior", value: "Exterior" },
        { label: "Interior", value: "Interior" },
    ];
    // Function to get type options based on selected category
    const getTypeOptions = () => {
        if (!category) return [];
        return defectTypes[category]?.map(t => ({ label: t, value: t })) || []; // Added safe navigation
    };

    // --- Handlers with Sequential Logic ---
    const handleCategoryChange = (newCategory) => {
        setCategory(newCategory);
        setType(''); // Reset type when category changes
        setActiveDropdown('type'); // Open Type dropdown next
    };

    const handleTypeChange = (newType) => {
        setType(newType);
        setActiveDropdown('location'); // Open Location dropdown next
    };

    const handleLocationChange = (newLocation) => {
        setLocation(newLocation);
        setActiveDropdown('none'); // Close Location dropdown after selection
    };

    // Handler for manually opening/closing dropdowns if user clicks header
    const handleDropdownHeaderPress = (dropdownName) => {
        setActiveDropdown(current => (current === dropdownName ? 'none' : dropdownName));
    };

    // Handler for the 'Mark' button
    const handleMark = () => {
        if (!category || !type || !location) {
            Alert.alert('Missing Information', 'Please select Category, Type, and Location before marking.');
            return;
        }
        // Update context with current details before opening MarkModal
        updateDefectDetails(defect.section, defect.item.name, {
            category,
            type,
            location,
            remarks,
            marks: defect.item.defectDetails?.marks || [], // Preserve existing marks
        });
        setMarking(true); // Show the MarkModal
    };

    return (
        <Modal
            visible={true}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose} // Handle back button press on Android
        >
            <View style={localStyles.modalContainer}>
                <View style={localStyles.modalContent}>

                    <Text style={localStyles.title}>Defect Information</Text>
                    <View style={localStyles.infoBox}>
                        <Text style={localStyles.infoTitle}>Section {defect.section} - {defect.item.name}</Text>
                    </View>

                    {/* Category Dropdown */}
                    <Text style={localStyles.label}>Category:</Text>
                    <CustomDropdown
                        label="Category"
                        options={categoryOptions}
                        selectedValue={category}
                        onValueChange={handleCategoryChange}
                        isOpen={activeDropdown === 'category'} // Controlled by state
                        onHeaderPress={() => handleDropdownHeaderPress('category')}
                    />

                    {/* Type Dropdown - Conditionally render based on category having a value */}
                    {category && (
                        <>
                            <Text style={localStyles.label}>Type:</Text>
                            <CustomDropdown
                                label="Type"
                                options={getTypeOptions()}
                                selectedValue={type}
                                onValueChange={handleTypeChange}
                                isOpen={activeDropdown === 'type'} // Controlled by state
                                onHeaderPress={() => handleDropdownHeaderPress('type')}
                            />
                        </>
                    )}

                    {/* Location Dropdown - Conditionally render based on type having a value */}
                    {type && ( // Only show location once type is selected
                        <>
                            <Text style={localStyles.label}>Location:</Text>
                            <CustomDropdown
                                label="Location"
                                options={locationOptions}
                                selectedValue={location}
                                onValueChange={handleLocationChange}
                                isOpen={activeDropdown === 'location'} // Controlled by state
                                onHeaderPress={() => handleDropdownHeaderPress('location')}
                            />
                        </>
                    )}

                    {/* Remarks Input - Render only when location is selected */}
                    {location && ( // Only show remarks once location is selected
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


                    {/* Footer Buttons */}
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
                                // Disable Mark button until all selections are made
                                (!category || !type || !location) ? commonStyles.actionButtonDisabled : {}
                            ]}
                            onPress={handleMark}
                            disabled={!category || !type || !location} // Disable button if selections incomplete
                        >
                            <Text style={[
                                commonStyles.actionButtonPrimaryText,
                                localStyles.modalButtonText,
                                (!category || !type || !location) ? commonStyles.actionButtonTextDisabled : {}
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
                    // Pass the latest defect details including potential existing marks
                    selectedItem={{
                        ...defect.item,
                        defectDetails: { category, type, location, remarks, marks: defect.item.defectDetails?.marks || [] },
                    }}
                    closeDefectModal={onClose} // Pass the main modal's close function
                />
            )}
        </Modal>
    );
}

// --- Styles (Themed) ---
const localStyles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)', // Overlay background
    },
    modalContent: {
        width: '90%', // Responsive width
        maxWidth: 500, // Max width for larger screens
        padding: PADDING.large, // Use common padding
        backgroundColor: COLORS.white, // Use theme background
        borderRadius: 10,
        maxHeight: '90%', // Prevent excessive height
        shadowColor: "#000", // Add subtle shadow
        shadowOffset: { width: 0, height: 2, },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    title: {
        fontSize: FONT_SIZES.xlarge, // Use common size
        fontWeight: 'bold',
        marginBottom: MARGIN.medium, // Use common margin
        color: COLORS.primary, // Use theme color
        textAlign: 'center',
    },
    infoBox: {
        backgroundColor: COLORS.primaryLight, // Use theme color
        padding: PADDING.medium, // Use common padding
        marginBottom: MARGIN.medium, // Use common margin
        borderRadius: 5,
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    infoTitle: {
        fontSize: FONT_SIZES.large, // Use common size
        fontWeight: '600', // Semi-bold
        color: COLORS.secondary, // Use theme color
        textAlign: 'center',
    },
    label: {
        fontSize: FONT_SIZES.medium, // Use common size
        fontWeight: 'bold',
        marginTop: MARGIN.medium, // Use common margin
        marginBottom: MARGIN.small, // Use common margin
        color: COLORS.secondary, // Use theme color
    },
    remarksInput: { // Local overrides for commonStyles.textInput
        minHeight: 80, // Taller for remarks
        height: 'auto', // Allow dynamic height
        textAlignVertical: 'top', // Align text to top for multiline
    },
    modalButton: { // Local overrides for commonStyles action buttons in modal
        paddingVertical: PADDING.medium, // Slightly smaller padding
        paddingHorizontal: PADDING.large, // Adjust as needed
        minWidth: 100, // Ensure minimum width
        flex: 0.45, // Allow buttons to share space
        alignItems: 'center',
    },
    modalButtonText: { // Local override for modal button text
        fontSize: FONT_SIZES.large, // Slightly smaller font
        // Inherits fontWeight, color, textAlign from commonStyles
    },
    // --- Styles for Themed CustomDropdown ---
    dropdownContainer: {
        marginBottom: MARGIN.medium, // Use common margin
    },
    dropdownHeader: {
        borderWidth: 1,
        borderColor: COLORS.lightGrey, // Use theme color
        borderRadius: 5,
        padding: PADDING.medium, // Use common padding
        backgroundColor: COLORS.white, // Use theme color
        flexDirection: 'row', // Align text and arrow
        justifyContent: 'space-between', // Space out text and arrow
        alignItems: 'center',
    },
    dropdownHeaderText: {
        fontSize: FONT_SIZES.medium, // Use common size
        fontWeight: '600', // Semi-bold
        color: COLORS.secondary, // Use theme color
        flexShrink: 1, // Allow text to shrink if long
        marginRight: MARGIN.small, // Space before arrow
    },
    dropdownOptionsContainer: {
        maxHeight: 150, // Limit dropdown height
        borderWidth: 1,
        borderColor: COLORS.lightGrey, // Use theme color
        backgroundColor: COLORS.white, // Use theme color
        borderRadius: 5,
        marginTop: MARGIN.xsmall, // Space below header
    },
    option: { // Style for each selectable item in the dropdown grid
        paddingVertical: PADDING.small, // Adjust padding for grid items
        paddingHorizontal: PADDING.small,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.divider, // Use theme color
        flex: 1, // Take up available space in the column
        alignItems: 'flex-start', // Align checkbox/label to the start
        margin: 2, // Add small margin for grid effect
        backgroundColor: COLORS.white,
        borderRadius: 3,
    },
    optionLabel: {
        fontSize: FONT_SIZES.medium, // Use common size
        color: COLORS.secondary, // Use theme color
        marginLeft: MARGIN.small, // Space between checkbox and label
    },
    itemInvisible: { // Style for blank grid cells
        backgroundColor: 'transparent',
        borderBottomWidth: 0,
    },
});
// --- End Styles ---