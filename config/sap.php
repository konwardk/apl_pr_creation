<?php

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
    'tenant_url' => env('SAP_S4HANA_URL', 'https://my443544-api.s4hana.cloud.sap'),
    'client' => env('SAP_CLIENT', '100'),
    'verify_ssl' => env('SAP_VERIFY_SSL', false),

    'auth' => [
        'username' => env('SAP_ODATA_USER', ''),
        'password' => env('SAP_ODATA_PASSWORD', ''),
    ],

    'endpoints' => [
        // CDS View for Purchase Requisition Document Types
        'pr_document_types' => env(
            'SAP_PR_TYPE_ENDPOINT',
            'https://my443544-api.s4hana.cloud.sap/sap/opu/odata/sap/YY1_PURCHASEREQTYPE_CDS/YY1_PURCHASEREQTYPE?$format=json'
        ),

        // CDS View for Materials / Products
        'materials' => env(
            'SAP_MATERIALS_ENDPOINT',
            'https://my443544-api.s4hana.cloud.sap/sap/opu/odata/sap/YY1_MATERIALS_CDS/YY1_MATERIALS?$format=json'
        ),

        // CDS View for Account Assignment Categories
        'account_assignment_categories' => env(
            'SAP_ACCOUNT_ASSIGNMENT_CAT_ENDPOINT',
            'https://my443544-api.s4hana.cloud.sap/sap/opu/odata/sap/YY1_ACCOUNTASSIGNMENTCAT_CDS/YY1_AccountAssignmentCat?$format=json'
        ),

        // Value Help Service for Plants (ZUI_TMS_DESPATCH_04 / PlantVH)
        'plants' => env(
            'SAP_PLANTS_ENDPOINT',
            'https://my443544-api.s4hana.cloud.sap/sap/opu/odata/sap/ZUI_TMS_DESPATCH_04/PlantVH?format=json'
        ),

        // OData V4 PR Service Root (for CSRF Token Fetch)
        'service_root' => env(
            'SAP_SERVICE_ROOT_ENDPOINT',
            env('SAP_S4HANA_URL', 'https://my443544-api.s4hana.cloud.sap') . '/sap/opu/odata4/sap/api_purchaserequisition_2/srvd_a2x/sap/purchaserequisition/0001/'
        ),

        // OData V4 PR Process Service (POST to create PR header & items: PurchaseReqn)
        'purchase_requisition_process' => env(
            'SAP_PR_PROCESS_ENDPOINT',
            env('SAP_S4HANA_URL', 'https://my443544-api.s4hana.cloud.sap') . '/sap/opu/odata4/sap/api_purchaserequisition_2/srvd_a2x/sap/purchaserequisition/0001/PurchaseReqn'
        ),

        // OData V4 PR Items Service (GET items: PurchaseReqnItem)
        'purchase_requisition_items' => env(
            'SAP_PR_ITEMS_ENDPOINT',
            env('SAP_S4HANA_URL', 'https://my443544-api.s4hana.cloud.sap') . '/sap/opu/odata4/sap/api_purchaserequisition_2/srvd_a2x/sap/purchaserequisition/0001/PurchaseReqnItem'
        ),
    ],
];
