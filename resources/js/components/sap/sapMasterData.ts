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
    attachmentDocTypes: SearchHelpOption[];
}

export const defaultSapMasterData: SapMasterDataConfig = {
    documentTypes: [
        { code: 'ZCOM', name: 'Domestic Cmpste PR (ZCOM)', extra: 'Standard Domestic Composite Purchase Requisition' },
        { code: 'NB', name: 'Pur. Requisition (NB)', extra: 'Standard Purchase Requisition' },
        { code: 'NBS', name: 'Pur. Requisition NBS (NBS)', extra: 'Standard PR with Special Item' },
        { code: 'RV', name: 'Outline Agrmt. Reqn. (RV)', extra: 'Outline Agreement Requisition' },
        { code: 'ZICP', name: 'Import Cmpste PR (ZICP)', extra: 'Import Composite Purchase Requisition' },
        { code: 'ZIMT', name: 'Import Material PR (ZIMT)', extra: 'Direct Import Material PR' },
        { code: 'ZISR', name: 'Import Service PR (ZISR)', extra: 'Import Service Procurement' },
        { code: 'ZMAT', name: 'Domestic Material PR (ZMAT)', extra: 'Domestic Standard Material PR' },
        { code: 'ZSER', name: 'Domestic Service PR (ZSER)', extra: 'Domestic Standard Service PR' },
    ],
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
        { code: '1200', name: '1200 - Dibrugarh Manufacturing Plant', extra: 'Parbatpur, Dibrugarh, Assam (AS), India (IN)' },
        { code: '1000', name: '1000 - Namrup Main Methanol Plant', extra: 'Namrup, Dibrugarh District, Assam (AS), India (IN)' },
        { code: '1100', name: '1100 - Guwahati Storage & Terminal', extra: 'Noonmati, Guwahati, Assam (AS), India (IN)' },
        { code: '1010', name: '1010 - Corporate Procurement Global', extra: 'Dietmar-Hopp-Allee 16, Walldorf, Germany (DE)' },
        { code: '1020', name: '1020 - Plant Texas Tech Center', extra: 'Austin, Texas, United States (US)' },
    ],
    accountAssignmentCategories: [
        { code: 'K', name: 'K - Cost Center', extra: 'Posting to Cost Center' },
        { code: 'P', name: 'P - Project (WBS)', extra: 'Posting to Work Breakdown Structure' },
        { code: 'A', name: 'A - Asset', extra: 'Capitalized Fixed Asset' },
        { code: 'F', name: 'F - Production Order', extra: 'Production / Internal Order' },
        { code: 'U', name: 'U - Unknown', extra: 'Unassigned Account Assignment' },
    ],
    materialGroups: [
        { code: 'L002', name: 'Raw Materials (L002)', extra: 'Chemical reagents, bulk materials, mineral acids' },
        { code: 'L001', name: 'Mechanical Components (L001)', extra: 'Valves, seals, flanges, piping, mechanical spares' },
        { code: 'L003', name: 'Electrical & Instrumentation (L003)', extra: 'Sensors, transmitters, cables, breakers' },
        { code: 'P001', name: 'Packaging & Containers (P001)', extra: 'Drums, IBC containers, palettes' },
        { code: 'S001', name: 'Maintenance Services (S001)', extra: 'Third-party plant maintenance, engineering labor' },
    ],
    materials: [
        {
            code: '10000001',
            name: 'HCL Acid 30-33% Conc.',
            extra: 'ROH • L002 • 26.94 INR / KG • Industrial feed',
            materialType: 'ROH - Raw Materials',
            materialGroup: 'L002',
            uom: 'KG',
            unitPrice: 26.94,
            currency: 'INR',
            poText: 'Hydrochloric Acid 30-33% concentration. Industrial grade in approved rubber-lined tankers.',
        },
        {
            code: '10000002',
            name: 'Methanol Synthesis Catalyst CuO/ZnO',
            extra: 'ROH • L002 • 850.00 INR / KG • Plant reactor charge',
            materialType: 'ROH - Raw Materials',
            materialGroup: 'L002',
            uom: 'KG',
            unitPrice: 850.00,
            currency: 'INR',
            poText: 'High activity copper-zinc-alumina catalyst pellets for low pressure methanol synthesis reactor.',
        },
        {
            code: '10000003',
            name: 'Natural Gas Feedstock (Pipeline Gas)',
            extra: 'ROH • L002 • 18.50 INR / SCM • Reformer supply',
            materialType: 'ROH - Raw Materials',
            materialGroup: 'L002',
            uom: 'TO',
            unitPrice: 18500.00,
            currency: 'INR',
            poText: 'Sweet natural gas feed conforming to APL reformer inlet specification.',
        },
        {
            code: 'TG11',
            name: 'High Pressure Hydraulic Seal 120mm',
            extra: 'ERSA • L001 • 320.00 INR / PC • Viton 350 bar',
            materialType: 'ERSA - Spare Parts',
            materialGroup: 'L001',
            uom: 'PC',
            unitPrice: 320.00,
            currency: 'INR',
            poText: 'High pressure cylinder piston seal, Viton FKM polymer, 120mm OD x 100mm ID x 15mm.',
        },
        {
            code: 'PUMP-01',
            name: 'Centrifugal Impeller SS316 280mm',
            extra: 'ERSA • L001 • 14,200.00 INR / EA • Methanol feed pump',
            materialType: 'ERSA - Spare Parts',
            materialGroup: 'L001',
            uom: 'EA',
            unitPrice: 14200.00,
            currency: 'INR',
            poText: 'Precision cast SS316 enclosed impeller dynamic balanced for KSB multi-stage feed pump.',
        },
        {
            code: 'SP-882',
            name: 'Stainless Steel Flange 4-inch ANSI',
            extra: 'ERSA • L001 • 145.00 INR / EA • 316L Class 150 RF',
            materialType: 'ERSA - Spare Parts',
            materialGroup: 'L001',
            uom: 'EA',
            unitPrice: 145.00,
            currency: 'INR',
            poText: 'Weld neck pipe flange Class 150 Raised Face, ASTM A182 F316L stainless steel.',
        },
        {
            code: 'INST-401',
            name: 'Differential Pressure Transmitter 4-20mA',
            extra: 'ERSA • L003 • 28,500.00 INR / EA • HART Protocol ATEX',
            materialType: 'ERSA - Spare Parts',
            materialGroup: 'L003',
            uom: 'EA',
            unitPrice: 28500.00,
            currency: 'INR',
            poText: 'Smart Differential Pressure Transmitter, 0-10 bar range, 4-20mA HART, flameproof ATEX Zone 1.',
        },
        {
            code: 'RM-049',
            name: 'Industrial Solvent Degreaser 50L',
            extra: 'HIBE • L002 • 84.50 INR / L • Plant maintenance wash',
            materialType: 'HIBE - Operating Supplies',
            materialGroup: 'L002',
            uom: 'L',
            unitPrice: 84.50,
            currency: 'INR',
            poText: 'Heavy-duty degreasing compound, biodegradable, flash point > 60°C.',
        },
        {
            code: 'DRUM-200',
            name: '200 Liter Epoxy Lined Steel Drum',
            extra: 'VERP • P001 • 1,850.00 INR / EA • UN Certified for export',
            materialType: 'VERP - Packaging Materials',
            materialGroup: 'P001',
            uom: 'EA',
            unitPrice: 1850.00,
            currency: 'INR',
            poText: 'Heavy gauge steel drum with internal chemical-resistant epoxy coating, tight head with 2-inch bungs.',
        },
        {
            code: 'SRV-01',
            name: 'Annual Machine Line Preventive Overhaul',
            extra: 'DIEN • S001 • 4,500.00 INR / AU • Certified servicing',
            materialType: 'DIEN - Services',
            materialGroup: 'S001',
            uom: 'AU',
            unitPrice: 4500.00,
            currency: 'INR',
            poText: 'Full mechanical overhaul and recalibration of automated reaction vessel line 4.',
        },
    ],
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
        { code: 'GBP', name: 'GBP - British Pound', extra: 'Pound Sterling (£)' },
    ],
    taxCodes: [
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
        { code: '1200', name: '1200 - APL Domestic Sourcing Org', extra: 'India Domestic Procurement Operations' },
        { code: '1010', name: '1010 - Corporate Procurement Global', extra: 'Global Centralized Purchasing Entity' },
    ],
    purchasingGroups: [
        { code: '103', name: 'Purchase (103)', extra: 'Operational Plant Purchasing Team' },
        { code: '101', name: 'Central Purchasing (101)', extra: 'Corporate Strategic Sourcing' },
        { code: '001', name: 'Raw Materials Sourcing (001)', extra: 'Bulk Chemical & Commodity Sourcing' },
        { code: '002', name: 'MRO & Spare Parts (002)', extra: 'Maintenance, Repairs & Operations' },
    ],
    storageLocations: [
        { code: '101A', name: '101A - Raw Materials Warehouse', extra: 'Main Chemical & Raw Materials Bay' },
        { code: '101B', name: '101B - Finished Goods Store', extra: 'Finished Product Storage' },
        { code: '102A', name: '102A - Engineering & Spares', extra: 'Mechanical & Electrical Spares Bay' },
    ],
    costCenters: [
        { code: '12001101', name: '12001101 - Chemical Processing Plant 1200', extra: 'APL Main Manufacturing Division' },
        { code: '10101101', name: '10101101 - Plant Maintenance Walldorf', extra: 'General Equipment & Preventive Upkeep' },
        { code: '10201101', name: '10201101 - Texas Operations Lab', extra: 'R&D and Pilot Facility' },
    ],
    glAccounts: [
        { code: '40000000', name: '40000000 - Raw Materials Consumption', extra: 'Direct Material Cost of Goods Sold' },
        { code: '51000000', name: '51000000 - Factory Maintenance & Spares', extra: 'Operating Expense - Maintenance' },
        { code: '52000000', name: '52000000 - Outside Processing Services', extra: 'Third-party Service Contracts' },
    ],
    batches: [
        { code: 'BATCH-2026-A1', name: 'BATCH-2026-A1', extra: 'Q1 Certified Industrial Batch' },
        { code: 'BATCH-2026-B2', name: 'BATCH-2026-B2', extra: 'Q2 High-Purity Synthesis Batch' },
        { code: 'STANDARD', name: 'STANDARD', extra: 'Non-lot tracked inventory' },
    ],
    revisionLevels: [
        { code: '01', name: '01 - Initial Revision', extra: 'Baseline engineering spec' },
        { code: '02', name: '02 - Updated Chemical Purity', extra: 'Enhanced 33% concentration spec' },
        { code: '03', name: '03 - Final Certified Spec', extra: 'Approved ISO-9001 revision' },
    ],
    desiredSuppliers: [
        { code: 'V-10029', name: 'V-10029 - Tata Chemicals Limited', extra: 'Preferred Chemical Supplier • Vendor Tier 1' },
        { code: 'V-10045', name: 'V-10045 - Parker Hannifin Seals Corp', extra: 'Hydraulic Components • Vendor Tier 1' },
        { code: 'V-10088', name: 'V-10088 - BASF India Ltd', extra: 'Specialty Chemical Solvents' },
        { code: 'V-10112', name: 'V-10112 - Larsen & Toubro Engineering', extra: 'Industrial Plant Maintenance Services' },
    ],
    attachmentDocTypes: [
        { code: 'SL1', name: 'For External Use (SL1)', extra: 'Drawings & specs shared with suppliers' },
        { code: 'SL9', name: 'For Internal Use (SL9)', extra: 'Confidential internal plant documentation' },
        { code: 'YB0', name: 'Office-Documents (YB0)', extra: 'Word, Excel, PDF calculation sheets' },
        { code: 'YP1', name: 'Image of Damage (YP1)', extra: 'Defect photos or maintenance evidence' },
        { code: 'YP2', name: 'Manuals (YP2)', extra: 'Operating manuals and schematics' },
    ],
};
