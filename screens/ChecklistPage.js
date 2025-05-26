// ChecklistPage.js
import React, { useContext, useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import CheckBox from 'react-native-checkbox';
import { ChecklistContext, BATTERY_ITEM_NAME, BATTERY_ITEM_SECTION } from '../context/ChecklistContext'; 
import DefectInfoModal from './DefectInfoModal';
import BatteryTerminalInputModal from './BatteryTerminalInputModal';
import ScreenWrapper from '../styles/flowstudiosbg.js';
import commonStyles, { COLORS, PADDING, MARGIN, FONT_SIZES } from '../styles/commonStyles';

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
    const { 
        checklist, 
        toggleCheck, 
        toggleDefect, 
        carInfo, 
        toggleCheckAll,
        setItemValueAndCheck 
    } = useContext(ChecklistContext);

    const [selectedDefect, setSelectedDefect] = useState(null);
    const [collapsedSections, setCollapsedSections] = useState({});
    const [isBatteryModalVisible, setIsBatteryModalVisible] = useState(false);
    const [selectedBatteryItem, setSelectedBatteryItem] = useState(null);

    const toggleSection = (section) => {
        setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const isChecklistComplete = useMemo(() => {
        if (!checklist || Object.keys(checklist).length === 0) {
            return false;
        }
        const allItems = Object.values(checklist).flat();
        if (allItems.length === 0) {
            return false;
        }
        
        return allItems.every(item => {
            const isBattery = item.section === BATTERY_ITEM_SECTION && item.name === BATTERY_ITEM_NAME;
            if (isBattery) {
                const isComplete = item.defect || (item.checked && typeof item.measurementValue === 'number');
                return isComplete;
            }
            const isOtherItemComplete = item.checked || item.defect;
            return isOtherItemComplete;
        });
    }, [checklist]);

    const handleBatteryInputSubmit = (inputValueFloat) => {
        if (selectedBatteryItem) {
            setItemValueAndCheck(selectedBatteryItem.section, selectedBatteryItem.id, inputValueFloat);
            setIsBatteryModalVisible(false);
            setSelectedBatteryItem(null);
        }
    };

    const handleBatteryModalClose = () => {
        setIsBatteryModalVisible(false);
        setSelectedBatteryItem(null);
    };

    const handleItemCheck = (section, item) => {
        const isBatteryItem = item.name === BATTERY_ITEM_NAME && section === BATTERY_ITEM_SECTION;

        if (isBatteryItem) {
            setSelectedBatteryItem(item); 
            setIsBatteryModalVisible(true);
        } else {
            toggleCheck(section, item.id);
        }
    };


    return (
        <ScreenWrapper
            showHeader={true}
            showFooter={true}
            contentStyle={commonStyles.contentArea}
            enableKeyboardAvoidingView={Platform.OS === 'ios'}
            enableScrollView={false} // We use our own ScrollView below
        >
            <Text style={commonStyles.pageHeader}>PDI Checklist</Text>
            <Text style={commonStyles.subHeaderText}>Chassis Number: {carInfo.chassis_no || 'N/A'}</Text>
            <Text style={commonStyles.infoText}>Model/Variant: {carInfo.model || 'N/A'} / {carInfo.variant || 'N/A'}</Text>
            <Text style={commonStyles.infoText}>Engine No: {carInfo.engine_no || 'N/A'}</Text>
            <Text style={commonStyles.infoText}>Color Code: {carInfo.colour_code || 'N/A'}</Text>
            <Text style={commonStyles.infoText}>Entry Date: {formatDateTime(carInfo.entry_date)}</Text>

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
                            {section !== 'A' && (
                                <CheckBox
                                    label="Select All"
                                    checked={items.every(item => item.checked && !item.defect)}
                                    onChange={() => {
                                        const isAllCurrentlyEffectivelyChecked = items.every(item => item.checked && !item.defect);
                                        toggleCheckAll(section, !isAllCurrentlyEffectivelyChecked);
                                    }}
                                    labelStyle={localStyles.selectAllLabel}
                                    checkboxStyle={localStyles.checkboxStyle}
                                />
                            )}
                        </TouchableOpacity>

                        {!collapsedSections[section] && (
                            items.map((item, itemIndex) => {
                                const isBatteryItem = item.name === BATTERY_ITEM_NAME && item.section === BATTERY_ITEM_SECTION;
                                
                                let displayItemName = item.name;
                                if (isBatteryItem && item.checked && typeof item.measurementValue === 'number') {
                                    displayItemName = `${item.name} (${item.measurementValue}V)`;
                                }

                                return (
                                    <View key={item.id} style={commonStyles.listItemContainer}>
                                        <Text style={commonStyles.listItemText}>
                                            {`${sectionIndex + 1}.${itemIndex + 1}. `} {displayItemName}
                                        </Text>

                                        <CheckBox
                                            label="Check"
                                            checked={item.checked && !item.defect}
                                            onChange={() => handleItemCheck(section, item)}
                                            labelStyle={[
                                                localStyles.checkboxLabel,
                                                { color: (item.checked && !item.defect) ? COLORS.success : COLORS.secondary },
                                            ]}
                                            checkboxStyle={localStyles.checkboxStyle}
                                        />
                                        <CheckBox
                                            label="Defect"
                                            checked={item.defect}
                                            onChange={() => {
                                                const isBecomingDefect = !item.defect;
                                                toggleDefect(section, item.id); 
                                                
                                                if (isBecomingDefect) {
                                                    const updatedItem = checklist[section]?.find(i => i.id === item.id) || {...item, defect: true, checked: false};
                                                    setSelectedDefect({ section, item: updatedItem });

                                                    if (isBatteryItem && isBatteryModalVisible && selectedBatteryItem?.id === item.id) {
                                                        handleBatteryModalClose();
                                                    }
                                                } else if (selectedDefect && selectedDefect.item.id === item.id) {
                                                    setSelectedDefect(null);
                                                }
                                            }}
                                            labelStyle={[
                                                localStyles.checkboxLabel,
                                                { color: item.defect ? COLORS.danger : COLORS.secondary }
                                            ]}
                                            checkboxStyle={localStyles.checkboxStyle}
                                        />
                                    </View>
                                );
                            })
                        )}
                    </View>
                ))}
                <View style={{ height: MARGIN.large }} />
            </ScrollView>

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
                    onPress={() => {
                        if (isChecklistComplete) {
                            navigation.navigate('Summary');
                        } else {
                        }
                    }}
                    disabled={!isChecklistComplete}
                >
                    <Text style={[
                        commonStyles.actionButtonPrimaryText || commonStyles.actionButtonText, 
                        !isChecklistComplete && (commonStyles.actionButtonTextDisabled || {opacity: 0.5})
                    ]}>Next</Text>
                </TouchableOpacity>
            </View>

            {selectedDefect && (
                <DefectInfoModal
                    defect={selectedDefect}
                    onClose={() => setSelectedDefect(null)}
                />
            )}

            {isBatteryModalVisible && selectedBatteryItem && (
                <BatteryTerminalInputModal
                    visible={isBatteryModalVisible}
                    item={selectedBatteryItem}
                    onClose={handleBatteryModalClose}
                    onSubmit={handleBatteryInputSubmit}
                />
            )}
        </ScreenWrapper>
    );
}

const localStyles = StyleSheet.create({
    section: {
        marginBottom: MARGIN.medium, 
        marginLeft: MARGIN.sectionLeft || MARGIN.small,
        marginRight: MARGIN.medium,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: MARGIN.sectionHeaderBottom || MARGIN.small,
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
});