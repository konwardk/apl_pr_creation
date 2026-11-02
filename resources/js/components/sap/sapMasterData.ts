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
    plants: [],
    accountAssignmentCategories: [],
    materialGroups: [],
    materials: [],
    unitsOfMeasure: [],
    currencies: [
        { code: 'INR', name: 'INR - Indian Rupee', extra: 'Domestic Indian Currency (₹)' },
        { code: 'USD', name: 'USD - United States Dollar', extra: 'International Trade Currency ($)' },
        { code: 'EUR', name: 'EUR - Euro', extra: 'European Union Currency (€)' },
    ],
    taxCodes: [],
    poPriceTypes: [
        { code: 'Do not adopt', name: 'Do not adopt', extra: 'No automatic price adoption' },
        { code: 'As gross price', name: 'As gross price', extra: 'Adopts valuation price as gross price in PO' },
        { code: 'As net price', name: 'As net price', extra: 'Adopts valuation price as net price in PO' },
    ],
    purchasingOrganizations: [],
    purchasingGroups: [],
    storageLocations: [],
    costCenters: [],
    glAccounts: [],
    batches: [],
    revisionLevels: [],
    desiredSuppliers: [],
    infoRecords: [],
    outlineAgreements: [],
    agreementItems: [],
    attachmentDocTypes: [
        { code: 'SL1', name: 'For External Use (SL1)', extra: 'Drawings & specs shared with suppliers' },
        { code: 'SL9', name: 'For Internal Use (SL9)', extra: 'Confidential internal plant documentation' },
        { code: 'YB0', name: 'Office-Documents (YB0)', extra: 'Word, Excel, PDF calculation sheets' },
        { code: 'YP1', name: 'Image of Damage (YP1)', extra: 'Defect photos or maintenance evidence' },
        { code: 'YP2', name: 'Manuals (YP2)', extra: 'Operating manuals and schematics' },
    ],
};
