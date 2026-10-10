<?php

namespace App\Services;

use App\Models\Attachment;
use App\Models\PrDocumentType;
use App\Models\PurchaseRequisition;
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
     * YY1_MATERIALS_CDS / YY1_MATERIALS
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
            'https://my443544-api.s4hana.cloud.sap/sap/opu/odata/sap/YY1_MATERIALS_CDS/YY1_MATERIALS?$format=json'
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
                $cleanedValuationArea = $valuationArea ? trim($valuationArea) : null;

                // If a specific material number was provided, attempt targeted OData query
                if (!empty($cleanedMaterial)) {
                    // 1. Try querying with both Product and ValuationArea if provided
                    if (!empty($cleanedValuationArea)) {
                        $filterQuery = "Product eq '{$cleanedMaterial}' and ValuationArea eq '{$cleanedValuationArea}'";
                        $targetUrl = $baseUri . "?\$filter=" . urlencode($filterQuery) . "&\$format=json";
                        $resp = (clone $request)->get($targetUrl);
                        if ($resp->successful()) {
                            $parsedItems = $this->parseMaterialODataItems($resp->json());
                            if (!empty($parsedItems)) {
                                $response = $resp;
                            }
                        }
                    }

                    // 2. If no response yet or 0 items with ValuationArea, query by Product only
                    if (!$response) {
                        $filterQuery = "Product eq '{$cleanedMaterial}'";
                        $targetUrl = $baseUri . "?\$filter=" . urlencode($filterQuery) . "&\$format=json";
                        $resp = (clone $request)->get($targetUrl);
                        if ($resp->successful()) {
                            $response = $resp;
                        }
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
                        $matched = array_values(array_filter($items, function ($it) use ($cleanedMaterial, $cleanedValuationArea) {
                            $prodMatch = strtolower($it['Product']) === strtolower($cleanedMaterial)
                                || strtolower($it['code']) === strtolower($cleanedMaterial);
                            if ($cleanedValuationArea && !empty($it['ValuationArea'])) {
                                return $prodMatch && (strtolower($it['ValuationArea']) === strtolower($cleanedValuationArea));
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
                                || str_contains(strtolower($it['name']), $term);
                        }));
                    }

                    return [
                        'success' => true,
                        'is_live' => true,
                        'status' => $response->status(),
                        'latency_ms' => $durationMs,
                        'source' => 'SAP S/4HANA Cloud (Live CDS: YY1_MATERIALS_CDS)',
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
            $weightUnit = trim((string)($rec['WeightUnit'] ?? ''));
            $uom = trim((string)($rec['UnitOfMeasure'] ?? $baseUnit));
            $productDesc = trim((string)($rec['ProductDescription'] ?? ''));
            $productDesc1 = trim((string)($rec['ProductDescription_1'] ?? ''));
            $productDesc2 = trim((string)($rec['ProductDescription_2'] ?? ''));
            $productDesc3 = trim((string)($rec['ProductDescription_3'] ?? ''));
            $movingAveragePrice = (string)($rec['MovingAveragePrice'] ?? '0.00');
            $standardPrice = (string)($rec['StandardPrice'] ?? '0.00');
            $invValProcedure = trim((string)($rec['InventoryValuationProcedure'] ?? ''));
            $currency = trim((string)($rec['Currency'] ?? ''));
            $valuationArea = trim((string)($rec['ValuationArea'] ?? ''));

            // Valuation Price calculation based on Price Control (InventoryValuationProcedure):
            // If InventoryValuationProcedure = 'V' -> MovingAveragePrice
            // If InventoryValuationProcedure = 'S' -> StandardPrice
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
                'ProductExternalID' => $productExternalId,
                'WeightUnit' => $weightUnit,
                'UnitOfMeasure' => $uom,
                'ProductGroup' => trim((string)$productGroup),
                'ProductDescription' => $productDesc,
                'ProductDescription_1' => $productDesc1,
                'ProductDescription_2' => $productDesc2,
                'ProductDescription_3' => $productDesc3,
                'ProductName' => trim((string)$productName),
                'ProductType' => trim((string)$productType),
                'MovingAveragePrice' => $movingAveragePrice,
                'StandardPrice' => $standardPrice,
                'InventoryValuationProcedure' => $invValProcedure,
                'priceControl' => $invValProcedure,
                'Currency' => $currency,
                'ValuationArea' => $valuationArea,
                'valuationPrice' => $computedValuationPrice,
                'UnitPrice' => $effectiveUnitPrice,
                'code' => trim((string)$product),
                'name' => trim((string)$productName),
                'uom' => $uom,
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
}
