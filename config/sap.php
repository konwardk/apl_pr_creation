<?php

$baseUrl = rtrim(env('SAP_S4HANA_URL', 'https://my443658.s4hana.cloud.sap'), '/');

return [
    /*
    |--------------------------------------------------------------------------
    | SAP S/4HANA Cloud Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration settings for connecting to SAP S/4HANA Public Cloud
    | OData APIs and CDS Views.
    |
    */

    'system_name' => 'SAP S/4HANA Cloud (Public Edition)',
    'edition' => '2408.3 Enterprise Cloud',
    'tenant_url' => $baseUrl,
    'client' => env('SAP_CLIENT', '100'),
    'verify_ssl' => env('SAP_VERIFY_SSL', false),

    'auth' => [
        'username' => env('SAP_ODATA_USER', 'Communication_user'),
        'password' => env('SAP_ODATA_PASSWORD', 'Communication@1123456789'),
    ],

    'environments' => [
        'quality' => [
            'username' => env('SAP_QUALITY_ODATA_USER', env('SAP_TEST_ODATA_USER', 'Communication_user')),
            'password' => env('SAP_QUALITY_ODATA_PASSWORD', env('SAP_TEST_ODATA_PASSWORD', 'Communication@1123456789')),
        ],
        'development' => [
            'username' => env('SAP_DEV_ODATA_USER', 'BTP_S4_INTEGRATION'),
            'password' => env('SAP_DEV_ODATA_PASSWORD', 'Assampetrochemical@123#'),
        ],
    ],

    'endpoints' => [
        // CDS View for Purchase Requisition Document Types
        'pr_document_types' => env(
            'SAP_PR_TYPE_ENDPOINT',
            $baseUrl . '/sap/opu/odata/sap/YY1_PURCHASEREQTYPE_CDS/YY1_PURCHASEREQTYPE?$format=json'
        ),

        // CDS View for Materials / Products with Plant Valuation (YY1_PRODUCTPLANTVALUATION_CDS)
        'materials' => env(
            'SAP_MATERIALS_ENDPOINT',
            $baseUrl . '/sap/opu/odata/sap/YY1_PRODUCTPLANTVALUATION_CDS/YY1_ProductPlantValuation?$format=json'
        ),

        // CDS View for Account Assignment Categories
        'account_assignment_categories' => env(
            'SAP_ACCOUNT_ASSIGNMENT_CAT_ENDPOINT',
            $baseUrl . '/sap/opu/odata/sap/YY1_ACCOUNTASSIGNMENTCAT_CDS/YY1_AccountAssignmentCat?$format=json'
        ),

        // Value Help Service for Plants (ZUI_TMS_DESPATCH_04 / PlantVH)
        'plants' => env(
            'SAP_PLANTS_ENDPOINT',
            $baseUrl . '/sap/opu/odata/sap/ZUI_TMS_DESPATCH_04/PlantVH?format=json'
        ),

        // Value Help Service for Storage Locations (ZUI_TMS_DESPATCH_04 / StorageLocationVH)
        'storage_locations' => env(
            'SAP_STORAGE_LOCATIONS_ENDPOINT',
            $baseUrl . '/sap/opu/odata/sap/ZUI_TMS_DESPATCH_04/StorageLocationVH?format=json'
        ),

        // CDS View for Material Groups (YY1_MATERIALGROUP_CDS)
        'material_groups' => env(
            'SAP_MATERIAL_GROUP_ENDPOINT',
            $baseUrl . '/sap/opu/odata/sap/YY1_MATERIALGROUP_CDS/YY1_MATERIALGROUP?$format=json'
        ),

        // CDS View for G/L Accounts in Company Code (YY1_I_GLACCOUNTINCOMPANYCO_CDS)
        'gl_accounts' => env(
            'SAP_GL_ACCOUNT_ENDPOINT',
            $baseUrl . '/sap/opu/odata/sap/YY1_I_GLACCOUNTINCOMPANYCO_CDS/YY1_I_GLACCOUNTINCOMPANYCO?$format=json'
        ),

        // CDS View for Cost Centers (YY1_COSTCENTER_CDS)
        'cost_centers' => env(
            'SAP_COST_CENTER_ENDPOINT',
            $baseUrl . '/sap/opu/odata/sap/YY1_COSTCENTER_CDS/YY1_COSTCENTER?$format=json'
        ),

        // CDS View for Suppliers / Vendors (YY1_SUPPLIER_CDS)
        'suppliers' => env(
            'SAP_SUPPLIERS_ENDPOINT',
            $baseUrl . '/sap/opu/odata/sap/YY1_SUPPLIER_CDS/YY1_Supplier?$format=json'
        ),

        // CDS View for Purchasing Organizations (YY1_PURCHASEORGANIZATION_CDS)
        'purchasing_organizations' => env(
            'SAP_PURCHASING_ORG_ENDPOINT',
            $baseUrl . '/sap/opu/odata/sap/YY1_PURCHASEORGANIZATION_CDS/YY1_PURCHASEORGANIZATION?$format=json'
        ),

        // CDS View for Purchasing Groups (YY1_PURCHASINGGROUPAPI_CDS)
        'purchasing_groups' => env(
            'SAP_PURCHASING_GROUP_ENDPOINT',
            $baseUrl . '/sap/opu/odata/sap/YY1_PURCHASINGGROUPAPI_CDS/YY1_PurchasingGroupAPI?$format=json'
        ),

        // CDS View for Unit of Measurement (YY1_UNITOFMEASUREMENT_CDS)
        'units_of_measure' => env(
            'SAP_UOM_ENDPOINT',
            $baseUrl . '/sap/opu/odata/sap/YY1_UNITOFMEASUREMENT_CDS/YY1_UnitOfMeasurement?$format=json'
        ),

        // CDS View for Purchasing Info Records (YY1_INFORECORD_CDS)
        'info_records' => env(
            'SAP_INFO_RECORDS_ENDPOINT',
            $baseUrl . '/sap/opu/odata/sap/YY1_INFORECORD_CDS/YY1_INFORECORD?$format=json'
        ),

        // CDS View for Tax Codes (YY1_TAXCODE_CDS)
        'tax_codes' => env(
            'SAP_TAX_CODES_ENDPOINT',
            $baseUrl . '/sap/opu/odata/sap/YY1_TAXCODE_CDS/YY1_TAXCODE?$format=json'
        ),

        // CDS View for Outline Contracts / Agreements (YY1_OUTLINECONTRACT_CDS)
        'outline_contracts' => env(
            'SAP_OUTLINE_CONTRACTS_ENDPOINT',
            $baseUrl . '/sap/opu/odata/sap/YY1_OUTLINECONTRACT_CDS/YY1_OUTLINECONTRACT?$format=json'
        ),

        // OData V4 PR Service Root (for CSRF Token Fetch)
        'service_root' => env(
            'SAP_SERVICE_ROOT_ENDPOINT',
            $baseUrl . '/sap/opu/odata4/sap/api_purchaserequisition_2/srvd_a2x/sap/purchaserequisition/0001/'
        ),

        // OData V4 PR Process Service (POST to create PR header & items: PurchaseReqn)
        'purchase_requisition_process' => env(
            'SAP_PR_PROCESS_ENDPOINT',
            $baseUrl . '/sap/opu/odata4/sap/api_purchaserequisition_2/srvd_a2x/sap/purchaserequisition/0001/PurchaseReqn'
        ),

        // OData V4 PR Items Service (GET items: PurchaseReqnItem)
        'purchase_requisition_items' => env(
            'SAP_PR_ITEMS_ENDPOINT',
            $baseUrl . '/sap/opu/odata4/sap/api_purchaserequisition_2/srvd_a2x/sap/purchaserequisition/0001/PurchaseReqnItem'
        ),

        // SAP Attachment Service (API_CV_ATTACHMENT_SRV - Communication Scenario SAP_COM_0119)
        // Enables binary attachments for Purchase Requisitions (EBAN / BUS2105) in SAP S/4HANA Cloud
        'attachment_service_root' => env(
            'SAP_ATTACHMENT_SERVICE_ROOT',
            $baseUrl . '/sap/opu/odata/sap/API_CV_ATTACHMENT_SRV/'
        ),

        'attachment_content' => env(
            'SAP_ATTACHMENT_CONTENT_ENDPOINT',
            $baseUrl . '/sap/opu/odata/sap/API_CV_ATTACHMENT_SRV/AttachmentContentSet'
        ),

        // SAP Custom Business Object API for Contract Requisition (YY1_API_CONTRACTREQUISITION)
        'contract_requisition' => env(
            'SAP_CONTRACT_REQUISITION_ENDPOINT',
            $baseUrl . '/sap/opu/odata4/sap/yy1_api_contractrequisition/srvd_a2x/sap/yy1_api_contractrequisition/0001/ContractRequisition'
        ),

        'contract_requisition_service_root' => env(
            'SAP_CONTRACT_REQUISITION_SERVICE_ROOT',
            $baseUrl . '/sap/opu/odata4/sap/yy1_api_contractrequisition/srvd_a2x/sap/yy1_api_contractrequisition/0001/'
        ),
    ],
];
