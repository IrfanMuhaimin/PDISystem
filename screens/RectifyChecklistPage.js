// screens/RectifyChecklistPage.js
import React, {
  useContext,
  useState,
  useMemo,
  useEffect,
  useCallback,
} from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  Image,
  ActivityIndicator,
  Platform,
} from "react-native";
import CheckBox from "react-native-checkbox"; // Adjust if using a different library
import { RectifyContext } from "../context/RectifyContext"; // Adjust path
import RectifyInfoModal from "./RectifyInfoModal"; // Adjust path
import ScreenWrapper from "../styles/flowstudiosbg.js"; // Adjust path
import commonStyles, {
  COLORS,
  FONT_SIZES,
  PADDING,
  MARGIN,
} from "../styles/commonStyles"; // Adjust path

// --- Constants ---
const MARKER_SIZE = 24;
const SUMMARY_PAGE_IMAGE_WIDTH = 500;
const SUMMARY_PAGE_IMAGE_HEIGHT = 600;

// --- Helper Functions (Original) ---
const sectionNumberToNameMap = {
  1: "A",
  2: "B",
  3: "C",
  4: "D",
  5: "E",
  6: "F",
  7: "Others",
};
const getSectionLetter = (sectionNumberInput) => {
  const sectionNumber = parseInt(sectionNumberInput, 10);
  if (
    !isNaN(sectionNumber) &&
    sectionNumberToNameMap.hasOwnProperty(sectionNumber)
  ) {
    return sectionNumberToNameMap[sectionNumber];
  }
  // Updated warning and consistent return
  console.warn(
    `[getSectionLetter] Invalid or unmapped section number: "${sectionNumberInput}". Mapping to 'Others'.`
  );
  const othersKey = Object.keys(sectionNumberToNameMap).find(
    (key) => sectionNumberToNameMap[key] === "Others"
  );
  return othersKey ? sectionNumberToNameMap[othersKey] : "Others"; // Return 'Others' explicitly
};
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    // Format as DD/MM/YYYY
    return new Date(dateString).toLocaleDateString("en-GB");
  } catch (e) {
    console.error("Error formatting date:", dateString, e);
    return "Invalid Date";
  }
};
// --- End Helper Functions ---

// --- Component ---
export default function RectifyChecklistPage({ navigation, route }) {
  console.log("\n--- RectifyChecklistPage Render START ---");

  // --- Context ---
  const contextData = useContext(RectifyContext);
  const {
    rectifyItems: allItemsFromContext,
    carInfo,
    images,
    loading,
    error,
    rectifyItemWithDetails,
    unrectifyItem,
    fetchDataForRectification,
  } = contextData || {};

  // --- State (Original) ---
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageLoading, setImageLoading] = useState(false);
  const [rectifyInfoModalVisible, setRectifyInfoModalVisible] = useState(false);
  const [selectedItemForRectify, setSelectedItemForRectify] = useState(null);
  const [modalImageLayout, setModalImageLayout] = useState(null);
  // --- End State ---

  // --- Memos (Original) ---
  const defectItems = useMemo(() => {
    console.log("[Memo] Calculating defectItems...");
    if (!Array.isArray(allItemsFromContext)) {
      console.log(
        "[Memo] allItemsFromContext is not an array or is null/undefined."
      );
      return [];
    }
    const filtered = allItemsFromContext.filter(
      (item) => item && item.originalPass === false
    );
    console.log(`[Memo] Filtered ${filtered.length} defect items.`);
    return filtered;
  }, [allItemsFromContext]);

  const { groupedItems, sortedSectionKeys, calculationError } = useMemo(() => {
    console.log("[Memo] Calculating groupedItems...");
    if (!Array.isArray(defectItems) || defectItems.length === 0) {
      console.log("[Memo] No defect items to group.");
      return {
        groupedItems: {},
        sortedSectionKeys: [],
        calculationError: null,
      };
    }
    try {
      const groups = {};
      defectItems.forEach((item) => {
        if (!item || item.id === undefined) {
          console.warn(`[Grouping] Skipping invalid item:`, item);
          return;
        }

        const sectionValue = item.section;
        let mappedSectionKey = null;

        // Logic to map section value (number or string) to section key ('A', 'B', etc.)
        if (typeof sectionValue === "number") {
          const sectionNumber = sectionValue;
          if (!isNaN(sectionNumber)) {
            mappedSectionKey = getSectionLetter(sectionNumber);
          }
        } else if (typeof sectionValue === "string") {
          if (sectionValue.length === 1 && /^[A-F]$/i.test(sectionValue)) {
            mappedSectionKey = sectionValue.toUpperCase();
          } else if (sectionValue.toLowerCase() === "others") {
            mappedSectionKey = "Others";
          } else {
            const sectionNumber = parseInt(sectionValue, 10);
            if (
              !isNaN(sectionNumber) &&
              sectionNumber >= 1 &&
              sectionNumber <= 7
            ) {
              mappedSectionKey = getSectionLetter(sectionNumber);
            }
          }
        } else {
          console.warn(
            `[Grouping Debug] -> Section value has unexpected type: ${typeof sectionValue} for Item ID ${
              item.id
            }`
          );
        }

        const validSectionKeys = Object.values(sectionNumberToNameMap);
        if (mappedSectionKey && validSectionKeys.includes(mappedSectionKey)) {
          if (!groups[mappedSectionKey]) {
            groups[mappedSectionKey] = [];
          }
          groups[mappedSectionKey].push(item);
        } else {
          // Fallback to 'Others' if mapping fails
          const othersKey = "Others";
          console.warn(
            `[Grouping Debug] -> Item ID ${item.id} could not be mapped ('${mappedSectionKey}'). Falling back to '${othersKey}'.`
          );
          if (!groups[othersKey]) {
            groups[othersKey] = [];
          }
          groups[othersKey].push(item);
        }
      });

      // Sort items within each group by ID
      for (const key in groups) {
        groups[key].sort((a, b) => (a.id || 0) - (b.id || 0));
      }

      // Sort the section keys ('A', 'B', ..., 'Others')
      const sortedKeys = Object.keys(groups).sort((a, b) => {
        if (a === "Others") return 1; // 'Others' always last
        if (b === "Others") return -1;
        const numA = Object.keys(sectionNumberToNameMap).find(
          (key) => sectionNumberToNameMap[key] === a
        );
        const numB = Object.keys(sectionNumberToNameMap).find(
          (key) => sectionNumberToNameMap[key] === b
        );
        if (numA && numB) {
          return parseInt(numA, 10) - parseInt(numB, 10);
        }
        return a.localeCompare(b); // Fallback sort
      });

      console.log(
        `[Memo] Grouped items into sections: ${sortedKeys.join(", ")}`
      );
      return {
        groupedItems: groups,
        sortedSectionKeys: sortedKeys,
        calculationError: null,
      };
    } catch (e) {
      console.error("[Grouping] Error:", e);
      return {
        groupedItems: {},
        sortedSectionKeys: [],
        calculationError: `Grouping failed: ${e.message || e}`,
      };
    }
  }, [defectItems]);

  const allDefectsRectified = useMemo(() => {
    // Original calculation remains unchanged
    if (!Array.isArray(defectItems) || defectItems.length === 0) return true;
    const result = defectItems.every((item) => item && item.rectified === true);
    console.log(`[Memo] All defects rectified: ${result}`);
    return result;
  }, [defectItems]);
  // --- End Memos ---

  // --- Handlers (Original) ---
  const handleNextImage = () => {
    if (!images || images.length === 0) return;
    setImageLoading(true);
    setModalImageLayout(null);
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };
  const handlePreviousImage = () => {
    if (!images || images.length === 0) return;
    setImageLoading(true);
    setModalImageLayout(null);
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleRectifiedChange = (item) => {
    if (!item) return;
    console.log(
      `handleRectifiedChange called for item ID: ${item.id}, Current rectified: ${item.rectified}`
    );
    if (!item.rectified) {
      // Open RectifyInfoModal
      if (!rectifyItemWithDetails) {
        console.error(
          "rectifyItemWithDetails function is missing from context."
        );
        Alert.alert(
          "Error",
          "Cannot process rectification. Context setup issue."
        );
        return;
      }
      console.log("Opening RectifyInfoModal for item ID:", item.id);
      setSelectedItemForRectify(item);
      setRectifyInfoModalVisible(true);
    } else {
      // Un-rectify
      if (!unrectifyItem) {
        console.error("unrectifyItem function is missing from context.");
        Alert.alert(
          "Error",
          "Cannot process un-rectification. Context setup issue."
        );
        return;
      }
      console.log("Calling unrectifyItem for item ID:", item.id);
      unrectifyItem(item.id);
      setSelectedItemForRectify(null);
    }
  };

  const handleModalConfirm = (name, no, remark, date) => {
    if (!selectedItemForRectify || !rectifyItemWithDetails) {
      console.error(
        "Cannot confirm: selectedItemForRectify or rectifyItemWithDetails missing."
      );
      Alert.alert("Error", "Could not process rectification details.");
      return;
    }
    const itemId = selectedItemForRectify.id;
    console.log(`Confirming rectification for item ID: ${itemId}`);
    rectifyItemWithDetails(itemId, { name, no, remark, date });
    handleModalClose();
  };

  const handleModalClose = () => {
    console.log("Closing RectifyInfoModal");
    setRectifyInfoModalVisible(false);
    setSelectedItemForRectify(null);
  };
  // --- End Handlers ---

  // --- Layout Callback for Image Modal (Original) ---
  const onModalImageLayout = useCallback(
    (event) => {
      const { width, height } = event.nativeEvent.layout;
      // console.log(`[Layout Callback] Modal image layout measured: ${width}x${height}`); // Reduce logging
      if (width > 0 && height > 0) {
        if (
          !modalImageLayout ||
          modalImageLayout.width !== width ||
          modalImageLayout.height !== height
        ) {
          console.log("[Layout Callback] Setting modal image layout state.");
          setModalImageLayout({ width, height });
        }
      } else {
        console.warn(
          "[Layout Callback] Invalid dimensions measured:",
          width,
          height
        );
      }
    },
    [modalImageLayout]
  );
  // --- End Layout Callback ---

  // --- Mark Filtering Calculation for Image Modal (Original) ---
  const marksForCurrentImage = useMemo(() => {
    // Original calculation remains unchanged
    // console.log("[Memo] Calculating marksForCurrentImage..."); // Reduce logging
    if (!modalImageLayout) return [];
    if (!images || images.length <= currentImageIndex) return [];
    if (!Array.isArray(defectItems)) return [];

    const currentImageId = images[currentImageIndex].id;
    // console.log(`[Memo] Current image ID: ${currentImageId}`); // Reduce logging
    const filteredMarks = [];

    defectItems.forEach((item) => {
      if (!item) return;
      const defectsArray = item?.allDefects; // Assuming structure from context
      if (!Array.isArray(defectsArray) || defectsArray.length === 0) return;

      defectsArray.forEach((defectInfo, defectIndex) => {
        if (!defectInfo) return;
        const defectImageId = defectInfo.image_id;
        const hasMatchingId = String(defectImageId) === String(currentImageId);
        if (!hasMatchingId) return;

        let marksData = null;
        if (Array.isArray(defectInfo.marks) && defectInfo.marks.length > 0) {
          marksData = defectInfo.marks;
        } else if (defectInfo.mark && typeof defectInfo.mark === "object") {
          marksData = [defectInfo.mark];
        }
        if (!Array.isArray(marksData) || marksData.length === 0) return;

        marksData.forEach((mark, markIndex) => {
          const xCoord = mark.x ?? mark.nx;
          const yCoord = mark.y ?? mark.ny;
          const isValidMark =
            mark && typeof xCoord === "number" && typeof yCoord === "number";
          if (!isValidMark) {
            console.warn(
              `[Memo Marks] Invalid mark format for item ${item.id}, defect ${defectIndex}, mark ${markIndex}:`,
              mark
            );
            return;
          }
          const pixelX = xCoord * modalImageLayout.width;
          const pixelY = yCoord * modalImageLayout.height;
          // console.log(`[Memo Marks] Adding mark for Item ID ${item.id}`); // Reduce logging
          filteredMarks.push({
            id: `${item.id}-defect-${defectIndex}-mark-${markIndex}`,
            pixelX: pixelX - MARKER_SIZE / 2,
            pixelY: pixelY - MARKER_SIZE / 2,
            location: defectInfo.location || "N/A",
          });
        });
      });
    });
    // console.log(`[Memo] Found ${filteredMarks.length} marks for image ID ${currentImageId}.`); // Reduce logging
    return filteredMarks;
  }, [defectItems, images, currentImageIndex, modalImageLayout]);
  // --- End Mark Calculation ---

  // --- RENDER LOGIC ---

  // Loading/Error States (Original)
  if (loading) {
    return (
      <ScreenWrapper showHeader={true} showFooter={false}>
        <View style={localStyles.centeredMessageContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={localStyles.loadingText}>
            Loading Rectification Data...
          </Text>
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
          <Text style={localStyles.errorDetailText}>
            {String(displayError)}
          </Text>
        </View>
        <View style={commonStyles.footerActionContainer}>
          <TouchableOpacity
            style={commonStyles.actionButtonSecondary}
            onPress={() => navigation.goBack()}
          >
            <Text style={commonStyles.actionButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }
  if (!carInfo) {
    console.error(
      "RectifyChecklistPage: carInfo is null or undefined after loading/error checks."
    );
    return (
      <ScreenWrapper showHeader={true} showFooter={true}>
        <View style={localStyles.centeredMessageContainer}>
          <Text style={commonStyles.noDataText}>
            Car Information Not Available.
          </Text>
          <Text style={localStyles.errorDetailText}>
            Cannot proceed without car details.
          </Text>
        </View>
        <View style={commonStyles.footerActionContainer}>
          <TouchableOpacity
            style={commonStyles.actionButtonSecondary}
            onPress={() => navigation.goBack()}
          >
            <Text style={commonStyles.actionButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
    );
  }
  // --- End Loading/Error States ---

  // --- Main Content Render ---
  // const currentImageData = (images && images.length > currentImageIndex) ? images[currentImageIndex] : null;
  // --- Sort the images by ID (ascending) ---
  // Create a shallow copy using spread syntax [...] before sorting
  const sortedImages = images ? [...images].sort((a, b) => a.id - b.id) : [];

  const currentImageData =
    sortedImages.length > currentImageIndex
      ? sortedImages[currentImageIndex]
      : null;
  const imageUrl = currentImageData?.file_path
    ? String(currentImageData.file_path).trim().startsWith("http")
      ? String(currentImageData.file_path).trim()
      : `http://${String(currentImageData.file_path).trim()}`
    : null;

  // console.log(`Rendering main content. All rectified: ${allDefectsRectified}.`); // Reduce logging

  return (
    <ScreenWrapper
      showHeader={true}
      showFooter={true}
      enableScrollView={false}
      enableKeyboardAvoidingView={Platform.OS === "ios"}
    >
      {/* Scrollable Content */}
      <ScrollView
        style={localStyles.scrollView}
        contentContainerStyle={localStyles.scrollContentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={commonStyles.pageHeader}>Rectify Defects</Text>
        <Text style={localStyles.subHeader}>
          Chassis: {carInfo?.chassis_no || "N/A"}
        </Text>
        <Text style={localStyles.carInfo}>
          Model: {carInfo?.model || "N/A"}
        </Text>

        {/* View Defect Locations Button (Original) */}
        <View style={localStyles.viewImageButtonContainer}>
          <TouchableOpacity
            style={[
              localStyles.viewImageButton,
              (!images || images.length === 0) && localStyles.disabledButton,
            ]}
            onPress={() => {
              if (images?.length) {
                console.log(
                  "View Defect Locations button pressed. Opening modal."
                );
                setCurrentImageIndex(0);
                setImageLoading(true);
                setModalImageLayout(null);
                setImageModalVisible(true);
              } else {
                console.log(
                  "View Defect Locations button pressed, but no images available."
                );
              }
            }}
            disabled={!images?.length}
          >
            <Text style={localStyles.viewImageButtonText}>
              {images?.length ? `View Defect Locations` : "No Defect Available"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Defect List - Grouped by Section */}
        {sortedSectionKeys && sortedSectionKeys.length > 0 ? (
          sortedSectionKeys.map((sectionKey) => (
            <View key={sectionKey} style={localStyles.sectionContainer}>
              <Text style={localStyles.sectionHeader}>
                Section {sectionKey}
              </Text>
              {/* Items within the section */}
              {Array.isArray(groupedItems[sectionKey]) ? (
                groupedItems[sectionKey].map((item, index) => {
                  if (!item || item.id === undefined) {
                    console.warn(
                      `Skipping rendering of invalid item in section ${sectionKey}.`
                    );
                    return null;
                  }

                  // Extract defect details (assuming first defect is primary from allDefects)
                  // This is where severity is expected from the server
                  const defectInfo = item.allDefects?.[0];

                  return (
                    <View key={item.id} style={localStyles.item}>
                      {/* Left side: Item details */}
                      <View style={localStyles.itemDetails}>
                        {/* Item Name */}
                        <Text style={localStyles.itemName}>
                          {`${index + 1}. ${item.name || "Unnamed Item"}`}
                        </Text>

                        {/* Defect Details (Category, Type, Severity) */}
                        {defectInfo && (
                          <View style={localStyles.detailsContainer}>
                            {/* Category Row */}
                            <View style={localStyles.detailRow}>
                              <Text style={localStyles.detailLabel}>
                                Category
                              </Text>
                              <Text style={localStyles.detailSeparator}>:</Text>
                              <Text style={localStyles.detailValue}>
                                {defectInfo.category || "N/A"}
                              </Text>
                            </View>
                            {/* Type Row */}
                            <View style={localStyles.detailRow}>
                              <Text style={localStyles.detailLabel}>Type</Text>
                              <Text style={localStyles.detailSeparator}>:</Text>
                              <Text style={localStyles.detailValue}>
                                {defectInfo.type || "N/A"}
                              </Text>
                            </View>
                            {/* --- MODIFIED: Added Severity Row --- */}
                            <View style={localStyles.detailRow}>
                              <Text style={localStyles.detailLabel}>
                                Severity
                              </Text>
                              <Text style={localStyles.detailSeparator}>:</Text>
                              <Text style={localStyles.detailValue}>
                                {/* Display Severity fetched from server */}
                                {defectInfo.severity || "N/A"}
                              </Text>
                            </View>
                            {/* --- END MODIFICATION --- */}
                            {/* Location Row (Optional) */}
                            <View style={localStyles.detailRow}>
                              <Text style={localStyles.detailLabel}>
                                Location
                              </Text>
                              <Text style={localStyles.detailSeparator}>:</Text>
                              <Text style={localStyles.detailValue}>
                                {defectInfo.location || "N/A"}
                              </Text>
                            </View>
                          </View>
                        )}

                        {/* Rectifier Info (if rectified) */}
                        {item.rectified && (
                          <View style={localStyles.rectifierInfoContainer}>
                            {(item.rectifierName || item.rectificationDate) && (
                              <Text style={localStyles.rectifierInfoText}>
                                By: {item.rectifierName || "N/A"} (
                                {item.rectifierNo || "N/A"}) on{" "}
                                {formatDate(item.rectificationDate)}
                              </Text>
                            )}
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
                        checked={!!item.rectified}
                        onChange={() => handleRectifiedChange(item)}
                        labelStyle={{
                          color: item.rectified
                            ? COLORS.success
                            : COLORS.secondary,
                          fontSize: FONT_SIZES.small,
                          marginLeft: MARGIN.xsmall,
                        }}
                        checkboxStyle={localStyles.checkboxStyle}
                      />
                    </View>
                  );
                })
              ) : (
                <Text style={commonStyles.noDataText}>
                  No items found for section {sectionKey}
                </Text>
              )}
            </View>
          ))
        ) : (
          <View style={localStyles.centeredMessageContainer}>
            <Text style={commonStyles.noDataText}>
              No defect items found for rectification.
            </Text>
          </View>
        )}
        <View style={{ height: 40 }} />
        {/* Scroll bottom padding */}
      </ScrollView>

      {/* Fixed Footer Buttons (Original) */}
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
            !allDefectsRectified && commonStyles.actionButtonDisabled,
          ]}
          onPress={() => {
            if (allDefectsRectified) {
              console.log(
                "Next button pressed. All defects rectified. Navigating to RectifySummary."
              );
              navigation.navigate("RectifySummary");
            } else {
              console.log(
                "Next button pressed, but not all defects are rectified."
              );
              Alert.alert(
                "Incomplete",
                "Please ensure all defects are marked as rectified before proceeding."
              );
            }
          }}
          disabled={!allDefectsRectified}
        >
          <Text
            style={[
              commonStyles.actionButtonPrimaryText,
              !allDefectsRectified && commonStyles.actionButtonTextDisabled,
            ]}
          >
            Next
          </Text>
        </TouchableOpacity>
      </View>

      {/* Image Modal (Original) */}
      {imageModalVisible && currentImageData && imageUrl && (
        <Modal
          visible={imageModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => {
            console.log("Image modal onRequestClose triggered.");
            setImageModalVisible(false);
            setImageLoading(false);
            setModalImageLayout(null);
          }}
        >
          <View style={localStyles.modalContainer}>
            <Text style={localStyles.modalHeader}>Defect Locations</Text>
            <Text style={localStyles.modalSubHeader}>
              {`Image ${currentImageIndex + 1} of ${images.length}${
                currentImageData.description
                  ? ` (${currentImageData.description})`
                  : ""
              }`}
            </Text>

            <View style={localStyles.imageSelector}>
              <TouchableOpacity
                onPress={handlePreviousImage}
                style={localStyles.imageButton}
                disabled={!images || images.length <= 1 || imageLoading}
              >
                <Text style={localStyles.imageButtonText}>Back</Text>
              </TouchableOpacity>
              <Text
                style={{
                  color: "white",
                  fontSize: 16,
                  fontWeight: "bold",
                  marginHorizontal: 10,
                  flexShrink: 1,
                  textAlign: "center",
                }}
              >
                {currentImageData.description ||
                  `Image ${currentImageIndex + 1}`}
              </Text>
              <TouchableOpacity
                onPress={handleNextImage}
                style={localStyles.imageButton}
                disabled={!images || images.length <= 1 || imageLoading}
              >
                <Text style={localStyles.imageButtonText}>Next</Text>
              </TouchableOpacity>
            </View>

            <View style={localStyles.imageContainer}>
              <Image
                key={currentImageData.id}
                source={{ uri: imageUrl }}
                style={localStyles.image}
                onLoadStart={() => {
                  console.log(`Image onLoadStart: ${imageUrl}`);
                  setImageLoading(true);
                }}
                onLoad={() => {
                  console.log(`Image onLoad Success: ${imageUrl}`);
                  setImageLoading(false);
                }}
                onError={(e) => {
                  console.error(
                    `Image Load Error: ${imageUrl}`,
                    e.nativeEvent.error
                  );
                  setImageLoading(false);
                  Alert.alert(
                    "Image Error",
                    `Failed to load image: ${
                      currentImageData.description || imageUrl
                    }. \nError: ${e.nativeEvent.error}`
                  );
                }}
                resizeMode="contain"
                onLayout={onModalImageLayout}
              />

              {(imageLoading || !modalImageLayout) && (
                <View style={localStyles.loadingOverlay}>
                  <ActivityIndicator size="large" color="#FFF" />
                  <Text style={localStyles.modalLoadingText}>
                    Loading Image...
                  </Text>
                </View>
              )}

              {modalImageLayout && marksForCurrentImage.length > 0 && (
                <View
                  style={StyleSheet.absoluteFillObject}
                  pointerEvents="none"
                >
                  {marksForCurrentImage.map((mark) => (
                    <View
                      key={mark.id}
                      style={[
                        localStyles.markerContainer,
                        { left: mark.pixelX, top: mark.pixelY },
                      ]}
                    >
                      {mark.location === "Interior" && (
                        <View style={localStyles.markerCircle} />
                      )}
                      <Text style={localStyles.markerX}>X</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <TouchableOpacity
              style={localStyles.closeButton}
              onPress={() => {
                console.log("Image modal Close button pressed.");
                setImageModalVisible(false);
                setImageLoading(false);
                setModalImageLayout(null);
              }}
            >
              <Text style={localStyles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}

      {/* Rectify Info Modal (Original) */}
      <RectifyInfoModal
        visible={rectifyInfoModalVisible}
        item={selectedItemForRectify}
        onClose={handleModalClose}
        onConfirm={handleModalConfirm}
      />
    </ScreenWrapper>
  );
}

// --- Styles (Original - Unchanged) ---
const localStyles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContentContainer: {
    paddingHorizontal: PADDING.medium,
    paddingTop: PADDING.small,
    paddingBottom: PADDING.large,
  },
  centeredMessageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: PADDING.large,
    marginTop: MARGIN.xlarge,
  },
  subHeader: {
    fontSize: FONT_SIZES.large,
    textAlign: "center",
    marginBottom: MARGIN.xsmall,
    color: COLORS.secondary,
    fontWeight: "600",
  },
  carInfo: {
    fontSize: FONT_SIZES.medium,
    marginBottom: MARGIN.medium,
    textAlign: "center",
    color: COLORS.grey,
  },
  viewImageButtonContainer: {
    alignItems: "center",
    marginVertical: MARGIN.medium,
  },
  viewImageButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: PADDING.medium,
    paddingHorizontal: PADDING.medium,
    borderRadius: 8,
    alignItems: "center",
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  disabledButton: {
    backgroundColor: COLORS.disabled,
    opacity: 0.7,
    elevation: 0,
  },
  viewImageButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: FONT_SIZES.medium,
  },
  sectionContainer: {
    marginBottom: MARGIN.medium,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    elevation: 1,
    shadowColor: COLORS.grey,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    overflow: "hidden",
  },
  sectionHeader: {
    fontSize: FONT_SIZES.large,
    fontWeight: "bold",
    color: COLORS.black,
    backgroundColor: COLORS.primaryLight,
    paddingVertical: PADDING.small,
    paddingHorizontal: PADDING.medium,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "transparent",
    paddingVertical: PADDING.medium,
    paddingHorizontal: PADDING.medium,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  itemDetails: { flex: 1, marginRight: MARGIN.medium },
  itemName: {
    fontSize: FONT_SIZES.medium,
    fontWeight: "600",
    marginBottom: MARGIN.xsmall,
    color: COLORS.secondary,
    lineHeight: FONT_SIZES.medium * 1.3,
  },
  detailsContainer: { marginLeft: MARGIN.small, marginBottom: MARGIN.xsmall },
  detailRow: {
    flexDirection: "row",
    marginBottom: MARGIN.xsmall / 2,
    alignItems: "flex-start",
  },
  detailLabel: {
    fontSize: FONT_SIZES.small,
    color: COLORS.grey,
    fontWeight: "600",
    width: 70,
  }, // Using fixed width for label alignment
  detailSeparator: {
    fontSize: FONT_SIZES.small,
    color: COLORS.grey,
    fontWeight: "600",
    marginHorizontal: MARGIN.xsmall / 2,
  }, // Kept separator
  detailValue: {
    flex: 1,
    fontSize: FONT_SIZES.small,
    color: COLORS.secondary,
    lineHeight: FONT_SIZES.small * 1.5,
  }, // Style for value text
  rectifierInfoContainer: {
    marginTop: MARGIN.small,
    marginLeft: MARGIN.small,
    paddingTop: MARGIN.small,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  rectifierInfoText: {
    fontSize: FONT_SIZES.xsmall,
    fontStyle: "italic",
    color: COLORS.success,
    marginBottom: MARGIN.xsmall / 2,
    lineHeight: FONT_SIZES.xsmall * 1.3,
  },
  remarkText: {
    fontSize: FONT_SIZES.xsmall,
    fontStyle: "italic",
    color: COLORS.grey,
    lineHeight: FONT_SIZES.xsmall * 1.3,
  },
  checkboxStyle: { width: 24, height: 24 },
  errorDetailText: {
    color: COLORS.danger,
    fontSize: FONT_SIZES.small,
    textAlign: "center",
    marginTop: MARGIN.small,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.85)",
    paddingVertical: PADDING.large,
    paddingHorizontal: PADDING.medium,
  },
  modalHeader: {
    fontSize: FONT_SIZES.xlarge,
    fontWeight: "bold",
    color: COLORS.white,
    marginBottom: MARGIN.small,
    textAlign: "center",
  },
  modalSubHeader: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.lightGrey,
    marginBottom: MARGIN.large,
    textAlign: "center",
    paddingHorizontal: PADDING.small,
  },
  imageSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    maxWidth: SUMMARY_PAGE_IMAGE_WIDTH + 40,
    marginBottom: MARGIN.medium,
    alignItems: "center",
  },
  imageButton: {
    backgroundColor: COLORS.primaryLight,
    paddingVertical: PADDING.small,
    paddingHorizontal: PADDING.medium,
    borderRadius: 5,
    minWidth: 80,
    alignItems: "center",
  },
  imageButtonText: {
    fontWeight: "bold",
    color: COLORS.secondary,
    fontSize: FONT_SIZES.medium,
  },
  imageContainer: {
    position: "relative",
    borderColor: COLORS.grey,
    borderWidth: 1,
    marginVertical: MARGIN.medium,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    aspectRatio: SUMMARY_PAGE_IMAGE_WIDTH / SUMMARY_PAGE_IMAGE_HEIGHT,
    maxWidth: SUMMARY_PAGE_IMAGE_WIDTH,
    maxHeight: SUMMARY_PAGE_IMAGE_HEIGHT,
    backgroundColor: COLORS.black,
    borderRadius: 5,
    overflow: "hidden",
  },
  image: { width: "100%", height: "100%" },
  markerContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    width: MARKER_SIZE,
    height: MARKER_SIZE,
  },
  markerX: {
    fontSize: FONT_SIZES.large,
    fontWeight: "bold",
    color: COLORS.redinfo,
    textShadowColor: "rgba(255, 255, 255, 0.7)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  markerCircle: {
    width: MARKER_SIZE * 0.9,
    height: MARKER_SIZE * 0.9,
    borderRadius: MARKER_SIZE * 0.45,
    borderWidth: 2,
    borderColor: COLORS.warning,
    position: "absolute",
    backgroundColor: "transparent",
  },
  closeButton: {
    marginTop: MARGIN.large,
    backgroundColor: COLORS.danger,
    paddingVertical: PADDING.medium,
    paddingHorizontal: PADDING.xlarge,
    borderRadius: 8,
  },
  closeText: {
    fontWeight: "bold",
    color: COLORS.white,
    fontSize: FONT_SIZES.medium,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    borderRadius: 5,
  },
  loadingText: {
    marginTop: MARGIN.small,
    color: COLORS.grey,
    fontSize: FONT_SIZES.medium,
  }, // General loading text
  modalLoadingText: {
    marginTop: MARGIN.small,
    color: COLORS.white,
    fontSize: FONT_SIZES.medium,
  }, // Loading text for modal overlay
});
// --- End Styles ---
