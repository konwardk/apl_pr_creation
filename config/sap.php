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

        // OData V4 PR Process Service
        'purchase_requisition_process' => env(
            'SAP_ODATA_URL',
            'https://my443544-api.s4hana.cloud.sap'
        ) . '/sap/opu/odata4/sap/api_purchaserequisition_process_srv/srvd_a2x/sap/purchaserequisition/0001/PurchaseRequisition',
    ],
];
