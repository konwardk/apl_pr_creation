<?php

namespace App\Services;

use App\Models\Attachment;
use App\Models\PrDocumentType;
use App\Models\PurchasingOrganization;
use App\Models\PurchasingGroup;
use App\Models\PurchaseRequisition;
use App\Models\ContractRequisition;
use GuzzleHttp\Client;
use GuzzleHttp\Cookie\CookieJar;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class SapMasterDataService
{
    /**
     * Default realistic fallback document types representing SAP S/4HANA Cloud
     * I_PurchaseRequisitionType CDS view release data for Assam Petro-Chemicals Ltd.
     */
    protected array $fallbackDocumentTypes = [];

    /**
     * Fetch PR Document Types from the SAP S/4HANA Cloud CDS View endpoint:
     * YY1_PURCHASEREQTYPE_CDS / YY1_PURCHASEREQTYPE (I_PurchaseRequisitionType)
     *
     * @param string|null $username Optional communication user override
     * @param string|null $password Optional communication password override
     * @param string|null $endpointUrl Optional endpoint URL override
     * @return array
     */
    public function fetchPrDocumentTypesFromCdsView(
        ?string $username = null,
        ?string $password = null,
        ?string $endpointUrl = null
    ): array {
        $endpoint = $endpointUrl ?: config(
            'sap.endpoints.pr_document_types',
            'https://my443544-api.s4hana.cloud.sap/sap/opu/odata/sap/YY1_PURCHASEREQTYPE_CDS/YY1_PURCHASEREQTYPE?$format=json'
        );

        $authUser = $username ?: config('sap.auth.username', env('SAP_ODATA_USER'));
        $authPass = $password ?: config('sap.auth.password', env('SAP_ODATA_PASSWORD'));

        // If credentials are provided, attempt live HTTP fetch to SAP S/4HANA Cloud
        if (!empty($authUser) && !empty($authPass)) {
            try {
                $startTime = microtime(true);
                $verifySsl = config('sap.verify_ssl', false);
                $request = Http::timeout(15)
                    ->withBasicAuth($authUser, $authPass)
                    ->withHeaders([
                        'Accept' => 'application/json',
                        'Content-Type' => 'application/json',
                    ]);

                if (!$verifySsl) {
                    $request = $request->withoutVerifying();
                }

                $response = $request->get($endpoint);

                $durationMs = round((microtime(true) - $startTime) * 1000);

                if ($response->successful()) {
                    $json = $response->json();
                    $parsedItems = $this->parseODataItems($json);

                    return [
                        'success' => true,
                        'is_live' => true,
                        'status' => $response->status(),
                        'latency_ms' => $durationMs,
                        'source' => 'SAP S/4HANA Cloud (Live CDS: YY1_PURCHASEREQTYPE_CDS)',
                        'endpoint' => $endpoint,
                        'count' => count($parsedItems),
                        'items' => $parsedItems,
                        'message' => "Successfully fetched " . count($parsedItems) . " PR document types live from SAP S/4HANA Cloud CDS View in {$durationMs}ms.",
                    ];
                }

                // If authentication failed or endpoint error, log and return error
                $errorBody = $response->body();
                Log::warning('SAP CDS View fetch returned non-200: ' . $response->status(), [
                    'body' => substr($errorBody, 0, 500),
                ]);

                return [
                    'success' => false,
                    'is_live' => true,
                    'status' => $response->status(),
                    'source' => 'SAP S/4HANA Cloud (Live Request Failed)',
                    'endpoint' => $endpoint,
                    'message' => "SAP S/4HANA Cloud responded with HTTP {$response->status()}: " .
                        ($response->status() === 401 ? 'Invalid or unauthorized Communication User credentials.' : 'Check CDS View service exposure.'),
                    'items' => [],
                    'error_details' => substr($errorBody, 0, 300),
                ];
            } catch (\Exception $e) {
                Log::error('Exception connecting to SAP CDS View: ' . $e->getMessage());

                return [
                    'success' => false,
                    'is_live' => false,
                    'status' => 500,
                    'source' => 'SAP S/4HANA Cloud (Connection Error)',
                    'endpoint' => $endpoint,
                    'message' => "Network connection to SAP Cloud endpoint timed out or failed: " . $e->getMessage(),
                    'items' => [],
                ];
            }
        }

        return [
            'success' => false,
            'is_live' => false,
            'status' => 400,
            'source' => 'SAP S/4HANA Cloud CDS View (Credentials Not Configured)',
            'endpoint' => $endpoint,
            'count' => 0,
            'items' => [],
            'message' => 'SAP Communication User credentials not configured in .env.',
        ];
    }

    /**
     * Parse raw SAP OData V2 or V4 payload into standardized document type records.
     */
    protected function parseODataItems(array $json): array
    {
        $rawRecords = [];

        // OData V2 payload: { "d": { "results": [ ... ] } } or { "d": [ ... ] }
        if (isset($json['d']['results']) && is_array($json['d']['results'])) {
            $rawRecords = $json['d']['results'];
        } elseif (isset($json['d']) && is_array($json['d'])) {
            $rawRecords = $json['d'];
        }
        // OData V4 payload: { "value": [ ... ] }
        elseif (isset($json['value']) && is_array($json['value'])) {
            $rawRecords = $json['value'];
        }
        // Direct array payload
        elseif (isset($json[0]) && is_array($json[0])) {
            $rawRecords = $json;
        }

        $parsed = [];

        foreach ($rawRecords as $rec) {
            $code = $rec['PurchaseRequisitionType']
                ?? $rec['YY1_PURCHASEREQTYPE']
                ?? $rec['PurchasingDocumentType']
                ?? $rec['DocumentType']
                ?? $rec['code']
                ?? null;

            if (empty($code)) {
                continue;
            }

            $name = $rec['PurchasingDocumentTypeName_1']
                ?? $rec['PurchasingDocumentTypeName']
                ?? $rec['PurchaseRequisitionTypeName']
                ?? $rec['Description']
                ?? $rec['name']
                ?? $code;

            $category = $this->determineCategory($code, $rec);
            $description = $rec['Description']
                ?? $rec['LongText']
                ?? $this->generateStandardDescription($code, $name);

            $parsed[] = [
                'code' => trim((string)$code),
                'name' => trim((string)$name),
                'category' => $category,
                'description' => $description,
                'sap_source' => 'YY1_PURCHASEREQTYPE_CDS / I_PurchaseRequisitionType',
                'raw_data' => $rec,
            ];
        }

        return $parsed;
    }

    /**
     * Get fallback document types formatted for presentation and persistence.
     */
    public function getFormattedFallbackItems(): array
    {
        return [];
    }

    /**
     * Infer business procurement category from document type code.
     */
    protected function determineCategory(string $code, array $rec): string
    {
        if (isset($rec['Category']) && !empty($rec['Category'])) {
            return $rec['Category'];
        }

        return match (strtoupper($code)) {
            'ZCOM' => 'Domestic Composite',
            'NB' => 'Standard SAP',
            'NBS' => 'Special Item',
            'RV' => 'Outline Agreement',
            'ZICP' => 'Import Procurement',
            'ZIMT' => 'Import Materials',
            'ZISR' => 'Import Services',
            'ZMAT' => 'Domestic Materials',
            'ZSER' => 'Domestic Services',
            'FO' => 'Framework',
            'UB' => 'Stock Transport Order',
            default => str_starts_with($code, 'Z') ? 'Custom APL Type' : 'Standard SAP',
        };
    }

    /**
     * Generate descriptive help text for standard SAP codes.
     */
    protected function generateStandardDescription(string $code, string $name): string
    {
        return match (strtoupper($code)) {
            'ZCOM' => 'Standard Assam Petro-Chemicals composite requisition for plant materials and maintenance services.',
            'NB' => 'Standard Purchase Requisition conforming to baseline SAP S/4HANA Cloud schemas.',
            'NBS' => 'Purchase requisition requiring specialized supplier routing or consignment terms.',
            'RV' => 'Requisition linked to existing Corporate Blanket Contract or Long-Term Sourcing Agreement.',
            'ZICP' => 'International composite procurement requiring customs clearance, forex, and import duties.',
            'ZIMT' => 'Direct international raw chemical and synthesis catalyst material order.',
            'ZISR' => 'Overseas OEM technical consultant servicing, license renewals, and expert engineering.',
            'ZMAT' => 'Direct plant inventory materials, feedstocks, drums, and packaging.',
            'ZSER' => 'Local industrial overhaul, plant electrical instrumentation, and civil contractor jobs.',
            'FO' => 'Framework standing requisition for recurring operational materials or monthly utility consumption.',
            default => "SAP S/4HANA Cloud Document Type: {$name} ({$code})",
        };
    }

    /**
     * Save/upsert selected PR document types into MySQL apl_pr_db.
     *
     * @param array $items Array of document type items to persist
     * @param int|null $userId ID of user performing sync
     * @return array Summary of created and updated records
     */
    public function savePrDocumentTypes(array $items, ?int $userId = null): array
    {
        $created = 0;
        $updated = 0;

        foreach ($items as $item) {
            $code = trim($item['code'] ?? '');
            if (empty($code)) {
                continue;
            }

            $existing = PrDocumentType::where('code', $code)->first();

            $attributes = [
                'name' => trim($item['name'] ?? $code),
                'description' => $item['description'] ?? null,
                'category' => $item['category'] ?? 'Standard SAP',
                'is_active' => $item['is_active'] ?? true,
                'sap_source' => $item['sap_source'] ?? 'YY1_PURCHASEREQTYPE_CDS / I_PurchaseRequisitionType',
                'is_synced' => true,
                'synced_at' => now(),
                'raw_data' => $item['raw_data'] ?? null,
                'created_by' => $userId,
            ];

            if ($existing) {
                $existing->update($attributes);
                $updated++;
            } else {
                PrDocumentType::create(array_merge(['code' => $code], $attributes));
                $created++;
            }
        }

        return [
            'created' => $created,
            'updated' => $updated,
            'total' => $created + $updated,
        ];
    }

    /**
     * Fallback materials list matching SAP YY1_MATERIALS_CDS / I_Product schema.
     */
    protected array $fallbackMaterials = [];

    /**
     * Fetch Materials / Products from SAP S/4HANA Cloud CDS View:
     * YY1_PRODUCTPLANTVALUATION_CDS / YY1_ProductPlantValuation
     */
    public function fetchMaterialsFromCdsView(
        ?string $search = null,
        ?string $material = null,
        ?string $valuationArea = null,
        ?string $username = null,
        ?string $password = null,
        ?string $endpointUrl = null
    ): array {
        $endpoint = $endpointUrl ?: config(
            'sap.endpoints.materials',
            'https://my443544-api.s4hana.cloud.sap/sap/opu/odata/sap/YY1_PRODUCTPLANTVALUATION_CDS/YY1_ProductPlantValuation?$format=json'
        );

        $authUser = $username ?: config('sap.auth.username', env('SAP_ODATA_USER'));
        $authPass = $password ?: config('sap.auth.password', env('SAP_ODATA_PASSWORD'));

        if (!empty($authUser) && !empty($authPass)) {
            try {
                $startTime = microtime(true);

                $verifySsl = config('sap.verify_ssl', false);
                $request = Http::timeout(15)
                    ->withBasicAuth($authUser, $authPass)
                    ->withHeaders([
                        'Accept' => 'application/json',
                        'Content-Type' => 'application/json',
                    ]);

                if (!$verifySsl) {
                    $request = $request->withoutVerifying();
                }

                // Base endpoint without query params
                $baseUri = explode('?', $endpoint)[0];

                $response = null;
                $cleanedMaterial = $material ? trim($material) : null;
                $cleanedPlant = $valuationArea ? trim($valuationArea) : null;

                // 1. If material number and plant provided, query with Product and Plant filter
                if (!empty($cleanedMaterial)) {
                    if (!empty($cleanedPlant)) {
                        $filterQuery = "Product eq '{$cleanedMaterial}' and Plant eq '{$cleanedPlant}'";
                        $targetUrl = $baseUri . "?\$filter=" . urlencode($filterQuery) . "&\$format=json";
                        $resp = (clone $request)->get($targetUrl);
                        if ($resp->successful()) {
                            $parsedItems = $this->parseMaterialODataItems($resp->json());
                            if (!empty($parsedItems)) {
                                $response = $resp;
                            }
                        }
                    }

                    // 2. If no response yet, query by Product only
                    if (!$response) {
                        $filterQuery = "Product eq '{$cleanedMaterial}'";
                        $targetUrl = $baseUri . "?\$filter=" . urlencode($filterQuery) . "&\$format=json";
                        $resp = (clone $request)->get($targetUrl);
                        if ($resp->successful()) {
                            $response = $resp;
                        }
                    }
                }

                // If only plant was provided (filter by plant in CDS view)
                if (!$response && !empty($cleanedPlant) && empty($cleanedMaterial)) {
                    $filterQuery = "Plant eq '{$cleanedPlant}'";
                    $targetUrl = $baseUri . "?\$filter=" . urlencode($filterQuery) . "&\$format=json";
                    $resp = (clone $request)->get($targetUrl);
                    if ($resp->successful()) {
                        $response = $resp;
                    }
                }

                // If no targeted response, query default endpoint
                if (!$response) {
                    $response = $request->get($endpoint);
                }

                $durationMs = round((microtime(true) - $startTime) * 1000);

                if ($response->successful()) {
                    $json = $response->json();
                    $items = $this->parseMaterialODataItems($json);

                    // If a specific material is requested, filter items to target
                    if (!empty($cleanedMaterial)) {
                        $matched = array_values(array_filter($items, function ($it) use ($cleanedMaterial, $cleanedPlant) {
                            $prodMatch = strtolower($it['Product']) === strtolower($cleanedMaterial)
                                || strtolower($it['code']) === strtolower($cleanedMaterial);
                            if ($cleanedPlant && !empty($it['Plant'])) {
                                return $prodMatch && (strtolower($it['Plant']) === strtolower($cleanedPlant));
                            }
                            return $prodMatch;
                        }));

                        if (!empty($matched)) {
                            $items = $matched;
                        }
                    }

                    if (!empty($search)) {
                        $term = strtolower(trim($search));
                        $items = array_values(array_filter($items, function ($it) use ($term) {
                            return str_contains(strtolower($it['Product']), $term)
                                || str_contains(strtolower($it['ProductName']), $term)
                                || str_contains(strtolower($it['code']), $term)
                                || str_contains(strtolower($it['name']), $term)
                                || str_contains(strtolower($it['Plant']), $term);
                        }));
                    }

                    return [
                        'success' => true,
                        'is_live' => true,
                        'status' => $response->status(),
                        'latency_ms' => $durationMs,
                        'source' => 'SAP S/4HANA Cloud (Live CDS: YY1_PRODUCTPLANTVALUATION_CDS)',
                        'endpoint' => $endpoint,
                        'count' => count($items),
                        'items' => $items,
                        'message' => "Successfully fetched " . count($items) . " materials live from SAP CDS View in {$durationMs}ms.",
                    ];
                }

                $errorBody = $response->body();
                Log::warning('SAP Materials CDS View fetch non-200: ' . $response->status(), [
                    'body' => substr($errorBody, 0, 500),
                ]);

                return [
                    'success' => false,
                    'is_live' => false,
                    'status' => $response->status(),
                    'source' => 'SAP S/4HANA Cloud (Live Request Failed)',
                    'endpoint' => $endpoint,
                    'message' => "SAP S/4HANA Cloud responded with HTTP {$response->status()}: " .
                        ($response->status() === 401 ? 'Invalid or unauthorized Communication User credentials.' : 'Check CDS View service exposure.'),
                    'items' => [],
                    'error_details' => substr($errorBody, 0, 300),
                ];
            } catch (\Exception $e) {
                Log::error('Exception connecting to SAP Materials CDS View: ' . $e->getMessage());

                return [
                    'success' => false,
                    'is_live' => false,
                    'status' => 500,
                    'source' => 'SAP S/4HANA Cloud (Connection Error)',
                    'endpoint' => $endpoint,
                    'message' => "Network connection to SAP Cloud endpoint timed out or failed: " . $e->getMessage(),
                    'items' => [],
                ];
            }
        }

        return [
            'success' => false,
            'is_live' => false,
            'status' => 400,
            'source' => 'SAP S/4HANA Cloud CDS View (Credentials Not Configured)',
            'endpoint' => $endpoint,
            'count' => 0,
            'items' => [],
            'message' => 'SAP Communication User credentials not configured in .env.',
        ];
    }

    /**
     * Parse raw SAP OData V2 or V4 payload into standardized material items.
     */
    protected function parseMaterialODataItems(array $json): array
    {
        $rawRecords = [];
        if (isset($json['d']['results']) && is_array($json['d']['results'])) {
            $rawRecords = $json['d']['results'];
        } elseif (isset($json['d']) && is_array($json['d'])) {
            $rawRecords = $json['d'];
        } elseif (isset($json['value']) && is_array($json['value'])) {
            $rawRecords = $json['value'];
        } elseif (isset($json[0]) && is_array($json[0])) {
            $rawRecords = $json;
        }

        $parsed = [];
        foreach ($rawRecords as $rec) {
            $product = $rec['Product']
                ?? $rec['YY1_MATERIALS']
                ?? $rec['Material']
                ?? $rec['MaterialNumber']
                ?? $rec['code']
                ?? null;

            if (empty($product)) {
                continue;
            }

            $productName = '';
            foreach (['ProductName', 'ProductDescription', 'Description', 'name'] as $nameKey) {
                if (!empty($rec[$nameKey]) && trim((string)$rec[$nameKey]) !== '') {
                    $productName = trim((string)$rec[$nameKey]);
                    break;
                }
            }
            if ($productName === '') {
                $productName = (string)$product;
            }

            $baseUnit = '';
            foreach (['BaseUnit', 'UnitOfMeasure', 'BaseUnitOfMeasure', 'UoM', 'Unit', 'uom'] as $uomKey) {
                if (!empty($rec[$uomKey]) && trim((string)$rec[$uomKey]) !== '') {
                    $baseUnit = trim((string)$rec[$uomKey]);
                    break;
                }
            }
            if ($baseUnit === '') {
                $baseUnit = 'PC';
            }

            $productGroup = '';
            foreach (['ProductGroup', 'MaterialGroup', 'materialGroup'] as $groupKey) {
                if (!empty($rec[$groupKey]) && trim((string)$rec[$groupKey]) !== '') {
                    $productGroup = trim((string)$rec[$groupKey]);
                    break;
                }
            }
            if ($productGroup === '') {
                $productGroup = 'L001';
            }

            $productType = '';
            foreach (['ProductType', 'MaterialType', 'materialType'] as $typeKey) {
                if (!empty($rec[$typeKey]) && trim((string)$rec[$typeKey]) !== '') {
                    $productType = trim((string)$rec[$typeKey]);
                    break;
                }
            }
            if ($productType === '') {
                $productType = 'ROH';
            }

            $unitPrice = isset($rec['UnitPrice']) ? (float)$rec['UnitPrice'] : (isset($rec['Price']) ? (float)$rec['Price'] : 0.0);

            $poText = '';
            foreach (['poText', 'LongText', 'ProductDescription', 'ProductDescription_1', 'ProductName'] as $descKey) {
                if (!empty($rec[$descKey]) && trim((string)$rec[$descKey]) !== '') {
                    $poText = trim((string)$rec[$descKey]);
                    break;
                }
            }

            $productExternalId = trim((string)($rec['ProductExternalID'] ?? $product));
            $plant = trim((string)($rec['Plant'] ?? $rec['ValuationArea'] ?? '1200'));
            $division = trim((string)($rec['Division'] ?? ''));
            $weightUnit = trim((string)($rec['WeightUnit'] ?? ''));
            $uom = trim((string)($rec['UnitOfMeasure'] ?? $baseUnit));
            $productDesc = trim((string)($rec['ProductDescription'] ?? ''));
            $productDesc1 = trim((string)($rec['ProductDescription_1'] ?? ''));
            $productDesc2 = trim((string)($rec['ProductDescription_2'] ?? ''));
            $productDesc3 = trim((string)($rec['ProductDescription_3'] ?? ''));
            $movingAveragePrice = (string)($rec['MovingAveragePrice'] ?? '0.00');
            $standardPrice = (string)($rec['StandardPrice'] ?? '0.00');
            $invValProcedure = trim((string)($rec['InventoryValuationProcedure'] ?? ''));
            $currency = trim((string)($rec['Currency'] ?? 'INR'));
            if ($currency === '') {
                $currency = 'INR';
            }

            // Valuation Price calculation based on Price Control (InventoryValuationProcedure):
            // The valuation will be coming from passing the material number and plant.
            // On selecting these input, it will check:
            // if the Price Control = V then pick the MovingAveragePrice
            // if the Price Control = S then pick the StandardPrice
            $procUpper = strtoupper($invValProcedure);
            $mapVal = (float)$movingAveragePrice;
            $stdVal = (float)$standardPrice;
            $computedValuationPrice = 0.0;
            if ($procUpper === 'V') {
                $computedValuationPrice = $mapVal;
            } elseif ($procUpper === 'S') {
                $computedValuationPrice = $stdVal;
            } else {
                $computedValuationPrice = $mapVal > 0 ? $mapVal : ($stdVal > 0 ? $stdVal : $unitPrice);
            }

            $effectiveUnitPrice = $computedValuationPrice > 0 ? $computedValuationPrice : $unitPrice;

            $parsed[] = [
                'Product' => trim((string)$product),
                'Plant' => $plant,
                'plant' => $plant,
                'ValuationArea' => $plant,
                'ProductType' => trim((string)$productType),
                'WeightUnit' => $weightUnit,
                'BaseUnit' => $baseUnit,
                'UnitOfMeasure' => $baseUnit,
                'Division' => $division,
                'division' => $division,
                'ProductGroup' => trim((string)$productGroup),
                'ProductDescription' => $productDesc,
                'ProductDescription_1' => $productDesc1,
                'ProductDescription_2' => $productDesc2,
                'ProductDescription_3' => $productDesc3,
                'ProductName' => trim((string)$productName),
                'MovingAveragePrice' => $movingAveragePrice,
                'StandardPrice' => $standardPrice,
                'InventoryValuationProcedure' => $invValProcedure,
                'priceControl' => $invValProcedure,
                'Currency' => $currency,
                'currency' => $currency,
                'valuationPrice' => $computedValuationPrice,
                'UnitPrice' => $effectiveUnitPrice,
                'code' => trim((string)$product),
                'name' => trim((string)$productName),
                'uom' => $baseUnit,
                'materialGroup' => trim((string)$productGroup),
                'materialType' => trim((string)$productType),
                'unitPrice' => $effectiveUnitPrice,
                'poText' => $poText,
                'raw_data' => $rec,
            ];
        }

        return $parsed;
    }

    /**
     * Get formatted fallback materials.
     */
    public function getFormattedFallbackMaterials(): array
    {
        return [];
    }

    protected array $fallbackAccountAssignmentCategories = [];

    /**
     * Fetch Account Assignment Categories from SAP S/4HANA Cloud CDS View:
     * YY1_ACCOUNTASSIGNMENTCAT_CDS / YY1_AccountAssignmentCat
     */
    public function fetchAccountAssignmentCategoriesFromCdsView(
        ?string $search = null,
        ?string $username = null,
        ?string $password = null,
        ?string $endpointUrl = null
    ): array {
        $endpoint = $endpointUrl ?: config(
            'sap.endpoints.account_assignment_categories',
            'https://my443544-api.s4hana.cloud.sap/sap/opu/odata/sap/YY1_ACCOUNTASSIGNMENTCAT_CDS/YY1_AccountAssignmentCat?$format=json'
        );

        $authUser = $username ?: config('sap.auth.username', env('SAP_ODATA_USER'));
        $authPass = $password ?: config('sap.auth.password', env('SAP_ODATA_PASSWORD'));

        if (!empty($authUser) && !empty($authPass)) {
            try {
                $startTime = microtime(true);

                $verifySsl = config('sap.verify_ssl', false);
                $request = Http::timeout(15)
                    ->withBasicAuth($authUser, $authPass)
                    ->withHeaders([
                        'Accept' => 'application/json',
                        'Content-Type' => 'application/json',
                    ]);

                if (!$verifySsl) {
                    $request = $request->withoutVerifying();
                }

                $response = $request->get($endpoint);

                $durationMs = round((microtime(true) - $startTime) * 1000);

                if ($response->successful()) {
                    $json = $response->json();
                    $items = $this->parseAccountAssignmentCategoryODataItems($json);

                    if (!empty($search)) {
                        $term = strtolower(trim($search));
                        $items = array_values(array_filter($items, function ($it) use ($term) {
                            return str_contains(strtolower($it['code']), $term)
                                || str_contains(strtolower($it['name']), $term)
                                || str_contains(strtolower($it['extra'] ?? ''), $term);
                        }));
                    }

                    return [
                        'success' => true,
                        'is_live' => true,
                        'status' => $response->status(),
                        'latency_ms' => $durationMs,
                        'source' => 'SAP S/4HANA Cloud (Live CDS: YY1_ACCOUNTASSIGNMENTCAT_CDS)',
                        'endpoint' => $endpoint,
                        'count' => count($items),
                        'items' => $items,
                        'message' => "Successfully fetched " . count($items) . " account assignment categories live from SAP CDS View in {$durationMs}ms.",
                    ];
                }

                $errorBody = $response->body();
                Log::warning('SAP Account Assignment Category CDS View fetch non-200: ' . $response->status(), [
                    'body' => substr($errorBody, 0, 500),
                ]);

                return [
                    'success' => false,
                    'is_live' => false,
                    'status' => $response->status(),
                    'source' => 'SAP S/4HANA Cloud (Live Request Failed)',
                    'endpoint' => $endpoint,
                    'message' => "SAP S/4HANA Cloud responded with HTTP {$response->status()}: " .
                        ($response->status() === 401 ? 'Invalid or unauthorized Communication User credentials.' : 'Check CDS View service exposure.'),
                    'items' => [],
                    'error_details' => substr($errorBody, 0, 300),
                ];
            } catch (\Exception $e) {
                Log::error('Exception connecting to SAP Account Assignment Category CDS View: ' . $e->getMessage());

                return [
                    'success' => false,
                    'is_live' => false,
                    'status' => 500,
                    'source' => 'SAP S/4HANA Cloud (Connection Error)',
                    'endpoint' => $endpoint,
                    'message' => "Network connection to SAP Cloud endpoint timed out or failed: " . $e->getMessage(),
                    'items' => [],
                ];
            }
        }

        return [
            'success' => false,
            'is_live' => false,
            'status' => 400,
            'source' => 'SAP S/4HANA Cloud CDS View (Credentials Not Configured)',
            'endpoint' => $endpoint,
            'count' => 0,
            'items' => [],
            'message' => 'SAP Communication User credentials not configured in .env.',
        ];
    }

    /**
     * Parse raw SAP OData V2 or V4 payload into standardized account assignment category items.
     */
    protected function parseAccountAssignmentCategoryODataItems(array $json): array
    {
        $rawRecords = [];
        if (isset($json['d']['results']) && is_array($json['d']['results'])) {
            $rawRecords = $json['d']['results'];
        } elseif (isset($json['d']) && is_array($json['d'])) {
            $rawRecords = $json['d'];
        } elseif (isset($json['value']) && is_array($json['value'])) {
            $rawRecords = $json['value'];
        } elseif (isset($json[0]) && is_array($json[0])) {
            $rawRecords = $json;
        }

        $parsed = [
            [
                'code' => '',
                'name' => 'Blank - Standard Stock / Inventory',
                'extra' => 'Inventory / Stock Procurement (Standard - No controlling account assignment required)',
                'AccountAssignmentCategory' => '',
                'AcctAssignmentCategoryName' => 'Blank - Standard Stock / Inventory',
                'language' => 'EN',
                'raw_data' => ['code' => '', 'name' => 'Blank - Standard Stock / Inventory'],
            ]
        ];

        foreach ($rawRecords as $rec) {
            $code = $rec['AccountAssignmentCategory']
                ?? $rec['AccountAssignmentCategory_1']
                ?? $rec['YY1_AccountAssignmentCat']
                ?? $rec['code']
                ?? null;

            if ($code === null) {
                continue;
            }

            $code = trim((string)$code);
            if ($code === '') {
                continue;
            }

            $name = '';
            foreach (['AcctAssignmentCategoryName', 'AccountAssignmentCategoryName', 'Description', 'name'] as $nameKey) {
                if (!empty($rec[$nameKey]) && trim((string)$rec[$nameKey]) !== '') {
                    $name = trim((string)$rec[$nameKey]);
                    break;
                }
            }
            if ($name === '') {
                $name = "Category {$code}";
            }

            $extra = match (strtoupper($code)) {
                'K' => 'Posting to Cost Center (Standard Operating Expense)',
                'P' => 'Work Breakdown Structure (WBS Project Element)',
                'A' => 'Capitalized Fixed Asset',
                'F' => 'Internal / Production Order',
                'U' => 'Unassigned / Unknown Account Assignment',
                'C' => 'Sales Order Line Item',
                'N' => 'Network / Project System (Requires PS Network activity - not valid for standard items)',
                'Q' => 'Project Make-to-Order',
                'S' => 'Third-Party Procurement Project',
                'R' => 'Customer / Plant Service Order',
                'M' => 'Individual Customer without KD-CO',
                'J' => 'Transportation Management Cost Distribution',
                'H' => 'Non-Stock Sales Order',
                'Y' => 'Third Party without Serial Number',
                'W' => 'Third Party with Serial Number',
                'I' => 'Returns Process',
                'T' => 'Auxiliary Account Assignment',
                'X' => 'All Auxiliary Account Assignments',
                default => "SAP Account Assignment Category ({$code})",
            };

            $parsed[] = [
                'code' => $code,
                'name' => $name,
                'extra' => $extra,
                'AccountAssignmentCategory' => $code,
                'AcctAssignmentCategoryName' => $name,
                'language' => $rec['Language'] ?? 'EN',
                'raw_data' => $rec,
            ];
        }

        // Sort: Priority categories ('', 'K', 'P', 'A') first, then alphabetically by code
        $priorityOrder = ['', 'K', 'P', 'A', 'F', 'C'];
        usort($parsed, function ($a, $b) use ($priorityOrder) {
            $codeA = strtoupper($a['code']);
            $codeB = strtoupper($b['code']);
            $posA = array_search($codeA, $priorityOrder, true);
            $posB = array_search($codeB, $priorityOrder, true);

            if ($posA !== false && $posB !== false) {
                return $posA <=> $posB;
            }
            if ($posA !== false) {
                return -1;
            }
            if ($posB !== false) {
                return 1;
            }
            return strcmp($codeA, $codeB);
        });

        return $parsed;
    }

    /**
     * Get formatted fallback account assignment categories.
     */
    public function getFormattedFallbackAccountAssignmentCategories(): array
    {
        return [
            [
                'code' => '',
                'name' => 'Blank - Standard Stock / Inventory',
                'extra' => 'Inventory / Stock Procurement (Standard - No controlling account assignment required)',
            ],
            [
                'code' => 'K',
                'name' => 'Cost Center',
                'extra' => 'Posting to Cost Center (Standard Operating Expense)',
            ],
            [
                'code' => 'P',
                'name' => 'Project',
                'extra' => 'Work Breakdown Structure (WBS Project Element)',
            ],
            [
                'code' => 'A',
                'name' => 'Asset',
                'extra' => 'Capitalized Fixed Asset',
            ],
            [
                'code' => 'F',
                'name' => 'Order',
                'extra' => 'Internal / Production Order',
            ],
            [
                'code' => 'U',
                'name' => 'Unknown',
                'extra' => 'Unassigned Account Assignment',
            ],
        ];
    }

    /**
     * Fetch Plants from SAP S/4HANA Cloud Value Help Service:
     * ZUI_TMS_DESPATCH_04 / PlantVH
     */
    public function fetchPlantsFromSap(
        ?string $search = null,
        ?string $username = null,
        ?string $password = null,
        ?string $endpointUrl = null
    ): array {
        $endpoint = $endpointUrl ?: config(
            'sap.endpoints.plants',
            'https://my443544-api.s4hana.cloud.sap/sap/opu/odata/sap/ZUI_TMS_DESPATCH_04/PlantVH?format=json'
        );

        $authUser = $username ?: config('sap.auth.username', env('SAP_ODATA_USER'));
        $authPass = $password ?: config('sap.auth.password', env('SAP_ODATA_PASSWORD'));

        if (!empty($authUser) && !empty($authPass)) {
            try {
                $startTime = microtime(true);

                $verifySsl = config('sap.verify_ssl', false);
                $request = Http::timeout(15)
                    ->withBasicAuth($authUser, $authPass)
                    ->withHeaders([
                        'Accept' => 'application/json',
                        'Content-Type' => 'application/json',
                    ]);

                if (!$verifySsl) {
                    $request = $request->withoutVerifying();
                }

                $response = $request->get($endpoint);

                $durationMs = round((microtime(true) - $startTime) * 1000);

                if ($response->successful()) {
                    $json = $response->json();
                    $items = $this->parsePlantODataItems($json);

                    if (!empty($search)) {
                        $term = strtolower(trim($search));
                        $items = array_values(array_filter($items, function ($it) use ($term) {
                            return str_contains(strtolower($it['code']), $term)
                                || str_contains(strtolower($it['name']), $term)
                                || str_contains(strtolower($it['plantName'] ?? ''), $term);
                        }));
                    }

                    return [
                        'success' => true,
                        'is_live' => true,
                        'status' => $response->status(),
                        'latency_ms' => $durationMs,
                        'source' => 'SAP S/4HANA Cloud (Live Service: ZUI_TMS_DESPATCH_04 / PlantVH)',
                        'endpoint' => $endpoint,
                        'count' => count($items),
                        'items' => $items,
                        'message' => "Successfully fetched " . count($items) . " plants live from SAP in {$durationMs}ms.",
                    ];
                }

                $errorBody = $response->body();
                Log::warning('SAP PlantVH fetch non-200: ' . $response->status(), [
                    'body' => substr($errorBody, 0, 500),
                ]);

                return [
                    'success' => false,
                    'is_live' => false,
                    'status' => $response->status(),
                    'source' => 'SAP S/4HANA Cloud (Live Request Failed)',
                    'endpoint' => $endpoint,
                    'message' => "SAP S/4HANA Cloud responded with HTTP {$response->status()}",
                    'items' => $this->getFormattedFallbackPlants(),
                    'error_details' => substr($errorBody, 0, 300),
                ];
            } catch (\Exception $e) {
                Log::error('Exception connecting to SAP PlantVH: ' . $e->getMessage());

                return [
                    'success' => false,
                    'is_live' => false,
                    'status' => 500,
                    'source' => 'SAP S/4HANA Cloud (Connection Error)',
                    'endpoint' => $endpoint,
                    'message' => "Network connection to SAP Cloud endpoint timed out or failed: " . $e->getMessage(),
                    'items' => $this->getFormattedFallbackPlants(),
                ];
            }
        }

        return [
            'success' => true,
            'is_live' => false,
            'status' => 200,
            'source' => 'Local Fallback Master Data (PlantVH)',
            'endpoint' => $endpoint,
            'count' => 4,
            'items' => $this->getFormattedFallbackPlants(),
            'message' => 'Returning fallback plant data.',
        ];
    }

    /**
     * Parse raw SAP OData V2 or V4 payload into standardized plant items.
     */
    protected function parsePlantODataItems(array $json): array
    {
        $rawRecords = [];
        if (isset($json['d']['results']) && is_array($json['d']['results'])) {
            $rawRecords = $json['d']['results'];
        } elseif (isset($json['d']) && is_array($json['d'])) {
            $rawRecords = $json['d'];
        } elseif (isset($json['value']) && is_array($json['value'])) {
            $rawRecords = $json['value'];
        } elseif (isset($json[0]) && is_array($json[0])) {
            $rawRecords = $json;
        }

        $parsed = [];
        foreach ($rawRecords as $rec) {
            $code = $rec['Plant'] ?? $rec['code'] ?? null;
            if ($code === null || trim((string)$code) === '') {
                continue;
            }

            $code = trim((string)$code);
            $plantName = trim((string)($rec['PlantName'] ?? $rec['name'] ?? ''));
            if ($plantName === '') {
                $plantName = "Plant {$code}";
            }

            $parsed[] = [
                'code' => $code,
                'name' => "{$code} - {$plantName}",
                'plantName' => $plantName,
                'extra' => "Plant {$code} • {$plantName}",
                'Plant' => $code,
                'PlantName' => $plantName,
                'raw_data' => $rec,
            ];
        }

        return !empty($parsed) ? $parsed : $this->getFormattedFallbackPlants();
    }

    /**
     * Get fallback plants matching live SAP PlantVH service data.
     */
    public function getFormattedFallbackPlants(): array
    {
        return [
            [
                'code' => '1100',
                'name' => '1100 - Corporate Office',
                'plantName' => 'Corporate Office',
                'extra' => 'Plant 1100 • Corporate Office',
                'Plant' => '1100',
                'PlantName' => 'Corporate Office',
            ],
            [
                'code' => '1200',
                'name' => '1200 - Namrup',
                'plantName' => 'Namrup',
                'extra' => 'Plant 1200 • Namrup',
                'Plant' => '1200',
                'PlantName' => 'Namrup',
            ],
            [
                'code' => '1300',
                'name' => '1300 - Boitamari',
                'plantName' => 'Boitamari',
                'extra' => 'Plant 1300 • Boitamari',
                'Plant' => '1300',
                'PlantName' => 'Boitamari',
            ],
            [
                'code' => '1400',
                'name' => '1400 - Rani Nagar',
                'plantName' => 'Rani Nagar',
                'extra' => 'Plant 1400 • Rani Nagar',
                'Plant' => '1400',
                'PlantName' => 'Rani Nagar',
            ],
        ];
    }

    /**
     * Fetch Storage Locations from SAP S/4HANA Cloud Value Help Service:
     * ZUI_TMS_DESPATCH_04 / StorageLocationVH
     */
    public function fetchStorageLocationsFromSap(
        ?string $search = null,
        ?string $plant = null,
        ?string $username = null,
        ?string $password = null,
        ?string $endpointUrl = null
    ): array {
        $endpoint = $endpointUrl ?: config(
            'sap.endpoints.storage_locations',
            'https://my443544-api.s4hana.cloud.sap/sap/opu/odata/sap/ZUI_TMS_DESPATCH_04/StorageLocationVH?format=json'
        );

        $authUser = $username ?: config('sap.auth.username', env('SAP_ODATA_USER'));
        $authPass = $password ?: config('sap.auth.password', env('SAP_ODATA_PASSWORD'));

        if (!empty($authUser) && !empty($authPass)) {
            try {
                $startTime = microtime(true);

                $verifySsl = config('sap.verify_ssl', false);
                $request = Http::timeout(15)
                    ->withBasicAuth($authUser, $authPass)
                    ->withHeaders([
                        'Accept' => 'application/json',
                        'Content-Type' => 'application/json',
                    ]);

                if (!$verifySsl) {
                    $request = $request->withoutVerifying();
                }

                $baseUri = explode('?', $endpoint)[0];
                $targetUrl = $baseUri . '?$format=json';
                if (!empty($plant)) {
                    $targetUrl .= "&\$filter=" . urlencode("Plant eq '{$plant}'");
                }

                $response = $request->get($targetUrl);

                $durationMs = round((microtime(true) - $startTime) * 1000);

                if ($response->successful()) {
                    $json = $response->json();
                    $items = $this->parseStorageLocationODataItems($json);

                    if (!empty($search)) {
                        $term = strtolower(trim($search));
                        $items = array_values(array_filter($items, function ($it) use ($term) {
                            return str_contains(strtolower($it['code']), $term)
                                || str_contains(strtolower($it['name']), $term)
                                || str_contains(strtolower($it['StorageLocation'] ?? ''), $term)
                                || str_contains(strtolower($it['StorageLocationName'] ?? ''), $term)
                                || str_contains(strtolower($it['Plant'] ?? ''), $term);
                        }));
                    }

                    return [
                        'success' => true,
                        'is_live' => true,
                        'status' => $response->status(),
                        'latency_ms' => $durationMs,
                        'source' => 'SAP S/4HANA Cloud (Live Service: ZUI_TMS_DESPATCH_04 / StorageLocationVH)',
                        'endpoint' => $targetUrl,
                        'count' => count($items),
                        'items' => $items,
                        'message' => "Successfully fetched " . count($items) . " storage locations live from SAP in {$durationMs}ms.",
                    ];
                }

                $errorBody = $response->body();
                Log::warning('SAP StorageLocationVH fetch non-200: ' . $response->status(), [
                    'body' => substr($errorBody, 0, 500),
                ]);

                return [
                    'success' => false,
                    'is_live' => false,
                    'status' => $response->status(),
                    'source' => 'SAP S/4HANA Cloud (Live Request Failed)',
                    'endpoint' => $targetUrl,
                    'message' => "SAP S/4HANA Cloud responded with HTTP {$response->status()}",
                    'items' => $this->getFormattedFallbackStorageLocations($plant),
                    'error_details' => substr($errorBody, 0, 300),
                ];
            } catch (\Exception $e) {
                Log::error('Exception connecting to SAP StorageLocationVH: ' . $e->getMessage());

                return [
                    'success' => false,
                    'is_live' => false,
                    'status' => 500,
                    'source' => 'SAP S/4HANA Cloud (Connection Error)',
                    'endpoint' => $endpoint,
                    'message' => "Network connection to SAP Cloud endpoint timed out or failed: " . $e->getMessage(),
                    'items' => $this->getFormattedFallbackStorageLocations($plant),
                ];
            }
        }

        return [
            'success' => true,
            'is_live' => false,
            'status' => 200,
            'source' => 'Local Fallback Master Data (StorageLocationVH)',
            'endpoint' => $endpoint,
            'count' => count($this->getFormattedFallbackStorageLocations($plant)),
            'items' => $this->getFormattedFallbackStorageLocations($plant),
            'message' => 'Returning fallback storage location data.',
        ];
    }

    /**
     * Parse raw SAP OData V2 payload into standardized storage location items.
     */
    protected function parseStorageLocationODataItems(array $json): array
    {
        $rawRecords = [];
        if (isset($json['d']['results']) && is_array($json['d']['results'])) {
            $rawRecords = $json['d']['results'];
        } elseif (isset($json['d']) && is_array($json['d'])) {
            $rawRecords = $json['d'];
        } elseif (isset($json['value']) && is_array($json['value'])) {
            $rawRecords = $json['value'];
        } elseif (isset($json[0]) && is_array($json[0])) {
            $rawRecords = $json;
        }

        $parsed = [];
        foreach ($rawRecords as $rec) {
            $code = $rec['StorageLocation'] ?? $rec['code'] ?? null;
            if ($code === null || trim((string)$code) === '') {
                continue;
            }

            $code = trim((string)$code);
            $plant = trim((string)($rec['Plant'] ?? $rec['plant'] ?? ''));
            $name = trim((string)($rec['StorageLocationName'] ?? $rec['name'] ?? ''));
            if ($name === '') {
                $name = "Storage Location {$code}";
            }

            $extra = "Plant {$plant} • {$name}";

            $parsed[] = [
                'code' => $code,
                'name' => "{$code} - {$name}",
                'StorageLocation' => $code,
                'StorageLocationName' => $name,
                'Plant' => $plant,
                'extra' => $extra,
                'raw_data' => $rec,
            ];
        }

        return !empty($parsed) ? $parsed : $this->getFormattedFallbackStorageLocations();
    }

    /**
     * Get fallback storage locations matching live SAP StorageLocationVH service data.
     */
    public function getFormattedFallbackStorageLocations(?string $plant = null): array
    {
        $all = [
            ['code' => 'SL01', 'name' => 'SL01 - Store', 'StorageLocation' => 'SL01', 'StorageLocationName' => 'Store', 'Plant' => '1100', 'extra' => 'Plant 1100 • Store'],
            ['code' => 'F125', 'name' => 'F125 - 125 TPD Formalin', 'StorageLocation' => 'F125', 'StorageLocationName' => '125 TPD Formalin', 'Plant' => '1200', 'extra' => 'Plant 1200 • 125 TPD Formalin'],
            ['code' => 'M100', 'name' => 'M100 - 100 TPD Methanol', 'StorageLocation' => 'M100', 'StorageLocationName' => '100 TPD Methanol', 'Plant' => '1200', 'extra' => 'Plant 1200 • 100 TPD Methanol'],
            ['code' => 'M500', 'name' => 'M500 - 500 TPD Methanol', 'StorageLocation' => 'M500', 'StorageLocationName' => '500 TPD Methanol', 'Plant' => '1200', 'extra' => 'Plant 1200 • 500 TPD Methanol'],
            ['code' => 'ISST', 'name' => 'ISST - ISGEC Store', 'StorageLocation' => 'ISST', 'StorageLocationName' => 'ISGEC Store', 'Plant' => '1200', 'extra' => 'Plant 1200 • ISGEC Store'],
            ['code' => 'SLCH', 'name' => 'SLCH - Chemical', 'StorageLocation' => 'SLCH', 'StorageLocationName' => 'Chemical', 'Plant' => '1200', 'extra' => 'Plant 1200 • Chemical'],
            ['code' => 'SSM2', 'name' => 'SSM2 - Mech Sub-Stre M2', 'StorageLocation' => 'SSM2', 'StorageLocationName' => 'Mech Sub-Stre M2', 'Plant' => '1200', 'extra' => 'Plant 1200 • Mech Sub-Stre M2'],
            ['code' => 'SSM3', 'name' => 'SSM3 - Mech Sub-Stre M3', 'StorageLocation' => 'SSM3', 'StorageLocationName' => 'Mech Sub-Stre M3', 'Plant' => '1200', 'extra' => 'Plant 1200 • Mech Sub-Stre M3'],
            ['code' => 'F200', 'name' => 'F200 - 200 TPD Formalin', 'StorageLocation' => 'F200', 'StorageLocationName' => '200 TPD Formalin', 'Plant' => '1300', 'extra' => 'Plant 1300 • 200 TPD Formalin'],
            ['code' => 'SL01', 'name' => 'SL01 - Store', 'StorageLocation' => 'SL01', 'StorageLocationName' => 'Store', 'Plant' => '1300', 'extra' => 'Plant 1300 • Store'],
            ['code' => 'SL01', 'name' => 'SL01 - Store', 'StorageLocation' => 'SL01', 'StorageLocationName' => 'Store', 'Plant' => '1400', 'extra' => 'Plant 1400 • Store'],
        ];

        if (!empty($plant)) {
            $filtered = array_values(array_filter($all, fn($it) => $it['Plant'] === $plant));
            return !empty($filtered) ? $filtered : $all;
        }

        return $all;
    }

    /**
     * Default realistic fallback material groups representing SAP S/4HANA Cloud
     * YY1_MATERIALGROUP_CDS / YY1_MATERIALGROUP CDS view release data.
     */
    protected array $fallbackMaterialGroups = [
        ['code' => '100001', 'name' => 'Acids', 'extra' => 'SAP Material Group • Acids', 'MaterialGroup' => '100001', 'MaterialGroupName' => 'Acids', 'Language' => 'EN'],
        ['code' => '100002', 'name' => 'Alkalis', 'extra' => 'SAP Material Group • Alkalis', 'MaterialGroup' => '100002', 'MaterialGroupName' => 'Alkalis', 'Language' => 'EN'],
        ['code' => '100003', 'name' => 'Resin', 'extra' => 'SAP Material Group • Resin', 'MaterialGroup' => '100003', 'MaterialGroupName' => 'Resin', 'Language' => 'EN'],
        ['code' => '100004', 'name' => 'Salt', 'extra' => 'SAP Material Group • Salt', 'MaterialGroup' => '100004', 'MaterialGroupName' => 'Salt', 'Language' => 'EN'],
        ['code' => '100005', 'name' => 'Raw Materials', 'extra' => 'SAP Material Group • Raw Materials', 'MaterialGroup' => '100005', 'MaterialGroupName' => 'Raw Materials', 'Language' => 'EN'],
        ['code' => '100006', 'name' => 'Fan', 'extra' => 'SAP Material Group • Fan', 'MaterialGroup' => '100006', 'MaterialGroupName' => 'Fan', 'Language' => 'EN'],
        ['code' => '100007', 'name' => 'Centrifugal Blowers', 'extra' => 'SAP Material Group • Centrifugal Blowers', 'MaterialGroup' => '100007', 'MaterialGroupName' => 'Centrifugal Blowers', 'Language' => 'EN'],
        ['code' => '100008', 'name' => 'Rotary Blower', 'extra' => 'SAP Material Group • Rotary Blower', 'MaterialGroup' => '100008', 'MaterialGroupName' => 'Rotary Blower', 'Language' => 'EN'],
        ['code' => '110001', 'name' => 'Cs Pipes', 'extra' => 'SAP Material Group • Cs Pipes', 'MaterialGroup' => '110001', 'MaterialGroupName' => 'Cs Pipes', 'Language' => 'EN'],
        ['code' => '110002', 'name' => 'Cs Erw Pipes', 'extra' => 'SAP Material Group • Cs Erw Pipes', 'MaterialGroup' => '110002', 'MaterialGroupName' => 'Cs Erw Pipes', 'Language' => 'EN'],
        ['code' => 'L001', 'name' => 'Industrial Raw Chemicals', 'extra' => 'SAP Material Group • Chemicals', 'MaterialGroup' => 'L001', 'MaterialGroupName' => 'Industrial Raw Chemicals', 'Language' => 'EN'],
        ['code' => 'L002', 'name' => 'Plant Spares & Mechanical', 'extra' => 'SAP Material Group • Spares', 'MaterialGroup' => 'L002', 'MaterialGroupName' => 'Plant Spares & Mechanical', 'Language' => 'EN'],
        ['code' => 'SERV', 'name' => 'General Services & Overhaul', 'extra' => 'SAP Service Group • Services', 'MaterialGroup' => 'SERV', 'MaterialGroupName' => 'General Services & Overhaul', 'Language' => 'EN'],
    ];

    /**
     * Get fallback material groups matching live SAP YY1_MATERIALGROUP_CDS service data.
     */
    public function getFormattedFallbackMaterialGroups(): array
    {
        return $this->fallbackMaterialGroups;
    }

    /**
     * Fetch Material Groups from SAP S/4HANA Cloud CDS View:
     * YY1_MATERIALGROUP_CDS / YY1_MATERIALGROUP
     */
    public function fetchMaterialGroupsFromCdsView(
        ?string $search = null,
        ?string $username = null,
        ?string $password = null,
        ?string $endpointUrl = null
    ): array {
        $endpoint = $endpointUrl ?: config(
            'sap.endpoints.material_groups',
            'https://my443544-api.s4hana.cloud.sap/sap/opu/odata/sap/YY1_MATERIALGROUP_CDS/YY1_MATERIALGROUP?$format=json'
        );

        $authUser = $username ?: config('sap.auth.username', env('SAP_ODATA_USER'));
        $authPass = $password ?: config('sap.auth.password', env('SAP_ODATA_PASSWORD'));

        if (!empty($authUser) && !empty($authPass)) {
            try {
                $startTime = microtime(true);
                $verifySsl = config('sap.verify_ssl', false);
                $request = Http::timeout(15)
                    ->withBasicAuth($authUser, $authPass)
                    ->withHeaders([
                        'Accept' => 'application/json',
                        'Content-Type' => 'application/json',
                    ]);

                if (!$verifySsl) {
                    $request = $request->withoutVerifying();
                }

                $baseUri = explode('?', $endpoint)[0];
                // In SAP CDS view, filter by Language eq 'EN' to get English descriptions
                $filterQuery = "Language eq 'EN'";
                $targetUrl = $baseUri . "?\$filter=" . urlencode($filterQuery) . "&\$format=json";

                $response = $request->get($targetUrl);

                $durationMs = round((microtime(true) - $startTime) * 1000);

                if ($response->successful()) {
                    $json = $response->json();
                    $items = $this->parseMaterialGroupODataItems($json);

                    if (!empty($search)) {
                        $term = strtolower(trim($search));
                        $items = array_values(array_filter($items, function ($it) use ($term) {
                            return str_contains(strtolower($it['code']), $term)
                                || str_contains(strtolower($it['name']), $term)
                                || str_contains(strtolower($it['extra'] ?? ''), $term);
                        }));
                    }

                    return [
                        'success' => true,
                        'is_live' => true,
                        'status' => $response->status(),
                        'latency_ms' => $durationMs,
                        'source' => 'SAP S/4HANA Cloud (Live CDS: YY1_MATERIALGROUP_CDS)',
                        'endpoint' => $endpoint,
                        'count' => count($items),
                        'items' => $items,
                        'message' => "Successfully fetched " . count($items) . " material groups live from SAP CDS View in {$durationMs}ms.",
                    ];
                }

                $errorBody = $response->body();
                Log::warning('SAP Material Groups CDS View fetch non-200: ' . $response->status(), [
                    'body' => substr($errorBody, 0, 500),
                ]);

                return [
                    'success' => false,
                    'is_live' => false,
                    'status' => $response->status(),
                    'source' => 'SAP S/4HANA Cloud (Live Request Failed)',
                    'endpoint' => $endpoint,
                    'message' => "SAP S/4HANA Cloud responded with HTTP {$response->status()}: " .
                        ($response->status() === 401 ? 'Invalid or unauthorized Communication User credentials.' : 'Check CDS View service exposure.'),
                    'items' => $this->getFormattedFallbackMaterialGroups(),
                    'error_details' => substr($errorBody, 0, 300),
                ];
            } catch (\Exception $e) {
                Log::error('Exception connecting to SAP Material Groups CDS View: ' . $e->getMessage());

                return [
                    'success' => false,
                    'is_live' => false,
                    'status' => 500,
                    'source' => 'SAP S/4HANA Cloud (Connection Error)',
                    'endpoint' => $endpoint,
                    'message' => "Network connection to SAP Cloud endpoint timed out or failed: " . $e->getMessage(),
                    'items' => $this->getFormattedFallbackMaterialGroups(),
                ];
            }
        }

        return [
            'success' => true,
            'is_live' => false,
            'status' => 200,
            'source' => 'Local Fallback Master Data (Material Groups)',
            'endpoint' => $endpoint,
            'count' => count($this->fallbackMaterialGroups),
            'items' => $this->getFormattedFallbackMaterialGroups(),
            'message' => 'SAP Communication User credentials not configured in .env. Returning fallback material groups.',
        ];
    }

    /**
     * Parse raw SAP OData V2 or V4 payload into standardized material group items.
     */
    protected function parseMaterialGroupODataItems(array $json): array
    {
        $rawRecords = [];
        if (isset($json['d']['results']) && is_array($json['d']['results'])) {
            $rawRecords = $json['d']['results'];
        } elseif (isset($json['d']) && is_array($json['d'])) {
            $rawRecords = $json['d'];
        } elseif (isset($json['value']) && is_array($json['value'])) {
            $rawRecords = $json['value'];
        } elseif (isset($json[0]) && is_array($json[0])) {
            $rawRecords = $json;
        }

        $parsed = [];
        $seen = [];

        foreach ($rawRecords as $rec) {
            $code = $rec['MaterialGroup']
                ?? $rec['MaterialGroup_1']
                ?? $rec['ProductGroup']
                ?? $rec['code']
                ?? null;

            if (empty($code)) {
                continue;
            }

            $codeStr = trim((string)$code);
            if (isset($seen[$codeStr])) {
                continue;
            }
            $seen[$codeStr] = true;

            $name = '';
            foreach (['MaterialGroupName', 'MaterialGroupDesc', 'Description', 'ProductGroupName', 'name'] as $nameKey) {
                if (!empty($rec[$nameKey]) && trim((string)$rec[$nameKey]) !== '') {
                    $name = trim((string)$rec[$nameKey]);
                    break;
                }
            }
            if ($name === '') {
                $name = "Material Group {$codeStr}";
            }

            $parsed[] = [
                'code' => $codeStr,
                'name' => $name,
                'extra' => "SAP Material Group • {$name}",
                'MaterialGroup' => $codeStr,
                'MaterialGroupName' => $name,
                'Language' => $rec['Language'] ?? 'EN',
                'raw_data' => $rec,
            ];
        }

        return !empty($parsed) ? $parsed : $this->getFormattedFallbackMaterialGroups();
    }

    /**
     * Post/Sync Purchase Requisition to SAP S/4HANA Public Cloud via OData V4 API.
     *
     * @param PurchaseRequisition $purchaseRequisition
     * @param bool $doOnlyValidation
     * @return array
     */
    public function postPurchaseRequisition(PurchaseRequisition $purchaseRequisition, bool $doOnlyValidation = false): array
    {
        $username = config('sap.auth.username', env('SAP_ODATA_USER'));
        $password = config('sap.auth.password', env('SAP_ODATA_PASSWORD'));
        $endpoint = config(
            'sap.endpoints.purchase_requisition_process',
            env('SAP_S4HANA_URL', 'https://my443544-api.s4hana.cloud.sap') . '/sap/opu/odata4/sap/api_purchaserequisition_2/srvd_a2x/sap/purchaserequisition/0001/PurchaseReqn'
        );
        $serviceRoot = config(
            'sap.endpoints.service_root',
            env('SAP_S4HANA_URL', 'https://my443544-api.s4hana.cloud.sap') . '/sap/opu/odata4/sap/api_purchaserequisition_2/srvd_a2x/sap/purchaserequisition/0001/'
        );

        if (empty($username) || empty($password)) {
            return [
                'success' => false,
                'sap_pr_number' => null,
                'status' => 400,
                'message' => 'SAP Communication User credentials not configured in .env',
                'response' => [],
                'payload' => $purchaseRequisition->toSapODataV4Payload($doOnlyValidation),
            ];
        }

        $payload = $purchaseRequisition->toSapODataV4Payload($doOnlyValidation);

        try {
            $client = new Client([
                'verify' => config('sap.verify_ssl', false),
                'timeout' => 30,
                'http_errors' => false,
            ]);
            $cookieJar = new CookieJar();

            // 1. Fetch CSRF Token
            $tokenRes = $client->request('GET', $serviceRoot, [
                'auth' => [$username, $password],
                'headers' => [
                    'x-csrf-token' => 'Fetch',
                    'Accept' => 'application/json',
                ],
                'cookies' => $cookieJar,
            ]);

            $csrfToken = $tokenRes->getHeaderLine('x-csrf-token');
            if (empty($csrfToken)) {
                Log::error('SAP CSRF Token fetch failed: HTTP ' . $tokenRes->getStatusCode());
                return [
                    'success' => false,
                    'sap_pr_number' => null,
                    'status' => $tokenRes->getStatusCode(),
                    'message' => 'Failed to obtain CSRF token from SAP S/4HANA Cloud (HTTP ' . $tokenRes->getStatusCode() . ')',
                    'response' => [],
                    'payload' => $payload,
                ];
            }

            // 2. Post to PurchaseReqn
            $startTime = microtime(true);
            $postRes = $client->request('POST', $endpoint, [
                'auth' => [$username, $password],
                'headers' => [
                    'x-csrf-token' => $csrfToken,
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json',
                ],
                'cookies' => $cookieJar,
                'json' => $payload,
            ]);

            $durationMs = round((microtime(true) - $startTime) * 1000);
            $statusCode = $postRes->getStatusCode();
            $body = (string) $postRes->getBody();
            $resJson = json_decode($body, true) ?: [];

            if ($statusCode === 201 || $statusCode === 200) {
                $sapPrNum = $resJson['PurchaseRequisition']
                    ?? ($resJson['d']['PurchaseRequisition']
                    ?? ($resJson['_PurchaseRequisitionItem'][0]['PurchaseRequisition'] ?? null));

                return [
                    'success' => true,
                    'sap_pr_number' => $sapPrNum,
                    'status' => $statusCode,
                    'latency_ms' => $durationMs,
                    'message' => "Successfully posted to SAP S/4HANA Cloud. Assigned SAP PR #{$sapPrNum} in {$durationMs}ms.",
                    'response' => $resJson,
                    'payload' => $payload,
                ];
            }

            // Parse SAP error message
            $errorMessage = $resJson['error']['message'] ?? ("HTTP {$statusCode}: " . substr($body, 0, 300));
            if (!empty($resJson['error']['details']) && is_array($resJson['error']['details'])) {
                $detailMsgs = array_filter(array_column($resJson['error']['details'], 'message'));
                if (!empty($detailMsgs)) {
                    $errorMessage .= ' - ' . implode('; ', $detailMsgs);
                }
            } elseif (isset($resJson['error']['details'][0]['message'])) {
                $errorMessage .= ' - ' . $resJson['error']['details'][0]['message'];
            }

            Log::warning("SAP PR POST failed with HTTP {$statusCode}: {$errorMessage}", [
                'payload' => $payload,
                'response' => $body,
            ]);

            return [
                'success' => false,
                'sap_pr_number' => null,
                'status' => $statusCode,
                'latency_ms' => $durationMs,
                'message' => $errorMessage,
                'response' => $resJson,
                'payload' => $payload,
            ];
        } catch (\Exception $e) {
            Log::error('Exception posting PR to SAP: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return [
                'success' => false,
                'sap_pr_number' => null,
                'status' => 500,
                'message' => 'Connection error: ' . $e->getMessage(),
                'response' => [],
                'payload' => $payload,
            ];
        }
    }

    /**
     * Upload an attachment to SAP S/4HANA Cloud via Attachment Service API (API_CV_ATTACHMENT_SRV).
     *
     * @param Attachment $attachment
     * @param string $sapPrNumber
     * @param string|null $itemNumber
     * @return array
     */
    public function uploadAttachmentToSap(Attachment $attachment, string $sapPrNumber, ?string $itemNumber = null): array
    {
        $username = config('sap.auth.username', env('SAP_ODATA_USER'));
        $password = config('sap.auth.password', env('SAP_ODATA_PASSWORD'));
        $endpoint = config(
            'sap.endpoints.attachment_content',
            env('SAP_S4HANA_URL', 'https://my443544-api.s4hana.cloud.sap') . '/sap/opu/odata/sap/API_CV_ATTACHMENT_SRV/AttachmentContentSet'
        );
        $serviceRoot = config(
            'sap.endpoints.attachment_service_root',
            env('SAP_S4HANA_URL', 'https://my443544-api.s4hana.cloud.sap') . '/sap/opu/odata/sap/API_CV_ATTACHMENT_SRV/'
        );

        if (empty($username) || empty($password)) {
            $attachment->update([
                'sap_sync_status' => 'pending',
                'sap_sync_message' => 'SAP Communication User credentials not configured in .env',
            ]);

            return [
                'success' => false,
                'status' => 400,
                'message' => 'SAP Communication User credentials not configured in .env',
            ];
        }

        if (!Storage::disk('public')->exists($attachment->file_path)) {
            $attachment->update([
                'sap_sync_status' => 'failed',
                'sap_sync_message' => "Local file not found at storage path: {$attachment->file_path}",
            ]);

            return [
                'success' => false,
                'status' => 404,
                'message' => "File not found at {$attachment->file_path}",
            ];
        }

        try {
            $client = new Client([
                'verify' => config('sap.verify_ssl', false),
                'timeout' => 30,
                'http_errors' => false,
            ]);
            $cookieJar = new CookieJar();

            // 1. Fetch CSRF Token from Attachment Service Root
            $tokenRes = $client->request('GET', $serviceRoot, [
                'auth' => [$username, $password],
                'headers' => [
                    'x-csrf-token' => 'Fetch',
                    'Accept' => 'application/json',
                ],
                'cookies' => $cookieJar,
            ]);

            $csrfToken = $tokenRes->getHeaderLine('x-csrf-token');
            if (empty($csrfToken)) {
                $msg = 'Failed to obtain CSRF token from SAP Attachment Service (HTTP ' . $tokenRes->getStatusCode() . ')';
                $attachment->update([
                    'sap_sync_status' => 'failed',
                    'sap_sync_message' => $msg,
                ]);

                return [
                    'success' => false,
                    'status' => $tokenRes->getStatusCode(),
                    'message' => $msg,
                ];
            }

            // 2. Format SAP Object Key: 10-digit PR number (optionally + 5-digit item number)
            $formattedPrKey = str_pad($sapPrNumber, 10, '0', STR_PAD_LEFT);
            if (!empty($itemNumber)) {
                $formattedPrKey .= str_pad($itemNumber, 5, '0', STR_PAD_LEFT);
            }

            $fileContents = Storage::disk('public')->get($attachment->file_path);

            $postRes = $client->request('POST', $endpoint, [
                'auth' => [$username, $password],
                'headers' => [
                    'x-csrf-token' => $csrfToken,
                    'Slug' => $attachment->file_name,
                    'BusinessObjectTypeName' => 'EBAN',
                    'LinkedSAPObjectKey' => $formattedPrKey,
                    'HarmonizedDocType' => $attachment->attachment_doc_type ?: 'SL1',
                    'Content-Type' => $attachment->mime_type ?: 'application/octet-stream',
                    'Accept' => 'application/json',
                ],
                'cookies' => $cookieJar,
                'body' => $fileContents,
            ]);

            $statusCode = $postRes->getStatusCode();
            $body = (string) $postRes->getBody();
            $resJson = json_decode($body, true) ?: [];

            if ($statusCode === 201 || $statusCode === 200) {
                $sapDocId = $resJson['d']['DocumentId'] ?? ($resJson['DocumentId'] ?? ('SAP-ATT-' . uniqid()));
                $attachment->update([
                    'sap_document_number' => $sapDocId,
                    'sap_sync_status' => 'synced',
                    'sap_synced_at' => now(),
                    'sap_sync_message' => "Successfully uploaded to SAP Attachment Service (Document ID: {$sapDocId})",
                ]);

                return [
                    'success' => true,
                    'status' => $statusCode,
                    'sap_document_id' => $sapDocId,
                    'message' => "Attachment {$attachment->file_name} successfully uploaded to SAP S/4HANA Cloud.",
                ];
            }

            $errorMessage = $resJson['error']['message']['value'] ?? ($resJson['error']['message'] ?? "HTTP {$statusCode}: " . substr($body, 0, 300));
            $attachment->update([
                'sap_sync_status' => 'failed',
                'sap_sync_message' => $errorMessage,
            ]);

            return [
                'success' => false,
                'status' => $statusCode,
                'message' => $errorMessage,
            ];
        } catch (\Exception $e) {
            Log::error('Exception uploading attachment to SAP: ' . $e->getMessage());
            $attachment->update([
                'sap_sync_status' => 'failed',
                'sap_sync_message' => 'Upload error: ' . $e->getMessage(),
            ]);

            return [
                'success' => false,
                'status' => 500,
                'message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Post/Sync Contract Requisition Custom Business Object to SAP S/4HANA Public Cloud via OData V4 API.
     *
     * @param ContractRequisition $contractRequisition
     * @param string|null $sapPrNumber
     * @return array
     */
    public function postContractRequisition(ContractRequisition $contractRequisition, ?string $sapPrNumber = null): array
    {
        $username = config('sap.auth.username', env('SAP_ODATA_USER'));
        $password = config('sap.auth.password', env('SAP_ODATA_PASSWORD'));
        $endpoint = config(
            'sap.endpoints.contract_requisition',
            'https://my443544-api.s4hana.cloud.sap/sap/opu/odata4/sap/yy1_api_contractrequisition/srvd_a2x/sap/yy1_api_contractrequisition/0001/ContractRequisition'
        );
        $serviceRoot = config(
            'sap.endpoints.contract_requisition_service_root',
            'https://my443544-api.s4hana.cloud.sap/sap/opu/odata4/sap/yy1_api_contractrequisition/srvd_a2x/sap/yy1_api_contractrequisition/0001/'
        );

        if (empty($username) || empty($password)) {
            return [
                'success' => false,
                'status' => 400,
                'message' => 'SAP Communication User credentials not configured in .env',
                'response' => [],
                'payload' => $contractRequisition->toSapODataV4Payload($sapPrNumber),
            ];
        }

        $payload = $contractRequisition->toSapODataV4Payload($sapPrNumber);

        try {
            $client = new Client([
                'verify' => config('sap.verify_ssl', false),
                'timeout' => 30,
                'http_errors' => false,
            ]);
            $cookieJar = new CookieJar();

            // 1. Fetch CSRF Token
            $tokenRes = $client->request('GET', $serviceRoot, [
                'auth' => [$username, $password],
                'headers' => [
                    'x-csrf-token' => 'Fetch',
                    'Accept' => 'application/json',
                ],
                'cookies' => $cookieJar,
            ]);

            $csrfToken = $tokenRes->getHeaderLine('x-csrf-token');
            if (empty($csrfToken)) {
                Log::error('SAP Contract Requisition CSRF Token fetch failed: HTTP ' . $tokenRes->getStatusCode());
                return [
                    'success' => false,
                    'status' => $tokenRes->getStatusCode(),
                    'message' => 'Failed to obtain CSRF token for Contract Requisition from SAP S/4HANA Cloud (HTTP ' . $tokenRes->getStatusCode() . ')',
                    'response' => [],
                    'payload' => $payload,
                ];
            }

            // 2. Post to ContractRequisition
            $startTime = microtime(true);
            $postRes = $client->request('POST', $endpoint, [
                'auth' => [$username, $password],
                'headers' => [
                    'x-csrf-token' => $csrfToken,
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json',
                ],
                'cookies' => $cookieJar,
                'json' => $payload,
            ]);

            $durationMs = round((microtime(true) - $startTime) * 1000);
            $statusCode = $postRes->getStatusCode();
            $body = (string) $postRes->getBody();
            $resJson = json_decode($body, true) ?: [];

            if ($statusCode === 201 || $statusCode === 200) {
                return [
                    'success' => true,
                    'status' => $statusCode,
                    'latency_ms' => $durationMs,
                    'message' => "Successfully posted Contract Requisition {$contractRequisition->cr_no} to SAP S/4HANA Cloud in {$durationMs}ms.",
                    'response' => $resJson,
                    'payload' => $payload,
                ];
            }

            // Parse SAP error message
            $errorMessage = $resJson['error']['message'] ?? ("HTTP {$statusCode}: " . substr($body, 0, 300));
            if (!empty($resJson['error']['details']) && is_array($resJson['error']['details'])) {
                $detailMsgs = array_filter(array_column($resJson['error']['details'], 'message'));
                if (!empty($detailMsgs)) {
                    $errorMessage .= ' - ' . implode('; ', $detailMsgs);
                }
            }

            Log::warning("SAP Contract Requisition POST failed with HTTP {$statusCode}: {$errorMessage}", [
                'payload' => $payload,
                'response' => $body,
            ]);

            return [
                'success' => false,
                'status' => $statusCode,
                'latency_ms' => $durationMs,
                'message' => $errorMessage,
                'response' => $resJson,
                'payload' => $payload,
            ];
        } catch (\Exception $e) {
            Log::error('Exception posting Contract Requisition to SAP: ' . $e->getMessage());

            return [
                'success' => false,
                'status' => 500,
                'message' => 'Connection error: ' . $e->getMessage(),
                'response' => [],
                'payload' => $payload,
            ];
        }
    }

    /**
     * Fetch G/L Accounts from SAP S/4HANA Cloud CDS View
     * YY1_I_GLACCOUNTINCOMPANYCO_CDS / YY1_I_GLACCOUNTINCOMPANYCO
     */
    public function fetchGlAccountsFromCdsView(
        ?string $search = null,
        ?string $companyCode = null,
        ?string $username = null,
        ?string $password = null,
        ?string $endpointUrl = null
    ): array {
        $endpoint = $endpointUrl ?: config(
            'sap.endpoints.gl_accounts',
            'https://my443544-api.s4hana.cloud.sap/sap/opu/odata/sap/YY1_I_GLACCOUNTINCOMPANYCO_CDS/YY1_I_GLACCOUNTINCOMPANYCO?$format=json'
        );

        $authUser = $username ?: config('sap.auth.username', env('SAP_ODATA_USER'));
        $authPass = $password ?: config('sap.auth.password', env('SAP_ODATA_PASSWORD'));

        if (!empty($authUser) && !empty($authPass)) {
            try {
                $startTime = microtime(true);
                $verifySsl = config('sap.verify_ssl', false);

                $request = Http::timeout(15)
                    ->withBasicAuth($authUser, $authPass)
                    ->withHeaders([
                        'Accept' => 'application/json',
                        'Content-Type' => 'application/json',
                    ]);

                if (!$verifySsl) {
                    $request = $request->withoutVerifying();
                }

                $baseUri = explode('?', $endpoint)[0];
                $url = $baseUri . '?$format=json';

                $response = $request->get($url);
                $durationMs = round((microtime(true) - $startTime) * 1000);

                if ($response->successful()) {
                    $json = $response->json();
                    $items = $this->parseGlAccountODataItems($json);

                    // Filter by company code if requested
                    if (!empty($companyCode)) {
                        $comp = strtoupper(trim($companyCode));
                        $items = array_values(array_filter($items, function ($it) use ($comp) {
                            return empty($it['CompanyCode']) || strtoupper($it['CompanyCode']) === $comp;
                        }));
                    }

                    // Filter by search query if requested
                    if (!empty($search)) {
                        $term = strtolower(trim($search));
                        $items = array_values(array_filter($items, function ($it) use ($term) {
                            return str_contains(strtolower($it['code']), $term)
                                || str_contains(strtolower($it['name']), $term)
                                || str_contains(strtolower($it['CompanyCode'] ?? ''), $term)
                                || str_contains(strtolower($it['GLAccountLongName'] ?? ''), $term);
                        }));
                    }

                    return [
                        'success' => true,
                        'is_live' => true,
                        'status' => $response->status(),
                        'latency_ms' => $durationMs,
                        'source' => 'SAP S/4HANA Cloud (Live CDS: YY1_I_GLACCOUNTINCOMPANYCO_CDS)',
                        'endpoint' => $endpoint,
                        'count' => count($items),
                        'items' => $items,
                        'message' => "Successfully fetched " . count($items) . " G/L accounts live from SAP CDS View in {$durationMs}ms.",
                    ];
                }

                $errorBody = $response->body();
                Log::warning('SAP GL Account CDS View fetch non-200: ' . $response->status(), [
                    'body' => substr($errorBody, 0, 500),
                ]);

                return [
                    'success' => false,
                    'is_live' => false,
                    'status' => $response->status(),
                    'source' => 'SAP S/4HANA Cloud (Live Request Failed)',
                    'endpoint' => $endpoint,
                    'message' => "SAP S/4HANA Cloud responded with HTTP {$response->status()}: " .
                        ($response->status() === 401 ? 'Invalid or unauthorized Communication User credentials.' : 'Check CDS View service exposure.'),
                    'items' => $this->getFormattedFallbackGlAccounts($search, $companyCode),
                    'error_details' => substr($errorBody, 0, 300),
                ];
            } catch (\Exception $e) {
                Log::error('Exception connecting to SAP GL Account CDS View: ' . $e->getMessage());

                return [
                    'success' => false,
                    'is_live' => false,
                    'status' => 500,
                    'source' => 'SAP S/4HANA Cloud (Connection Error)',
                    'endpoint' => $endpoint,
                    'message' => "Network connection to SAP Cloud endpoint timed out or failed: " . $e->getMessage(),
                    'items' => $this->getFormattedFallbackGlAccounts($search, $companyCode),
                ];
            }
        }

        return [
            'success' => true,
            'is_live' => false,
            'status' => 200,
            'source' => 'Local Fallback Master Data (G/L Accounts)',
            'endpoint' => $endpoint,
            'count' => count($this->getFormattedFallbackGlAccounts($search, $companyCode)),
            'items' => $this->getFormattedFallbackGlAccounts($search, $companyCode),
            'message' => 'SAP Communication User credentials not configured in .env. Returning fallback G/L accounts.',
        ];
    }

    /**
     * Parse raw SAP OData V2 or V4 payload into standardized G/L Account items.
     * Uses GLAccount, CompanyCode, and GLAccountName from YY1_I_GLACCOUNTINCOMPANYCO_CDS.
     */
    public function parseGlAccountODataItems(array $json): array
    {
        $rawRecords = [];
        if (isset($json['d']['results']) && is_array($json['d']['results'])) {
            $rawRecords = $json['d']['results'];
        } elseif (isset($json['d']) && is_array($json['d'])) {
            $rawRecords = $json['d'];
        } elseif (isset($json['value']) && is_array($json['value'])) {
            $rawRecords = $json['value'];
        } elseif (isset($json[0]) && is_array($json[0])) {
            $rawRecords = $json;
        }

        $parsed = [];
        $seen = [];

        foreach ($rawRecords as $rec) {
            $glAccount = trim((string)($rec['GLAccount'] ?? $rec['gl_account'] ?? $rec['code'] ?? ''));
            $companyCode = trim((string)($rec['CompanyCode'] ?? $rec['company_code'] ?? ''));
            $glAccountName = trim((string)($rec['GLAccountName'] ?? $rec['gl_account_name'] ?? $rec['name'] ?? ''));
            $glAccountLongName = trim((string)($rec['GLAccountLongName'] ?? $rec['gl_account_long_name'] ?? ''));
            $language = trim((string)($rec['Language'] ?? 'EN'));

            if (empty($glAccount)) {
                continue;
            }

            $key = "{$companyCode}-{$glAccount}";
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;

            $parsed[] = [
                'code' => $glAccount,
                'name' => $glAccountName ?: $glAccount,
                'extra' => trim("Company: {$companyCode}" . ($glAccountLongName ? " • {$glAccountLongName}" : "")),
                'GLAccount' => $glAccount,
                'CompanyCode' => $companyCode,
                'GLAccountName' => $glAccountName ?: $glAccount,
                'GLAccountLongName' => $glAccountLongName ?: $glAccountName,
                'Language' => $language,
            ];
        }

        return $parsed;
    }

    /**
     * Fallback G/L accounts formatted for search help and master data.
     */
    public function getFormattedFallbackGlAccounts(?string $search = null, ?string $companyCode = null): array
    {
        $fallbacks = [
            [
                'code' => '12545200',
                'name' => 'Adj. Sold Recv. ARF',
                'extra' => 'Company: 1000 • Adjustment of Sold Receivables (ARF Funder)',
                'GLAccount' => '12545200',
                'CompanyCode' => '1000',
                'GLAccountName' => 'Adj. Sold Recv. ARF',
                'GLAccountLongName' => 'Adjustment of Sold Receivables (ARF Funder)',
                'Language' => 'EN',
            ],
            [
                'code' => '65301000',
                'name' => 'Consumed Materials',
                'extra' => 'Company: 1000 • Consumed Materials & Components',
                'GLAccount' => '65301000',
                'CompanyCode' => '1000',
                'GLAccountName' => 'Consumed Materials',
                'GLAccountLongName' => 'Consumed Materials & Components',
                'Language' => 'EN',
            ],
            [
                'code' => '410100001',
                'name' => 'Raw Material Consumption',
                'extra' => 'Company: 1000 • Raw Material Consumption Expense',
                'GLAccount' => '410100001',
                'CompanyCode' => '1000',
                'GLAccountName' => 'Raw Material Consumption',
                'GLAccountLongName' => 'Raw Material Consumption Expense',
                'Language' => 'EN',
            ],
            [
                'code' => '410100006',
                'name' => 'Operating Supplies Expense',
                'extra' => 'Company: 1000 • Operating Supplies & Maintenance',
                'GLAccount' => '410100006',
                'CompanyCode' => '1000',
                'GLAccountName' => 'Operating Supplies Expense',
                'GLAccountLongName' => 'Operating Supplies & Maintenance',
                'Language' => 'EN',
            ],
        ];

        if (!empty($companyCode)) {
            $comp = strtoupper(trim($companyCode));
            $fallbacks = array_values(array_filter($fallbacks, fn($it) => strtoupper($it['CompanyCode']) === $comp));
        }

        if (!empty($search)) {
            $term = strtolower(trim($search));
            $fallbacks = array_values(array_filter($fallbacks, fn($it) =>
                str_contains(strtolower($it['code']), $term) ||
                str_contains(strtolower($it['name']), $term) ||
                str_contains(strtolower($it['CompanyCode']), $term) ||
                str_contains(strtolower($it['GLAccountLongName']), $term)
            ));
        }

        return $fallbacks;
    }

    /**
     * Fetch Cost Centers from SAP S/4HANA Cloud CDS View
     * YY1_COSTCENTER_CDS / YY1_COSTCENTER
     */
    public function fetchCostCentersFromCdsView(
        ?string $search = null,
        ?string $companyCode = null,
        ?string $controllingArea = null,
        ?string $username = null,
        ?string $password = null,
        ?string $endpointUrl = null
    ): array {
        $endpoint = $endpointUrl ?: config(
            'sap.endpoints.cost_centers',
            'https://my443544-api.s4hana.cloud.sap/sap/opu/odata/sap/YY1_COSTCENTER_CDS/YY1_COSTCENTER?$format=json'
        );

        $authUser = $username ?: config('sap.auth.username', env('SAP_ODATA_USER'));
        $authPass = $password ?: config('sap.auth.password', env('SAP_ODATA_PASSWORD'));

        if (!empty($authUser) && !empty($authPass)) {
            try {
                $startTime = microtime(true);
                $verifySsl = config('sap.verify_ssl', false);

                $request = Http::timeout(15)
                    ->withBasicAuth($authUser, $authPass)
                    ->withHeaders([
                        'Accept' => 'application/json',
                        'Content-Type' => 'application/json',
                    ]);

                if (!$verifySsl) {
                    $request = $request->withoutVerifying();
                }

                $baseUri = explode('?', $endpoint)[0];
                $url = $baseUri . '?$format=json';

                $response = $request->get($url);
                $durationMs = round((microtime(true) - $startTime) * 1000);

                if ($response->successful()) {
                    $json = $response->json();
                    $items = $this->parseCostCenterODataItems($json);

                    // Filter by company code if requested
                    if (!empty($companyCode)) {
                        $comp = strtoupper(trim($companyCode));
                        $items = array_values(array_filter($items, function ($it) use ($comp) {
                            return empty($it['CompanyCode']) || strtoupper($it['CompanyCode']) === $comp;
                        }));
                    }

                    // Filter by controlling area if requested
                    if (!empty($controllingArea)) {
                        $ctrl = strtoupper(trim($controllingArea));
                        $items = array_values(array_filter($items, function ($it) use ($ctrl) {
                            return empty($it['ControllingArea']) || strtoupper($it['ControllingArea']) === $ctrl;
                        }));
                    }

                    // Filter by search query if requested
                    if (!empty($search)) {
                        $term = strtolower(trim($search));
                        $items = array_values(array_filter($items, function ($it) use ($term) {
                            return str_contains(strtolower($it['code']), $term)
                                || str_contains(strtolower($it['CostCenter'] ?? ''), $term)
                                || str_contains(strtolower($it['ProfitCenter'] ?? ''), $term)
                                || str_contains(strtolower($it['CompanyCode'] ?? ''), $term)
                                || str_contains(strtolower($it['ControllingArea'] ?? ''), $term)
                                || str_contains(strtolower($it['extra'] ?? ''), $term);
                        }));
                    }

                    return [
                        'success' => true,
                        'is_live' => true,
                        'status' => $response->status(),
                        'latency_ms' => $durationMs,
                        'source' => 'SAP S/4HANA Cloud (Live CDS: YY1_COSTCENTER_CDS)',
                        'endpoint' => $endpoint,
                        'count' => count($items),
                        'items' => $items,
                        'message' => "Successfully fetched " . count($items) . " cost centers live from SAP CDS View in {$durationMs}ms.",
                    ];
                }

                $errorBody = $response->body();
                Log::warning('SAP Cost Center CDS View fetch non-200: ' . $response->status(), [
                    'body' => substr($errorBody, 0, 500),
                ]);

                return [
                    'success' => false,
                    'is_live' => false,
                    'status' => $response->status(),
                    'source' => 'SAP S/4HANA Cloud (Live Request Failed)',
                    'endpoint' => $endpoint,
                    'message' => "SAP S/4HANA Cloud responded with HTTP {$response->status()}: " .
                        ($response->status() === 401 ? 'Invalid or unauthorized Communication User credentials.' : 'Check CDS View service exposure.'),
                    'items' => $this->getFormattedFallbackCostCenters($search, $companyCode),
                    'error_details' => substr($errorBody, 0, 300),
                ];
            } catch (\Exception $e) {
                Log::error('Exception connecting to SAP Cost Center CDS View: ' . $e->getMessage());

                return [
                    'success' => false,
                    'is_live' => false,
                    'status' => 500,
                    'source' => 'SAP S/4HANA Cloud (Connection Error)',
                    'endpoint' => $endpoint,
                    'message' => "Network connection to SAP Cloud endpoint timed out or failed: " . $e->getMessage(),
                    'items' => $this->getFormattedFallbackCostCenters($search, $companyCode),
                ];
            }
        }

        return [
            'success' => true,
            'is_live' => false,
            'status' => 200,
            'source' => 'Local Fallback Master Data (Cost Centers)',
            'endpoint' => $endpoint,
            'count' => count($this->getFormattedFallbackCostCenters($search, $companyCode)),
            'items' => $this->getFormattedFallbackCostCenters($search, $companyCode),
            'message' => 'SAP Communication User credentials not configured in .env. Returning fallback cost centers.',
        ];
    }

    /**
     * Parse raw SAP OData V2 or V4 payload into standardized Cost Center items.
     * Uses CostCenter, ControllingArea, CompanyCode, ProfitCenter, and Plant from YY1_COSTCENTER_CDS.
     */
    public function parseCostCenterODataItems(array $json): array
    {
        $rawRecords = [];
        if (isset($json['d']['results']) && is_array($json['d']['results'])) {
            $rawRecords = $json['d']['results'];
        } elseif (isset($json['d']) && is_array($json['d'])) {
            $rawRecords = $json['d'];
        } elseif (isset($json['value']) && is_array($json['value'])) {
            $rawRecords = $json['value'];
        } elseif (isset($json[0]) && is_array($json[0])) {
            $rawRecords = $json;
        }

        $parsed = [];
        $seen = [];

        foreach ($rawRecords as $rec) {
            $costCenter = trim((string)($rec['CostCenter'] ?? $rec['cost_center'] ?? $rec['code'] ?? ''));
            $companyCode = trim((string)($rec['CompanyCode'] ?? $rec['company_code'] ?? ''));
            $controllingArea = trim((string)($rec['ControllingArea'] ?? $rec['controlling_area'] ?? ''));
            $profitCenter = trim((string)($rec['ProfitCenter'] ?? $rec['profit_center'] ?? ''));
            $plant = trim((string)($rec['Plant'] ?? $rec['plant'] ?? ''));

            if (empty($costCenter)) {
                continue;
            }

            // Deduplicate by CostCenter + ControllingArea + CompanyCode
            $key = "{$controllingArea}-{$companyCode}-{$costCenter}";
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;

            $extraParts = [];
            if (!empty($controllingArea)) {
                $extraParts[] = "Area: {$controllingArea}";
            }
            if (!empty($companyCode)) {
                $extraParts[] = "Company: {$companyCode}";
            }
            if (!empty($profitCenter)) {
                $extraParts[] = "Profit Center: {$profitCenter}";
            }
            if (!empty($plant)) {
                $extraParts[] = "Plant: {$plant}";
            }

            $parsed[] = [
                'code' => $costCenter,
                'name' => $costCenter,
                'extra' => implode(' • ', $extraParts),
                'CostCenter' => $costCenter,
                'ControllingArea' => $controllingArea,
                'CompanyCode' => $companyCode,
                'ProfitCenter' => $profitCenter,
                'Plant' => $plant,
                'ValidityEndDate' => $rec['ValidityEndDate'] ?? null,
                'raw_data' => $rec,
            ];
        }

        return $parsed;
    }

    /**
     * Fallback Cost Centers matching SAP YY1_COSTCENTER_CDS schema.
     */
    public function getFormattedFallbackCostCenters(?string $search = null, ?string $companyCode = null): array
    {
        $fallbacks = [
            [
                'code' => '10101PCC01',
                'name' => '10101PCC01',
                'extra' => 'Area: A000 • Company: 1000 • Profit Center: 1010PC0010',
                'CostCenter' => '10101PCC01',
                'ControllingArea' => 'A000',
                'CompanyCode' => '1000',
                'ProfitCenter' => '1010PC0010',
                'Plant' => '',
            ],
            [
                'code' => '10102PCC02',
                'name' => '10102PCC02',
                'extra' => 'Area: A000 • Company: 1000 • Profit Center: 1010PC0010',
                'CostCenter' => '10102PCC02',
                'ControllingArea' => 'A000',
                'CompanyCode' => '1000',
                'ProfitCenter' => '1010PC0010',
                'Plant' => '',
            ],
            [
                'code' => '10102PCC03',
                'name' => '10102PCC03',
                'extra' => 'Area: A000 • Company: 1000 • Profit Center: 1010PC0010',
                'CostCenter' => '10102PCC03',
                'ControllingArea' => 'A000',
                'CompanyCode' => '1000',
                'ProfitCenter' => '1010PC0010',
                'Plant' => '',
            ],
            [
                'code' => '10702ACC02',
                'name' => '10702ACC02',
                'extra' => 'Area: A000 • Company: 1000 • Profit Center: 1070PC0010',
                'CostCenter' => '10702ACC02',
                'ControllingArea' => 'A000',
                'CompanyCode' => '1000',
                'ProfitCenter' => '1070PC0010',
                'Plant' => '',
            ],
            [
                'code' => '10705ACC05',
                'name' => '10705ACC05',
                'extra' => 'Area: A000 • Company: 1000 • Profit Center: 1070PC0010',
                'CostCenter' => '10705ACC05',
                'ControllingArea' => 'A000',
                'CompanyCode' => '1000',
                'ProfitCenter' => '1070PC0010',
                'Plant' => '',
            ],
            [
                'code' => '12001101',
                'name' => '12001101',
                'extra' => 'Area: A000 • Company: 1000 • Profit Center: 1200PC0001',
                'CostCenter' => '12001101',
                'ControllingArea' => 'A000',
                'CompanyCode' => '1000',
                'ProfitCenter' => '1200PC0001',
                'Plant' => '1200',
            ],
        ];

        if (!empty($companyCode)) {
            $comp = strtoupper(trim($companyCode));
            $fallbacks = array_values(array_filter($fallbacks, fn($it) => strtoupper($it['CompanyCode']) === $comp));
        }

        if (!empty($search)) {
            $term = strtolower(trim($search));
            $fallbacks = array_values(array_filter($fallbacks, fn($it) =>
                str_contains(strtolower($it['code']), $term) ||
                str_contains(strtolower($it['CostCenter']), $term) ||
                str_contains(strtolower($it['CompanyCode']), $term) ||
                str_contains(strtolower($it['ControllingArea']), $term) ||
                str_contains(strtolower($it['ProfitCenter']), $term)
            ));
        }

        return $fallbacks;
    }

    /**
     * Fetch Suppliers / Vendors from SAP S/4HANA Cloud CDS View
     * YY1_SUPPLIER_CDS / YY1_Supplier
     */
    public function fetchSuppliersFromCdsView(
        ?string $search = null,
        ?string $username = null,
        ?string $password = null,
        ?string $endpointUrl = null
    ): array {
        $endpoint = $endpointUrl ?: config(
            'sap.endpoints.suppliers',
            'https://my443544-api.s4hana.cloud.sap/sap/opu/odata/sap/YY1_SUPPLIER_CDS/YY1_Supplier?$format=json'
        );

        $authUser = $username ?: config('sap.auth.username', env('SAP_ODATA_USER'));
        $authPass = $password ?: config('sap.auth.password', env('SAP_ODATA_PASSWORD'));

        if (!empty($authUser) && !empty($authPass)) {
            try {
                $startTime = microtime(true);
                $verifySsl = config('sap.verify_ssl', false);

                $request = Http::timeout(15)
                    ->withBasicAuth($authUser, $authPass)
                    ->withHeaders([
                        'Accept' => 'application/json',
                        'Content-Type' => 'application/json',
                    ]);

                if (!$verifySsl) {
                    $request = $request->withoutVerifying();
                }

                $baseUri = explode('?', $endpoint)[0];
                $url = $baseUri . '?$format=json';

                $response = $request->get($url);
                $durationMs = round((microtime(true) - $startTime) * 1000);

                if ($response->successful()) {
                    $json = $response->json();
                    $items = $this->parseSupplierODataItems($json);

                    // Filter by search query if requested
                    if (!empty($search)) {
                        $term = strtolower(trim($search));
                        $items = array_values(array_filter($items, function ($it) use ($term) {
                            return str_contains(strtolower($it['Supplier'] ?? ''), $term)
                                || str_contains(strtolower($it['SupplierName'] ?? ''), $term)
                                || str_contains(strtolower($it['SupplierFullName'] ?? ''), $term)
                                || str_contains(strtolower($it['code'] ?? ''), $term)
                                || str_contains(strtolower($it['name'] ?? ''), $term);
                        }));
                    }

                    return [
                        'success' => true,
                        'is_live' => true,
                        'status' => $response->status(),
                        'latency_ms' => $durationMs,
                        'source' => 'SAP S/4HANA Cloud (Live CDS: YY1_SUPPLIER_CDS)',
                        'endpoint' => $endpoint,
                        'count' => count($items),
                        'items' => $items,
                        'message' => "Successfully fetched " . count($items) . " suppliers live from SAP CDS View in {$durationMs}ms.",
                    ];
                }

                $errorBody = $response->body();
                Log::warning('SAP Supplier CDS View fetch non-200: ' . $response->status(), [
                    'body' => substr($errorBody, 0, 500),
                ]);

                return [
                    'success' => false,
                    'is_live' => false,
                    'status' => $response->status(),
                    'source' => 'SAP S/4HANA Cloud (Live Request Failed)',
                    'endpoint' => $endpoint,
                    'message' => "SAP S/4HANA Cloud responded with HTTP {$response->status()}: " .
                        ($response->status() === 401 ? 'Invalid or unauthorized Communication User credentials.' : 'Check CDS View service exposure.'),
                    'items' => $this->getFormattedFallbackSuppliers($search),
                    'error_details' => substr($errorBody, 0, 300),
                ];
            } catch (\Exception $e) {
                Log::error('Exception connecting to SAP Supplier CDS View: ' . $e->getMessage());

                return [
                    'success' => false,
                    'is_live' => false,
                    'status' => 500,
                    'source' => 'SAP S/4HANA Cloud (Connection Error)',
                    'endpoint' => $endpoint,
                    'message' => "Network connection to SAP Cloud endpoint timed out or failed: " . $e->getMessage(),
                    'items' => $this->getFormattedFallbackSuppliers($search),
                ];
            }
        }

        return [
            'success' => true,
            'is_live' => false,
            'status' => 200,
            'source' => 'Local Fallback Master Data (Suppliers)',
            'endpoint' => $endpoint,
            'count' => count($this->getFormattedFallbackSuppliers($search)),
            'items' => $this->getFormattedFallbackSuppliers($search),
            'message' => 'SAP Communication User credentials not configured in .env. Returning fallback suppliers.',
        ];
    }

    /**
     * Parse raw SAP OData V2 or V4 payload into standardized Supplier items.
     * Uses Supplier, SupplierName, SupplierFullName, and BPSupplierName from YY1_SUPPLIER_CDS.
     */
    public function parseSupplierODataItems(array $json): array
    {
        $rawRecords = [];
        if (isset($json['d']['results']) && is_array($json['d']['results'])) {
            $rawRecords = $json['d']['results'];
        } elseif (isset($json['d']) && is_array($json['d'])) {
            $rawRecords = $json['d'];
        } elseif (isset($json['value']) && is_array($json['value'])) {
            $rawRecords = $json['value'];
        } elseif (isset($json[0]) && is_array($json[0])) {
            $rawRecords = $json;
        }

        $parsed = [];
        $seen = [];

        foreach ($rawRecords as $rec) {
            $supplier = trim((string)($rec['Supplier'] ?? $rec['supplier'] ?? $rec['code'] ?? ''));
            $supplierName = trim((string)($rec['SupplierName'] ?? $rec['supplier_name'] ?? $rec['BPSupplierName'] ?? $rec['name'] ?? ''));
            $supplierFullName = trim((string)($rec['SupplierFullName'] ?? $rec['supplier_full_name'] ?? ''));
            $bpSupplierName = trim((string)($rec['BPSupplierName'] ?? ''));

            if (empty($supplier)) {
                continue;
            }

            if (isset($seen[$supplier])) {
                continue;
            }
            $seen[$supplier] = true;

            $parsed[] = [
                'code' => $supplier,
                'name' => $supplierName ?: $supplier,
                'extra' => $supplierFullName ?: "Supplier {$supplier}",
                'Supplier' => $supplier,
                'SupplierName' => $supplierName ?: $supplier,
                'SupplierFullName' => $supplierFullName,
                'BPSupplierName' => $bpSupplierName,
                'supplierName' => $supplierName ?: $supplier,
                'raw_data' => $rec,
            ];
        }

        return $parsed;
    }

    /**
     * Fallback Suppliers matching SAP YY1_SUPPLIER_CDS schema.
     */
    public function getFormattedFallbackSuppliers(?string $search = null): array
    {
        $fallbacks = [
            [
                'code' => 'V-10029',
                'name' => 'Tata Chemicals Ltd',
                'extra' => 'Vendor 10029 • Industrial & Inorganic Chemicals • Active',
                'Supplier' => 'V-10029',
                'SupplierName' => 'Tata Chemicals Ltd',
                'SupplierFullName' => 'Tata Chemicals Ltd - Industrial & Inorganic Chemicals',
                'BPSupplierName' => 'Tata Chemicals Ltd',
                'supplierName' => 'Tata Chemicals Ltd',
            ],
            [
                'code' => 'V-10034',
                'name' => 'Gujarat Fluorochemicals Ltd',
                'extra' => 'Vendor 10034 • Specialty Fluoropolymers & Reagents • Active',
                'Supplier' => 'V-10034',
                'SupplierName' => 'Gujarat Fluorochemicals Ltd',
                'SupplierFullName' => 'Gujarat Fluorochemicals Ltd - Specialty Fluoropolymers & Reagents',
                'BPSupplierName' => 'Gujarat Fluorochemicals Ltd',
                'supplierName' => 'Gujarat Fluorochemicals Ltd',
            ],
            [
                'code' => 'V-10045',
                'name' => 'Reliance Industries Ltd',
                'extra' => 'Vendor 10045 • Petrochemicals & Polymers • Active',
                'Supplier' => 'V-10045',
                'SupplierName' => 'Reliance Industries Ltd',
                'SupplierFullName' => 'Reliance Industries Ltd - Petrochemicals & Polymers',
                'BPSupplierName' => 'Reliance Industries Ltd',
                'supplierName' => 'Reliance Industries Ltd',
            ],
            [
                'code' => 'V-10052',
                'name' => 'BASF India Limited',
                'extra' => 'Vendor 10052 • Catalysts, Dispersions & Resins • Active',
                'Supplier' => 'V-10052',
                'SupplierName' => 'BASF India Limited',
                'SupplierFullName' => 'BASF India Limited - Catalysts, Dispersions & Resins',
                'BPSupplierName' => 'BASF India Limited',
                'supplierName' => 'BASF India Limited',
            ],
            [
                'code' => 'V-10061',
                'name' => 'Linde India Limited',
                'extra' => 'Vendor 10061 • Cryogenic & Industrial Gases • Active',
                'Supplier' => 'V-10061',
                'SupplierName' => 'Linde India Limited',
                'SupplierFullName' => 'Linde India Limited - Cryogenic & Industrial Gases',
                'BPSupplierName' => 'Linde India Limited',
                'supplierName' => 'Linde India Limited',
            ],
            [
                'code' => 'V-10080',
                'name' => 'Siemens Energy India Ltd',
                'extra' => 'Vendor 10080 • Turbines, Drives & High-Voltage Spares • Active',
                'Supplier' => 'V-10080',
                'SupplierName' => 'Siemens Energy India Ltd',
                'SupplierFullName' => 'Siemens Energy India Ltd - Turbines, Drives & High-Voltage Spares',
                'BPSupplierName' => 'Siemens Energy India Ltd',
                'supplierName' => 'Siemens Energy India Ltd',
            ],
            [
                'code' => 'V-10095',
                'name' => 'Thermax Limited',
                'extra' => 'Vendor 10095 • Boilers, Heat Exchangers & Water Solutions • Active',
                'Supplier' => 'V-10095',
                'SupplierName' => 'Thermax Limited',
                'SupplierFullName' => 'Thermax Limited - Boilers, Heat Exchangers & Water Solutions',
                'BPSupplierName' => 'Thermax Limited',
                'supplierName' => 'Thermax Limited',
            ],
            [
                'code' => 'V-10110',
                'name' => 'Bharat Heavy Electricals Ltd (BHEL)',
                'extra' => 'Vendor 10110 • Heavy Engineering & Pressure Vessels • Active',
                'Supplier' => 'V-10110',
                'SupplierName' => 'Bharat Heavy Electricals Ltd (BHEL)',
                'SupplierFullName' => 'Bharat Heavy Electricals Ltd (BHEL) - Heavy Engineering & Pressure Vessels',
                'BPSupplierName' => 'Bharat Heavy Electricals Ltd (BHEL)',
                'supplierName' => 'Bharat Heavy Electricals Ltd (BHEL)',
            ],
            [
                'code' => 'V-10125',
                'name' => 'Indian Oil Corporation Ltd (IOCL)',
                'extra' => 'Vendor 10125 • Fuel & Specialty Base Oils • Active',
                'Supplier' => 'V-10125',
                'SupplierName' => 'Indian Oil Corporation Ltd (IOCL)',
                'SupplierFullName' => 'Indian Oil Corporation Ltd (IOCL) - Fuel & Specialty Base Oils',
                'BPSupplierName' => 'Indian Oil Corporation Ltd (IOCL)',
                'supplierName' => 'Indian Oil Corporation Ltd (IOCL)',
            ],
        ];

        if (!empty($search)) {
            $term = strtolower(trim($search));
            $fallbacks = array_values(array_filter($fallbacks, fn($it) =>
                str_contains(strtolower($it['code']), $term) ||
                str_contains(strtolower($it['name']), $term) ||
                str_contains(strtolower($it['Supplier']), $term) ||
                str_contains(strtolower($it['SupplierName']), $term) ||
                str_contains(strtolower($it['extra']), $term)
            ));
        }

        return $fallbacks;
    }

    /**
     * Fetch Purchasing Organizations from SAP S/4HANA Cloud CDS View
     * YY1_PURCHASEORGANIZATION_CDS / YY1_PURCHASEORGANIZATION
     */
    public function fetchPurchasingOrganizationsFromCdsView(
        ?string $username = null,
        ?string $password = null,
        ?string $endpointUrl = null
    ): array {
        $endpoint = $endpointUrl ?: config(
            'sap.endpoints.purchasing_organizations',
            'https://my443544-api.s4hana.cloud.sap/sap/opu/odata/sap/YY1_PURCHASEORGANIZATION_CDS/YY1_PURCHASEORGANIZATION?$format=json'
        );

        $authUser = $username ?: config('sap.auth.username', env('SAP_ODATA_USER'));
        $authPass = $password ?: config('sap.auth.password', env('SAP_ODATA_PASSWORD'));

        if (!empty($authUser) && !empty($authPass)) {
            try {
                $startTime = microtime(true);
                $verifySsl = config('sap.verify_ssl', false);

                $request = Http::timeout(15)
                    ->withBasicAuth($authUser, $authPass)
                    ->withHeaders([
                        'Accept' => 'application/json',
                        'Content-Type' => 'application/json',
                    ]);

                if (!$verifySsl) {
                    $request = $request->withoutVerifying();
                }

                $baseUri = explode('?', $endpoint)[0];
                $url = $baseUri . '?$format=json';

                $response = $request->get($url);
                $durationMs = round((microtime(true) - $startTime) * 1000);

                if ($response->successful()) {
                    $json = $response->json();
                    $items = $this->parsePurchasingOrganizationODataItems($json);

                    return [
                        'success' => true,
                        'is_live' => true,
                        'status' => $response->status(),
                        'latency_ms' => $durationMs,
                        'source' => 'SAP S/4HANA Cloud (Live CDS: YY1_PURCHASEORGANIZATION_CDS)',
                        'endpoint' => $endpoint,
                        'count' => count($items),
                        'items' => $items,
                        'message' => "Successfully fetched " . count($items) . " purchasing organizations live from SAP CDS View in {$durationMs}ms.",
                    ];
                }

                $errorBody = $response->body();
                Log::warning('SAP Purchasing Org CDS View fetch non-200: ' . $response->status(), [
                    'body' => substr($errorBody, 0, 500),
                ]);

                return [
                    'success' => false,
                    'is_live' => false,
                    'status' => $response->status(),
                    'source' => 'SAP S/4HANA Cloud (Live Request Failed)',
                    'endpoint' => $endpoint,
                    'message' => "SAP S/4HANA Cloud responded with HTTP {$response->status()}: " .
                        ($response->status() === 401 ? 'Invalid or unauthorized Communication User credentials.' : 'Check CDS View service exposure.'),
                    'items' => $this->getFormattedFallbackPurchasingOrganizations(),
                    'error_details' => substr($errorBody, 0, 300),
                ];
            } catch (\Exception $e) {
                Log::error('Exception connecting to SAP Purchasing Org CDS View: ' . $e->getMessage());

                return [
                    'success' => false,
                    'is_live' => false,
                    'status' => 500,
                    'source' => 'SAP S/4HANA Cloud (Connection Error)',
                    'endpoint' => $endpoint,
                    'message' => "Network connection to SAP Cloud endpoint timed out or failed: " . $e->getMessage(),
                    'items' => $this->getFormattedFallbackPurchasingOrganizations(),
                ];
            }
        }

        return [
            'success' => true,
            'is_live' => false,
            'status' => 200,
            'source' => 'Local Fallback Master Data (Purchasing Organizations)',
            'endpoint' => $endpoint,
            'count' => count($this->getFormattedFallbackPurchasingOrganizations()),
            'items' => $this->getFormattedFallbackPurchasingOrganizations(),
            'message' => 'SAP Communication User credentials not configured in .env. Returning fallback purchasing organizations.',
        ];
    }

    /**
     * Parse raw SAP OData V2 or V4 payload into standardized Purchasing Organization items.
     * Aggregates by PurchasingOrganization and collects associated Plants.
     */
    public function parsePurchasingOrganizationODataItems(array $json): array
    {
        $rawRecords = [];
        if (isset($json['d']['results']) && is_array($json['d']['results'])) {
            $rawRecords = $json['d']['results'];
        } elseif (isset($json['d']) && is_array($json['d'])) {
            $rawRecords = $json['d'];
        } elseif (isset($json['value']) && is_array($json['value'])) {
            $rawRecords = $json['value'];
        } elseif (isset($json[0]) && is_array($json[0])) {
            $rawRecords = $json;
        }

        $grouped = [];

        foreach ($rawRecords as $rec) {
            $code = trim((string)($rec['PurchasingOrganization'] ?? $rec['purchasing_organization'] ?? $rec['code'] ?? ''));
            if (empty($code)) {
                continue;
            }

            $name = trim((string)($rec['PurchasingOrganizationName'] ?? $rec['purchasing_organization_name'] ?? $rec['name'] ?? $code));
            $plant = trim((string)($rec['Plant'] ?? $rec['plant'] ?? ''));

            if (!isset($grouped[$code])) {
                $grouped[$code] = [
                    'code' => $code,
                    'name' => $name,
                    'PurchasingOrganization' => $code,
                    'PurchasingOrganizationName' => $name,
                    'plants' => [],
                    'raw_data' => $rec,
                ];
            }

            if (!empty($plant) && !in_array($plant, $grouped[$code]['plants'])) {
                $grouped[$code]['plants'][] = $plant;
            }
        }

        $parsed = [];
        foreach ($grouped as $code => $data) {
            sort($data['plants']);
            $plantsStr = implode(', ', $data['plants']);
            $parsed[] = [
                'code' => $code,
                'name' => $data['name'],
                'PurchasingOrganization' => $code,
                'PurchasingOrganizationName' => $data['name'],
                'company_code' => '1000',
                'plants' => $data['plants'],
                'extra' => $plantsStr ? "Mapped Plants: {$plantsStr}" : 'Company Code: 1000',
                'description' => "SAP S/4HANA Purchasing Organization {$code} ({$data['name']})" . ($plantsStr ? " for Plant(s) {$plantsStr}" : ""),
                'sap_source' => 'YY1_PURCHASEORGANIZATION_CDS / YY1_PURCHASEORGANIZATION',
                'raw_data' => $data['raw_data'],
            ];
        }

        return $parsed;
    }

    /**
     * Save/upsert selected Purchasing Organizations into MySQL database (apl_pr_db).
     *
     * @param array $items Array of purchasing org items to persist
     * @param int|null $userId ID of user performing sync
     * @return array Summary of created and updated records
     */
    public function savePurchasingOrganizations(array $items, ?int $userId = null): array
    {
        $created = 0;
        $updated = 0;

        foreach ($items as $item) {
            $code = trim($item['code'] ?? $item['PurchasingOrganization'] ?? '');
            if (empty($code)) {
                continue;
            }

            $existing = PurchasingOrganization::where('code', $code)->first();

            $plants = [];
            if (!empty($item['plants'])) {
                $plants = is_array($item['plants']) ? $item['plants'] : explode(',', (string)$item['plants']);
                $plants = array_values(array_filter(array_map('trim', $plants)));
            } elseif (!empty($item['Plant'])) {
                $plants = [trim((string)$item['Plant'])];
            }

            $attributes = [
                'name' => trim($item['name'] ?? $item['PurchasingOrganizationName'] ?? $code),
                'company_code' => trim($item['company_code'] ?? '1000'),
                'plants' => $plants,
                'description' => $item['description'] ?? null,
                'is_active' => $item['is_active'] ?? true,
                'sap_source' => $item['sap_source'] ?? 'YY1_PURCHASEORGANIZATION_CDS / YY1_PURCHASEORGANIZATION',
                'is_synced' => true,
                'synced_at' => now(),
                'raw_data' => $item['raw_data'] ?? null,
                'created_by' => $userId,
            ];

            if ($existing) {
                // If plants already exist, merge new plants
                if (!empty($attributes['plants'])) {
                    $mergedPlants = array_values(array_unique(array_merge($existing->plants ?? [], $attributes['plants'])));
                    $attributes['plants'] = $mergedPlants;
                }
                $existing->update($attributes);
                $updated++;
            } else {
                PurchasingOrganization::create(array_merge(['code' => $code], $attributes));
                $created++;
            }
        }

        return [
            'created' => $created,
            'updated' => $updated,
            'total' => $created + $updated,
        ];
    }

    /**
     * Fallback Purchasing Organizations matching SAP YY1_PURCHASEORGANIZATION_CDS schema.
     */
    public function getFormattedFallbackPurchasingOrganizations(): array
    {
        return [
            [
                'code' => '1100',
                'name' => 'Central Purchase Org',
                'PurchasingOrganization' => '1100',
                'PurchasingOrganizationName' => 'Central Purchase Org',
                'company_code' => '1000',
                'plants' => ['1100', '1200', '1300', '1400'],
                'extra' => 'Mapped Plants: 1100, 1200, 1300, 1400',
                'description' => 'SAP S/4HANA Purchasing Organization 1100 (Central Purchase Org) for Plant(s) 1100, 1200, 1300, 1400',
                'sap_source' => 'YY1_PURCHASEORGANIZATION_CDS / YY1_PURCHASEORGANIZATION',
                'is_active' => true,
            ],
            [
                'code' => '1200',
                'name' => 'Local Purchase Org',
                'PurchasingOrganization' => '1200',
                'PurchasingOrganizationName' => 'Local Purchase Org',
                'company_code' => '1000',
                'plants' => ['1100', '1200', '1300', '1400'],
                'extra' => 'Mapped Plants: 1100, 1200, 1300, 1400',
                'description' => 'SAP S/4HANA Purchasing Organization 1200 (Local Purchase Org) for Plant(s) 1100, 1200, 1300, 1400',
                'sap_source' => 'YY1_PURCHASEORGANIZATION_CDS / YY1_PURCHASEORGANIZATION',
                'is_active' => true,
            ],
            [
                'code' => '9000',
                'name' => 'STO',
                'PurchasingOrganization' => '9000',
                'PurchasingOrganizationName' => 'STO',
                'company_code' => '1000',
                'plants' => ['1100', '1200', '1300', '1400'],
                'extra' => 'Mapped Plants: 1100, 1200, 1300, 1400',
                'description' => 'SAP S/4HANA Purchasing Organization 9000 (STO) for Plant(s) 1100, 1200, 1300, 1400',
                'sap_source' => 'YY1_PURCHASEORGANIZATION_CDS / YY1_PURCHASEORGANIZATION',
                'is_active' => true,
            ],
        ];
    }

    /**
     * Fetch Purchasing Groups from SAP S/4HANA Cloud CDS View:
     * YY1_PURCHASINGGROUPAPI_CDS / YY1_PurchasingGroupAPI
     */
    public function fetchPurchasingGroupsFromCdsView(
        ?string $username = null,
        ?string $password = null,
        ?string $endpointUrl = null
    ): array {
        $endpoint = $endpointUrl ?: config(
            'sap.endpoints.purchasing_groups',
            'https://my443544-api.s4hana.cloud.sap/sap/opu/odata/sap/YY1_PURCHASINGGROUPAPI_CDS/YY1_PurchasingGroupAPI?$format=json'
        );

        $authUser = $username ?: config('sap.auth.username', env('SAP_ODATA_USER'));
        $authPass = $password ?: config('sap.auth.password', env('SAP_ODATA_PASSWORD'));

        if (!empty($authUser) && !empty($authPass)) {
            try {
                $startTime = microtime(true);
                $verifySsl = config('sap.verify_ssl', false);

                $request = Http::timeout(15)
                    ->withBasicAuth($authUser, $authPass)
                    ->withHeaders([
                        'Accept' => 'application/json',
                        'Content-Type' => 'application/json',
                    ]);

                if (!$verifySsl) {
                    $request = $request->withoutVerifying();
                }

                $baseUri = explode('?', $endpoint)[0];
                $url = $baseUri . '?$format=json';

                $response = $request->get($url);
                $durationMs = round((microtime(true) - $startTime) * 1000);

                if ($response->successful()) {
                    $json = $response->json();
                    $items = $this->parsePurchasingGroupODataItems($json);

                    return [
                        'success' => true,
                        'is_live' => true,
                        'status' => $response->status(),
                        'latency_ms' => $durationMs,
                        'source' => 'SAP S/4HANA Cloud (Live CDS: YY1_PURCHASINGGROUPAPI_CDS)',
                        'endpoint' => $endpoint,
                        'count' => count($items),
                        'items' => $items,
                        'message' => "Successfully fetched " . count($items) . " purchasing groups live from SAP CDS View in {$durationMs}ms.",
                    ];
                }

                $errorBody = $response->body();
                Log::warning('SAP Purchasing Group CDS View fetch non-200: ' . $response->status(), [
                    'body' => substr($errorBody, 0, 500),
                ]);

                return [
                    'success' => false,
                    'is_live' => false,
                    'status' => $response->status(),
                    'source' => 'SAP S/4HANA Cloud (Live Request Failed)',
                    'endpoint' => $endpoint,
                    'message' => "SAP S/4HANA Cloud responded with HTTP {$response->status()}: " .
                        ($response->status() === 401 ? 'Invalid or unauthorized Communication User credentials.' : 'Check CDS View service exposure.'),
                    'items' => $this->getFormattedFallbackPurchasingGroups(),
                    'error_details' => substr($errorBody, 0, 300),
                ];
            } catch (\Exception $e) {
                Log::error('Exception connecting to SAP Purchasing Group CDS View: ' . $e->getMessage());

                return [
                    'success' => false,
                    'is_live' => false,
                    'status' => 500,
                    'source' => 'SAP S/4HANA Cloud (Connection Error)',
                    'endpoint' => $endpoint,
                    'message' => "Network connection to SAP Cloud endpoint timed out or failed: " . $e->getMessage(),
                    'items' => $this->getFormattedFallbackPurchasingGroups(),
                ];
            }
        }

        return [
            'success' => true,
            'is_live' => false,
            'status' => 200,
            'source' => 'Local Fallback Master Data (Purchasing Groups)',
            'endpoint' => $endpoint,
            'count' => count($this->getFormattedFallbackPurchasingGroups()),
            'items' => $this->getFormattedFallbackPurchasingGroups(),
            'message' => 'SAP Communication User credentials not configured in .env. Returning fallback purchasing groups.',
        ];
    }

    /**
     * Parse raw SAP OData V2 or V4 payload into standardized Purchasing Group items.
     */
    public function parsePurchasingGroupODataItems(array $json): array
    {
        $rawRecords = [];
        if (isset($json['d']['results']) && is_array($json['d']['results'])) {
            $rawRecords = $json['d']['results'];
        } elseif (isset($json['d']) && is_array($json['d'])) {
            $rawRecords = $json['d'];
        } elseif (isset($json['value']) && is_array($json['value'])) {
            $rawRecords = $json['value'];
        } elseif (isset($json[0]) && is_array($json[0])) {
            $rawRecords = $json;
        }

        $parsed = [];

        foreach ($rawRecords as $rec) {
            $code = trim((string)($rec['PurchasingGroup'] ?? $rec['purchasing_group'] ?? $rec['code'] ?? ''));
            if (empty($code)) {
                continue;
            }

            $name = trim((string)($rec['PurchasingGroupName'] ?? $rec['purchasing_group_name'] ?? $rec['name'] ?? $rec['Description'] ?? $code));
            $description = trim((string)($rec['description'] ?? $rec['Description'] ?? $name));

            $parsed[] = [
                'code' => $code,
                'name' => $name,
                'description' => $description ?: $name,
                'PurchasingGroup' => $code,
                'PurchasingGroupName' => $name,
                'extra' => $description ?: $name,
                'is_active' => true,
                'sap_source' => 'YY1_PURCHASINGGROUPAPI_CDS / YY1_PurchasingGroupAPI',
                'raw_data' => $rec,
            ];
        }

        usort($parsed, fn($a, $b) => strcmp($a['code'], $b['code']));

        return $parsed;
    }

    /**
     * Save/upsert selected Purchasing Groups into MySQL database (apl_pr_db).
     *
     * @param array $items Array of purchasing group items to persist
     * @param int|null $userId ID of user performing sync
     * @return array Summary of created and updated records
     */
    public function savePurchasingGroups(array $items, ?int $userId = null): array
    {
        $created = 0;
        $updated = 0;

        foreach ($items as $item) {
            $code = trim($item['code'] ?? $item['PurchasingGroup'] ?? '');
            if (empty($code)) {
                continue;
            }

            $existing = PurchasingGroup::where('code', $code)->first();

            $name = trim($item['name'] ?? $item['PurchasingGroupName'] ?? $code);
            $description = trim($item['description'] ?? $name);

            $attributes = [
                'name' => $name,
                'description' => $description ?: $name,
                'email' => $item['email'] ?? ($existing ? $existing->email : null),
                'phone_number' => $item['phone_number'] ?? ($existing ? $existing->phone_number : null),
                'is_active' => isset($item['is_active']) ? (bool)$item['is_active'] : true,
                'sap_source' => $item['sap_source'] ?? 'YY1_PURCHASINGGROUPAPI_CDS / YY1_PurchasingGroupAPI',
                'is_synced' => true,
                'synced_at' => now(),
                'raw_data' => $item['raw_data'] ?? null,
                'created_by' => $userId ?: ($existing ? $existing->created_by : null),
            ];

            if ($existing) {
                $existing->update($attributes);
                $updated++;
            } else {
                PurchasingGroup::create(array_merge(['code' => $code], $attributes));
                $created++;
            }
        }

        return [
            'created' => $created,
            'updated' => $updated,
            'total' => $created + $updated,
        ];
    }

    /**
     * Fallback Purchasing Groups matching SAP YY1_PURCHASINGGROUPAPI_CDS schema.
     */
    public function getFormattedFallbackPurchasingGroups(): array
    {
        return [
            ['code' => '001', 'name' => 'Group 001', 'PurchasingGroup' => '001', 'PurchasingGroupName' => 'Group 001', 'description' => 'Group 001', 'extra' => 'Group 001', 'is_active' => true, 'sap_source' => 'YY1_PURCHASINGGROUPAPI_CDS / YY1_PurchasingGroupAPI'],
            ['code' => '002', 'name' => 'Group 002', 'PurchasingGroup' => '002', 'PurchasingGroupName' => 'Group 002', 'description' => 'Group 002', 'extra' => 'Group 002', 'is_active' => true, 'sap_source' => 'YY1_PURCHASINGGROUPAPI_CDS / YY1_PurchasingGroupAPI'],
            ['code' => '003', 'name' => 'Group 003', 'PurchasingGroup' => '003', 'PurchasingGroupName' => 'Group 003', 'description' => 'Group 003', 'extra' => 'Group 003', 'is_active' => true, 'sap_source' => 'YY1_PURCHASINGGROUPAPI_CDS / YY1_PurchasingGroupAPI'],
            ['code' => '005', 'name' => 'Transportation Srv', 'PurchasingGroup' => '005', 'PurchasingGroupName' => 'Transportation Srv', 'description' => 'Transportation Srv', 'extra' => 'Transportation Srv', 'is_active' => true, 'sap_source' => 'YY1_PURCHASINGGROUPAPI_CDS / YY1_PurchasingGroupAPI'],
            ['code' => '006', 'name' => 'TM – Ext. Planning', 'PurchasingGroup' => '006', 'PurchasingGroupName' => 'TM – Ext. Planning', 'description' => 'TM – Ext. Planning', 'extra' => 'TM – Ext. Planning', 'is_active' => true, 'sap_source' => 'YY1_PURCHASINGGROUPAPI_CDS / YY1_PurchasingGroupAPI'],
            ['code' => '007', 'name' => 'TM – Int. Planning', 'PurchasingGroup' => '007', 'PurchasingGroupName' => 'TM – Int. Planning', 'description' => 'TM – Int. Planning', 'extra' => 'TM – Int. Planning', 'is_active' => true, 'sap_source' => 'YY1_PURCHASINGGROUPAPI_CDS / YY1_PurchasingGroupAPI'],
            ['code' => '101', 'name' => 'Civil', 'PurchasingGroup' => '101', 'PurchasingGroupName' => 'Civil', 'description' => 'Civil', 'extra' => 'Civil', 'is_active' => true, 'sap_source' => 'YY1_PURCHASINGGROUPAPI_CDS / YY1_PurchasingGroupAPI'],
            ['code' => '102', 'name' => 'Contracts', 'PurchasingGroup' => '102', 'PurchasingGroupName' => 'Contracts', 'description' => 'Contracts', 'extra' => 'Contracts', 'is_active' => true, 'sap_source' => 'YY1_PURCHASINGGROUPAPI_CDS / YY1_PurchasingGroupAPI'],
            ['code' => '103', 'name' => 'Purchase', 'PurchasingGroup' => '103', 'PurchasingGroupName' => 'Purchase', 'description' => 'Purchase', 'extra' => 'Purchase', 'is_active' => true, 'sap_source' => 'YY1_PURCHASINGGROUPAPI_CDS / YY1_PurchasingGroupAPI'],
            ['code' => '104', 'name' => 'Marketing', 'PurchasingGroup' => '104', 'PurchasingGroupName' => 'Marketing', 'description' => 'Marketing', 'extra' => 'Marketing', 'is_active' => true, 'sap_source' => 'YY1_PURCHASINGGROUPAPI_CDS / YY1_PurchasingGroupAPI'],
            ['code' => '105', 'name' => 'Technical Service', 'PurchasingGroup' => '105', 'PurchasingGroupName' => 'Technical Service', 'description' => 'Technical Service', 'extra' => 'Technical Service', 'is_active' => true, 'sap_source' => 'YY1_PURCHASINGGROUPAPI_CDS / YY1_PurchasingGroupAPI'],
            ['code' => '106', 'name' => 'EDP', 'PurchasingGroup' => '106', 'PurchasingGroupName' => 'EDP', 'description' => 'EDP', 'extra' => 'EDP', 'is_active' => true, 'sap_source' => 'YY1_PURCHASINGGROUPAPI_CDS / YY1_PurchasingGroupAPI'],
            ['code' => '107', 'name' => 'Project', 'PurchasingGroup' => '107', 'PurchasingGroupName' => 'Project', 'description' => 'Project', 'extra' => 'Project', 'is_active' => true, 'sap_source' => 'YY1_PURCHASINGGROUPAPI_CDS / YY1_PurchasingGroupAPI'],
            ['code' => '108', 'name' => 'Process', 'PurchasingGroup' => '108', 'PurchasingGroupName' => 'Process', 'description' => 'Process', 'extra' => 'Process', 'is_active' => true, 'sap_source' => 'YY1_PURCHASINGGROUPAPI_CDS / YY1_PurchasingGroupAPI'],
            ['code' => '109', 'name' => 'Admin', 'PurchasingGroup' => '109', 'PurchasingGroupName' => 'Admin', 'description' => 'Admin', 'extra' => 'Admin', 'is_active' => true, 'sap_source' => 'YY1_PURCHASINGGROUPAPI_CDS / YY1_PurchasingGroupAPI'],
            ['code' => '110', 'name' => 'Finance', 'PurchasingGroup' => '110', 'PurchasingGroupName' => 'Finance', 'description' => 'Finance', 'extra' => 'Finance', 'is_active' => true, 'sap_source' => 'YY1_PURCHASINGGROUPAPI_CDS / YY1_PurchasingGroupAPI'],
            ['code' => '111', 'name' => 'Production', 'PurchasingGroup' => '111', 'PurchasingGroupName' => 'Production', 'description' => 'Production', 'extra' => 'Production', 'is_active' => true, 'sap_source' => 'YY1_PURCHASINGGROUPAPI_CDS / YY1_PurchasingGroupAPI'],
            ['code' => '112', 'name' => 'Stores', 'PurchasingGroup' => '112', 'PurchasingGroupName' => 'Stores', 'description' => 'Stores', 'extra' => 'Stores', 'is_active' => true, 'sap_source' => 'YY1_PURCHASINGGROUPAPI_CDS / YY1_PurchasingGroupAPI'],
            ['code' => '113', 'name' => 'Fire & Safety', 'PurchasingGroup' => '113', 'PurchasingGroupName' => 'Fire & Safety', 'description' => 'Fire & Safety', 'extra' => 'Fire & Safety', 'is_active' => true, 'sap_source' => 'YY1_PURCHASINGGROUPAPI_CDS / YY1_PurchasingGroupAPI'],
            ['code' => '114', 'name' => 'Quality Control', 'PurchasingGroup' => '114', 'PurchasingGroupName' => 'Quality Control', 'description' => 'Quality Control', 'extra' => 'Quality Control', 'is_active' => true, 'sap_source' => 'YY1_PURCHASINGGROUPAPI_CDS / YY1_PurchasingGroupAPI'],
            ['code' => '115', 'name' => 'Elect - 500 TPD', 'PurchasingGroup' => '115', 'PurchasingGroupName' => 'Elect - 500 TPD', 'description' => 'Elect - 500 TPD', 'extra' => 'Elect - 500 TPD', 'is_active' => true, 'sap_source' => 'YY1_PURCHASINGGROUPAPI_CDS / YY1_PurchasingGroupAPI'],
            ['code' => '116', 'name' => 'Elect - 125 TPD', 'PurchasingGroup' => '116', 'PurchasingGroupName' => 'Elect - 125 TPD', 'description' => 'Elect - 125 TPD', 'extra' => 'Elect - 125 TPD', 'is_active' => true, 'sap_source' => 'YY1_PURCHASINGGROUPAPI_CDS / YY1_PurchasingGroupAPI'],
            ['code' => '117', 'name' => 'Elect - 100 TPD', 'PurchasingGroup' => '117', 'PurchasingGroupName' => 'Elect - 100 TPD', 'description' => 'Elect - 100 TPD', 'extra' => 'Elect - 100 TPD', 'is_active' => true, 'sap_source' => 'YY1_PURCHASINGGROUPAPI_CDS / YY1_PurchasingGroupAPI'],
            ['code' => '118', 'name' => 'Elect - 200 TPD', 'PurchasingGroup' => '118', 'PurchasingGroupName' => 'Elect - 200 TPD', 'description' => 'Elect - 200 TPD', 'extra' => 'Elect - 200 TPD', 'is_active' => true, 'sap_source' => 'YY1_PURCHASINGGROUPAPI_CDS / YY1_PurchasingGroupAPI'],
            ['code' => '119', 'name' => 'Mech - 500 TPD', 'PurchasingGroup' => '119', 'PurchasingGroupName' => 'Mech - 500 TPD', 'description' => 'Mech - 500 TPD', 'extra' => 'Mech - 500 TPD', 'is_active' => true, 'sap_source' => 'YY1_PURCHASINGGROUPAPI_CDS / YY1_PurchasingGroupAPI'],
            ['code' => '120', 'name' => 'Mech - 125 TPD', 'PurchasingGroup' => '120', 'PurchasingGroupName' => 'Mech - 125 TPD', 'description' => 'Mech - 125 TPD', 'extra' => 'Mech - 125 TPD', 'is_active' => true, 'sap_source' => 'YY1_PURCHASINGGROUPAPI_CDS / YY1_PurchasingGroupAPI'],
            ['code' => '121', 'name' => 'Mech - 100 TPD', 'PurchasingGroup' => '121', 'PurchasingGroupName' => 'Mech - 100 TPD', 'description' => 'Mech - 100 TPD', 'extra' => 'Mech - 100 TPD', 'is_active' => true, 'sap_source' => 'YY1_PURCHASINGGROUPAPI_CDS / YY1_PurchasingGroupAPI'],
            ['code' => '122', 'name' => 'Mech - 200 TPD', 'PurchasingGroup' => '122', 'PurchasingGroupName' => 'Mech - 200 TPD', 'description' => 'Mech - 200 TPD', 'extra' => 'Mech - 200 TPD', 'is_active' => true, 'sap_source' => 'YY1_PURCHASINGGROUPAPI_CDS / YY1_PurchasingGroupAPI'],
            ['code' => '123', 'name' => 'Instr - 500 TPD', 'PurchasingGroup' => '123', 'PurchasingGroupName' => 'Instr - 500 TPD', 'description' => 'Instr - 500 TPD', 'extra' => 'Instr - 500 TPD', 'is_active' => true, 'sap_source' => 'YY1_PURCHASINGGROUPAPI_CDS / YY1_PurchasingGroupAPI'],
            ['code' => '124', 'name' => 'Instr - 125 TPD', 'PurchasingGroup' => '124', 'PurchasingGroupName' => 'Instr - 125 TPD', 'description' => 'Instr - 125 TPD', 'extra' => 'Instr - 125 TPD', 'is_active' => true, 'sap_source' => 'YY1_PURCHASINGGROUPAPI_CDS / YY1_PurchasingGroupAPI'],
            ['code' => '125', 'name' => 'Instr - 100 TPD', 'PurchasingGroup' => '125', 'PurchasingGroupName' => 'Instr - 100 TPD', 'description' => 'Instr - 100 TPD', 'extra' => 'Instr - 100 TPD', 'is_active' => true, 'sap_source' => 'YY1_PURCHASINGGROUPAPI_CDS / YY1_PurchasingGroupAPI'],
            ['code' => '126', 'name' => 'Instr - 200 TPD', 'PurchasingGroup' => '126', 'PurchasingGroupName' => 'Instr - 200 TPD', 'description' => 'Instr - 200 TPD', 'extra' => 'Instr - 200 TPD', 'is_active' => true, 'sap_source' => 'YY1_PURCHASINGGROUPAPI_CDS / YY1_PurchasingGroupAPI'],
        ];
    }

    /**
     * Default realistic fallback units of measure matching SAP YY1_UNITOFMEASUREMENT_CDS schema.
     */
    protected array $fallbackUnitsOfMeasure = [
        ['code' => 'NO', 'UnitOfMeasure' => 'NO', 'UnitOfMeasureCommercialName' => 'NO', 'UnitOfMeasureLongName' => 'Number', 'name' => 'NO - Number', 'extra' => 'Number'],
        ['code' => 'EA', 'UnitOfMeasure' => 'EA', 'UnitOfMeasureCommercialName' => 'EA', 'UnitOfMeasureLongName' => 'Each', 'name' => 'EA - Each', 'extra' => 'Each'],
        ['code' => 'PC', 'UnitOfMeasure' => 'PC', 'UnitOfMeasureCommercialName' => 'PC', 'UnitOfMeasureLongName' => 'Piece', 'name' => 'PC - Piece', 'extra' => 'Piece'],
        ['code' => 'KG', 'UnitOfMeasure' => 'KG', 'UnitOfMeasureCommercialName' => 'KG', 'UnitOfMeasureLongName' => 'Kilogram', 'name' => 'KG - Kilogram', 'extra' => 'Kilogram'],
        ['code' => 'M', 'UnitOfMeasure' => 'M', 'UnitOfMeasureCommercialName' => 'M', 'UnitOfMeasureLongName' => 'Meter', 'name' => 'M - Meter', 'extra' => 'Meter'],
        ['code' => 'M3', 'UnitOfMeasure' => 'M3', 'UnitOfMeasureCommercialName' => 'M3', 'UnitOfMeasureLongName' => 'Cubic Meter', 'name' => 'M3 - Cubic Meter', 'extra' => 'Cubic Meter'],
        ['code' => 'L', 'UnitOfMeasure' => 'L', 'UnitOfMeasureCommercialName' => 'L', 'UnitOfMeasureLongName' => 'Liter', 'name' => 'L - Liter', 'extra' => 'Liter'],
        ['code' => 'TO', 'UnitOfMeasure' => 'TO', 'UnitOfMeasureCommercialName' => 'TO', 'UnitOfMeasureLongName' => 'Metric Ton', 'name' => 'TO - Metric Ton', 'extra' => 'Metric Ton'],
        ['code' => 'HR', 'UnitOfMeasure' => 'HR', 'UnitOfMeasureCommercialName' => 'HR', 'UnitOfMeasureLongName' => 'Hours', 'name' => 'HR - Hours', 'extra' => 'Hours'],
        ['code' => 'DAY', 'UnitOfMeasure' => 'DAY', 'UnitOfMeasureCommercialName' => 'DAY', 'UnitOfMeasureLongName' => 'Days', 'name' => 'DAY - Days', 'extra' => 'Days'],
        ['code' => 'MON', 'UnitOfMeasure' => 'MON', 'UnitOfMeasureCommercialName' => 'MON', 'UnitOfMeasureLongName' => 'Months', 'name' => 'MON - Months', 'extra' => 'Months'],
        ['code' => 'AU', 'UnitOfMeasure' => 'AU', 'UnitOfMeasureCommercialName' => 'AU', 'UnitOfMeasureLongName' => 'Activity unit', 'name' => 'AU - Activity unit', 'extra' => 'Activity unit'],
        ['code' => 'SET', 'UnitOfMeasure' => 'SET', 'UnitOfMeasureCommercialName' => 'SET', 'UnitOfMeasureLongName' => 'Set', 'name' => 'SET - Set', 'extra' => 'Set'],
        ['code' => 'JOB', 'UnitOfMeasure' => 'JOB', 'UnitOfMeasureCommercialName' => 'JOB', 'UnitOfMeasureLongName' => 'Job / Lumpsum', 'name' => 'JOB - Job / Lumpsum', 'extra' => 'Job / Lumpsum'],
        ['code' => 'LOT', 'UnitOfMeasure' => 'LOT', 'UnitOfMeasureCommercialName' => 'LOT', 'UnitOfMeasureLongName' => 'Lot', 'name' => 'LOT - Lot', 'extra' => 'Lot'],
    ];

    /**
     * Get fallback units of measure matching SAP YY1_UNITOFMEASUREMENT_CDS schema.
     */
    public function getFormattedFallbackUnitsOfMeasure(): array
    {
        return $this->fallbackUnitsOfMeasure;
    }

    /**
     * Fetch Units of Measure from SAP S/4HANA Cloud CDS View:
     * YY1_UNITOFMEASUREMENT_CDS / YY1_UnitOfMeasurement
     */
    public function fetchUnitsOfMeasureFromCdsView(
        ?string $search = null,
        ?string $username = null,
        ?string $password = null,
        ?string $endpointUrl = null
    ): array {
        $endpoint = $endpointUrl ?: config(
            'sap.endpoints.units_of_measure',
            'https://my443544-api.s4hana.cloud.sap/sap/opu/odata/sap/YY1_UNITOFMEASUREMENT_CDS/YY1_UnitOfMeasurement?$format=json'
        );

        $authUser = $username ?: config('sap.auth.username', env('SAP_ODATA_USER'));
        $authPass = $password ?: config('sap.auth.password', env('SAP_ODATA_PASSWORD'));

        if (!empty($authUser) && !empty($authPass)) {
            try {
                $startTime = microtime(true);
                $verifySsl = config('sap.verify_ssl', false);

                $cacheKey = 'sap_uom_items_all_v2';
                $cachedItems = \Illuminate\Support\Facades\Cache::get($cacheKey);

                if (is_array($cachedItems) && !empty($cachedItems)) {
                    $items = $cachedItems;
                    $durationMs = round((microtime(true) - $startTime) * 1000);
                } else {
                    $request = Http::timeout(15)
                        ->withBasicAuth($authUser, $authPass)
                        ->withHeaders([
                            'Accept' => 'application/json',
                            'Content-Type' => 'application/json',
                        ]);

                    if (!$verifySsl) {
                        $request = $request->withoutVerifying();
                    }

                    $baseUri = explode('?', $endpoint)[0];
                    $targetUrl = $baseUri . "?\$filter=" . urlencode("Language eq 'EN'") . "&\$format=json";

                    $response = $request->get($targetUrl);
                    $durationMs = round((microtime(true) - $startTime) * 1000);

                    if ($response->successful()) {
                        $json = $response->json();
                        $items = $this->parseUnitOfMeasureODataItems($json);
                        if (!empty($items)) {
                            \Illuminate\Support\Facades\Cache::put($cacheKey, $items, 3600);
                        }
                    } else {
                        $errorBody = $response->body();
                        Log::warning('SAP Units of Measure CDS View fetch non-200: ' . $response->status(), [
                            'body' => substr($errorBody, 0, 500),
                        ]);

                        return [
                            'success' => false,
                            'is_live' => false,
                            'status' => $response->status(),
                            'source' => 'SAP S/4HANA Cloud (Live Request Failed)',
                            'endpoint' => $endpoint,
                            'message' => "SAP S/4HANA Cloud responded with HTTP {$response->status()}: " .
                                ($response->status() === 401 ? 'Invalid or unauthorized Communication User credentials.' : 'Check CDS View service exposure.'),
                            'items' => $this->getFormattedFallbackUnitsOfMeasure(),
                            'error_details' => substr($errorBody, 0, 300),
                        ];
                    }
                }

                if (!empty($search)) {
                    $term = strtolower(trim($search));
                    $items = array_values(array_filter($items, function ($it) use ($term) {
                        return str_contains(strtolower($it['UnitOfMeasure'] ?? $it['code'] ?? ''), $term)
                            || str_contains(strtolower($it['UnitOfMeasureCommercialName'] ?? ''), $term)
                            || str_contains(strtolower($it['UnitOfMeasureLongName'] ?? ''), $term)
                            || str_contains(strtolower($it['name'] ?? ''), $term);
                    }));
                }

                return [
                    'success' => true,
                    'is_live' => true,
                    'status' => 200,
                    'latency_ms' => $durationMs,
                    'source' => 'SAP S/4HANA Cloud (Live CDS: YY1_UNITOFMEASUREMENT_CDS)',
                    'endpoint' => $endpoint,
                    'count' => count($items),
                    'items' => $items,
                    'message' => "Successfully fetched " . count($items) . " units of measure live from SAP CDS View in {$durationMs}ms.",
                ];
            } catch (\Exception $e) {
                Log::error('Exception connecting to SAP Units of Measure CDS View: ' . $e->getMessage());

                return [
                    'success' => false,
                    'is_live' => false,
                    'status' => 500,
                    'source' => 'SAP S/4HANA Cloud (Connection Error)',
                    'endpoint' => $endpoint,
                    'message' => "Network connection to SAP Cloud endpoint timed out or failed: " . $e->getMessage(),
                    'items' => $this->getFormattedFallbackUnitsOfMeasure(),
                ];
            }
        }

        return [
            'success' => true,
            'is_live' => false,
            'status' => 200,
            'source' => 'Fallback Master Data (SAP Credentials Not Configured)',
            'endpoint' => $endpoint,
            'count' => count($this->getFormattedFallbackUnitsOfMeasure()),
            'items' => $this->getFormattedFallbackUnitsOfMeasure(),
            'message' => 'Serving fallback units of measure (SAP credentials not configured).',
        ];
    }

    /**
     * Parse raw SAP OData V2 or V4 payload into standardized Unit of Measure items.
     * Response fields supported:
     * - UnitOfMeasure (code, e.g. "NO")
     * - UnitOfMeasureCommercialName (commercial name, e.g. "NO")
     * - UnitOfMeasureLongName (long description, e.g. "Number")
     */
    protected function parseUnitOfMeasureODataItems(array $json): array
    {
        $rawRecords = [];
        if (isset($json['d']['results']) && is_array($json['d']['results'])) {
            $rawRecords = $json['d']['results'];
        } elseif (isset($json['d']) && is_array($json['d'])) {
            $rawRecords = $json['d'];
        } elseif (isset($json['value']) && is_array($json['value'])) {
            $rawRecords = $json['value'];
        } elseif (isset($json[0]) && is_array($json[0])) {
            $rawRecords = $json;
        }

        $parsed = [];
        foreach ($rawRecords as $rec) {
            $uom = trim((string)($rec['UnitOfMeasure'] ?? $rec['code'] ?? ''));
            if ($uom === '') {
                continue;
            }

            $commercialName = trim((string)($rec['UnitOfMeasureCommercialName'] ?? $uom));
            $longName = trim((string)($rec['UnitOfMeasureLongName'] ?? $rec['name'] ?? $commercialName));

            $code = $uom;
            $name = $commercialName !== '' ? "{$commercialName} - {$longName}" : "{$code} - {$longName}";
            $extra = $longName;

            $parsed[] = [
                'code' => $code,
                'name' => $name,
                'extra' => $extra,
                'UnitOfMeasure' => $uom,
                'UnitOfMeasureCommercialName' => $commercialName,
                'UnitOfMeasureLongName' => $longName,
                'Language' => $rec['Language'] ?? 'EN',
                'raw_data' => $rec,
            ];
        }

        return !empty($parsed) ? $parsed : $this->getFormattedFallbackUnitsOfMeasure();
    }

    /**
     * Fetch Purchasing Info Records from SAP S/4HANA Cloud CDS View:
     * YY1_INFORECORD_CDS / YY1_INFORECORD
     *
     * @param string|null $search Filter keyword matching PurchasingInfoRecord, Supplier, or Material
     * @param string|null $supplier Optional supplier filter
     * @param string|null $material Optional material filter
     * @param string|null $username Optional basic auth user override
     * @param string|null $password Optional basic auth password override
     * @param string|null $endpointUrl Optional endpoint override
     * @return array
     */
    public function fetchInfoRecordsFromCdsView(
        ?string $search = null,
        ?string $supplier = null,
        ?string $material = null,
        ?string $username = null,
        ?string $password = null,
        ?string $endpointUrl = null
    ): array {
        $endpoint = $endpointUrl ?: config(
            'sap.endpoints.info_records',
            'https://my443544-api.s4hana.cloud.sap/sap/opu/odata/sap/YY1_INFORECORD_CDS/YY1_INFORECORD?$format=json'
        );

        $authUser = $username ?: config('sap.auth.username', env('SAP_ODATA_USER'));
        $authPass = $password ?: config('sap.auth.password', env('SAP_ODATA_PASSWORD'));

        if (!empty($authUser) && !empty($authPass)) {
            try {
                $startTime = microtime(true);
                $verifySsl = config('sap.verify_ssl', false);

                $cacheKey = 'sap_info_records_all_v1';
                $cachedItems = \Illuminate\Support\Facades\Cache::get($cacheKey);

                if (is_array($cachedItems) && !empty($cachedItems)) {
                    $items = $cachedItems;
                    $durationMs = round((microtime(true) - $startTime) * 1000);
                } else {
                    $request = Http::timeout(15)
                        ->withBasicAuth($authUser, $authPass)
                        ->withHeaders([
                            'Accept' => 'application/json',
                            'Content-Type' => 'application/json',
                        ]);

                    if (!$verifySsl) {
                        $request = $request->withoutVerifying();
                    }

                    $baseUri = explode('?', $endpoint)[0];
                    $targetUrl = $baseUri . "?\$format=json";

                    $response = $request->get($targetUrl);
                    $durationMs = round((microtime(true) - $startTime) * 1000);

                    if ($response->successful()) {
                        $json = $response->json();
                        $items = $this->parseInfoRecordODataItems($json);
                        if (!empty($items)) {
                            \Illuminate\Support\Facades\Cache::put($cacheKey, $items, 3600);
                        }
                    } else {
                        $errorBody = $response->body();
                        Log::warning('SAP Info Record CDS View fetch non-200: ' . $response->status(), [
                            'body' => substr($errorBody, 0, 500),
                        ]);

                        return [
                            'success' => false,
                            'is_live' => false,
                            'status' => $response->status(),
                            'source' => 'SAP S/4HANA Cloud (Live Request Failed)',
                            'endpoint' => $endpoint,
                            'message' => "SAP S/4HANA Cloud responded with HTTP {$response->status()}: " .
                                ($response->status() === 401 ? 'Invalid or unauthorized Communication User credentials.' : 'Check CDS View service exposure.'),
                            'items' => $this->getFormattedFallbackInfoRecords(),
                            'error_details' => substr($errorBody, 0, 300),
                        ];
                    }
                }

                // Apply filtering if $supplier, $material, or $search is provided
                if (!empty($supplier)) {
                    $suppTerm = strtolower(trim($supplier));
                    $items = array_values(array_filter($items, function ($it) use ($suppTerm) {
                        return strtolower(trim($it['Supplier'] ?? '')) === $suppTerm;
                    }));
                }

                if (!empty($material)) {
                    $matTerm = strtolower(trim($material));
                    $items = array_values(array_filter($items, function ($it) use ($matTerm) {
                        return strtolower(trim($it['Material'] ?? '')) === $matTerm;
                    }));
                }

                if (!empty($search)) {
                    $term = strtolower(trim($search));
                    $items = array_values(array_filter($items, function ($it) use ($term) {
                        return str_contains(strtolower($it['PurchasingInfoRecord'] ?? $it['code'] ?? ''), $term)
                            || str_contains(strtolower($it['Supplier'] ?? ''), $term)
                            || str_contains(strtolower($it['Material'] ?? ''), $term)
                            || str_contains(strtolower($it['name'] ?? ''), $term);
                    }));
                }

                return [
                    'success' => true,
                    'is_live' => true,
                    'status' => 200,
                    'latency_ms' => $durationMs,
                    'source' => 'SAP S/4HANA Cloud (Live CDS: YY1_INFORECORD_CDS)',
                    'endpoint' => $endpoint,
                    'count' => count($items),
                    'items' => $items,
                    'message' => "Successfully fetched " . count($items) . " purchasing info records live from SAP CDS View in {$durationMs}ms.",
                ];
            } catch (\Exception $e) {
                Log::error('Exception connecting to SAP Info Record CDS View: ' . $e->getMessage());

                return [
                    'success' => false,
                    'is_live' => false,
                    'status' => 500,
                    'source' => 'SAP S/4HANA Cloud (Connection Error)',
                    'endpoint' => $endpoint,
                    'message' => "Network connection to SAP Cloud endpoint timed out or failed: " . $e->getMessage(),
                    'items' => $this->getFormattedFallbackInfoRecords(),
                ];
            }
        }

        return [
            'success' => true,
            'is_live' => false,
            'status' => 200,
            'source' => 'Fallback Master Data (SAP Credentials Not Configured)',
            'endpoint' => $endpoint,
            'count' => count($this->getFormattedFallbackInfoRecords()),
            'items' => $this->getFormattedFallbackInfoRecords(),
            'message' => 'Serving fallback purchasing info records (SAP credentials not configured).',
        ];
    }

    /**
     * Parse raw SAP OData V2 or V4 payload into standardized Purchasing Info Record items.
     * Response fields supported:
     * - PurchasingInfoRecord (e.g. "5300000000")
     * - Supplier (e.g. "V1200")
     * - Material (e.g. "1000000005")
     */
    protected function parseInfoRecordODataItems(array $json): array
    {
        $rawRecords = [];
        if (isset($json['d']['results']) && is_array($json['d']['results'])) {
            $rawRecords = $json['d']['results'];
        } elseif (isset($json['d']) && is_array($json['d'])) {
            $rawRecords = $json['d'];
        } elseif (isset($json['value']) && is_array($json['value'])) {
            $rawRecords = $json['value'];
        } elseif (isset($json[0]) && is_array($json[0])) {
            $rawRecords = $json;
        }

        $parsed = [];
        foreach ($rawRecords as $rec) {
            $pir = trim((string)($rec['PurchasingInfoRecord'] ?? $rec['code'] ?? ''));
            if ($pir === '') {
                continue;
            }

            $supplier = trim((string)($rec['Supplier'] ?? ''));
            $supplierName = trim((string)($rec['SupplierName'] ?? ''));
            $material = trim((string)($rec['Material'] ?? ''));

            $nameParts = ["Info Record {$pir}"];
            if ($supplier !== '') {
                $nameParts[] = $supplierName !== '' ? "Vendor {$supplier} ({$supplierName})" : "Vendor {$supplier}";
            }
            if ($material !== '') {
                $nameParts[] = "Mat {$material}";
            }
            $name = implode(' • ', $nameParts);

            $extraParts = [];
            if ($supplier !== '') {
                $extraParts[] = $supplierName !== '' ? "Supplier: {$supplier} ({$supplierName})" : "Supplier: {$supplier}";
            }
            if ($material !== '') $extraParts[] = "Material: {$material}";
            $extra = !empty($extraParts) ? implode(' • ', $extraParts) : "Purchasing Info Record {$pir}";

            $parsed[] = [
                'code' => $pir,
                'name' => $name,
                'extra' => $extra,
                'PurchasingInfoRecord' => $pir,
                'Supplier' => $supplier,
                'SupplierName' => $supplierName,
                'Material' => $material,
                'raw_data' => $rec,
            ];
        }

        return !empty($parsed) ? $parsed : $this->getFormattedFallbackInfoRecords();
    }

    /**
     * Fallback purchasing info records for offline development or testing.
     */
    public function getFormattedFallbackInfoRecords(): array
    {
        return [
            [
                'code' => '5300000000',
                'name' => 'Info Record 5300000000 • Vendor V1200 • Mat 1000000005',
                'extra' => 'Supplier: V1200 • Material: 1000000005',
                'PurchasingInfoRecord' => '5300000000',
                'Supplier' => 'V1200',
                'Material' => '1000000005',
            ],
            [
                'code' => '5300000001',
                'name' => 'Info Record 5300000001 • Vendor 2000001 • Mat 500000000',
                'extra' => 'Supplier: 2000001 • Material: 500000000',
                'PurchasingInfoRecord' => '5300000001',
                'Supplier' => '2000001',
                'Material' => '500000000',
            ],
            [
                'code' => '5300000002',
                'name' => 'Info Record 5300000002 • Vendor 2000001 • Mat 600000014',
                'extra' => 'Supplier: 2000001 • Material: 600000014',
                'PurchasingInfoRecord' => '5300000002',
                'Supplier' => '2000001',
                'Material' => '600000014',
            ],
            [
                'code' => '5300000003',
                'name' => 'Info Record 5300000003 • Vendor 1000012 • Mat 500000000',
                'extra' => 'Supplier: 1000012 • Material: 500000000',
                'PurchasingInfoRecord' => '5300000003',
                'Supplier' => '1000012',
                'Material' => '500000000',
            ],
            [
                'code' => '5300000004',
                'name' => 'Info Record 5300000004 • Vendor 1000012 • Mat 1000000005',
                'extra' => 'Supplier: 1000012 • Material: 1000000005',
                'PurchasingInfoRecord' => '5300000004',
                'Supplier' => '1000012',
                'Material' => '1000000005',
            ],
            [
                'code' => '5300000005',
                'name' => 'Info Record 5300000005 • Vendor 1000011 • Mat 1200000000',
                'extra' => 'Supplier: 1000011 • Material: 1200000000',
                'PurchasingInfoRecord' => '5300000005',
                'Supplier' => '1000011',
                'Material' => '1200000000',
            ],
        ];
    }

    /**
     * Fetch Tax Codes from SAP S/4HANA Cloud CDS View (YY1_TAXCODE_CDS)
     *
     * @param string|null $search Optional search filter query
     * @param string|null $username Optional communication user override
     * @param string|null $password Optional communication password override
     * @param string|null $endpointUrl Optional endpoint URL override
     * @return array
     */
    public function fetchTaxCodesFromCdsView(
        ?string $search = null,
        ?string $username = null,
        ?string $password = null,
        ?string $endpointUrl = null
    ): array {
        $endpoint = $endpointUrl ?: config(
            'sap.endpoints.tax_codes',
            'https://my443544-api.s4hana.cloud.sap/sap/opu/odata/sap/YY1_TAXCODE_CDS/YY1_TAXCODE?$format=json'
        );

        $authUser = $username ?: config('sap.auth.username', env('SAP_ODATA_USER'));
        $authPass = $password ?: config('sap.auth.password', env('SAP_ODATA_PASSWORD'));

        if (!empty($authUser) && !empty($authPass)) {
            try {
                $startTime = microtime(true);
                $verifySsl = config('sap.verify_ssl', false);

                $cacheKey = 'sap_tax_codes_all_v1';
                $cachedItems = \Illuminate\Support\Facades\Cache::get($cacheKey);

                if (is_array($cachedItems) && !empty($cachedItems)) {
                    $items = $cachedItems;
                    $durationMs = round((microtime(true) - $startTime) * 1000);
                } else {
                    $request = Http::timeout(15)
                        ->withBasicAuth($authUser, $authPass)
                        ->withHeaders([
                            'Accept' => 'application/json',
                            'Content-Type' => 'application/json',
                        ]);

                    if (!$verifySsl) {
                        $request = $request->withoutVerifying();
                    }

                    $baseUri = explode('?', $endpoint)[0];
                    $targetUrl = $baseUri . "?\$format=json";

                    $response = $request->get($targetUrl);
                    $durationMs = round((microtime(true) - $startTime) * 1000);

                    if ($response->successful()) {
                        $json = $response->json();
                        $items = $this->parseTaxCodeODataItems($json);
                        if (!empty($items)) {
                            \Illuminate\Support\Facades\Cache::put($cacheKey, $items, 3600);
                        }
                    } else {
                        $errorBody = $response->body();
                        Log::warning('SAP Tax Code CDS View fetch non-200: ' . $response->status(), [
                            'body' => substr($errorBody, 0, 500),
                        ]);

                        return [
                            'success' => false,
                            'is_live' => false,
                            'status' => $response->status(),
                            'source' => 'SAP S/4HANA Cloud (Live Request Failed)',
                            'endpoint' => $endpoint,
                            'message' => "SAP S/4HANA Cloud responded with HTTP {$response->status()}: " .
                                ($response->status() === 401 ? 'Invalid or unauthorized Communication User credentials.' : 'Check CDS View service exposure.'),
                            'items' => $this->getFormattedFallbackTaxCodes($search),
                            'error_details' => substr($errorBody, 0, 300),
                        ];
                    }
                }

                if (!empty($search)) {
                    $term = strtolower(trim($search));
                    $items = array_values(array_filter($items, function ($it) use ($term) {
                        return str_contains(strtolower($it['TaxCode'] ?? $it['code'] ?? ''), $term)
                            || str_contains(strtolower($it['TaxCodeName'] ?? $it['name'] ?? ''), $term)
                            || str_contains(strtolower($it['VATConditionType'] ?? ''), $term)
                            || str_contains(strtolower($it['TaxCalculationProcedure'] ?? ''), $term)
                            || str_contains(strtolower($it['Country'] ?? ''), $term)
                            || str_contains(strtolower($it['ConditionRateRatio'] ?? ''), $term);
                    }));
                }

                return [
                    'success' => true,
                    'is_live' => true,
                    'status' => 200,
                    'latency_ms' => $durationMs,
                    'source' => 'SAP S/4HANA Cloud (Live CDS: YY1_TAXCODE_CDS)',
                    'endpoint' => $endpoint,
                    'count' => count($items),
                    'items' => $items,
                    'message' => "Successfully fetched " . count($items) . " tax codes live from SAP CDS View in {$durationMs}ms.",
                ];
            } catch (\Exception $e) {
                Log::error('Exception connecting to SAP Tax Code CDS View: ' . $e->getMessage());

                return [
                    'success' => false,
                    'is_live' => false,
                    'status' => 500,
                    'source' => 'SAP S/4HANA Cloud (Connection Error)',
                    'endpoint' => $endpoint,
                    'message' => "Network connection to SAP Cloud endpoint timed out or failed: " . $e->getMessage(),
                    'items' => $this->getFormattedFallbackTaxCodes($search),
                ];
            }
        }

        return [
            'success' => true,
            'is_live' => false,
            'status' => 200,
            'source' => 'Fallback Master Data (SAP Credentials Not Configured)',
            'endpoint' => $endpoint,
            'count' => count($this->getFormattedFallbackTaxCodes($search)),
            'items' => $this->getFormattedFallbackTaxCodes($search),
            'message' => 'Serving fallback tax codes (SAP credentials not configured).',
        ];
    }

    /**
     * Parse raw SAP OData V2 or V4 payload into standardized Tax Code records.
     * Response fields supported:
     * - Country (e.g. "IN")
     * - TaxCalculationProcedure (e.g. "0TXIN")
     * - TaxCode (e.g. "J2")
     * - VATConditionType (e.g. "JICG")
     * - CndnRecordValidityStartDate
     * - CndnRecordValidityEndDate
     * - TaxCodeName (e.g. "CGST 9% +SGST 9% - Domestic input GST-RCM")
     * - ConditionRateRatio (e.g. "9.000")
     * - ConditionRateRatioUnit (e.g. "%")
     */
    public function parseTaxCodeODataItems(array $json): array
    {
        $rawRecords = [];
        if (isset($json['d']['results']) && is_array($json['d']['results'])) {
            $rawRecords = $json['d']['results'];
        } elseif (isset($json['d']) && is_array($json['d'])) {
            $rawRecords = $json['d'];
        } elseif (isset($json['value']) && is_array($json['value'])) {
            $rawRecords = $json['value'];
        } elseif (isset($json[0]) && is_array($json[0])) {
            $rawRecords = $json;
        }

        $parsed = [];
        foreach ($rawRecords as $rec) {
            $taxCode = trim((string)($rec['TaxCode'] ?? $rec['code'] ?? ''));
            if ($taxCode === '') {
                continue;
            }

            $country = trim((string)($rec['Country'] ?? ''));
            $taxCalcProcedure = trim((string)($rec['TaxCalculationProcedure'] ?? ''));
            $vatConditionType = trim((string)($rec['VATConditionType'] ?? ''));
            $taxCodeName = trim((string)($rec['TaxCodeName'] ?? $rec['name'] ?? ''));
            $conditionRateRatio = isset($rec['ConditionRateRatio']) ? trim((string)$rec['ConditionRateRatio']) : '';
            $conditionRateRatioUnit = trim((string)($rec['ConditionRateRatioUnit'] ?? '%'));

            $startDate = $this->formatODataDate($rec['CndnRecordValidityStartDate'] ?? null);
            $endDate = $this->formatODataDate($rec['CndnRecordValidityEndDate'] ?? null);

            $rateText = $conditionRateRatio !== '' ? "{$conditionRateRatio}{$conditionRateRatioUnit}" : '';
            $extraParts = [];
            if ($taxCodeName !== '') {
                $extraParts[] = $taxCodeName;
            }
            if ($vatConditionType !== '') {
                $extraParts[] = "Cond: {$vatConditionType}";
            }
            if ($rateText !== '') {
                $extraParts[] = "Rate: {$rateText}";
            }
            if ($country !== '') {
                $extraParts[] = "Country: {$country}";
            }
            $extra = !empty($extraParts) ? implode(' • ', $extraParts) : "Tax Code {$taxCode}";

            $parsed[] = [
                'code' => $taxCode,
                'name' => $taxCodeName !== '' ? "{$taxCode} - {$taxCodeName}" : $taxCode,
                'extra' => $extra,
                'TaxCode' => $taxCode,
                'TaxCodeName' => $taxCodeName,
                'Country' => $country,
                'TaxCalculationProcedure' => $taxCalcProcedure,
                'VATConditionType' => $vatConditionType,
                'ConditionRateRatio' => $conditionRateRatio,
                'ConditionRateRatioUnit' => $conditionRateRatioUnit,
                'CndnRecordValidityStartDate' => $startDate,
                'CndnRecordValidityEndDate' => $endDate,
                'raw_data' => $rec,
            ];
        }

        return !empty($parsed) ? $parsed : $this->getFormattedFallbackTaxCodes();
    }

    /**
     * Helper to format OData /Date(...)/ timestamp strings.
     */
    protected function formatODataDate($rawDate): string
    {
        if (empty($rawDate) || !is_string($rawDate)) {
            return '';
        }
        if (preg_match('/\/Date\((-?\d+)\)\//', $rawDate, $matches)) {
            $ms = (float)$matches[1];
            if ($ms <= -2208988800000) {
                return '1900-01-01';
            }
            if ($ms >= 253402214400000) {
                return '9999-12-31';
            }
            return date('Y-m-d', (int)($ms / 1000));
        }
        return $rawDate;
    }

    /**
     * Fallback realistic tax codes representing SAP S/4HANA Cloud India GST (0TXIN)
     * YY1_TAXCODE_CDS view data for Assam Petro-Chemicals Ltd.
     */
    public function getFormattedFallbackTaxCodes(?string $search = null): array
    {
        $items = [
            [
                'code' => 'J2',
                'name' => 'J2 - CGST 9% +SGST 9% - Domestic input GST-RCM',
                'extra' => 'CGST 9% +SGST 9% - Domestic input GST-RCM • Cond: JICG • Rate: 9.000% • Country: IN',
                'TaxCode' => 'J2',
                'TaxCodeName' => 'CGST 9% +SGST 9% - Domestic input GST-RCM',
                'Country' => 'IN',
                'TaxCalculationProcedure' => '0TXIN',
                'VATConditionType' => 'JICG',
                'ConditionRateRatio' => '9.000',
                'ConditionRateRatioUnit' => '%',
                'CndnRecordValidityStartDate' => '1900-01-01',
                'CndnRecordValidityEndDate' => '9999-12-31',
            ],
            [
                'code' => 'G3',
                'name' => 'G3 - IGST 18% - Domestic input GST',
                'extra' => 'IGST 18% - Domestic input GST • Cond: JIIG • Rate: 18.000% • Country: IN',
                'TaxCode' => 'G3',
                'TaxCodeName' => 'IGST 18% - Domestic input GST',
                'Country' => 'IN',
                'TaxCalculationProcedure' => '0TXIN',
                'VATConditionType' => 'JIIG',
                'ConditionRateRatio' => '18.000',
                'ConditionRateRatioUnit' => '%',
                'CndnRecordValidityStartDate' => '1900-01-01',
                'CndnRecordValidityEndDate' => '9999-12-31',
            ],
            [
                'code' => 'G4',
                'name' => 'G4 - CGST 9% +SGST 9% - Domestic input GST',
                'extra' => 'CGST 9% +SGST 9% - Domestic input GST • Cond: JICG • Rate: 9.000% • Country: IN',
                'TaxCode' => 'G4',
                'TaxCodeName' => 'CGST 9% +SGST 9% - Domestic input GST',
                'Country' => 'IN',
                'TaxCalculationProcedure' => '0TXIN',
                'VATConditionType' => 'JICG',
                'ConditionRateRatio' => '9.000',
                'ConditionRateRatioUnit' => '%',
                'CndnRecordValidityStartDate' => '1900-01-01',
                'CndnRecordValidityEndDate' => '9999-12-31',
            ],
            [
                'code' => 'V1',
                'name' => 'V1 - 18% Input GST Standard',
                'extra' => '18% Input GST Standard • Cond: JICG • Rate: 18.000% • Country: IN',
                'TaxCode' => 'V1',
                'TaxCodeName' => '18% Input GST Standard',
                'Country' => 'IN',
                'TaxCalculationProcedure' => '0TXIN',
                'VATConditionType' => 'JICG',
                'ConditionRateRatio' => '18.000',
                'ConditionRateRatioUnit' => '%',
                'CndnRecordValidityStartDate' => '1900-01-01',
                'CndnRecordValidityEndDate' => '9999-12-31',
            ],
            [
                'code' => 'G0',
                'name' => 'G0 - Exempted input IGST',
                'extra' => 'Exempted input IGST • Cond: JIIG • Rate: 0.000% • Country: IN',
                'TaxCode' => 'G0',
                'TaxCodeName' => 'Exempted input IGST',
                'Country' => 'IN',
                'TaxCalculationProcedure' => '0TXIN',
                'VATConditionType' => 'JIIG',
                'ConditionRateRatio' => '0.000',
                'ConditionRateRatioUnit' => '%',
                'CndnRecordValidityStartDate' => '1900-01-01',
                'CndnRecordValidityEndDate' => '9999-12-31',
            ],
            [
                'code' => 'G1',
                'name' => 'G1 - Exempted input CGST + SGST',
                'extra' => 'Exempted input CGST + SGST • Cond: JICG • Rate: 0.000% • Country: IN',
                'TaxCode' => 'G1',
                'TaxCodeName' => 'Exempted input CGST + SGST',
                'Country' => 'IN',
                'TaxCalculationProcedure' => '0TXIN',
                'VATConditionType' => 'JICG',
                'ConditionRateRatio' => '0.000',
                'ConditionRateRatioUnit' => '%',
                'CndnRecordValidityStartDate' => '1900-01-01',
                'CndnRecordValidityEndDate' => '9999-12-31',
            ],
            [
                'code' => 'J1',
                'name' => 'J1 - IGST 18% - Domestic input GST -RCM',
                'extra' => 'IGST 18% - Domestic input GST -RCM • Cond: JIIG • Rate: 18.000% • Country: IN',
                'TaxCode' => 'J1',
                'TaxCodeName' => 'IGST 18% - Domestic input GST -RCM',
                'Country' => 'IN',
                'TaxCalculationProcedure' => '0TXIN',
                'VATConditionType' => 'JIIG',
                'ConditionRateRatio' => '18.000',
                'ConditionRateRatioUnit' => '%',
                'CndnRecordValidityStartDate' => '1900-01-01',
                'CndnRecordValidityEndDate' => '9999-12-31',
            ],
            [
                'code' => 'K1',
                'name' => 'K1 - IGST 18% - Imports',
                'extra' => 'IGST 18% - Imports • Cond: JIMN • Rate: 18.000% • Country: IN',
                'TaxCode' => 'K1',
                'TaxCodeName' => 'IGST 18% - Imports',
                'Country' => 'IN',
                'TaxCalculationProcedure' => '0TXIN',
                'VATConditionType' => 'JIMN',
                'ConditionRateRatio' => '18.000',
                'ConditionRateRatioUnit' => '%',
                'CndnRecordValidityStartDate' => '1900-01-01',
                'CndnRecordValidityEndDate' => '9999-12-31',
            ],
        ];

        if (!empty($search)) {
            $term = strtolower(trim($search));
            $items = array_values(array_filter($items, function ($it) use ($term) {
                return str_contains(strtolower($it['TaxCode'] ?? $it['code'] ?? ''), $term)
                    || str_contains(strtolower($it['TaxCodeName'] ?? $it['name'] ?? ''), $term)
                    || str_contains(strtolower($it['VATConditionType'] ?? ''), $term)
                    || str_contains(strtolower($it['TaxCalculationProcedure'] ?? ''), $term)
                    || str_contains(strtolower($it['Country'] ?? ''), $term)
                    || str_contains(strtolower($it['ConditionRateRatio'] ?? ''), $term);
            }));
        }

        return $items;
    }

    /**
     * Fetch Outline Contracts / Agreements from the SAP S/4HANA Cloud CDS View endpoint:
     * YY1_OUTLINECONTRACT_CDS / YY1_OUTLINECONTRACT
     *
     * Used for F4 search help on Agreement Item / Outline Contract Type.
     *
     * @param string|null $username Optional communication user override
     * @param string|null $password Optional communication password override
     * @param string|null $endpointUrl Optional endpoint URL override
     * @param string|null $search Optional filter query
     * @return array
     */
    public function fetchOutlineContractsFromCdsView(
        ?string $username = null,
        ?string $password = null,
        ?string $endpointUrl = null,
        ?string $search = null
    ): array {
        $endpoint = $endpointUrl ?: config(
            'sap.endpoints.outline_contracts',
            'https://my443544-api.s4hana.cloud.sap/sap/opu/odata/sap/YY1_OUTLINECONTRACT_CDS/YY1_OUTLINECONTRACT?$format=json'
        );

        $authUser = $username ?: config('sap.auth.username', env('SAP_ODATA_USER'));
        $authPass = $password ?: config('sap.auth.password', env('SAP_ODATA_PASSWORD'));

        if (!empty($authUser) && !empty($authPass)) {
            try {
                $startTime = microtime(true);
                $verifySsl = config('sap.verify_ssl', false);
                $request = Http::timeout(15)
                    ->withBasicAuth($authUser, $authPass)
                    ->withHeaders([
                        'Accept' => 'application/json',
                        'Content-Type' => 'application/json',
                    ]);

                if (!$verifySsl) {
                    $request = $request->withoutVerifying();
                }

                $response = $request->get($endpoint);
                $durationMs = round((microtime(true) - $startTime) * 1000);

                if ($response->successful()) {
                    $json = $response->json();
                    $parsedItems = $this->parseOutlineContractODataItems($json);

                    if (!empty($search)) {
                        $term = strtolower(trim($search));
                        $parsedItems = array_values(array_filter($parsedItems, function ($it) use ($term) {
                            return str_contains(strtolower($it['PurchaseContractType'] ?? $it['code'] ?? ''), $term)
                                || str_contains(strtolower($it['PurchasingDocumentTypeName'] ?? $it['name'] ?? ''), $term)
                                || str_contains(strtolower($it['PurchasingDocumentType'] ?? ''), $term)
                                || str_contains(strtolower($it['PurchasingDocumentCategory'] ?? ''), $term);
                        }));
                    }

                    return [
                        'success' => true,
                        'is_live' => true,
                        'status' => $response->status(),
                        'latency_ms' => $durationMs,
                        'source' => 'SAP S/4HANA Cloud (Live CDS: YY1_OUTLINECONTRACT_CDS)',
                        'endpoint' => $endpoint,
                        'count' => count($parsedItems),
                        'items' => $parsedItems,
                        'message' => "Successfully fetched " . count($parsedItems) . " outline contracts live from SAP S/4HANA Cloud in {$durationMs}ms.",
                    ];
                }

                $errorBody = $response->body();
                Log::warning('SAP Outline Contract CDS View fetch returned non-200: ' . $response->status(), [
                    'body' => substr($errorBody, 0, 500),
                ]);

                return [
                    'success' => false,
                    'is_live' => false,
                    'status' => $response->status(),
                    'source' => 'Fallback (Live SAP CDS Request failed)',
                    'endpoint' => $endpoint,
                    'items' => $this->getFormattedFallbackOutlineContracts($search),
                    'message' => "SAP S/4HANA Cloud responded with HTTP {$response->status()}. Serving fallback catalog.",
                    'error_details' => substr($errorBody, 0, 300),
                ];
            } catch (\Exception $e) {
                Log::error('SAP Outline Contract CDS View fetch exception: ' . $e->getMessage());

                return [
                    'success' => false,
                    'is_live' => false,
                    'source' => 'Fallback (Exception during SAP fetch)',
                    'endpoint' => $endpoint,
                    'items' => $this->getFormattedFallbackOutlineContracts($search),
                    'message' => "Could not reach SAP S/4HANA Cloud: {$e->getMessage()}. Serving fallback catalog.",
                ];
            }
        }

        return [
            'success' => true,
            'is_live' => false,
            'source' => 'Fallback Catalog',
            'endpoint' => $endpoint,
            'count' => count($this->getFormattedFallbackOutlineContracts($search)),
            'items' => $this->getFormattedFallbackOutlineContracts($search),
            'message' => 'Serving fallback outline contracts (SAP credentials not configured).',
        ];
    }

    /**
     * Parse raw SAP OData V2 or V4 payload into standardized Outline Contract records.
     * Response fields supported:
     * - PurchaseContractType (e.g. "CMK")
     * - PurchasingDocumentType (e.g. "CMK")
     * - PurchasingDocumentCategory (e.g. "K")
     * - PurchasingDocumentTypeName (e.g. "Qty Contract-PSE")
     */
    public function parseOutlineContractODataItems(array $json): array
    {
        $rawRecords = [];
        if (isset($json['d']['results']) && is_array($json['d']['results'])) {
            $rawRecords = $json['d']['results'];
        } elseif (isset($json['d']) && is_array($json['d'])) {
            $rawRecords = $json['d'];
        } elseif (isset($json['value']) && is_array($json['value'])) {
            $rawRecords = $json['value'];
        } elseif (isset($json[0]) && is_array($json[0])) {
            $rawRecords = $json;
        }

        $parsed = [];
        foreach ($rawRecords as $rec) {
            $contractType = trim((string)($rec['PurchaseContractType'] ?? $rec['PurchasingDocumentType'] ?? $rec['code'] ?? ''));
            if ($contractType === '') {
                continue;
            }

            $docType = trim((string)($rec['PurchasingDocumentType'] ?? $contractType));
            $docCategory = trim((string)($rec['PurchasingDocumentCategory'] ?? 'K'));
            $docTypeName = trim((string)($rec['PurchasingDocumentTypeName'] ?? $rec['name'] ?? ''));

            $extraParts = [];
            if ($docCategory !== '') {
                $extraParts[] = "Cat: {$docCategory}";
            }
            if ($docType !== '') {
                $extraParts[] = "Type: {$docType}";
            }
            if ($docTypeName !== '') {
                $extraParts[] = $docTypeName;
            }
            $extra = !empty($extraParts) ? implode(' • ', $extraParts) : "Contract Type {$contractType}";

            $parsed[] = [
                'code' => $contractType,
                'name' => $docTypeName !== '' ? "{$contractType} - {$docTypeName}" : $contractType,
                'extra' => $extra,
                'PurchaseContractType' => $contractType,
                'PurchasingDocumentType' => $docType,
                'PurchasingDocumentCategory' => $docCategory,
                'PurchasingDocumentTypeName' => $docTypeName,
                'raw_data' => $rec,
            ];
        }

        return !empty($parsed) ? $parsed : $this->getFormattedFallbackOutlineContracts();
    }

    /**
     * Fallback realistic outline contract types representing SAP S/4HANA Cloud
     * YY1_OUTLINECONTRACT_CDS view data for Assam Petro-Chemicals Ltd.
     */
    public function getFormattedFallbackOutlineContracts(?string $search = null): array
    {
        $items = [
            [
                'code' => 'CMK',
                'name' => 'CMK - Qty Contract-PSE',
                'extra' => 'Cat: K • Type: CMK • Qty Contract-PSE',
                'PurchaseContractType' => 'CMK',
                'PurchasingDocumentType' => 'CMK',
                'PurchasingDocumentCategory' => 'K',
                'PurchasingDocumentTypeName' => 'Qty Contract-PSE',
            ],
            [
                'code' => 'CWK',
                'name' => 'CWK - Value Contract-PSE',
                'extra' => 'Cat: K • Type: CWK • Value Contract-PSE',
                'PurchaseContractType' => 'CWK',
                'PurchasingDocumentType' => 'CWK',
                'PurchasingDocumentCategory' => 'K',
                'PurchasingDocumentTypeName' => 'Value Contract-PSE',
            ],
            [
                'code' => 'MK',
                'name' => 'MK - Quantity Contract',
                'extra' => 'Cat: K • Type: MK • Quantity Contract',
                'PurchaseContractType' => 'MK',
                'PurchasingDocumentType' => 'MK',
                'PurchasingDocumentCategory' => 'K',
                'PurchasingDocumentTypeName' => 'Quantity Contract',
            ],
            [
                'code' => 'WK',
                'name' => 'WK - Value Contract',
                'extra' => 'Cat: K • Type: WK • Value Contract',
                'PurchaseContractType' => 'WK',
                'PurchasingDocumentType' => 'WK',
                'PurchasingDocumentCategory' => 'K',
                'PurchasingDocumentTypeName' => 'Value Contract',
            ],
            [
                'code' => 'ZCMC',
                'name' => 'ZCMC - Composite Contract',
                'extra' => 'Cat: K • Type: ZCMC • Composite Contract',
                'PurchaseContractType' => 'ZCMC',
                'PurchasingDocumentType' => 'ZCMC',
                'PurchasingDocumentCategory' => 'K',
                'PurchasingDocumentTypeName' => 'Composite Contract',
            ],
            [
                'code' => 'ZMAC',
                'name' => 'ZMAC - Material Contract',
                'extra' => 'Cat: K • Type: ZMAC • Material Contract',
                'PurchaseContractType' => 'ZMAC',
                'PurchasingDocumentType' => 'ZMAC',
                'PurchasingDocumentCategory' => 'K',
                'PurchasingDocumentTypeName' => 'Material Contract',
            ],
            [
                'code' => 'ZSRC',
                'name' => 'ZSRC - Service Contract',
                'extra' => 'Cat: K • Type: ZSRC • Service Contract',
                'PurchaseContractType' => 'ZSRC',
                'PurchasingDocumentType' => 'ZSRC',
                'PurchasingDocumentCategory' => 'K',
                'PurchasingDocumentTypeName' => 'Service Contract',
            ],
        ];

        if (!empty($search)) {
            $term = strtolower(trim($search));
            $items = array_values(array_filter($items, function ($it) use ($term) {
                return str_contains(strtolower($it['PurchaseContractType'] ?? $it['code'] ?? ''), $term)
                    || str_contains(strtolower($it['PurchasingDocumentTypeName'] ?? $it['name'] ?? ''), $term)
                    || str_contains(strtolower($it['PurchasingDocumentType'] ?? ''), $term)
                    || str_contains(strtolower($it['PurchasingDocumentCategory'] ?? ''), $term);
            }));
        }

        return $items;
    }
}



