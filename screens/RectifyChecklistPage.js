// screens/RectifyChecklistPage.js
import React, { useContext, useState, useMemo, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, Modal, Image, ActivityIndicator, Platform
} from 'react-native';
import CheckBox from 'react-native-checkbox'; // Adjust if using a different library
import { RectifyContext } from '../context/RectifyContext'; // Adjust path
import RectifyInfoModal from './RectifyInfoModal'; // Adjust path
import ScreenWrapper from '../styles/flowstudiosbg.js'; // Adjust path
import commonStyles, { COLORS, FONT_SIZES, PADDING, MARGIN } from '../styles/commonStyles'; // Adjust path


const MARKER_SIZE = 24;
const SUMMARY_PAGE_IMAGE_WIDTH = 500;
const SUMMARY_PAGE_IMAGE_HEIGHT = 600;

// --- Helper Functions ---
const sectionNumberToNameMap = { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'F', 7: 'Others', };
const getSectionLetter = (sectionNumberInput) => {
    const sectionNumber = parseInt(sectionNumberInput, 10);
    if (!isNaN(sectionNumber) && sectionNumberToNameMap.hasOwnProperty(sectionNumber)) {
        return sectionNumberToNameMap[sectionNumber];
    }
    // Updated: More specific warning and consistent return for 'Others'
    console.warn(`[getSectionLetter] Invalid or unmapped section number: "${sectionNumberInput}". Mapping to 'Others'.`);
    // Find the key corresponding to 'Others' value if it exists, otherwise default might be needed
    const othersKey = Object.keys(sectionNumberToNameMap).find(key => sectionNumberToNameMap[key] === 'Others');
    return othersKey ? sectionNumberToNameMap[othersKey] : 'Others'; // Return 'Others' explicitly
};
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        // Format as DD/MM/YYYY
        return new Date(dateString).toLocaleDateString('en-GB');
    }
    catch (e) {
        console.error("Error formatting date:", dateString, e);
        return 'Invalid Date';
    }
};


export default function RectifyChecklistPage({ navigation, route }) {
    console.log("\n--- RectifyChecklistPage Render START ---");

    // --- Context ---
    const contextData = useContext(RectifyContext);
    const {
        rectifyItems: allItemsFromContext,carInfo,images, loading,error,rectifyItemWithDetails, unrectifyItem,fetchDataForRectification, 
    } = contextData || {};

    console.log("--- Raw items from RectifyContext ---");
    try {
        console.log(JSON.stringify(allItemsFromContext, null, 2));
    } catch (e) {
        console.error("Error stringifying allItemsFromContext:", e);
        console.log("allItemsFromContext (raw):", allItemsFromContext); // Log raw object on error
    }
    console.log("------------------------------------");


    // --- State ---
    const [imageModalVisible, setImageModalVisible] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [imageLoading, setImageLoading] = useState(false); // Loading state specifically for images in the modal
    const [rectifyInfoModalVisible, setRectifyInfoModalVisible] = useState(false);
    const [selectedItemForRectify, setSelectedItemForRectify] = useState(null); // Item being rectified
    const [modalImageLayout, setModalImageLayout] = useState(null); // Stores dimensions of the image in the modal

    const defectItems = useMemo(() => {
        console.log("[Memo] Calculating defectItems...");
        if (!Array.isArray(allItemsFromContext)) {
            console.log("[Memo] allItemsFromContext is not an array or is null/undefined.");
            return [];
        }

        // *** ADDED LOG: Log items being considered for filtering ***
        console.log("--- Items being considered for defect filtering ---");
        allItemsFromContext.forEach(item => {
            if(item) { // Check if item is not null/undefined
                console.log(`Checking Item ID: ${item.id}, Name: ${item.name}, Section: ${item.section}, OriginalPass: ${item.originalPass}`);
                if (item.originalPass === false) {
                     console.log(` -> MARKED AS DEFECT (Section: ${item.section})`);
                }
            } else {
                console.log("Encountered a null/undefined item in allItemsFromContext during filtering check.");
            }
        });
        console.log("---------------------------------------------");

        const filtered = allItemsFromContext.filter(item => item && item.originalPass === false);
        console.log(`[Memo] Filtered ${filtered.length} defect items.`);
        return filtered;
    }, [allItemsFromContext]);

    // Group defect items by section letter and sort
    const { groupedItems, sortedSectionKeys, calculationError } = useMemo(() => {
        console.log("[Memo] Calculating groupedItems...");
        if (!Array.isArray(defectItems) || defectItems.length === 0) {
             console.log("[Memo] No defect items to group.");
             return { groupedItems: {}, sortedSectionKeys: [], calculationError: null };
        }
        try {
            const groups = {};
            defectItems.forEach((item) => {
                if (!item || item.id === undefined) {
                    console.warn(`[Grouping] Skipping invalid item:`, item);
                    return;
                }

                const sectionValue = item.section;
                let mappedSectionKey = null; // Variable to hold the final section key ('A', 'B', etc.)

                // *** ADDED LOG: Detailed grouping debug log ***
                console.log(`[Grouping Debug] Processing Item ID: ${item.id}, Name: "${item.name}", Section Value: "${sectionValue}" (Type: ${typeof sectionValue})`);

                if (typeof sectionValue === 'number') {
                    const sectionNumber = sectionValue;
                    if (!isNaN(sectionNumber)) {
                        mappedSectionKey = getSectionLetter(sectionNumber); // Convert number to letter
                        console.log(`[Grouping Debug] -> Handled as Number. Mapped number ${sectionNumber} to section key: ${mappedSectionKey}`);
                    } else {
                         console.warn(`[Grouping Debug] -> Handled as Number, but it's NaN.`);
                    }
                } else if (typeof sectionValue === 'string') {
                     // Handle if sectionValue is already a letter (A-F or potentially 'Others')
                    if (sectionValue.length === 1 && /^[A-F]$/i.test(sectionValue)) { // More specific check A-F
                        mappedSectionKey = sectionValue.toUpperCase();
                        console.log(`[Grouping Debug] -> Handled as String (Letter A-F). Section value is already a letter: ${mappedSectionKey}`);
                    } else if (sectionValue.toLowerCase() === 'others') { // Handle 'Others' string explicitly
                         mappedSectionKey = 'Others';
                         console.log(`[Grouping Debug] -> Handled as String ('Others'). Section value is: ${mappedSectionKey}`);
                    } else {
                         // Try parsing if it's a string representation of a number (1-7)
                        const sectionNumber = parseInt(sectionValue, 10);
                        if (!isNaN(sectionNumber) && sectionNumber >= 1 && sectionNumber <= 7) { // Check if parse result is valid number 1-7
                            mappedSectionKey = getSectionLetter(sectionNumber);
                            console.log(`[Grouping Debug] -> Handled as String (Parsed as Number). Parsed string "${sectionValue}" to number ${sectionNumber}, mapped key: ${mappedSectionKey}`);
                        } else {
                            console.warn(`[Grouping Debug] -> Handled as String, but not a recognized letter, 'Others', or parsable number: "${sectionValue}"`);
                        }
                    }
                } else {
                     console.warn(`[Grouping Debug] -> Section value has unexpected type: ${typeof sectionValue}`);
                }

                 // Group the item if we successfully determined a valid section key ('A'-'F', 'Others')
                 // Check against the values of the map ('A', 'B', etc.)
                 const validSectionKeys = Object.values(sectionNumberToNameMap);
                if (mappedSectionKey && validSectionKeys.includes(mappedSectionKey)) {
                    if (!groups[mappedSectionKey]) {
                        groups[mappedSectionKey] = [];
                    }
                    groups[mappedSectionKey].push(item);
                     console.log(`[Grouping Debug] -> Successfully grouped Item ID ${item.id} under section: ${mappedSectionKey}`);
                } else {
                    // Fallback or Warning for unmappable sections
                    const othersKey = 'Others'; // Define the fallback key explicitly
                    console.warn(`[Grouping Debug] -> Item ID ${item.id} could not be mapped to a valid section key ('${mappedSectionKey}'). Falling back to group under '${othersKey}'.`);
                    if (!groups[othersKey]) {
                        groups[othersKey] = [];
                    }
                    groups[othersKey].push(item);
                }
            }); // end forEach

            // Sort items within each group by their ID (assuming ID implies order)
            for (const key in groups) {
                groups[key].sort((a, b) => (a.id || 0) - (b.id || 0));
            }

            // Sort the section keys ('A', 'B', 'C', ..., 'Others')
            const sortedKeys = Object.keys(groups).sort((a, b) => {
                if (a === 'Others') return 1; // 'Others' always last
                if (b === 'Others') return -1;
                // Find numeric equivalent for sorting A-F correctly
                const numA = Object.keys(sectionNumberToNameMap).find(key => sectionNumberToNameMap[key] === a);
                const numB = Object.keys(sectionNumberToNameMap).find(key => sectionNumberToNameMap[key] === b);
                // If both are standard sections (A-F), sort numerically based on original number
                if(numA && numB) {
                    return parseInt(numA, 10) - parseInt(numB, 10);
                }
                // Fallback to localeCompare if something unexpected happens
                return a.localeCompare(b);
            });

            console.log(`[Memo] Grouped items into sections: ${sortedKeys.join(', ')}`);
            return { groupedItems: groups, sortedSectionKeys: sortedKeys, calculationError: null };
        } catch (e) {
            console.error("[Grouping] Error:", e);
            return { groupedItems: {}, sortedSectionKeys: [], calculationError: `Grouping failed: ${e.message || e}` };
        }
    }, [defectItems]); // Dependency: defectItems

    // Check if all defect items have been marked as rectified
    const allDefectsRectified = useMemo(() => {
        if (!Array.isArray(defectItems) || defectItems.length === 0) return true; // No defects means all are 'rectified'
        const result = defectItems.every(item => item && item.rectified === true);
        console.log(`[Memo] All defects rectified: ${result}`);
        return result;
    }, [defectItems]); // Dependency: defectItems

    // --- Handlers ---
    const handleNextImage = () => {
        if (!images || images.length === 0) return;
        setImageLoading(true); // Show loading indicator for image change
        setModalImageLayout(null); // Reset layout as image source changes
        setCurrentImageIndex(prev => (prev + 1) % images.length);
    };
    const handlePreviousImage = () => {
        if (!images || images.length === 0) return;
        setImageLoading(true); // Show loading indicator for image change
        setModalImageLayout(null); // Reset layout
        setCurrentImageIndex(prev => (prev - 1 + images.length) % images.length);
    };

    // Handle checkbox change for rectification status
    const handleRectifiedChange = (item) => {
        if (!item) return;
        console.log(`handleRectifiedChange called for item ID: ${item.id}, Current rectified: ${item.rectified}`);
        if (!item.rectified) {
             // Trying to mark as rectified - show the info modal
             if (!rectifyItemWithDetails) {
                 console.error("rectifyItemWithDetails function is missing from context.");
                 Alert.alert("Error", "Cannot process rectification. Context setup issue.");
                 return;
             }
             console.log("Opening RectifyInfoModal for item:", item);
             setSelectedItemForRectify(item);
             setRectifyInfoModalVisible(true);
        } else {
             // Trying to un-mark as rectified
             if (!unrectifyItem) {
                 console.error("unrectifyItem function is missing from context.");
                 Alert.alert("Error", "Cannot process un-rectification. Context setup issue.");
                 return;
             }
             console.log("Calling unrectifyItem for item ID:", item.id);
             unrectifyItem(item.id); // Update context/state
             setSelectedItemForRectify(null); // Clear selection
        }
    };

    // Confirm button press inside RectifyInfoModal
    const handleModalConfirm = (name, no, remark, date) => {
        if (!selectedItemForRectify || !rectifyItemWithDetails) {
             console.error("Cannot confirm: selectedItemForRectify or rectifyItemWithDetails missing.");
             Alert.alert("Error", "Could not process rectification details.");
             return;
        }
        const itemId = selectedItemForRectify.id;
        console.log(`Confirming rectification for item ID: ${itemId} with details:`, { name, no, remark, date });
        rectifyItemWithDetails(itemId, { name, no, remark, date }); // Call context function
        handleModalClose(); // Close the modal
    };

    // Close the RectifyInfoModal
    const handleModalClose = () => {
        console.log("Closing RectifyInfoModal");
        setRectifyInfoModalVisible(false);
        setSelectedItemForRectify(null); // Clear selection when modal closes
    };

    // --- Layout Callback for Image Modal ---
    const onModalImageLayout = useCallback((event) => {
         const { width, height } = event.nativeEvent.layout;
         console.log(`[Layout Callback] Modal image layout measured: ${width}x${height}`);
         if (width > 0 && height > 0) {
            // Only update state if layout is different or not set yet
            if (!modalImageLayout || modalImageLayout.width !== width || modalImageLayout.height !== height) {
                 console.log("[Layout Callback] Setting modal image layout state.");
                 setModalImageLayout({ width, height });
             }
         } else {
             console.warn("[Layout Callback] Invalid dimensions measured:", width, height);
         }
    }, [modalImageLayout]); // Dependency: modalImageLayout

    // --- Mark Filtering Calculation for Image Modal ---
    const marksForCurrentImage = useMemo(() => {
        console.log("[Memo] Calculating marksForCurrentImage...");
        if (!modalImageLayout) {
            console.log("[Memo] No modal image layout, cannot calculate marks.");
            return [];
        }
        if (!images || images.length <= currentImageIndex) {
            console.log("[Memo] No images or invalid index.");
            return [];
        }
        if (!Array.isArray(defectItems)) {
            console.log("[Memo] defectItems is not an array.");
            return [];
        }

        const currentImageId = images[currentImageIndex].id; // ID of the image currently displayed
        console.log(`[Memo] Current image ID: ${currentImageId}`);
        const filteredMarks = [];

        defectItems.forEach(item => {
             // Check if the item itself is valid
             if (!item) {
                 console.warn("[Memo Marks] Skipping null/undefined defect item.");
                 return;
             }

            // Check if the item has defect details (assuming stored in allDefects array)
            const defectsArray = item?.allDefects;
            if (!Array.isArray(defectsArray) || defectsArray.length === 0) {
                 console.log(`[Memo Marks] Item ID ${item.id} has no 'allDefects' array or it's empty.`);
                 return;
            }

            // Assuming the relevant defect info is the first element
            const defectInfo = defectsArray[0];
            if (!defectInfo) {
                console.log(`[Memo Marks] Item ID ${item.id} has 'allDefects' but the first element is null/undefined.`);
                return;
            }

            // Check if this defect's mark belongs to the currently displayed image
            const defectImageId = defectInfo.image_id;
             // Handle potential type differences (number vs string)
            const hasMatchingId = String(defectImageId) === String(currentImageId);

             console.log(`[Memo Marks] Item ID ${item.id}, Defect Image ID: "${defectImageId}" (Type: ${typeof defectImageId}), Current Modal Image ID: "${currentImageId}" (Type: ${typeof currentImageId}), Match: ${hasMatchingId}`);

            if (!hasMatchingId) {
                 // console.log(`[Memo Marks] Skipping Item ID ${item.id} - mark not for current image.`);
                 return; // Skip if mark is not for this image
            }

            // Get the marks array (could be 'marks' or 'mark')
            // Prioritize 'marks' if it exists and is an array, otherwise check 'mark'
            let marksData = null;
            if (Array.isArray(defectInfo.marks) && defectInfo.marks.length > 0) {
                marksData = defectInfo.marks;
            } else if (defectInfo.mark && typeof defectInfo.mark === 'object') {
                marksData = [defectInfo.mark]; // Treat single mark object as an array of one
            }

            if (!Array.isArray(marksData) || marksData.length === 0) {
                 console.log(`[Memo Marks] Item ID ${item.id} has no valid 'marks' or 'mark' data for Image ID ${currentImageId}.`);
                 return; // No valid mark data
            }

            // Process each mark associated with this defect for the current image
            marksData.forEach((mark, markIndex) => {
                // Check for normalized coordinates (accept nx/ny or x/y)
                const xCoord = mark.x ?? mark.nx; // Prioritize x, fallback to nx
                const yCoord = mark.y ?? mark.ny; // Prioritize y, fallback to ny
                const isValidMark = mark && typeof xCoord === 'number' && typeof yCoord === 'number';

                if (!isValidMark) {
                     console.warn(`[Memo Marks] Invalid mark format found for item ${item.id}, mark index ${markIndex}:`, mark);
                     return; // Skip invalid mark format
                }

                // Calculate pixel position based on modal image layout and normalized coords
                const pixelX = xCoord * modalImageLayout.width;
                const pixelY = yCoord * modalImageLayout.height;

                 console.log(`[Memo Marks] Adding mark for Item ID ${item.id} at coords (x: ${xCoord}, y: ${yCoord}) -> pixels (X: ${pixelX.toFixed(1)}, Y: ${pixelY.toFixed(1)})`);

                // Add the mark to the list for rendering
                filteredMarks.push({
                    id: `${item.id}-mark-${markIndex}`, // Unique key for rendering
                    pixelX: pixelX - MARKER_SIZE / 2, // Adjust for centering the marker visually
                    pixelY: pixelY - MARKER_SIZE / 2, // Adjust for centering the marker visually
                    location: defectInfo.location || 'N/A' // Include location for potential styling (e.g., circle)
                });
            });
        });
        console.log(`[Memo] Found ${filteredMarks.length} marks for image ID ${currentImageId}.`);
        return filteredMarks;
    }, [defectItems, images, currentImageIndex, modalImageLayout]); // Dependencies


    // --- RENDER LOGIC ---

    // --- Loading/Error States from Context ---
    if (loading) {
        return (
            <ScreenWrapper showHeader={true} showFooter={false}>
                <View style={localStyles.centeredMessageContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={localStyles.loadingText}>Loading Rectification Data...</Text>
                </View>
            </ScreenWrapper>
        );
    }

    const displayError = error || calculationError;
    if (displayError) {
        return (
            <ScreenWrapper showHeader={true} showFooter={true}>
                <View style={localStyles.centeredMessageContainer}>
                    <Text style={commonStyles.errorText}>Error Loading Data</Text>
                    <Text style={localStyles.errorDetailText}>{String(displayError)}</Text>
                    {/* Optional: Add a retry button */}
                </View>
                 {/* Keep Footer Buttons for Back navigation even on error */}
                 <View style={commonStyles.footerActionContainer}>
                     <TouchableOpacity style={commonStyles.actionButtonSecondary} onPress={() => navigation.goBack()} >
                         <Text style={commonStyles.actionButtonText}>Back</Text>
                     </TouchableOpacity>
                </View>
            </ScreenWrapper>
        );
    }
    // Check specifically for carInfo after handling loading/error
    if (!carInfo) {
        console.error("RectifyChecklistPage: carInfo is null or undefined after loading/error checks.");
        return (
             <ScreenWrapper showHeader={true} showFooter={true}>
                 <View style={localStyles.centeredMessageContainer}>
                     <Text style={commonStyles.noDataText}>Car Information Not Available.</Text>
                     <Text style={localStyles.errorDetailText}>Cannot proceed without car details.</Text>
                 </View>
                  {/* Keep Footer Buttons */}
                 <View style={commonStyles.footerActionContainer}>
                      <TouchableOpacity style={commonStyles.actionButtonSecondary} onPress={() => navigation.goBack()} >
                          <Text style={commonStyles.actionButtonText}>Back</Text>
                      </TouchableOpacity>
                 </View>
             </ScreenWrapper>
        )
     }
    // --- End Loading/Error States ---


    // --- Main Content Render ---
     const currentImageData = (images && images.length > currentImageIndex) ? images[currentImageIndex] : null;
     // Construct image URL carefully - ensure no leading/trailing spaces and add protocol if missing
     const imageUrl = currentImageData?.file_path
        ? (String(currentImageData.file_path).trim().startsWith('http')
            ? String(currentImageData.file_path).trim()
            : `http://${String(currentImageData.file_path).trim()}`)
        : null;

     console.log(`Rendering main content. All rectified: ${allDefectsRectified}. Current Image Index: ${currentImageIndex}. Current Image Data ID: ${currentImageData?.id}. Calculated Image URL: ${imageUrl}`);

    return (
        <ScreenWrapper showHeader={true} showFooter={true} enableScrollView={false} enableKeyboardAvoidingView={Platform.OS === 'ios'} >
            {/* Scrollable Content */}
            <ScrollView
                style={localStyles.scrollView}
                contentContainerStyle={localStyles.scrollContentContainer}
                keyboardShouldPersistTaps="handled" // Helps with inputs inside ScrollView if any were added
            >
                 <Text style={commonStyles.pageHeader}>Rectify Defects</Text>
                 {/* Check carInfo again before accessing properties */}
                 <Text style={localStyles.subHeader}>Chassis: {carInfo?.chassis_no || 'N/A'}</Text>
                 <Text style={localStyles.carInfo}>Model: {carInfo?.model || 'N/A'}</Text>

                 {/* View Defect Locations Button */}
                 <View style={localStyles.viewImageButtonContainer}>
                    <TouchableOpacity
                        style={[
                            localStyles.viewImageButton,
                            (!images || images.length === 0) && localStyles.disabledButton // Style when disabled
                        ]}
                        onPress={() => {
                            if (images?.length) { // Only open if images exist
                                console.log("View Defect Locations button pressed. Opening modal.");
                                setCurrentImageIndex(0); // Start from the first image
                                setImageLoading(true); // Show loading initially
                                setModalImageLayout(null); // Reset layout measurement
                                setImageModalVisible(true); // Open modal
                            } else {
                                console.log("View Defect Locations button pressed, but no images available.");
                            }
                        }}
                        disabled={!images?.length} // Disable button if no images
                    >
                        <Text style={localStyles.viewImageButtonText}>
                            {images?.length ? `View Defect Locations` : 'No Defect Available'}
                        </Text>
                    </TouchableOpacity>
                 </View>

                 {/* Defect List - Grouped by Section */}
                {sortedSectionKeys && sortedSectionKeys.length > 0
                    ? sortedSectionKeys.map((sectionKey) => (
                        <View key={sectionKey} style={localStyles.sectionContainer}>
                            <Text style={localStyles.sectionHeader}>Section {sectionKey}</Text>
                            {/* Items within the section */}
                            {Array.isArray(groupedItems[sectionKey]) ? groupedItems[sectionKey].map((item, index) => {
                                if (!item || item.id === undefined) {
                                     console.warn(`Skipping rendering of invalid item in section ${sectionKey}:`, item);
                                     return null; // Skip invalid items
                                }

                                // Extract defect details (assuming first defect is primary)
                                const defectInfo = item.allDefects?.[0]; // Use optional chaining

                                return (
                                    <View key={item.id} style={localStyles.item}>
                                        {/* Left side: Item details */}
                                        <View style={localStyles.itemDetails}>
                                            {/* Item Name */}
                                            <Text style={localStyles.itemName}>
                                                {`${index + 1}. ${item.name || 'Unnamed Item'}`}
                                            </Text>

                                            {/* Defect Details (Category & Type) */}
                                            {defectInfo && (
                                                <View style={localStyles.detailsContainer}>
                                                    {/* Category Row */}
                                                    <View style={localStyles.detailRow}>
                                                        <Text style={localStyles.detailLabel}>Category</Text>
                                                        <Text style={localStyles.detailSeparator}>:</Text>
                                                        <Text style={localStyles.detailValue}>
                                                            {defectInfo.category || 'N/A'}
                                                        </Text>
                                                    </View>
                                                    {/* Type Row */}
                                                    <View style={localStyles.detailRow}>
                                                        <Text style={localStyles.detailLabel}>Type</Text>
                                                        <Text style={localStyles.detailSeparator}>:</Text>
                                                        <Text style={localStyles.detailValue}>
                                                            {defectInfo.type || 'N/A'}
                                                        </Text>
                                                    </View>
                                                    {/* Optionally add Location */}
                                                    {/* <View style={localStyles.detailRow}>
                                                        <Text style={localStyles.detailLabel}>Location</Text>
                                                        <Text style={localStyles.detailSeparator}>:</Text>
                                                        <Text style={localStyles.detailValue}>{defectInfo.location || 'N/A'}</Text>
                                                    </View> */}
                                                </View>
                                            )}

                                            {/* Rectifier Info (if rectified) */}
                                            {item.rectified && (
                                                <View style={localStyles.rectifierInfoContainer}>
                                                    {/* Display name, number, and date if available */}
                                                    {(item.rectifierName || item.rectificationDate) && (
                                                         <Text style={localStyles.rectifierInfoText}>
                                                             By: {item.rectifierName || 'N/A'} ({item.rectifierNo || 'N/A'}) on {formatDate(item.rectificationDate)}
                                                         </Text>
                                                    )}
                                                    {/* Display remark if available */}
                                                    {item.remark && (
                                                         <Text style={localStyles.remarkText}>
                                                             Remark: {item.remark}
                                                         </Text>
                                                    )}
                                                </View>
                                            )}
                                        </View>

                                        {/* Right side: Checkbox */}
                                        <CheckBox
                                            label="Rectified"
                                            checked={!!item.rectified} // Ensure boolean value
                                            onChange={() => handleRectifiedChange(item)}
                                            labelStyle={{
                                                color: item.rectified ? COLORS.success : COLORS.secondary,
                                                fontSize: FONT_SIZES.xsmall,
                                                marginLeft: MARGIN.xsmall, // Add space between box and label
                                            }}
                                            checkboxStyle={localStyles.checkboxStyle} // Custom style for the checkbox itself
                                        />
                                    </View>
                                );
                            }) : (
                                <Text style={commonStyles.noDataText}>No items found for section {sectionKey}</Text>
                            )}
                        </View>
                    ))
                    : (
                        <View style={localStyles.centeredMessageContainer}>
                            <Text style={commonStyles.noDataText}>No defect items found for rectification.</Text>
                        </View>
                    )
                }
                {/* Add extra space at the bottom of scroll view */}
                <View style={{ height: 40 }} />
            </ScrollView>

             {/* Fixed Footer Buttons */}
             <View style={commonStyles.footerActionContainer}>
                 <TouchableOpacity
                     style={commonStyles.actionButtonSecondary}
                     onPress={() => navigation.goBack()}
                 >
                     <Text style={commonStyles.actionButtonText}>Back</Text>
                 </TouchableOpacity>
                 <TouchableOpacity
                     style={[
                         commonStyles.actionButton, // Base style for primary action
                         !allDefectsRectified && commonStyles.actionButtonDisabled // Style when disabled
                     ]}
                     onPress={() => {
                         if (allDefectsRectified) {
                             console.log("Next button pressed. All defects rectified. Navigating to RectifySummary.");
                             navigation.navigate('RectifySummary'); // Navigate only if enabled
                         } else {
                             console.log("Next button pressed, but not all defects are rectified.");
                             Alert.alert("Incomplete", "Please ensure all defects are marked as rectified before proceeding.");
                         }
                     }}
                     disabled={!allDefectsRectified} // Disable button if not all rectified
                 >
                     <Text style={[
                         commonStyles.actionButtonPrimaryText, // Base text style
                         !allDefectsRectified && commonStyles.actionButtonTextDisabled // Style when disabled
                     ]}>
                         Next
                     </Text>
                 </TouchableOpacity>
            </View>

            {/* Image Modal (Styled like SummaryPage) */}
            {imageModalVisible && currentImageData && imageUrl && (
                 <Modal
                    visible={imageModalVisible}
                    transparent
                    animationType="fade" // Changed to fade for potentially smoother feel
                    onRequestClose={() => { // Handle Android back button press
                        console.log("Image modal onRequestClose triggered.");
                        setImageModalVisible(false);
                        setImageLoading(false); // Reset loading state
                        setModalImageLayout(null); // Reset layout state
                    }}
                 >
                      {/* Use modalContainer style copied from SummaryPage */}
                      <View style={localStyles.modalContainer}>
                         {/* Use modalHeader style copied from SummaryPage */}
                         <Text style={localStyles.modalHeader}>Defect Locations</Text>
                         {/* Keep original modalSubHeader for image count/description */}
                         <Text style={localStyles.modalSubHeader}>
                            {`Image ${currentImageIndex + 1} of ${images.length}${currentImageData.description ? ` (${currentImageData.description})` : ''}`}
                         </Text>

                         {/* Use imageSelector style copied from SummaryPage */}
                         <View style={localStyles.imageSelector}>
                             {/* Use imageButton style copied from SummaryPage */}
                             <TouchableOpacity
                                onPress={handlePreviousImage}
                                style={localStyles.imageButton}
                                disabled={!images || images.length <= 1 || imageLoading} // Disable during load or if only 1 image
                             >
                                 {/* Use imageButtonText style copied from SummaryPage */}
                                 <Text style={localStyles.imageButtonText}>Back</Text>
                             </TouchableOpacity>

                             {/* Display Image Description or Index (optional, styled) */}
                             <Text style={{color:'white', fontSize: 16, fontWeight:'bold', marginHorizontal: 10, flexShrink: 1, textAlign: 'center'}}>
                                {currentImageData.description || `Image ${currentImageIndex + 1}`}
                             </Text>

                             {/* Use imageButton style copied from SummaryPage */}
                             <TouchableOpacity
                                onPress={handleNextImage}
                                style={localStyles.imageButton}
                                disabled={!images || images.length <= 1 || imageLoading} // Disable during load or if only 1 image
                             >
                                 {/* Use imageButtonText style copied from SummaryPage */}
                                 <Text style={localStyles.imageButtonText}>Next</Text>
                             </TouchableOpacity>
                         </View>

                         {/* Use imageContainer style (updated with SummaryPage's imageWrapper styles) */}
                         <View style={localStyles.imageContainer}>
                             {/* The actual Image component */}
                             <Image
                                key={currentImageData.id} // Re-mount image when ID changes
                                source={{ uri: imageUrl }}
                                // Use image style copied from SummaryPage
                                style={localStyles.image}
                                onLoadStart={() => {
                                    console.log(`Image onLoadStart: ${imageUrl}`);
                                    setImageLoading(true);
                                }}
                                onLoad={() => {
                                    console.log(`Image onLoad Success: ${imageUrl}`);
                                    setImageLoading(false);
                                }} // Hide loader when image finishes loading
                                onError={(e) => {
                                    console.error(`Image Load Error: ${imageUrl}`, e.nativeEvent.error);
                                    setImageLoading(false); // Hide loader on error
                                    Alert.alert("Image Error", `Failed to load image: ${currentImageData.description || imageUrl}. \nError: ${e.nativeEvent.error}`);
                                }}
                                resizeMode="contain" // Ensure image fits within bounds
                                onLayout={onModalImageLayout} // Measure layout after image loads
                            />

                             {/* Loading Indicator Overlay (Styled like SummaryPage) */}
                             {(imageLoading || !modalImageLayout) && ( // Show if explicitly loading OR if layout hasn't been measured yet
                                // Use loadingOverlay style copied from SummaryPage
                                <View style={localStyles.loadingOverlay}>
                                    <ActivityIndicator size="large" color="#FFF" />
                                    {/* Use specific modalLoadingText style */}
                                    <Text style={localStyles.modalLoadingText}>Loading Image...</Text>
                                </View>
                             )}

                             {/* Render Marks Overlay */}
                             {modalImageLayout && marksForCurrentImage.length > 0 && ( // Only render container if layout exists AND there are marks
                                 <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                                     {/* Map the marks *inside* an absolutely positioned view */}
                                     {marksForCurrentImage.map(mark => (
                                         // Use markerContainer style copied from SummaryPage
                                         <View
                                            key={mark.id} // Use the unique ID generated in the memo
                                            style={[
                                                localStyles.markerContainer,
                                                { left: mark.pixelX, top: mark.pixelY } // Position based on calculated pixels
                                            ]}
                                         >
                                             {/* Use markerCircle style (updated with SummaryPage's circle styles) */}
                                             {/* Conditionally render circle based on location */}
                                             {mark.location === 'Interior' && <View style={localStyles.markerCircle} />}
                                             {/* Use markerX style (updated with SummaryPage's xMark styles) */}
                                             <Text style={localStyles.markerX}>X</Text>
                                         </View>
                                     ))}
                                </View>
                            )}
                         </View>

                         {/* Use closeButton style copied from SummaryPage */}
                         <TouchableOpacity
                            style={localStyles.closeButton}
                            onPress={() => {
                                console.log("Image modal Close button pressed.");
                                setImageModalVisible(false);
                                setImageLoading(false); // Reset loading state
                                setModalImageLayout(null); // Reset layout state
                            }}
                         >
                             {/* Use closeText style copied from SummaryPage */}
                             <Text style={localStyles.closeText}>Close</Text>
                         </TouchableOpacity>
                    </View>
                 </Modal>
            )}

            {/* Rectify Info Modal (Keep Original Instance) */}
            {/* This modal's internal styling is defined within RectifyInfoModal.js */}
            <RectifyInfoModal
                visible={rectifyInfoModalVisible}
                item={selectedItemForRectify}
                onClose={handleModalClose}
                onConfirm={handleModalConfirm}
            />
        </ScreenWrapper>
    );
}

const localStyles = StyleSheet.create({
    scrollView: {
        flex: 1,
    },
    scrollContentContainer: {
        paddingHorizontal: PADDING.medium,
        paddingTop: PADDING.small,
        paddingBottom: PADDING.large,
    },
    centeredMessageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: PADDING.large,
        marginTop: MARGIN.xlarge,
    },
    subHeader: {
        fontSize: FONT_SIZES.large,
        textAlign: 'center',
        marginBottom: MARGIN.xsmall,
        color: COLORS.secondary,
        fontWeight: '600',
    },
    carInfo: {
        fontSize: FONT_SIZES.medium,
        marginBottom: MARGIN.medium,
        textAlign: 'center',
        color: COLORS.grey,
    },
    viewImageButtonContainer: {
        alignItems: 'center',
        marginVertical: MARGIN.medium,
    },
    viewImageButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: PADDING.small,
        paddingHorizontal: PADDING.medium,
        borderRadius: 8,
        alignItems: 'center',
        elevation: 2,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.5,
    },
    disabledButton: { // Style for view image button when disabled
        backgroundColor: COLORS.disabled,
        opacity: 0.7,
        elevation: 0,
    },
    viewImageButtonText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: FONT_SIZES.medium,
    },
    // --- Section & Item Styling ---
    sectionContainer: {
        marginBottom: MARGIN.medium,
        backgroundColor: COLORS.white,
        borderRadius: 8,
        elevation: 1,
        shadowColor: COLORS.grey,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
        overflow: 'hidden',
    },
    sectionHeader: {
        fontSize: FONT_SIZES.large,
        fontWeight: 'bold',
        color: COLORS.secondary,
        backgroundColor: COLORS.primaryLight,
        paddingVertical: PADDING.small,
        paddingHorizontal: PADDING.medium,

    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'transparent',
        paddingVertical: PADDING.medium,
        paddingHorizontal: PADDING.medium,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.divider,
        
    },

    itemDetails: {
        flex: 1,
        marginRight: MARGIN.medium, 
    },
    itemName: {
        fontSize: FONT_SIZES.medium,
        fontWeight: '600',
        marginBottom: MARGIN.xsmall,
        color: COLORS.secondary,
        lineHeight: FONT_SIZES.medium * 1.3,
    },
    detailsContainer: {
        marginLeft: MARGIN.small,
        marginBottom: MARGIN.xsmall,
    },
    detailRow: {
        flexDirection: 'row',
        marginBottom: MARGIN.xsmall / 2,
        alignItems: 'flex-start',
    },
    detailLabel: {
        fontSize: FONT_SIZES.small,
        color: COLORS.grey,
        fontWeight: '600',
        width: 70,
    },
    detailSeparator: {
        // Separator might not be needed if using spacing and fixed width label
        // fontSize: FONT_SIZES.small,
        // color: COLORS.grey,
        // fontWeight: '600',
        // marginHorizontal: MARGIN.xsmall / 2,
    },
    detailValue: {
        flex: 1, // Allow value to wrap
        fontSize: FONT_SIZES.small,
        color: COLORS.secondary,
        lineHeight: FONT_SIZES.small * 1.5,
    },
    rectifierInfoContainer: {
        marginTop: MARGIN.small,
        marginLeft: MARGIN.small,
        paddingTop: MARGIN.small,
        borderTopWidth: 1,
        borderTopColor: COLORS.divider,
    },
    rectifierInfoText: {
        fontSize: FONT_SIZES.xsmall,
        fontStyle: 'italic',
        color: COLORS.success,
        marginBottom: MARGIN.xsmall / 2,
        lineHeight: FONT_SIZES.xsmall,
    },
    remarkText: {
        fontSize: FONT_SIZES.xsmall,
        fontStyle: 'italic',
        color: COLORS.grey,
        lineHeight: FONT_SIZES.xsmall,
    },
    checkboxStyle: { 
        width: 24,
        height: 24,
    },
    errorDetailText: {
        color: COLORS.danger,
        fontSize: FONT_SIZES.small,
        textAlign: 'center',
        marginTop: MARGIN.small,
    },

    // --- Modal Styles (Adhering to commonStyles constants & SummaryPage look) ---
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.85)',
        paddingVertical: PADDING.large,
        paddingHorizontal: PADDING.medium,
    },
    modalHeader: {
        fontSize: FONT_SIZES.xlarge,
        fontWeight: 'bold',
        color: COLORS.white,
        marginBottom: MARGIN.small,
        textAlign: 'center',
    },
    modalSubHeader: { 
        fontSize: FONT_SIZES.medium,
        color: COLORS.lightGrey,
        marginBottom: MARGIN.large,
        textAlign: 'center',
        paddingHorizontal: PADDING.small,
    },
    imageSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        maxWidth: SUMMARY_PAGE_IMAGE_WIDTH + 40,
        marginBottom: MARGIN.medium,
        alignItems: 'center',
    },
    imageButton: {
        backgroundColor: COLORS.primaryLight,
        paddingVertical: PADDING.small,
        paddingHorizontal: PADDING.medium,
        borderRadius: 5,
        minWidth: 80,
        alignItems: 'center',
    },
    imageButtonText: {
        fontWeight: 'bold',
        color: COLORS.secondary,
        fontSize: FONT_SIZES.medium,
    },
    imageContainer: {
        position: 'relative',
        borderColor: COLORS.grey,
        borderWidth: 1,
        marginVertical: MARGIN.medium,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        aspectRatio: SUMMARY_PAGE_IMAGE_WIDTH / SUMMARY_PAGE_IMAGE_HEIGHT,
        maxWidth: SUMMARY_PAGE_IMAGE_WIDTH,
        maxHeight: SUMMARY_PAGE_IMAGE_HEIGHT,
        backgroundColor: COLORS.black, 
        borderRadius: 5,
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    markerContainer: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        width: MARKER_SIZE,
        height: MARKER_SIZE,
    },
    markerX: {
        fontSize: FONT_SIZES.large,
        fontWeight: 'bold',
        color: COLORS.redinfo,
        textShadowColor: 'rgba(255, 255, 255, 0.7)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    markerCircle: {
        width: MARKER_SIZE * 0.9,
        height: MARKER_SIZE * 0.9,
        borderRadius: MARKER_SIZE * 0.45,
        borderWidth: 2,
        borderColor: COLORS.warning,
        position: 'absolute',
        backgroundColor: 'transparent',
    },
    closeButton: {
        marginTop: MARGIN.large,
        backgroundColor: COLORS.grey,
        paddingVertical: PADDING.medium,
        paddingHorizontal: PADDING.xlarge, 
        borderRadius: 8,
    },
    closeText: {
        fontWeight: 'bold',
        color: COLORS.white,
        fontSize: FONT_SIZES.medium,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        alignItems: 'center',
        zIndex: 10, 
        borderRadius: 5,
    },
    loadingText: {
        marginTop: MARGIN.small,
        color: COLORS.grey,
        fontSize: FONT_SIZES.medium,
    },
    modalLoadingText: {
         marginTop: MARGIN.small,
         color: COLORS.white,
         fontSize: FONT_SIZES.medium,
    }

});