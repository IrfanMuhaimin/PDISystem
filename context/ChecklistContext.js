// ChecklistContext.js
import React, { createContext, useState, useEffect } from 'react';

// Sample checklist items by section
const initialChecklistPlus = {
    A: [
        { id: 112, section: "A", name: "Battery clamps & terminal", checked: false, defect: false },
        { id: 113, section: "A", name: "Engine oil level", checked: false, defect: false },
        { id: 114, section: "A", name: "Brake Fluid reservoir level", checked: false, defect: false },
        { id: 115, section: "A", name: "Coolant reservoir level", checked: false, defect: false },
        { id: 116, section: "A", name: "Wiper washer reservoir level", checked: false, defect: false },
        { id: 117, section: "A", name: "Verify Engine number imprint copy", checked: false, defect: false },
        { id: 118, section: "A", name: "Verify chassis number", checked: false, defect: false },
        { id: 119, section: "A", name: "Engine condition", checked: false, defect: false },
        { id: 120, section: "A", name: "Front bumper and grille", checked: false, defect: false },
        { id: 121, section: "A", name: "Fr Lamps, Fog, Indicator operations", checked: false, defect: false },
        { id: 122, section: "A", name: "Delta Cover", checked: false, defect: false },
        { id: 123, section: "A", name: "Hood Panel", checked: false, defect: false },
        { id: 124, section: "A", name: "Fr Windscreen appearance", checked: false, defect: false },
        { id: 125, section: "A", name: "Front LH/RH Fenders", checked: false, defect: false },
        { id: 126, section: "A", name: "Front LH/RH Wheel Rims", checked: false, defect: false },
        { id: 127, section: "A", name: "Fr Lh/Rh Wheel Cap", checked: false, defect: false },
        { id: 128, section: "A", name: "Fr Lh/Rh Check Tyre pressure", checked: false, defect: false },
        { id: 129, section: "A", name: "Front Camera", checked: false, defect: false },
    ],
    B: [
        { id: 130, section: "B", name: "Driver Door", checked: false, defect: false },
        { id: 131, section: "B", name: "Fr Rh Side Mirror", checked: false, defect: false },
        { id: 132, section: "B", name: "Fr Rh Door Furnishings", checked: false, defect: false },
        { id: 133, section: "B", name: "Driver Seat", checked: false, defect: false },
        { id: 134, section: "B", name: "Clock setting, Bluetooth & meter", checked: false, defect: false },
        { id: 135, section: "B", name: "Hazard warning light switch", checked: false, defect: false },
        { id: 136, section: "B", name: "Cabin Light, Map Light & Vanity Mirror Light", checked: false, defect: false },
        { id: 137, section: "B", name: "Fr Rh Air Conditioner / Vents / blower", checked: false, defect: false },
        { id: 138, section: "B", name: "Heads Up display & adjustment", checked: false, defect: false },
        { id: 139, section: "B", name: "Operate climate control system", checked: false, defect: false },
        { id: 140, section: "B", name: "Horn function, hood & trunk release", checked: false, defect: false },
        { id: 141, section: "B", name: "Touch screen & Audio, Navigator functions", checked: false, defect: false },
        { id: 142, section: "B", name: "Speakers function driver side", checked: false, defect: false },
        { id: 143, section: "B", name: "Steering control switches & function", checked: false, defect: false },
        { id: 144, section: "B", name: "Power outlet / USB port / centre USB", checked: false, defect: false
        },
        { id: 145, section: "B", name: "Front & Rear Parking sensor function", checked: false, defect: false
        },
        { id: 146, section: "B", name: "Side mirror adj, retractable & switches functioning", checked: false, defect: false
        },
        { id: 147, section: "B", name: "Fr Rh Power window switch operation", checked: false, defect: false
        },
        { id: 148, section: "B", name: "Defogger rear glass function", checked: false, defect: false
        },
        { id: 149, section: "B", name: "Glove box operation", checked: false, defect: false
        },
        { id: 150, section: "B", name: "Fr Rh Seat belt function", checked: false, defect: false
        },
        { id: 151, section: "B", name: "Instrument panel leather", checked: false, defect: false
        },
        { id: 152, section: "B", name: "Fr Rh Scuff plate", checked: false, defect: false
        },
        { id: 153, section: "B", name: "Gear console", checked: false, defect: false
        },
        { id: 154, section: "B", name: "Driver Sunvisor", checked: false, defect: false
        },
        { id: 155, section: "B", name: "Handbrake (button)", checked: false, defect: false
        },
        { id: 156, section: "B", name: "Engine startability", checked: false, defect: false
        },
        { id: 157, section: "B", name: "Fr RH Door Glasses appearance", checked: false, defect: false
        },
        { id: 158, section: "B", name: "MGDA (Display Audio)", checked: false, defect: false
        },
        { id: 159, section: "B", name: "Fr Rh Carpet Mat", checked: false, defect: false
        },
        { id: 160, section: "B", name: "All Round Monitor (ARM)", checked: false, defect: false
        },
        { id: 161, section: "B", name: "Front DVR", checked: false, defect: false
        },
        { id: 162, section: "B", name: "Fr Rh Door Visor", checked: false, defect: false
        },
        { id: 163, section: "B", name: "Wireless Charger", checked: false, defect: false
        },
    ],
    C: [
        { id: 164, section: "C", name: "Rr Rh Door", checked: false, defect: false
        },
        { id: 165, section: "C", name: "Rr Rh Scuff plate", checked: false, defect: false
        },
        { id: 166, section: "C", name: "Rr Rh Door Furnishings", checked: false, defect: false
        },
        { id: 167, section: "C", name: "Rr Rh Door Glasses appearance", checked: false, defect: false
        },
        { id: 168, section: "C", name: "2nd Row Rh Passenger Seat", checked: false, defect: false
        },
        { id: 169, section: "C", name: "Rr Lh Power window switch operation", checked: false, defect: false
        },
        { id: 170, section: "C", name: "Rr Rh Air Conditioner / Vents / blower", checked: false, defect: false
        },
        { id: 171, section: "C", name: "Mid Rh Seat belt function", checked: false, defect: false
        },
        { id: 172, section: "C", name: "Mid Rh Carpet Mat", checked: false, defect: false
        },
        { id: 173, section: "C", name: "Sticker (PDI OK)", checked: false, defect: false
        },
        { id: 174, section: "C", name: "Dual USB Data Port", checked: false, defect: false
        },
        { id: 175, section: "C", name: "Safety Triangle", checked: false, defect: false
        },
        { id: 176, section: "C", name: "Organizer Booklet", checked: false, defect: false
        },
        { id: 177, section: "C", name: "Rr Rh Door Visor", checked: false, defect: false
        },
    ],
    D: [
        { id: 178, section: "D", name: "Side Panel Complete", checked: false, defect: false
        },
        { id: 179, section: "D", name: "Quarter Panel Complete", checked: false, defect: false
        },
        { id: 180, section: "D", name: "Tailgate Complete", checked: false, defect: false
        },
        { id: 181, section: "D", name: "Rr Windscreen appearance", checked: false, defect: false
        },
        { id: 182, section: "D", name: "Rear Wiper", checked: false, defect: false
        },
        { id: 183, section: "D", name: "Rr Lamps, Fog, Indicator operations", checked: false, defect: false
        },
        { id: 184, section: "D", name: "Shark Fin & Roof Spoiler", checked: false, defect: false
        },
        { id: 185, section: "D", name: "Emblems (XPander, MIVEC)", checked: false, defect: false
        },
        { id: 186, section: "D", name: "Rear Bumper", checked: false, defect: false
        },
        { id: 187, section: "D", name: "Rear Lh/Rh Wheel Rims", checked: false, defect: false
        },
        { id: 188, section: "D", name: "Rr Lh/Rh Check Tyre pressure", checked: false, defect: false
        },
        { id: 189, section: "D", name: "Rr Lh/Rh Wheel Cap", checked: false, defect: false
        },
        { id: 190, section: "D", name: "Fuel Lid Complete & Sticker", checked: false, defect: false
        },
        { id: 191, section: "D", name: "Third Row Seat", checked: false, defect: false
        },
        { id: 192, section: "D", name: "Cup holder", checked: false, defect: false
        },
        { id: 193, section: "D", name: "Rear seat function / folding / Arm rest / Head rest", checked: false, defect: false
        },
        { id: 194, section: "D", name: "Rr Seat belt function", checked: false, defect: false
        },
        { id: 195, section: "D", name: "Trunk and Room Lamp function (charged)", checked: false, defect: false
        },
        { id: 196, section: "D", name: "Spare Tyre inflation / inflator", checked: false, defect: false
        },
        { id: 197, section: "D", name: "Jack & Jack Bar", checked: false, defect: false
        },
        { id: 198, section: "D", name: "Wheel Nut Wrench", checked: false, defect: false
        },
        { id: 199, section: "D", name: "Cargo Box & Tools Box", checked: false, defect: false
        },
        { id: 200, section: "D", name: "Trunk Floor mat & floor board", checked: false, defect: false
        },
        { id: 201, section: "D", name: "Reverse Sensor", checked: false, defect: false
        },
        { id: 202, section: "D", name: "Tailgate Spoiler (Black)", checked: false, defect: false
        },
        { id: 203, section: "D", name: "Rear DVR", checked: false, defect: false
        },
    ],
    E: [
        { id: 204, section: "E", name: "Rr Lh Side Panel", checked: false, defect: false
        },
        { id: 205, section: "E", name: "Rr Lh Door", checked: false, defect: false
        },
        { id: 206, section: "E", name: "Rr Lh Scuff plate", checked: false, defect: false
        },
        { id: 207, section: "E", name: "Rr Lh Door Furnishings", checked: false, defect: false
        },
        { id: 208, section: "E", name: "Rr Lh Door Glasses appearance", checked: false, defect: false
        },
        { id: 209, section: "E", name: "2nd Row Lh Passenger Seat", checked: false, defect: false
        },
        { id: 210, section: "E", name: "Rr Lh Power window switch operation", checked: false, defect: false
        },
        { id: 211, section: "E", name: "Rr Lh Air Conditioner / Vents / blower", checked: false, defect: false
        },
        { id: 212, section: "E", name: "Front Rr-Lh seats adjustment", checked: false, defect: false
        },
        { id: 213, section: "E", name: "Mid Lh Seat belt function", checked: false, defect: false
        },
        { id: 214, section: "E", name: "Mid Ctr Seat belt function", checked: false, defect: false
        },
        { id: 215, section: "E", name: "Mid Lh Carpet Mat", checked: false, defect: false
        },
        { id: 216, section: "E", name: "Rr Lh Door Visor", checked: false, defect: false
        },
    ],
    F: [
        { id: 217, section: "F", name: "Fr Lh Door", checked: false, defect: false
        },
        { id: 218, section: "F", name: "Fr Lh Scuff plate", checked: false, defect: false
        },
        { id: 219, section: "F", name: "Fr Lh Side Mirror", checked: false, defect: false
        },
        { id: 220, section: "F", name: "Fr Lh Door Furnishings", checked: false, defect: false
        },
        { id: 221, section: "F", name: "A Pillar", checked: false, defect: false
        },
        { id: 222, section: "F", name: "B Pillar", checked: false, defect: false
        },
        { id: 223, section: "F", name: "Fr Lh Door Glasses appearance", checked: false, defect: false
        },
        { id: 224, section: "F", name: "Fr Lh Passenger Seat", checked: false, defect: false
        },
        { id: 225, section: "F", name: "Fr Lh Carpet Mat", checked: false, defect: false
        },
        { id: 226, section: "F", name: "Fr Lh Power window switch operation", checked: false, defect: false
        },
        { id: 227, section: "F", name: "Passenger Sunvisor", checked: false, defect: false
        },
        { id: 228, section: "F", name: "Fr Lh Seat belt function", checked: false, defect: false
        },
        { id: 229, section: "F", name: "Fr Lh Air Conditioner / Vents / blower", checked: false, defect: false
        },
        { id: 230, section: "F", name: "Child lock function", checked: false, defect: false
        },
        { id: 231, section: "F", name: "Fr Lh Door Visor", checked: false, defect: false
        },
    ],
    Overall: [
        { id: 232, section: "Overall", name: "Alarm System", checked: false, defect: false
        },
        { id: 233, section: "Overall", name: "Remote / Keyless / Actuator function Fr/Rr", checked: false, defect: false
        },
        { id: 234, section: "Overall", name: "Leatherrette Cover", checked: false, defect: false
        },
        { id: 235, section: "Overall", name: "Scuff Plate", checked: false, defect: false
        }
    ]
};

const initialChecklistBase = {
    A: [
        { id: 1, section: "A", name: "Battery clamps & terminal", checked: false, defect: false },
        { id: 2, section: "A", name: "Engine oil level", checked: false, defect: false },
        { id: 3, section: "A", name: "Brake Fluid reservoir level", checked: false, defect: false },
        { id: 4, section: "A", name: "Coolant reservoir level", checked: false, defect: false },
        { id: 5, section: "A", name: "Wiper washer reservoir level", checked: false, defect: false },
        { id: 6, section: "A", name: "Verify Engine number imprint copy", checked: false, defect: false },
        { id: 7, section: "A", name: "Verify chassis number", checked: false, defect: false },
        { id: 8, section: "A", name: "Engine condition", checked: false, defect: false },
        { id: 9, section: "A", name: "Front bumper and grille", checked: false, defect: false },
        { id: 10, section: "A", name: "Fr Lamps, Fog, Indicator operations", checked: false, defect: false },
        { id: 11, section: "A", name: "Delta Cover", checked: false, defect: false },
        { id: 12, section: "A", name: "Hood Panel", checked: false, defect: false },
        { id: 13, section: "A", name: "Fr Windscreen appearance", checked: false, defect: false },
        { id: 14, section: "A", name: "Front LH/RH Fenders", checked: false, defect: false },
        { id: 15, section: "A", name: "Front LH/RH Wheel Rims", checked: false, defect: false },
        { id: 16, section: "A", name: "Fr Lh/Rh Wheel Cap", checked: false, defect: false },
        { id: 17, section: "A", name: "Fr Lh/Rh Tyre pressure", checked: false, defect: false },
        { id: 18, section: "A", name: "Front Camera", checked: false, defect: false },
    ],
    B: [
        { id: 19, section: "B", name: "Driver Door", checked: false, defect: false },
        { id: 20, section: "B", name: "Fr Rh Side Mirror", checked: false, defect: false },
        { id: 21, section: "B", name: "Fr Rh Door Furnishings", checked: false, defect: false },
        { id: 22, section: "B", name: "Driver Seat", checked: false, defect: false },
        { id: 23, section: "B", name: "Clock setting, Bluetooth & meter", checked: false, defect: false },
        { id: 24, section: "B", name: "Hazard warning light switch", checked: false, defect: false },
        { id: 25, section: "B", name: "Cabin Light, Map Light & Vanity Mirror Light", checked: false, defect: false },
        { id: 26, section: "B", name: "Fr Rh Air Conditioner / Vents / blower", checked: false, defect: false },
        { id: 27, section: "B", name: "Heads Up display & adjustment", checked: false, defect: false },
        { id: 28, section: "B", name: "Operate climate control system", checked: false, defect: false },
        { id: 29, section: "B", name: "Horn function, hood & trunk release", checked: false, defect: false },
        { id: 30, section: "B", name: "Touch screen & Audio, Navigator functions", checked: false, defect: false },
        { id: 31, section: "B", name: "Speakers function driver side", checked: false, defect: false },
        { id: 32, section: "B", name: "Steering control switches & function", checked: false, defect: false },
        { id: 33, section: "B", name: "Power outlet / USB port / centre USB", checked: false, defect: false },
        { id: 34, section: "B", name: "Front & Rear Parking sensor function", checked: false, defect: false },
        { id: 35, section: "B", name: "Side mirror adj, retractable & switches functioning", checked: false, defect: false },
        { id: 36, section: "B", name: "Fr Rh Power window switch operation", checked: false, defect: false },
        { id: 37, section: "B", name: "Defogger rear glass function", checked: false, defect: false },
        { id: 38, section: "B", name: "Glove box operation", checked: false, defect: false },
        { id: 39, section: "B", name: "Fr Rh Seat belt function", checked: false, defect: false },
        { id: 40, section: "B", name: "Instrument panel leather", checked: false, defect: false },
        { id: 41, section: "B", name: "Scuff plate", checked: false, defect: false },
        { id: 42, section: "B", name: "Gear console", checked: false, defect: false },
        { id: 43, section: "B", name: "Driver Sunvisor", checked: false, defect: false },
        { id: 44, section: "B", name: "Handbrake (button)", checked: false, defect: false },
        { id: 45, section: "B", name: "Engine startability", checked: false, defect: false },
        { id: 46, section: "B", name: "Fr Rh Door Glasses appearance", checked: false, defect: false },
        { id: 47, section: "B", name: "MGDA (Display Audio)", checked: false, defect: false },
        { id: 48, section: "B", name: "Fr Rh Carpet Mat", checked: false, defect: false },
    ],
    C: [
        { id: 49, section: "C", name: "Rr Rh Door", checked: false, defect: false },
        { id: 50, section: "C", name: "Rr Rh Door Furnishings", checked: false, defect: false },
        { id: 51, section: "C", name: "Rr Rh Door Glasses appearance", checked: false, defect: false },
        { id: 52, section: "C", name: "2nd Row Rh Passenger Seat", checked: false, defect: false },
        { id: 53, section: "C", name: "Rr Rh Power window switch operation", checked: false, defect: false },
        { id: 54, section: "C", name: "Rr Rh Air Conditioner / Vents / blower", checked: false, defect: false },
        { id: 55, section: "C", name: "Mid Rh Seat belt function", checked: false, defect: false },
        { id: 56, section: "C", name: "Mid Rh Carpet Mat", checked: false, defect: false },
        { id: 57, section: "C", name: "Sticker (PDI OK)", checked: false, defect: false },
        { id: 58, section: "C", name: "Dual USB Data Port", checked: false, defect: false },
        { id: 59, section: "C", name: "Safety Triangle", checked: false, defect: false },
        { id: 60, section: "C", name: "Organizer Booklet", checked: false, defect: false },
    ],
    D: [
        { id: 61, section: "D", name: "Side Panel Complete", checked: false, defect: false },
        { id: 62, section: "D", name: "Quarter Panel Complete", checked: false, defect: false },
        { id: 63, section: "D", name: "Tailgate Complete", checked: false, defect: false },
        { id: 64, section: "D", name: "Rr Windscreen appearance", checked: false, defect: false },
        { id: 65, section: "D", name: "Rear Wiper", checked: false, defect: false },
        { id: 66, section: "D", name: "Rr Lamps, Fog, Indicator operations", checked: false, defect: false },
        { id: 67, section: "D", name: "Shark Fin & Roof Spoiler", checked: false, defect: false },
        { id: 68, section: "D", name: "Emblems (XPander, MIVEC)", checked: false, defect: false },
        { id: 69, section: "D", name: "Rear Bumper", checked: false, defect: false },
        { id: 70, section: "D", name: "Rear Lh/Rh Wheel Rims", checked: false, defect: false },
        { id: 71, section: "D", name: "Rr Lh/Rh Tyre pressure", checked: false, defect: false },
        { id: 72, section: "D", name: "Rr Lh/Rh Wheel Cap", checked: false, defect: false },
        { id: 73, section: "D", name: "Fuel Lid Complete & Sticker", checked: false, defect: false },
        { id: 74, section: "D", name: "Third Row Seat", checked: false, defect: false },
        { id: 75, section: "D", name: "Cup holder", checked: false, defect: false },
        { id: 76, section: "D", name: "Rear seat function / folding / Arm rest / Head rest", checked: false, defect: false },
        { id: 77, section: "D", name: "Rr Seat belt function", checked: false, defect: false },
        { id: 78, section: "D", name: "Trunk and Room Lamp function (charged)", checked: false, defect: false },
        { id: 79, section: "D", name: "Spare Tyre inflation / inflator", checked: false, defect: false },
        { id: 80, section: "D", name: "Jack & Jack Bar", checked: false, defect: false },
        { id: 81, section: "D", name: "Wheel Nut Wrench", checked: false, defect: false },
        { id: 82, section: "D", name: "Cargo Box & Tools Box", checked: false, defect: false },
        { id: 83, section: "D", name: "Trunk Floor mat & floor board", checked: false, defect: false },
        { id: 84, section: "D", name: "Reverse Sensor", checked: false, defect: false },
        { id: 85, section: "D", name: "Reverse Camera", checked: false, defect: false },
    ],
    E: [
        { id: 86, section: "E", name: "Rr Lh Side Panel", checked: false, defect: false },
        { id: 87, section: "E", name: "Rr Lh Door", checked: false, defect: false },
        { id: 88, section: "E", name: "Rr Lh Door Furnishings", checked: false, defect: false },
        { id: 89, section: "E", name: "Rr Lh Door Glasses appearance", checked: false, defect: false },
        { id: 90, section: "E", name: "2nd Row Lh Passenger Seat", checked: false, defect: false },
        { id: 91, section: "E", name: "Rr Lh Power window switch operation", checked: false, defect: false },
        { id: 92, section: "E", name: "Rr Lh Air Conditioner / Vents / blower", checked: false, defect: false },
        { id: 93, section: "E", name: "Front Rr-Lh seats adjustment", checked: false, defect: false },
        { id: 94, section: "E", name: "Mid Lh Seat belt function", checked: false, defect: false },
        { id: 95, section: "E", name: "Mid Ctr Seat belt function", checked: false, defect: false },
        { id: 96, section: "E", name: "Mid Lh Carpet Mat", checked: false, defect: false },
    ],
    F: [
        { id: 97, section: "F", name: "Fr Lh Door", checked: false, defect: false },
        { id: 98, section: "F", name: "Fr Lh Side Mirror", checked: false, defect: false },
        { id: 99, section: "F", name: "Fr Lh Door Furnishings", checked: false, defect: false },
        { id: 100, section: "F", name: "A Pillar", checked: false, defect: false },
        { id: 101, section: "F", name: "B Pillar", checked: false, defect: false },
        { id: 102, section: "F", name: "Fr Lh Door Glasses appearance", checked: false, defect: false },
        { id: 103, section: "F", name: "Fr Lh Passenger Seat", checked: false, defect: false },
        { id: 104, section: "F", name: "Fr Lh Carpet Mat", checked: false, defect: false },
        { id: 105, section: "F", name: "Fr Lh Power window switch operation", checked: false, defect: false },
        { id: 106, section: "F", name: "Passenger Sunvisor", checked: false, defect: false },
        { id: 107, section: "F", name: "Fr Lh Seat belt function", checked: false, defect: false },
        { id: 108, section: "F", name: "Fr Lh Air Conditioner / Vents / blower", checked: false, defect: false },
        { id: 109, section: "F", name: "Child lock function", checked: false, defect: false },
    ],
    Overall: [
        { id: 110, section: "Overall", name: "Alarm System", checked: false, defect: false },
        { id: 111, section: "Overall", name: "Remote / Keyless / Actuator function Fr/Rr", checked: false, defect: false }
    ]
};

export const ChecklistContext = createContext();

export const ChecklistProvider = ({ children }) => {
    // **NEW: Checklist stored by chassis number**
    const [checklists, setChecklists] = useState({});
    const [currentChassis, setCurrentChassis] = useState(null);  // Track the current chassis number

    // **NEW: Car Info State**
    const [carInfo, setCarInfo] = useState({
        model: '',
        variant: '',
        engine_no: '',
        chassis_no: '',
        colour_code: '',
        entry_date: '',
        startTime: null, // Add startTime
        endTime: null, // Add endTime
    });

    // **Helper to get the initial checklist based on variant**
    const getInitialChecklistForVariant = (variant) => {
        if (variant === 'PLUS') return initialChecklistPlus;
        return initialChecklistBase; // Default to BASE
    };
    
    const checklist = checklists[currentChassis] || getInitialChecklistForVariant(carInfo?.variant || 'BASE');

    // **Effect to load the correct checklist based on chassis and variant**
    useEffect(() => {
        if (!currentChassis) return;

        setChecklists(prevChecklists => {
            // If checklist already exists for the chassis, load it
            if (prevChecklists[currentChassis]) {
                //setChecklist(prevChecklists[currentChassis]);
                return prevChecklists;
            }

            // Get initial checklist based on the variant
            const variant = carInfo.variant || 'BASE';
            const initial = getInitialChecklistForVariant(variant);

            //setChecklist(initial);
            return {
                ...prevChecklists,
                [currentChassis]: initial
            };
        });
    }, [currentChassis, carInfo.variant]); // Re-run effect when chassis or variant changes

    // Toggle the checked status of an item
    const toggleCheck = (section, id) => {
        if (!currentChassis) return; // Do nothing if no chassis is selected

        setChecklists(prevChecklists => {
            const prevChecklist = prevChecklists[currentChassis] || initialChecklistBase;
            const updatedChecklist = {
                ...prevChecklist,
                [section]: prevChecklist[section].map(item =>
                    item.id === id ? { ...item, checked: !item.checked, defect: false } : item
                ),
            };
            return { ...prevChecklists, [currentChassis]: updatedChecklist };
        });
    };

    // NEW: Toggle All Items In Section
    const toggleCheckAll = (section, value) => {
        if (!currentChassis) return;
      
        setChecklists(prevChecklists => {
          const prevChecklist = prevChecklists[currentChassis] || initialChecklist;
          const updatedChecklist = {
            ...prevChecklist,
            [section]: prevChecklist[section].map(item => ({
              ...item,
              checked: value,  // true = check all, false = uncheck all
              defect: false,   // clear defect if checked
            })),
          };
          return { ...prevChecklists, [currentChassis]: updatedChecklist };
        });
      };
      

    // Toggle the defect status of an item
    const toggleDefect = (section, id) => {
        if (!currentChassis) return; // Do nothing if no chassis is selected

        setChecklists(prevChecklists => {
            const prevChecklist = prevChecklists[currentChassis] || initialChecklistBase;
            const updatedChecklist = {
                ...prevChecklist,
                [section]: prevChecklist[section].map(item =>
                    item.id === id ? { ...item, defect: !item.defect, checked: false } : item
                ),
            };
            return { ...prevChecklists, [currentChassis]: updatedChecklist };
        });
    };

    // Update defect details for an item
    const updateDefectDetails = (section, name, defectDetails) => {
        if (!currentChassis) return; // Do nothing if no chassis is selected

        setChecklists(prevChecklists => {
            const prevChecklist = prevChecklists[currentChassis] || initialChecklistBase;

            if (!prevChecklist || typeof prevChecklist !== "object") {
                console.error("prevChecklist is not an object:", prevChecklist);
                return prevChecklists;
            }
            if (!prevChecklist[section]) {
                console.error(`Section ${section} does not exist in checklist`);
                return prevChecklists;
            }

            const updatedChecklist = {
                ...prevChecklist,
                [section]: prevChecklist[section].map((item) =>
                    item.name === name ? { ...item, defectDetails } : item
                ),
            };
            return { ...prevChecklists, [currentChassis]: updatedChecklist };
        });
    };

    // **NEW: Function to set car info**
    const updateCarInfo = (newCarInfo) => {
        setCarInfo((prevCarInfo) => {
            const updated = { ...prevCarInfo, ...newCarInfo };
            if (newCarInfo.chassis_no) {
                setCurrentChassis(newCarInfo.chassis_no); // Set the current chassis
            }
            return updated;
        });
    };

    return (
        <ChecklistContext.Provider
          value={{
            checklist,
            toggleCheck,
            toggleCheckAll,
            toggleDefect,
            updateDefectDetails,
            carInfo,
            updateCarInfo,
            currentChassis,
            setCurrentChassis,
          }}
        >
          {children}
        </ChecklistContext.Provider>
      );
};