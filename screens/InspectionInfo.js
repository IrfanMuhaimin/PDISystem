// screens/InspectionInfo.js
import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
  Platform,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// --- Import ScreenWrapper ---
// *** ADJUST PATH IF NEEDED ***
import ScreenWrapper from "../styles/flowstudiosbg.js";

// --- Import Common Styles & Constants ---
// *** ADJUST PATH IF NEEDED ***
import commonStyles, {
  COLORS,
  FONT_SIZES,
  PADDING,
  MARGIN,
} from "../styles/commonStyles.js";

// --- Import Custom Components ---
// *** ADJUST PATH IF NEEDED ***
import InspectionConfirm from "../screens/InspectionConfirm";

// --- API Endpoints / Constants / Helpers ---
const API_BASE_URL = "http://pdi.flowstudios.com.my/api";
const JOB_CARD_DETAIL_ENDPOINT = `${API_BASE_URL}/jobcards`;
const PDI_APPROVAL_BASE_ENDPOINT = `${API_BASE_URL}/approvals`;

const MODAL_IMAGE_WIDTH = 500;
const MODAL_IMAGE_HEIGHT = 600;

// Helper functions (Unchanged)
const sectionNumberToNameMap = {
  1: "A",
  2: "B",
  3: "C",
  4: "D",
  5: "E",
  6: "F",
  7: "Others",
};
const getSectionNameFromNumber = (number) =>
  number === null || number === undefined
    ? "Uncategorized"
    : sectionNumberToNameMap[number] || `Unknown Section (${number})`;
// isItemRectified checks item.defect, which exists in items from data.sections
const isItemRectified = (item) =>
  item &&
  Array.isArray(item.defect) &&
  item.defect.length > 0 &&
  item.defect.some((d) => d && d.rectify && typeof d.rectify === "object");
const formatDate = (date) => {
  if (!date) return "N/A";
  try {
    const dateObj = new Date(date);
    return isNaN(dateObj.getTime())
      ? "Invalid Date"
      : dateObj.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
  } catch (error) {
    console.error("Error formatting date:", date, error);
    return "Error Date";
  }
};

// --- Component Definition ---
export default function InspectionInfo({ navigation }) {
  // --- State & Route --- (Unchanged)
  const route = useRoute();
  const { chassisNo } = route.params || {};
  const [detailedVehicleData, setDetailedVehicleData] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageLoadingInModal, setImageLoadingInModal] = useState(false);
  const [showPdiConfirmModal, setShowPdiConfirmModal] = useState(false);
  const [pdiDecisionToConfirm, setPdiDecisionToConfirm] = useState(null);
  const [isConfirmingPdi, setIsConfirmingPdi] = useState(false);
  const [supervisorName, setSupervisorName] = useState("N/A"); // User viewing the screen

  // --- useEffects ---

  // Fetch user name (Unchanged)
  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const name = await AsyncStorage.getItem("userFullName");
        if (name) {
          setSupervisorName(name);
        } else {
          console.warn("'userFullName' not found in AsyncStorage.");
        }
      } catch (e) {
        console.error("Failed to fetch supervisor name:", e);
      }
    };
    fetchUserName();
  }, []);

  // Fetch Job Card Details (Fetch logic unchanged, validation slightly adapted)
  useEffect(() => {
    const fetchJobCardDetails = async () => {
      if (!chassisNo) {
        setFetchError("No chassis number provided.");
        setIsLoadingDetails(false);
        return;
      }
      setIsLoadingDetails(true);
      setFetchError(null);
      setDetailedVehicleData(null);
      try {
        const token = await AsyncStorage.getItem("authToken");
        if (!token) throw new Error("Auth token missing.");
        const url = `${JOB_CARD_DETAIL_ENDPOINT}/${chassisNo}`;
        console.log(`Fetching Job Card Details: ${url}`);
        const response = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
        console.log(`[InspectionInfo] Fetch Status: ${response.status}`);
        if (!response.ok) {
          let errorMsg = `Fetch failed (${response.status})`;
          if (response.status === 404) {
            errorMsg = `Job card not found for Chassis: ${chassisNo}. (${response.status})`;
          } else {
            try {
              const eb = await response.json();
              errorMsg = eb.message || eb.error || errorMsg;
            } catch (e) {
              /*ignore*/
            }
          }
          throw new Error(errorMsg);
        }
        const data = await response.json();
        console.log(`[InspectionInfo] Fetch Success.`);
        // Basic data validation - check for chassis_no and the sections array specifically
        if (
          !data ||
          typeof data !== "object" ||
          !data.chassis_no ||
          !Array.isArray(data.sections)
        ) {
          // Check for data.sections array
          console.error(
            "[InspectionInfo] Invalid data format received (missing chassis_no or sections array):",
            JSON.stringify(data).substring(0, 500)
          );
          throw new Error("Invalid data format received from server.");
        }
        setDetailedVehicleData(data);
      } catch (error) {
        console.error("[InspectionInfo] Fetch Job Card Error:", error);
        setFetchError(error.message || "An unknown error occurred.");
      } finally {
        setIsLoadingDetails(false);
      }
    };
    fetchJobCardDetails();
  }, [chassisNo]);

  // --- *** MODIFIED useMemo hook to process data.sections *** ---
  const allItems = useMemo(() => {
    console.log(
      "[InspectionInfo useMemo - allItems] Calculating all items from data.sections..."
    );
    // Source items from detailedVehicleData.sections
    if (!detailedVehicleData?.sections) {
      console.log(
        "[InspectionInfo useMemo - allItems] detailedVehicleData.sections is missing or null."
      );
      return []; // Return empty array if sections data is not available
    }
    let collectedItems = [];
    try {
      // Iterate through each section object provided in the .sections array
      detailedVehicleData.sections.forEach((sectionObj, sectionIndex) => {
        // Check if the section object and its 'items' array are valid
        if (sectionObj && Array.isArray(sectionObj.items)) {
          // Filter out any potential null/undefined items within the section's items array before concatenating
          const validItemsInSection = sectionObj.items.filter(
            (item) => item != null
          );
          collectedItems = collectedItems.concat(validItemsInSection);
        } else {
          // Log a warning if a section object is invalid or missing its items array
          console.warn(
            `[InspectionInfo useMemo - allItems] Skipping invalid section object or missing items array at index ${sectionIndex}:`,
            sectionObj
          );
        }
      });
      console.log(
        `[InspectionInfo useMemo - allItems] Collected ${collectedItems.length} items from sections.`
      );
      return collectedItems; // Return the flat list of all valid items from all sections
    } catch (error) {
      // Log error if processing fails
      console.error(
        "[InspectionInfo useMemo - allItems] Error processing sections:",
        error
      );
      return []; // Return empty array on error
    }
  }, [detailedVehicleData]); // Dependency: Re-calculate when detailedVehicleData changes
  // --- *** END OF MODIFICATION *** ---

  // --- Subsequent useMemo hooks (depend on `allItems`, logic unchanged) ---

  // Filters for items that have been rectified
  const rectifiedItemsOnly = useMemo(() => {
    console.log(
      "[InspectionInfo useMemo - rectifiedItemsOnly] Filtering rectified items from allItems..."
    );
    const filtered = allItems.filter(isItemRectified); // Uses the `allItems` derived from sections
    console.log(
      `[InspectionInfo useMemo - rectifiedItemsOnly] Found ${filtered.length} rectified items.`
    );
    return filtered;
  }, [allItems]); // Depends on the modified allItems

  // Groups the rectified items by section name for display
  const { groupedItemsForDisplay, sortedSectionsForDisplay, groupingError } =
    useMemo(() => {
      console.log(
        "[InspectionInfo useMemo - groupedItems] Grouping rectified items..."
      );
      if (!rectifiedItemsOnly)
        return {
          groupedItemsForDisplay: {},
          sortedSectionsForDisplay: [],
          groupingError: "Rectified items data unavailable.",
        };
      const grouped = {};
      try {
        rectifiedItemsOnly.forEach((item) => {
          if (!item?.id) return;
          const sectionName = getSectionNameFromNumber(item.section); // Uses helper function converts number to letter/name
          if (!grouped[sectionName]) grouped[sectionName] = [];
          grouped[sectionName].push(item);
        });
        // Sorting logic (A, B, C..., Others, Uncategorized) - Unchanged
        const order = ["A", "B", "C", "D", "E", "F", "Others"];
        const sortedKeys = Object.keys(grouped).sort((a, b) => {
          const iA = order.indexOf(a),
            iB = order.indexOf(b);
          if (iA !== -1 && iB !== -1) return iA - iB; // Sort A-F correctly
          if (iA !== -1) return -1; // A-F comes before others
          if (iB !== -1) return 1; // Others comes after A-F
          if (a === "Uncategorized") return 1; // Uncategorized last
          if (b === "Uncategorized") return -1;
          return String(a).localeCompare(String(b)); // Fallback sort
        });
        console.log(
          "[InspectionInfo useMemo - groupedItems] Grouping successful."
        );
        return {
          groupedItemsForDisplay: grouped,
          sortedSectionsForDisplay: sortedKeys,
          groupingError: null,
        };
      } catch (err) {
        console.error(
          "[InspectionInfo useMemo - groupedItems] Grouping Error:",
          err
        );
        return {
          groupedItemsForDisplay: {},
          sortedSectionsForDisplay: [],
          groupingError: "Grouping failed.",
        };
      }
    }, [rectifiedItemsOnly]); // Depends on rectifiedItemsOnly

  // Calculates the summary statistics per section (Reported Defects vs. Rectified)
  const { sectionSummary, sectionSummaryError } = useMemo(() => {
    console.log(
      "[InspectionInfo useMemo - sectionSummary] Calculating section summary from allItems..."
    );
    // Uses the modified `allItems` derived from `data.sections`
    if (!allItems || isLoadingDetails || fetchError)
      return { sectionSummary: [], sectionSummaryError: null };
    const summaryMap = {};
    try {
      allItems.forEach((item) => {
        if (!item?.id) return;
        const sectionName = getSectionNameFromNumber(item.section); // Uses helper function
        if (!summaryMap[sectionName])
          summaryMap[sectionName] = {
            section: sectionName,
            totalDefectsReported: 0,
            rectifiedCount: 0,
          };
        // Check if item failed inspection (pass is false) AND defect array exists
        const hadDefect =
          item.hasOwnProperty("defect") &&
          Array.isArray(item.defect) &&
          item.pass === false;
        if (hadDefect) {
          summaryMap[sectionName].totalDefectsReported++; // Increment count of reported defects
          // Check if this specific defect item was rectified
          if (isItemRectified(item)) {
            // Uses helper function
            summaryMap[sectionName].rectifiedCount++;
          }
        }
      });
      // Filter out sections with no reported defects and sort - Unchanged
      const summaryArray = Object.values(summaryMap).filter(
        (s) => s.totalDefectsReported > 0
      );
      const order = ["A", "B", "C", "D", "E", "F", "Others"];
      summaryArray.sort((a, b) => {
        const iA = order.indexOf(a.section),
          iB = order.indexOf(b.section);
        if (iA !== -1 && iB !== -1) return iA - iB; // Sort A-F correctly
        if (iA !== -1) return -1; // A-F comes before others
        if (iB !== -1) return 1; // Others comes after A-F
        if (a.section === "Uncategorized") return 1; // Uncategorized last
        if (b.section === "Uncategorized") return -1;
        return String(a.section).localeCompare(String(b.section)); // Fallback sort
      });
      console.log(
        "[InspectionInfo useMemo - sectionSummary] Summary calculation successful."
      );
      return { sectionSummary: summaryArray, sectionSummaryError: null };
    } catch (err) {
      console.error(
        "[InspectionInfo useMemo - sectionSummary] Summary Error:",
        err
      );
      return {
        sectionSummary: [],
        sectionSummaryError: "Summary calculation failed.",
      };
    }
  }, [allItems, isLoadingDetails, fetchError]); // Depends on modified allItems

  // --- Handlers (Image Modal, PDI Confirmation) --- (Unchanged logic)
  const handleNextImage = () => {
    const images = detailedVehicleData?.images || [];
    if (images.length <= 1) return;
    setImageLoadingInModal(true);
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };
  const handlePreviousImage = () => {
    const images = detailedVehicleData?.images || [];
    if (images.length <= 1) return;
    setImageLoadingInModal(true);
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };
  const handleOpenImageModal = () => {
    const images = detailedVehicleData?.images || [];
    if (images.length > 0) {
      setCurrentImageIndex(0);
      setImageLoadingInModal(true);
      setImageModalVisible(true);
    } else {
      Alert.alert(
        "No Images",
        "No defect location images found for this vehicle."
      );
    }
  };
  const handleOpenPdiConfirmModal = (decision) => {
    if (isConfirmingPdi || isLoadingDetails || !!fetchError) return;
    setPdiDecisionToConfirm(decision);
    setShowPdiConfirmModal(true);
  };
  const handleClosePdiConfirmModal = () => {
    if (isConfirmingPdi) return;
    setShowPdiConfirmModal(false);
    setPdiDecisionToConfirm(null);
  };
  const handleConfirmPdiFromModal = async () => {
    // API Call logic remains the same, uses detailedVehicleData.chassis_no
    if (!pdiDecisionToConfirm || !detailedVehicleData?.chassis_no) {
      Alert.alert("Error", "Missing decision or chassis number.");
      return;
    }
    const currentChassisNo = detailedVehicleData.chassis_no;
    console.log(
      `CONFIRMING PDI: ${pdiDecisionToConfirm} for ${currentChassisNo} by ${supervisorName}`
    );
    setIsConfirmingPdi(true);
    try {
      const token = await AsyncStorage.getItem("authToken");
      if (!token) throw new Error("Token missing.");
      const endpoint = `${PDI_APPROVAL_BASE_ENDPOINT}/${currentChassisNo}`;
      console.log("API:", endpoint);
      const body = { approval: pdiDecisionToConfirm };
      console.log("Body:", body);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        let errorMsg = `Submission failed (${response.status})`;
        try {
          const ed = await response.json();
          errorMsg = ed.message || ed.error || `Status ${response.status}`;
        } catch (e) {
          /*ignore*/
        }
        if (response.status === 404)
          errorMsg += `\n(Check API endpoint/method)`;
        throw new Error(errorMsg);
      }
      const result = await response.json();
      console.log("Success:", result);
      Alert.alert(
        "Success",
        `Inspection status updated to ${pdiDecisionToConfirm} for ${currentChassisNo}.`
      );
      handleClosePdiConfirmModal();
      navigation.goBack(); // Go back after successful submission
    } catch (error) {
      console.error("API Error:", error);
      Alert.alert(
        "Submission Failed",
        `Could not update status.\nError: ${error.message}`
      );
    } finally {
      setIsConfirmingPdi(false);
    }
  };

  // --- RENDER LOGIC ---

  // --- Loading / Error States --- (Unchanged, uses state variables)
  if (
    isLoadingDetails ||
    fetchError ||
    groupingError ||
    sectionSummaryError ||
    !detailedVehicleData
  ) {
    const errorMsg =
      fetchError ||
      groupingError ||
      sectionSummaryError ||
      (!detailedVehicleData && !isLoadingDetails
        ? "No inspection data found."
        : null);
    const title = errorMsg
      ? fetchError
        ? "Error Loading Data"
        : "Data Processing Error"
      : "Loading...";
    return (
      <ScreenWrapper showHeader={true} showFooter={true}>
        <View style={localStyles.centeredMessageContainer}>
          {isLoadingDetails ? (
            <>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={localStyles.loadingText}>{title}</Text>
            </>
          ) : (
            <>
              <Text style={commonStyles.errorText}>{title}</Text>
              {errorMsg && (
                <Text style={localStyles.errorDetailText}>{errorMsg}</Text>
              )}
              <TouchableOpacity
                style={[
                  commonStyles.actionButtonSecondary,
                  { marginTop: MARGIN.large },
                ]}
                onPress={() => navigation.goBack()}
              >
                <Text style={commonStyles.actionButtonText}>Go Back</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScreenWrapper>
    );
  }

  // --- Prepare Data for Render --- (Unchanged, uses state variables)
  const images = detailedVehicleData.images || [];
  const sortedImages = images ? [...images].sort((a, b) => a.id - b.id) : [];
  // Now sortedImages = [ {id: 1, ...}, {id: 2, ...}, {id: 3, ...} ]

  // --- Use your existing index logic, but with the sorted array ---
  // Assume currentImageIndex starts at 0

  const currentImageData =
    sortedImages.length > currentImageIndex
      ? sortedImages[currentImageIndex]
      : null;
  // const currentImageData = images.length > 0 ? images[currentImageIndex] : null;
  // Ensure URL construction handles potential spaces and missing protocol
  const imageUrl = currentImageData?.file_path
    ? String(currentImageData.file_path).trim().startsWith("http")
      ? String(currentImageData.file_path).trim()
      : `http://${String(currentImageData.file_path).trim()}`
    : null;
  const vehicleInfoForPdiModal = {
    chassis_no: detailedVehicleData?.chassis_no,
    colour_code: detailedVehicleData?.colour_code,
    engine_no: detailedVehicleData?.engine_no,
    model: detailedVehicleData?.model,
    variant: detailedVehicleData?.variant,
  };
  const originalPdiStaffName =
    detailedVehicleData?.inspection?.name ?? "Unknown";

  // --- Main Content Render --- (JSX Structure Unchanged, uses derived data)
  return (
    <ScreenWrapper
      showHeader={true}
      showFooter={true} // Keep footer for PDI OK/NOK buttons
      enableScrollView={false} // Uses internal ScrollView
      enableKeyboardAvoidingView={true} // Good practice for modals
    >
      {/* Scrollable Content Area */}
      <ScrollView
        style={localStyles.scrollView}
        contentContainerStyle={localStyles.scrollContentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={commonStyles.pageHeader}>
          Final Inspection Information
        </Text>

        {/* Car Info Box */}
        <View style={localStyles.carInfoBox}>
          <Text style={localStyles.carInfo}>
            Chassis:{" "}
            <Text style={localStyles.carInfoValue}>
              {detailedVehicleData.chassis_no}
            </Text>
          </Text>
          <Text style={localStyles.carInfo}>
            Colour:{" "}
            <Text style={localStyles.carInfoValue}>
              {detailedVehicleData.colour_code}
            </Text>
          </Text>
          <Text style={localStyles.carInfo}>
            Engine:{" "}
            <Text style={localStyles.carInfoValue}>
              {detailedVehicleData.engine_no}
            </Text>
          </Text>
          <Text style={localStyles.carInfo}>
            Model:{" "}
            <Text style={localStyles.carInfoValue}>
              {detailedVehicleData.model}
            </Text>
          </Text>
          <Text style={localStyles.carInfo}>
            Variant:{" "}
            <Text style={localStyles.carInfoValue}>
              {detailedVehicleData.variant}
            </Text>
          </Text>
          <Text style={localStyles.carInfo}>
            PDI By:{" "}
            <Text style={localStyles.carInfoValue}>{originalPdiStaffName}</Text>
          </Text>
        </View>

        {/* View Image Button */}
        <View style={localStyles.viewImageButtonContainer}>
          <TouchableOpacity
            style={[
              localStyles.viewImageButton,
              (images.length === 0 || imageLoadingInModal) &&
                localStyles.disabledButton, // Apply disabled style
            ]}
            onPress={handleOpenImageModal}
            disabled={images.length === 0 || imageLoadingInModal}
          >
            <Text style={localStyles.viewImageButtonText}>
              {" "}
              View Defect Locations{" "}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Section Summary */}
        <Text style={localStyles.sectionSummaryTitle}>
          Section Summary (Reported Defects):
        </Text>
        <View style={localStyles.sectionSummaryContainer}>
          {/* Renders sectionSummary derived from allItems */}
          {sectionSummary.length > 0 ? (
            sectionSummary.map((summary) => (
              <View
                key={summary.section}
                style={localStyles.sectionSummaryItem}
              >
                <Text style={localStyles.sectionSummaryHeader}>
                  Section {summary.section}
                </Text>
                <View style={localStyles.summaryDetailRow}>
                  <Text style={localStyles.summaryDetailLabel}>
                    Defects Reported
                  </Text>
                  <Text style={localStyles.summaryDetailSeparator}>:</Text>
                  <Text style={localStyles.summaryDetailValue}>
                    {summary.totalDefectsReported}
                  </Text>
                </View>
                <View style={localStyles.summaryDetailRow}>
                  <Text style={localStyles.summaryDetailLabel}>Rectified</Text>
                  <Text style={localStyles.summaryDetailSeparator}>:</Text>
                  <Text style={localStyles.summaryDetailValue}>
                    {summary.rectifiedCount}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={commonStyles.noDataText}>
              No defects were reported during inspection.
            </Text>
          )}
        </View>

        {/* Rectified Items List */}
        <Text style={localStyles.itemsListTitle}>Rectified Item Details:</Text>
        {/* Renders groupedItemsForDisplay derived from rectifiedItemsOnly */}
        {rectifiedItemsOnly.length > 0 ? (
          sortedSectionsForDisplay.map((sectionName) => (
            <View key={sectionName} style={localStyles.groupedSectionContainer}>
              <Text style={localStyles.sectionHeaderItemsList}>
                Section {sectionName}
              </Text>
              {groupedItemsForDisplay[sectionName]?.map((item, index) => {
                // Ensure defect and rectification info exists before rendering
                const firstDefect = item.defect?.[0];
                const rectificationInfo = firstDefect?.rectify;
                if (!firstDefect || !rectificationInfo) return null; // Skip if no defect/rectify info

                return (
                  <View
                    key={`${item.id}-${index}`}
                    style={localStyles.summaryItem}
                  >
                    <Text style={localStyles.itemText}>{`${index + 1}. ${
                      item.name || "Unknown Item"
                    }`}</Text>
                    <View style={localStyles.detailsContainer}>
                      {/* Defect Details */}
                      <View style={localStyles.detailRow}>
                        <Text style={localStyles.detailLabel}>
                          Defect Category
                        </Text>
                        <Text style={localStyles.detailSeparator}>:</Text>
                        <Text style={localStyles.detailValue}>
                          {firstDefect.category || "N/A"}
                        </Text>
                      </View>
                      <View style={localStyles.detailRow}>
                        <Text style={localStyles.detailLabel}>Defect Type</Text>
                        <Text style={localStyles.detailSeparator}>:</Text>
                        <Text style={localStyles.detailValue}>
                          {firstDefect.type || "N/A"}
                        </Text>
                      </View>
                      <View style={localStyles.detailRow}>
                        <Text style={localStyles.detailLabel}>
                          Defect Severity
                        </Text>
                        <Text style={localStyles.detailSeparator}>:</Text>
                        <Text style={localStyles.detailValue}>
                          {firstDefect.severity || "N/A"}
                        </Text>
                      </View>
                      {/* Rectification Details */}
                      <View style={localStyles.detailRow}>
                        <Text style={localStyles.detailLabel}>
                          Rectified By
                        </Text>
                        <Text style={localStyles.detailSeparator}>:</Text>
                        <Text style={localStyles.detailValue}>
                          {rectificationInfo.staff_name || "N/A"} (
                          {rectificationInfo.staff_no || "N/A"})
                        </Text>
                      </View>
                      <View style={localStyles.detailRow}>
                        <Text style={localStyles.detailLabel}>
                          Date Rectified
                        </Text>
                        <Text style={localStyles.detailSeparator}>:</Text>
                        <Text style={localStyles.detailValue}>
                          {formatDate(rectificationInfo.date)}
                        </Text>
                      </View>
                      {/* Rectification Remarks */}
                      {rectificationInfo.remarks && (
                        <View style={localStyles.detailRow}>
                          <Text style={localStyles.detailLabel}>
                            Rect. Remark
                          </Text>
                          <Text style={localStyles.detailSeparator}>:</Text>
                          <Text
                            style={[
                              localStyles.detailValue,
                              localStyles.remarkText,
                            ]}
                          >
                            {rectificationInfo.remarks}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          ))
        ) : (
          <Text style={commonStyles.noDataText}>
            No items found marked as rectified.
          </Text>
        )}
        {/* Add some padding at the bottom of the scroll view */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Fixed Footer Buttons for PDI OK/NOK */}
      <View style={localStyles.footerActionContainer}>
        {/* Back Button */}
        <TouchableOpacity
          style={[
            commonStyles.actionButtonSecondary,
            localStyles.footerButtonFlex,
            (isLoadingDetails || isConfirmingPdi) &&
              commonStyles.actionButtonDisabled,
          ]}
          onPress={() => !isConfirmingPdi && navigation.goBack()}
          disabled={isLoadingDetails || isConfirmingPdi}
        >
          <Text
            style={[
              commonStyles.actionButtonText,
              (isLoadingDetails || isConfirmingPdi) &&
                commonStyles.actionButtonTextDisabled,
            ]}
          >
            Back
          </Text>
        </TouchableOpacity>
        {/* PDI NOK Button */}
        <TouchableOpacity
          style={[
            commonStyles.actionButton,
            localStyles.footerButtonFlex,
            localStyles.buttonActionNokStyle,
            (isLoadingDetails || isConfirmingPdi) &&
              commonStyles.actionButtonDisabled,
          ]}
          disabled={isLoadingDetails || isConfirmingPdi}
          onPress={() => handleOpenPdiConfirmModal("NOK")}
        >
          <Text
            style={[
              commonStyles.actionButtonPrimaryText,
              localStyles.buttonActionTextWhite,
              (isLoadingDetails || isConfirmingPdi) &&
                commonStyles.actionButtonTextDisabled,
            ]}
          >
            PDI NOK
          </Text>
        </TouchableOpacity>
        {/* PDI OK Button */}
        <TouchableOpacity
          style={[
            commonStyles.actionButton,
            localStyles.footerButtonFlex,
            localStyles.buttonActionOkStyle,
            (isLoadingDetails || isConfirmingPdi) &&
              commonStyles.actionButtonDisabled,
          ]}
          disabled={isLoadingDetails || isConfirmingPdi}
          onPress={() => handleOpenPdiConfirmModal("OK")}
        >
          <Text
            style={[
              commonStyles.actionButtonPrimaryText,
              localStyles.buttonActionTextWhite,
              (isLoadingDetails || isConfirmingPdi) &&
                commonStyles.actionButtonTextDisabled,
            ]}
          >
            PDI OK
          </Text>
        </TouchableOpacity>
      </View>

      {/* --- Modals --- */}
      {/* Image Modal */}
      {imageModalVisible && currentImageData && imageUrl && (
        <Modal
          visible={imageModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            if (!imageLoadingInModal) {
              setImageModalVisible(false);
              setImageLoadingInModal(false);
            }
          }}
        >
          <View style={localStyles.modalContainer}>
            {/* Header */}
            <Text style={localStyles.modalHeader}>Defect Location Images</Text>
            <Text style={localStyles.modalSubHeader}>
              {`Image ${currentImageIndex + 1} of ${images.length}${
                currentImageData.description
                  ? `: ${currentImageData.description}`
                  : ""
              }`}
            </Text>
            {/* Image Navigation */}
            <View style={localStyles.imageSelector}>
              <TouchableOpacity
                onPress={handlePreviousImage}
                style={[
                  localStyles.imageButton,
                  (images.length <= 1 || imageLoadingInModal) &&
                    localStyles.disabledButton,
                ]}
                disabled={images.length <= 1 || imageLoadingInModal}
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
                style={[
                  localStyles.imageButton,
                  (images.length <= 1 || imageLoadingInModal) &&
                    localStyles.disabledButton,
                ]}
                disabled={images.length <= 1 || imageLoadingInModal}
              >
                <Text style={localStyles.imageButtonText}>Next</Text>
              </TouchableOpacity>
            </View>
            {/* Image Container */}
            <View style={localStyles.imageContainer}>
              <Image
                source={{ uri: imageUrl }}
                style={localStyles.image}
                onLoadStart={() => setImageLoadingInModal(true)}
                onLoad={() => setImageLoadingInModal(false)}
                onError={(e) => {
                  console.error(
                    "Image Load Error:",
                    e.nativeEvent.error,
                    "URL:",
                    imageUrl
                  );
                  Alert.alert("Image Load Error", `Failed to load image.`);
                  setImageLoadingInModal(false);
                }}
                resizeMode="contain"
              />
              {/* Loading Overlay for Image */}
              {imageLoadingInModal && (
                <View style={localStyles.loadingOverlay}>
                  <ActivityIndicator size="large" color="#FFF" />
                  <Text style={localStyles.modalLoadingText}>
                    Loading Image...
                  </Text>
                </View>
              )}
            </View>
            {/* Close Button */}
            <TouchableOpacity
              style={localStyles.closeButton}
              onPress={() => {
                if (!imageLoadingInModal) {
                  setImageModalVisible(false);
                  setImageLoadingInModal(false);
                }
              }}
            >
              <Text style={localStyles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}

      {/* InspectionConfirm Modal */}
      <InspectionConfirm
        visible={showPdiConfirmModal}
        onClose={handleClosePdiConfirmModal}
        onConfirm={handleConfirmPdiFromModal}
        decision={pdiDecisionToConfirm}
        vehicleData={vehicleInfoForPdiModal}
        pdiStaffName={supervisorName} // Name of the user confirming (Supervisor)
        pdiPerformerName={originalPdiStaffName} // Name of the user who did the PDI
        rectifiedItemsCount={rectifiedItemsOnly.length} // Count of items marked as rectified
        isSubmitting={isConfirmingPdi} // Pass submitting state
      />
      {/* --- End Modals --- */}
    </ScreenWrapper>
  );
} // End of Component

// --- Local Styles --- (Completely Unchanged from previous version)
const localStyles = StyleSheet.create({
  // --- Core & Layout Styles ---
  scrollView: { flex: 1 },
  scrollContentContainer: {
    paddingHorizontal: PADDING.medium,
    paddingTop: PADDING.medium,
    paddingBottom: PADDING.large,
  },
  centeredMessageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: PADDING.large,
  },
  loadingText: {
    marginTop: MARGIN.medium,
    fontSize: FONT_SIZES.medium,
    color: COLORS.grey,
  },
  // --- Page Specific Content ---
  carInfoBox: {
    backgroundColor: COLORS.white,
    padding: PADDING.large,
    borderRadius: 8,
    marginBottom: MARGIN.large,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3.0,
    elevation: 2,
  },
  carInfo: {
    fontSize: FONT_SIZES.medium,
    marginBottom: MARGIN.small,
    color: COLORS.secondary,
  },
  carInfoValue: { fontWeight: "600", color: COLORS.secondary },
  viewImageButtonContainer: {
    alignItems: "center",
    marginVertical: MARGIN.medium,
  },
  viewImageButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: PADDING.medium,
    paddingHorizontal: PADDING.large,
    borderRadius: 6,
    alignItems: "center",
    flexDirection: "row",
    minWidth: 220,
    justifyContent: "center",
    minHeight: 45,
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  viewImageButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.medium,
    fontWeight: "bold",
  },
  sectionSummaryTitle: {
    fontSize: FONT_SIZES.large,
    fontWeight: "600",
    marginTop: MARGIN.large,
    marginBottom: MARGIN.small,
    color: COLORS.secondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    paddingBottom: PADDING.xsmall,
  },
  sectionSummaryContainer: {
    marginVertical: MARGIN.xsmall,
    padding: PADDING.medium,
    backgroundColor: COLORS.veryLightGrey,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGrey,
    marginBottom: MARGIN.large,
  },
  sectionSummaryItem: {
    marginBottom: MARGIN.small,
    paddingBottom: MARGIN.small,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGrey,
  },
  sectionSummaryHeader: {
    fontSize: FONT_SIZES.medium,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: MARGIN.small,
  },
  summaryDetailRow: {
    flexDirection: "row",
    marginBottom: MARGIN.xsmall,
    alignItems: "flex-start",
  },
  summaryDetailLabel: {
    fontSize: FONT_SIZES.small,
    color: COLORS.grey,
    fontWeight: "600",
    width: 160,
  },
  summaryDetailSeparator: {
    fontSize: FONT_SIZES.small,
    color: COLORS.grey,
    fontWeight: "600",
    marginHorizontal: MARGIN.xsmall / 2,
  },
  summaryDetailValue: {
    flex: 1,
    fontSize: FONT_SIZES.small,
    color: COLORS.secondary,
    lineHeight: FONT_SIZES.small * 1.3,
    fontWeight: "bold",
  },
  itemsListTitle: {
    fontSize: FONT_SIZES.large,
    fontWeight: "600",
    marginTop: MARGIN.medium,
    marginBottom: MARGIN.small,
    color: COLORS.secondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    paddingBottom: PADDING.xsmall,
  },
  groupedSectionContainer: {
    marginBottom: MARGIN.medium,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    overflow: "hidden",
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2.5,
    elevation: 1,
  },
  sectionHeaderItemsList: {
    fontSize: FONT_SIZES.medium,
    fontWeight: "bold",
    paddingVertical: PADDING.small,
    paddingHorizontal: PADDING.medium,
    backgroundColor: COLORS.success,
    color: COLORS.white,
  },
  summaryItem: {
    backgroundColor: COLORS.white,
    paddingVertical: PADDING.medium,
    paddingHorizontal: PADDING.medium,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.veryLightGrey,
  },
  itemText: {
    fontSize: FONT_SIZES.medium,
    fontWeight: "bold",
    color: COLORS.secondary,
    marginBottom: MARGIN.small,
  },
  detailsContainer: {
    marginLeft: MARGIN.small,
    paddingLeft: MARGIN.small,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.veryLightGrey,
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: MARGIN.xsmall,
    alignItems: "flex-start",
  },
  detailLabel: {
    fontSize: FONT_SIZES.xsmall,
    color: COLORS.grey,
    fontWeight: "600",
    width: 100,
  },
  detailSeparator: {
    fontSize: FONT_SIZES.xsmall,
    color: COLORS.grey,
    fontWeight: "600",
    marginHorizontal: MARGIN.xsmall / 2,
  },
  detailValue: {
    flex: 1,
    fontSize: FONT_SIZES.xsmall,
    color: COLORS.secondary,
    lineHeight: FONT_SIZES.xsmall * 1.3,
  },
  remarkText: {
    fontStyle: "italic",
    color: COLORS.grey,
    backgroundColor: COLORS.veryLightGrey,
    padding: PADDING.xsmall,
    borderRadius: 3,
  },
  errorDetailText: {
    color: COLORS.danger,
    fontSize: FONT_SIZES.small,
    textAlign: "center",
    lineHeight: FONT_SIZES.small * 1.4,
  },
  // --- MODAL STYLES ---
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.85)",
    paddingVertical: PADDING.large,
    paddingHorizontal: PADDING.medium,
  },
  modalHeader: {
    fontSize: FONT_SIZES.xlarge + 2,
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
    maxWidth: MODAL_IMAGE_WIDTH + 40,
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
    padding: PADDING.small,
  },
  imageContainer: {
    width: MODAL_IMAGE_WIDTH,
    height: MODAL_IMAGE_HEIGHT,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.black,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.grey,
    marginBottom: MARGIN.medium,
  },
  image: { width: "100%", height: "100%" },
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
  disabledButton: { opacity: 0.5 },
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
    borderRadius: 8,
  },
  modalLoadingText: {
    marginTop: MARGIN.small,
    color: COLORS.white,
    fontSize: FONT_SIZES.medium,
  },
  // --- Footer Styles ---
  footerActionContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: PADDING.small,
    paddingHorizontal: PADDING.small,
    borderTopWidth: 1,
    borderTopColor: COLORS.footer,
    backgroundColor: COLORS.footer,
  },
  footerButtonFlex: { flex: 1, marginHorizontal: MARGIN.xsmall },
  buttonActionNokStyle: { backgroundColor: COLORS.danger },
  buttonActionOkStyle: { backgroundColor: COLORS.success },
  buttonActionTextWhite: { color: COLORS.white },
});
