// screens/DefectInfoModal.js
import React, { useState, useContext, useEffect } from 'react';
import {
    View, Text, Modal, StyleSheet, TextInput, Alert,
    TouchableOpacity, FlatList, LayoutAnimation, Platform, UIManager
} from 'react-native';
import CheckBox from 'react-native-checkbox'; 
import MarkModal from './MarkModal';
import { ChecklistContext } from '../context/ChecklistContext';
import { DefectTypeContext } from '../context/defectTypeContext';
import commonStyles, { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/commonStyles'; 

if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

const BATTERY_ITEM_NAME_DEFECT_MODAL = "Battery clamps & terminal";
const BATTERY_ITEM_SECTION_DEFECT_MODAL = "A";

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
                    style={[localStyles.dropdownOptionsContainer, label === 'Severity' && { maxHeight: 80 }]}
                    data={formattedOptions}
                    keyExtractor={(item, index) => item.key || String(index)}
                    renderItem={({ item }) => {
                        if (item.empty === true) {
                            return <View style={[localStyles.option, localStyles.itemInvisible]} />;
                        }
                        return (
                            <TouchableOpacity
                                style={[localStyles.option, label === 'Severity' && { alignItems: 'center' }]}
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

export default function DefectInfoModal({ defect, onClose }) {
    const { updateDefectDetails } = useContext(ChecklistContext);
    const { categoryOptions, getTypeOptionsByCategory } = useContext(DefectTypeContext);

    const [category, setCategory] = useState(defect.item.defectDetails?.category || '');
    const [type, setType] = useState(defect.item.defectDetails?.type || '');
    const [location, setLocation] = useState(defect.item.defectDetails?.location || '');
    const [severity, setSeverity] = useState(defect.item.defectDetails?.severity || '');
    const [remarks, setRemarks] = useState(defect.item.defectDetails?.remarks || '');
    
    const isBatteryDefectItem = defect.item.name === BATTERY_ITEM_NAME_DEFECT_MODAL && defect.section === BATTERY_ITEM_SECTION_DEFECT_MODAL;

    const getInitialMeasurementString = () => {
        if (!isBatteryDefectItem) return '';
        const valFromDetails = defect.item.defectDetails?.measurementValue;
        const valFromItem = defect.item.measurementValue;
        
        if (valFromDetails != null) return String(valFromDetails);
        if (valFromItem != null) return String(valFromItem);
        return '';
    };
    const [measurementValueString, setMeasurementValueString] = useState(getInitialMeasurementString());

    const [marking, setMarking] = useState(false);

    const getInitialActiveDropdown = () => {
        if (!category) return 'category';
        if (!type) return 'type';
        if (!location) return 'location';
        if (!severity) return 'severity';
        return 'none';
    };
    const [activeDropdown, setActiveDropdown] = useState(getInitialActiveDropdown());

    const locationOptions = [
        { label: "Exterior", value: "Exterior" },
        { label: "Interior", value: "Interior" },
    ];
    const severityOptions = [
        { label: "Major", value: "Major" },
        { label: "Minor", value: "Minor" },
    ];

    const getTypeOptions = () => getTypeOptionsByCategory(category);

    const handleCategoryChange = (newCategory) => {
        setCategory(newCategory);
        setType('');
        setLocation('');
        setSeverity('');
        setActiveDropdown('type');
    };

    const handleTypeChange = (newType) => {
        setType(newType);
        setLocation('');
        setSeverity('');
        setActiveDropdown('location');
    };

    const handleLocationChange = (newLocation) => {
        setLocation(newLocation);
        setSeverity('');
        setActiveDropdown('severity');
    };

    const handleSeverityChange = (newSeverity) => {
        setSeverity(newSeverity);
        setActiveDropdown('none');
    };

    const handleDropdownHeaderPress = (dropdownName) => {
        setActiveDropdown(current => (current === dropdownName ? 'none' : dropdownName));
    };

    const isMarkButtonDisabled = () => {
        if (!category || !type || !location || !severity) return true;
        if (isBatteryDefectItem) {
            const trimmedMeasurement = measurementValueString.trim();
            if (!trimmedMeasurement || isNaN(parseFloat(trimmedMeasurement))) {
                return true;
            }
        }
        return false;
    };

    const handleMark = () => {
        let missingFields = [];
        if (!category) missingFields.push("Category");
        if (!type) missingFields.push("Type");
        if (!location) missingFields.push("Location");
        if (!severity) missingFields.push("Severity");

        let parsedBatteryFloat = null;
        if (isBatteryDefectItem) {
            const trimmedMeasurement = measurementValueString.trim();
            if (!trimmedMeasurement) {
                missingFields.push("Measured Value (Battery)");
            } else {
                parsedBatteryFloat = parseFloat(trimmedMeasurement);
                if (isNaN(parsedBatteryFloat)) {
                    missingFields.push("Valid Numeric Measured Value (Battery, e.g., 12.5)");
                }
            }
        }

        if (missingFields.length > 0) {
            Alert.alert('Missing Information', `Please fill in the following fields correctly: ${missingFields.join(', ')}.`);
            return;
        }

        if (!defect.item.id) {
            console.error("Defect item ID is missing in DefectInfoModal.");
            Alert.alert("Error", "Defect item ID is missing. Cannot update details.");
            return;
        }
        
        const defectDetailsPayload = {
            category,
            type,
            location,
            severity,
            remarks,
            marks: defect.item.defectDetails?.marks || [],
        };

        if (isBatteryDefectItem) {
            defectDetailsPayload.measurementValue = parsedBatteryFloat;
        }

        updateDefectDetails(defect.section, defect.item.id, defectDetailsPayload);
        setMarking(true);
    };

    const showRemarksInput = () => {
        if (!severity) return false;
        if (isBatteryDefectItem) {
            const trimmedMeasurement = measurementValueString.trim();
            return !!trimmedMeasurement && !isNaN(parseFloat(trimmedMeasurement));
        }
        return true;
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

                    <CustomDropdown
                        label="Category"
                        options={categoryOptions}
                        selectedValue={category}
                        onValueChange={handleCategoryChange}
                        isOpen={activeDropdown === 'category'}
                        onHeaderPress={() => handleDropdownHeaderPress('category')}
                    />

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

                    {location && (
                        <CustomDropdown
                            label="Severity"
                            options={severityOptions}
                            selectedValue={severity}
                            onValueChange={handleSeverityChange}
                            isOpen={activeDropdown === 'severity'}
                            onHeaderPress={() => handleDropdownHeaderPress('severity')}
                        />
                    )}
                    
                    {isBatteryDefectItem && severity && (
                        <>
                            <Text style={localStyles.label}>Measured Value (Battery):</Text>
                            <TextInput
                                style={[commonStyles.textInput, localStyles.measurementInput]}
                                placeholder="e.g., 12.5"
                                placeholderTextColor={COLORS.grey}
                                value={measurementValueString}
                                onChangeText={setMeasurementValueString}
                                keyboardType="numeric" // Or "decimal-pad"
                            />
                        </>
                    )}
                    
                    {showRemarksInput() && (
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
                                isMarkButtonDisabled() ? commonStyles.actionButtonDisabled : {}
                            ]}
                            onPress={handleMark}
                            disabled={isMarkButtonDisabled()}
                        >
                            <Text style={[
                                commonStyles.actionButtonPrimaryText,
                                localStyles.modalButtonText,
                                isMarkButtonDisabled() ? (commonStyles.actionButtonModalDisabled || { opacity: 0.5 }) : {}
                            ]}>Mark</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {marking && (
                <MarkModal
                    visible={marking}
                    onClose={() => setMarking(false)}
                    selectedItem={{
                        ...defect.item,
                        defectDetails: { 
                            category, 
                            type, 
                            location, 
                            severity, 
                            remarks, 
                            marks: defect.item.defectDetails?.marks || [],
                            ...(isBatteryDefectItem && { measurementValue: parseFloat(measurementValueString.trim()) }) // ensure float
                        },
                    }}
                    closeDefectModal={onClose}
                />
            )}
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
    remarksInput: {
        minHeight: 80,
        height: 'auto', 
        textAlignVertical: 'top',
    },
    measurementInput: {
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
        maxHeight: 350, 
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
        alignItems: 'flex-start', 
        margin: 2, 
        backgroundColor: COLORS.white, 
        borderRadius: 3,
    },
    optionLabel: {
        fontSize: FONT_SIZES.medium,
        color: COLORS.secondary,
        marginLeft: MARGIN.small, 
    },
    itemInvisible: {
        backgroundColor: 'transparent',
        borderBottomWidth: 0,
    },
});