// ChecklistPage.js
import React, { useContext, useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import CheckBox from 'react-native-checkbox';
import { ChecklistContext } from '../context/ChecklistContext';
import DefectInfoModal from './DefectInfoModal';
import ScreenWrapper from '../styles/flowstudiosbg.js';
import commonStyles, { COLORS, PADDING, MARGIN, FONT_SIZES } from '../styles/commonStyles';

const formatDateTime = (dateString) => {
    // (Keep existing formatDateTime function as is)
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

    const isChecklistComplete = useMemo(() => {
        // (Keep existing isChecklistComplete logic as is)
        if (!checklist || Object.keys(checklist).length === 0) return false;
        const allItems = Object.values(checklist).flat();
        if (allItems.length === 0) return false;
        return allItems.every(item => item.checked || item.defect);
    }, [checklist]);

    return (
        <ScreenWrapper
            showHeader={true}
            showFooter={true}
            contentStyle={commonStyles.contentArea}
            enableKeyboardAvoidingView={Platform.OS === 'ios'}
            enableScrollView={false} // We use our own ScrollView
        >
            {/* (Keep existing header info Text components as is) */}
            <Text style={commonStyles.pageHeader}>PDI Checklist</Text>
            <Text style={commonStyles.subHeaderText}>Chassis Number: {carInfo.chassis_no}</Text>
            <Text style={commonStyles.infoText}>Model/Variant: {carInfo.model} / {carInfo.variant}</Text>
            <Text style={commonStyles.infoText}>Engine No: {carInfo.engine_no}</Text>
            <Text style={commonStyles.infoText}>Color Code: {carInfo.colour_code}</Text>
            <Text style={commonStyles.infoText}>Entry Date: {carInfo.entry_date || 'N/A'}</Text>

            <ScrollView style={commonStyles.scrollViewContainer}>
                {Object.entries(checklist).map(([section, items], sectionIndex) => (
                    <View key={section} style={localStyles.section}>
                        <TouchableOpacity
                            style={localStyles.sectionHeader}
                            onPress={() => toggleSection(section)}
                        >
                            <Text style={commonStyles.sectionHeaderText}>
                                {collapsedSections[section] ? '▶︎' : '▼'} Section {section}
                            </Text>

                            {/* Select All Checkbox - Keep as is */}
                            <CheckBox
                                label="Select All"
                                checked={items.every(item => item.checked)}
                                onChange={() => {
                                    const isAllChecked = items.every(item => item.checked);
                                    toggleCheckAll(section, !isAllChecked);
                                }}
                                labelStyle={localStyles.selectAllLabel}
                                checkboxStyle={localStyles.checkboxStyle} // Default style
                            />
                        </TouchableOpacity>

                        {!collapsedSections[section] && (
                            items.map((item, itemIndex) => (
                                <View key={item.id} style={commonStyles.listItemContainer}>
                                    <Text style={commonStyles.listItemText}>
                                        {`${sectionIndex + 1}.${itemIndex + 1}. `} {item.name}
                                    </Text>

                                    {/* Check Checkbox - Apply conditional style */}
                                    <CheckBox
                                        label="Check"
                                        checked={item.checked}
                                        onChange={() => toggleCheck(section, item.id)}
                                        labelStyle={[
                                            localStyles.checkboxLabel,
                                            // Keep label color change
                                            { color: item.checked ? COLORS.success : COLORS.secondary }
                                        ]}
                                        // Apply conditional styling to the checkbox itself
                                        checkboxStyle={[
                                            localStyles.checkboxStyle, // Base style
                                            item.checked && localStyles.checkedCheckbox // Green style if checked
                                        ]}
                                    />
                                    {/* Defect Checkbox - Apply conditional style */}
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
                                        labelStyle={[
                                            localStyles.checkboxLabel,
                                             // Keep label color change
                                            { color: item.defect ? COLORS.danger : COLORS.secondary }
                                        ]}
                                         // Apply conditional styling to the checkbox itself
                                        checkboxStyle={[
                                            localStyles.checkboxStyle, // Base style
                                            item.defect && localStyles.defectCheckbox // Red style if defect
                                        ]}
                                    />
                                </View>
                            ))
                        )}
                    </View>
                ))}
                <View style={{ height: MARGIN.large }} />
            </ScrollView>

            {/* (Keep existing footer buttons as is) */}
            <View style={commonStyles.footerActionContainer}>
                <TouchableOpacity
                    style={commonStyles.actionButtonSecondary}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={commonStyles.actionButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        commonStyles.actionButton,
                        !isChecklistComplete && commonStyles.actionButtonDisabled
                    ]}
                    onPress={() => navigation.navigate('Summary')}
                    disabled={!isChecklistComplete}
                >
                    <Text style={[
                        commonStyles.actionButtonText,
                        !isChecklistComplete && commonStyles.actionButtonTextDisabled
                    ]}>Next</Text>
                </TouchableOpacity>
            </View>

            {/* (Keep existing DefectInfoModal as is) */}
            {selectedDefect && (
                <DefectInfoModal
                    defect={selectedDefect}
                    onClose={() => setSelectedDefect(null)}
                />
            )}
        </ScreenWrapper>
    );
}

// Add new styles for checked/defect states
const localStyles = StyleSheet.create({
    section: {
        marginBottom: MARGIN.medium,
        marginLeft: MARGIN.sectionLeft,
        marginRight: MARGIN.medium,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: MARGIN.sectionHeaderBottom,
    },
    selectAllLabel: {
        color: COLORS.secondary,
        fontSize: FONT_SIZES.small,
        marginLeft: MARGIN.xsmall,
    },
    checkboxLabel: {
        fontSize: FONT_SIZES.small,
        marginLeft: MARGIN.xsmall,
        marginRight: MARGIN.small,
    },
    checkboxStyle: {
        width: 20,
        height: 20,
    },
    defectCheckbox: {
        backgroundColor: COLORS.redinfo, 
    },
});