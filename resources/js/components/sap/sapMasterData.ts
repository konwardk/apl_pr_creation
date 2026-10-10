import { SearchHelpOption } from './SapSearchHelpModal';

export interface SapMasterDataConfig {
    documentTypes: SearchHelpOption[];
    plants: SearchHelpOption[];
    itemCategories: SearchHelpOption[];
    materialTypes: SearchHelpOption[];
    accountAssignmentCategories: SearchHelpOption[];
    materialGroups: SearchHelpOption[];
    materials: SearchHelpOption[];
    unitsOfMeasure: SearchHelpOption[];
    currencies: SearchHelpOption[];
    taxCodes: SearchHelpOption[];
    poPriceTypes: SearchHelpOption[];
    purchasingOrganizations: SearchHelpOption[];
    purchasingGroups: SearchHelpOption[];
    storageLocations: SearchHelpOption[];
    costCenters: SearchHelpOption[];
    glAccounts: SearchHelpOption[];
    batches: SearchHelpOption[];
    revisionLevels: SearchHelpOption[];
    desiredSuppliers: SearchHelpOption[];
    infoRecords?: SearchHelpOption[];
    outlineAgreements?: SearchHelpOption[];
    agreementItems?: SearchHelpOption[];
    attachmentDocTypes: SearchHelpOption[];
    headerOptions?: SearchHelpOption[];
}

export const defaultSapMasterData: SapMasterDataConfig = {
    documentTypes: [],
    itemCategories: [
        { code: 'Standard', name: 'Standard (0 / Blank)', extra: 'Standard material or service procurement' },
        { code: 'K', name: 'K - Consignment', extra: 'Vendor consignment stock stored at plant' },
        { code: 'L', name: 'L - Subcontracting', extra: 'Components provided to external vendor for processing' },
        { code: 'S', name: 'S - Third Party', extra: 'Vendor ships direct to end-customer' },
        { code: 'U', name: 'U - Stock Transfer', extra: 'Inter-plant stock transport order' },
        { code: 'D', name: 'D - Service', extra: 'External service line item' },
        { code: 'B', name: 'B - Limit Order', extra: 'Blanket purchase requisition with value limit' },
        { code: 'T', name: 'T - Text Item', extra: 'Non-valuated descriptive text line' },
    ],
    materialTypes: [
        { code: 'ROH', name: 'ROH - Raw Materials', extra: 'Natural gas, industrial reagents, feedstocks' },
        { code: 'ERSA', name: 'ERSA - Spare Parts', extra: 'Mechanical, electrical and instrument spares' },
        { code: 'HIBE', name: 'HIBE - Operating Supplies', extra: 'Lubricants, solvents, safety consumables' },
        { code: 'VERP', name: 'VERP - Packaging Materials', extra: 'Drums, carboys, IBC containers' },
        { code: 'DIEN', name: 'DIEN - Services', extra: 'Engineering, plant maintenance, overhaul services' },
        { code: 'FERT', name: 'FERT - Finished Products', extra: 'Methanol, Formaldehyde, UF resins' },
        { code: 'HALB', name: 'HALB - Semi-Finished Goods', extra: 'Intermediate distillates and synthesis products' },
        { code: 'NLAG', name: 'NLAG - Non-Stock Materials', extra: 'Direct expense non-inventoried items' },
    ],
    plants: [
        { code: '1100', name: '1100 - Corporate Office', plantName: 'Corporate Office', extra: 'Plant 1100 • Corporate Office' },
        { code: '1200', name: '1200 - Namrup', plantName: 'Namrup', extra: 'Plant 1200 • Namrup' },
        { code: '1300', name: '1300 - Boitamari', plantName: 'Boitamari', extra: 'Plant 1300 • Boitamari' },
        { code: '1400', name: '1400 - Rani Nagar', plantName: 'Rani Nagar', extra: 'Plant 1400 • Rani Nagar' },
    ],
    accountAssignmentCategories: [],
    materialGroups: [],
    materials: [],
    unitsOfMeasure: [
        { code: 'KG', name: 'Kilogram (KG)', extra: 'Weight measure' },
        { code: 'PC', name: 'Piece (PC)', extra: 'Individual item count' },
        { code: 'EA', name: 'Each (EA)', extra: 'Unit count' },
        { code: 'L', name: 'Liter (L)', extra: 'Volume measure' },
        { code: 'M', name: 'Meter (M)', extra: 'Linear length' },
        { code: 'TO', name: 'Metric Ton (TO)', extra: 'Bulk weight measure' },
        { code: 'AU', name: 'Activity Unit (AU)', extra: 'Service execution unit' },
        { code: 'HR', name: 'Hours (HR)', extra: 'Time/Labor unit' },
    ],
    currencies: [
        { code: 'INR', name: 'INR - Indian Rupee', extra: 'Domestic Indian Currency (₹)' },
        { code: 'USD', name: 'USD - United States Dollar', extra: 'International Trade Currency ($)' },
        { code: 'EUR', name: 'EUR - Euro', extra: 'European Union Currency (€)' },
    ],
    taxCodes: [
        { code: 'G3', name: 'G3 - 18% Input GST', extra: 'Input GST 18%' },
        { code: 'G4', name: 'G4 - 12% Input GST', extra: 'Input GST 12%' },
        { code: 'V1', name: 'V1 - 18% Input GST Standard', extra: 'Domestic CGST + SGST (9% + 9%)' },
        { code: 'V0', name: 'V0 - 0% Tax Exempt', extra: 'Zero-rated or exempt goods' },
        { code: 'I1', name: 'I1 - 12% IGST Interstate', extra: 'Interstate Integrated GST 12%' },
        { code: 'I2', name: 'I2 - 28% Input High GST', extra: 'Special chemicals & automotive parts 28%' },
    ],
    poPriceTypes: [
        { code: 'Do not adopt', name: 'Do not adopt', extra: 'No automatic price adoption' },
        { code: 'As gross price', name: 'As gross price', extra: 'Adopts valuation price as gross price in PO' },
        { code: 'As net price', name: 'As net price', extra: 'Adopts valuation price as net price in PO' },
    ],
    purchasingOrganizations: [
        { code: '1100', name: '1100 - Purchasing Org 1100', extra: 'SAP S/4HANA Purchasing Org 1100' },
        { code: '1200', name: '1200 - APL Domestic Sourcing Org', extra: 'India Domestic Procurement Operations' },
    ],
    purchasingGroups: [
        { code: '103', name: '103 - Purchasing Group 103', extra: 'Operational Plant Purchasing Team' },
        { code: '001', name: '001 - Purchasing Group 001', extra: 'General Purchasing Team 001' },
        { code: '101', name: '101 - Central Purchasing', extra: 'Corporate Strategic Sourcing' },
        { code: '102', name: '102 - Technical Purchasing', extra: 'Technical & Spares Sourcing' },
        { code: '104', name: '104 - Projects Purchasing', extra: 'Project Procurement' },
        { code: '112', name: '112 - Chemicals Purchasing', extra: 'Bulk Chemical Procurement' },
        { code: '114', name: '114 - Reagents Purchasing', extra: 'Laboratory & Plant Reagents' },
        { code: '119', name: '119 - Services Purchasing', extra: 'Contract & Manpower Services' },
    ],
    storageLocations: [
        { code: 'M100', name: 'M100 - Main Raw Material Store', extra: 'Plant 1200 Main Chemical Store' },
        { code: 'SSM2', name: 'SSM2 - Safety & Spares Store 2', extra: 'Plant 1200 Safety Store' },
        { code: 'SSM3', name: 'SSM3 - Spares Store 3', extra: 'Plant 1200 Spares Store' },
        { code: 'SL01', name: 'SL01 - General Warehouse 1', extra: 'Plant 1300 Warehouse' },
    ],
    costCenters: [
        { code: '10101PCC01', name: '10101PCC01 - Plant Cost Center 01', extra: 'Default Manufacturing Cost Center' },
        { code: '12001101', name: '12001101 - Chemical Processing Plant 1200', extra: 'APL Main Manufacturing Division' },
    ],
    glAccounts: [
        { code: '65301000', name: '65301000 - Consumed Materials', extra: 'Chart of Accounts YCOA - Consumables Expense' },
        { code: '410100001', name: '410100001 - Raw Material Consumption', extra: 'Chart of Accounts YCOA - Direct Raw Material' },
        { code: '410100006', name: '410100006 - Operating Supplies Expense', extra: 'Chart of Accounts YCOA - Operating Supplies' },
    ],
    batches: [],
    revisionLevels: [],
    desiredSuppliers: [
        { code: 'V-10029', name: 'Tata Chemicals Ltd', supplierName: 'Tata Chemicals Ltd', extra: 'Vendor 10029 • Industrial & Inorganic Chemicals • Active' },
        { code: 'V-10034', name: 'Gujarat Fluorochemicals Ltd', supplierName: 'Gujarat Fluorochemicals Ltd', extra: 'Vendor 10034 • Specialty Fluoropolymers & Reagents • Active' },
        { code: 'V-10045', name: 'Reliance Industries Ltd', supplierName: 'Reliance Industries Ltd', extra: 'Vendor 10045 • Petrochemicals & Polymers • Active' },
        { code: 'V-10052', name: 'BASF India Limited', supplierName: 'BASF India Limited', extra: 'Vendor 10052 • Catalysts, Dispersions & Resins • Active' },
        { code: 'V-10061', name: 'Linde India Limited', supplierName: 'Linde India Limited', extra: 'Vendor 10061 • Cryogenic & Industrial Gases • Active' },
        { code: 'V-10080', name: 'Siemens Energy India Ltd', supplierName: 'Siemens Energy India Ltd', extra: 'Vendor 10080 • Turbines, Drives & High-Voltage Spares • Active' },
        { code: 'V-10095', name: 'Thermax Limited', supplierName: 'Thermax Limited', extra: 'Vendor 10095 • Boilers, Heat Exchangers & Water Solutions • Active' },
        { code: 'V-10110', name: 'Bharat Heavy Electricals Ltd (BHEL)', supplierName: 'Bharat Heavy Electricals Ltd', extra: 'Vendor 10110 • Heavy Engineering & Pressure Vessels • Active' },
        { code: 'V-10125', name: 'Indian Oil Corporation Ltd (IOCL)', supplierName: 'Indian Oil Corporation Ltd', extra: 'Vendor 10125 • Fuel & Specialty Base Oils • Active' },
    ],
    infoRecords: [
        { code: '5300001201', name: 'Tata Chemicals - Standard Material Info Record', extra: 'Vendor V-10029 • Plant 1200 • Purchasing Org 1100 • Regular Vendor' },
        { code: '5300001205', name: 'Reliance Industries - Feedstock Info Record', extra: 'Vendor V-10045 • Plant 1200 • Purchasing Org 1100 • Standard Terms' },
        { code: '5300001210', name: 'BASF India - Catalyst Supply Info Record', extra: 'Vendor V-10052 • Plant 1200 • Purchasing Org 1100 • Long-term Tier' },
        { code: '5300001218', name: 'Linde India - Industrial Nitrogen Info Record', extra: 'Vendor V-10061 • Plant 1200 • Purchasing Org 1200 • Pipeline Feed' },
        { code: '5300001230', name: 'Siemens Energy - Turbine Maintenance Info Record', extra: 'Vendor V-10080 • Plant 1200 • Purchasing Org 1100 • OEM Spares' },
    ],
    outlineAgreements: [
        { code: '4600000110', name: 'Annual Rate Contract 2026 - Bulk Chemicals', extra: 'Vendor V-10029 • Validity: 01.01.2026 - 31.12.2026 • Item 00010' },
        { code: '4600000125', name: 'Long Term Feedstock Framework Agreement', extra: 'Vendor V-10045 • Validity: 01.04.2025 - 31.03.2027 • Item 00010' },
        { code: '4600000140', name: 'Plant Spares & Consumables Blanket Contract', extra: 'Vendor V-10052 • Validity: 01.07.2025 - 30.06.2026 • Item 00020' },
        { code: '4600000155', name: 'Industrial Gas Long-Term Supply Contract', extra: 'Vendor V-10061 • Validity: 01.01.2024 - 31.12.2028 • Item 00010' },
        { code: '4600000180', name: 'Turbine Spares Master Purchase Agreement', extra: 'Vendor V-10080 • Validity: 01.10.2025 - 30.09.2027 • Item 00010' },
    ],
    agreementItems: [
        { code: '00010', name: 'Item 00010 - Primary Agreement Target Position', extra: 'Contract Target Item 10' },
        { code: '00020', name: 'Item 00020 - Secondary / Alternate Grade Position', extra: 'Contract Target Item 20' },
        { code: '00030', name: 'Item 00030 - High-Grade Specification Position', extra: 'Contract Target Item 30' },
    ],
    attachmentDocTypes: [
        { code: 'SL1', name: 'For External Use (SL1)', extra: 'Drawings & specs shared with suppliers' },
        { code: 'SL9', name: 'For Internal Use (SL9)', extra: 'Confidential internal plant documentation' },
        { code: 'YB0', name: 'Office-Documents (YB0)', extra: 'Word, Excel, PDF calculation sheets' },
        { code: 'YP1', name: 'Image of Damage (YP1)', extra: 'Defect photos or maintenance evidence' },
        { code: 'YP2', name: 'Manuals (YP2)', extra: 'Operating manuals and schematics' },
    ],
};
