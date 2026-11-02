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
     * Base URL for SAP S/4HANA Cloud instance
     */
    protected string $baseUrl;

    /**
     * Default realistic fallback document types representing SAP S/4HANA Cloud
     * I_PurchaseRequisitionType CDS view release data for Assam Petro-Chemicals Ltd.
     */
    protected array $fallbackDocumentTypes = [];

    public function __construct(?string $baseUrl = null)
    {
        $this->baseUrl = rtrim(
            $baseUrl ?: config('sap.tenant_url', env('SAP_S4HANA_URL', 'https://my443544-api.s4hana.cloud.sap')),
            '/'
        );
    }

    /**
     * Get the configured SAP S/4HANA Cloud base URL.
     */
    public function getBaseUrl(): string
    {
        return $this->baseUrl;
    }

    /**
     * Resolve endpoint URL using config key with fallback to base URL + relative path.
     *
     * @param string $configKey Key inside config('sap.endpoints.*')
     * @param string $relativePath Default relative path (e.g. '/sap/opu/odata/sap/...')
     * @return string
     */
    public function getEndpoint(string $configKey, string $relativePath): string
    {
        $configured = config("sap.endpoints.{$configKey}");
        if (!empty($configured)) {
            // Clean up any literal escaped dollar signs (e.g. \$format -> $format)
            $configured = str_replace('\$', '$', $configured);

            if (!str_starts_with($configured, 'http://') && !str_starts_with($configured, 'https://')) {
                return $this->baseUrl . '/' . ltrim($configured, '/');
            }
            return $configured;
        }

        return $this->baseUrl . '/' . ltrim($relativePath, '/');
    }

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
        $endpoint = $endpointUrl ?: $this->getEndpoint(
            'pr_document_types',
            '/sap/opu/odata/sap/YY1_PURCHASEREQTYPE_CDS/YY1_PURCHASEREQTYPE?$format=json'
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
        $endpoint = $endpointUrl ?: $this->getEndpoint(
            'materials',
            '/sap/opu/odata/sap/YY1_PRODUCTPLANTVALUATION_CDS/YY1_ProductPlantValuation?$format=json'
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
        $endpoint = $endpointUrl ?: $this->getEndpoint(
            'account_assignment_categories',
            '/sap/opu/odata/sap/YY1_ACCOUNTASSIGNMENTCAT_CDS/YY1_AccountAssignmentCat?$format=json'
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
        return [];
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
        $endpoint = $endpointUrl ?: $this->getEndpoint(
            'plants',
            '/sap/opu/odata/sap/ZUI_TMS_DESPATCH_04/PlantVH?format=json'
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

        return $parsed;
    }

    /**
     * Get fallback plants matching live SAP PlantVH service data.
     */
    public function getFormattedFallbackPlants(): array
    {
        return [];
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
        $endpoint = $endpointUrl ?: $this->getEndpoint(
            'storage_locations',
            '/sap/opu/odata/sap/ZUI_TMS_DESPATCH_04/StorageLocationVH?format=json'
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

        return $parsed;
    }

    /**
     * Get fallback storage locations matching live SAP StorageLocationVH service data.
     */
    public function getFormattedFallbackStorageLocations(?string $plant = null): array
    {
        return [];
    }

    /**
     * Default realistic fallback material groups representing SAP S/4HANA Cloud
     * YY1_MATERIALGROUP_CDS / YY1_MATERIALGROUP CDS view release data.
     */
    protected array $fallbackMaterialGroups = [];

    /**
     * Get fallback material groups matching live SAP YY1_MATERIALGROUP_CDS service data.
     */
    public function getFormattedFallbackMaterialGroups(): array
    {
        return [];
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
        $endpoint = $endpointUrl ?: $this->getEndpoint(
            'material_groups',
            '/sap/opu/odata/sap/YY1_MATERIALGROUP_CDS/YY1_MATERIALGROUP?$format=json'
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

        return $parsed;
    }

    /**
     * Format a descriptive, user-friendly error message when SAP CSRF token handshake fails.
     */
    protected function formatSapTokenErrorMessage(int $statusCode, string $serviceName = 'SAP S/4HANA Cloud'): string
    {
        return match ($statusCode) {
            401 => "SAP S/4HANA Cloud Authentication Failed (HTTP 401): Communication User credentials rejected or expired. Please verify SAP_ODATA_USER and SAP_ODATA_PASSWORD credentials.",
            403 => "SAP S/4HANA Cloud Access Forbidden (HTTP 403): Communication User lacks authorization to access {$serviceName}.",
            404 => "SAP S/4HANA Cloud Service Not Found (HTTP 404): The {$serviceName} endpoint was not reachable at the configured URL.",
            408, 504 => "SAP S/4HANA Cloud Gateway Timeout (HTTP {$statusCode}): Connection to {$serviceName} timed out.",
            500, 502, 503 => "SAP S/4HANA Cloud Server Error (HTTP {$statusCode}): The remote SAP server is temporarily unavailable.",
            200, 204 => "SAP S/4HANA Cloud security handshake incomplete: The server responded with HTTP {$statusCode} but did not return an x-csrf-token header.",
            default => "SAP S/4HANA Cloud handshake failed with HTTP {$statusCode} while obtaining security token.",
        };
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
        $endpoint = $this->getEndpoint(
            'purchase_requisition_process',
            '/sap/opu/odata4/sap/api_purchaserequisition_2/srvd_a2x/sap/purchaserequisition/0001/PurchaseReqn'
        );
        $serviceRoot = $this->getEndpoint(
            'service_root',
            '/sap/opu/odata4/sap/api_purchaserequisition_2/srvd_a2x/sap/purchaserequisition/0001/'
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

        // Build SAP UoM → ISO code mapping from CDS View for accurate BaseUnitISOCode
        $uomIsoMapping = $this->buildUomIsoMapping();

        $payload = $purchaseRequisition->toSapODataV4Payload($doOnlyValidation, $uomIsoMapping);

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
                $statusCode = $tokenRes->getStatusCode();
                Log::error('SAP CSRF Token fetch failed: HTTP ' . $statusCode);
                return [
                    'success' => false,
                    'sap_pr_number' => null,
                    'status' => $statusCode,
                    'message' => $this->formatSapTokenErrorMessage($statusCode, 'Purchase Requisition API'),
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
        $endpoint = $this->getEndpoint(
            'attachment_content',
            '/sap/opu/odata/sap/API_CV_ATTACHMENT_SRV/AttachmentContentSet'
        );
        $serviceRoot = $this->getEndpoint(
            'attachment_service_root',
            '/sap/opu/odata/sap/API_CV_ATTACHMENT_SRV/'
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
                $statusCode = $tokenRes->getStatusCode();
                $msg = $this->formatSapTokenErrorMessage($statusCode, 'SAP Attachment Service');
                $attachment->update([
                    'sap_sync_status' => 'failed',
                    'sap_sync_message' => $msg,
                ]);

                return [
                    'success' => false,
                    'status' => $statusCode,
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
        $endpoint = $this->getEndpoint(
            'contract_requisition',
            '/sap/opu/odata4/sap/yy1_api_contractrequisition/srvd_a2x/sap/yy1_api_contractrequisition/0001/ContractRequisition'
        );
        $serviceRoot = $this->getEndpoint(
            'contract_requisition_service_root',
            '/sap/opu/odata4/sap/yy1_api_contractrequisition/srvd_a2x/sap/yy1_api_contractrequisition/0001/'
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
                $statusCode = $tokenRes->getStatusCode();
                Log::error('SAP Contract Requisition CSRF Token fetch failed: HTTP ' . $statusCode);
                return [
                    'success' => false,
                    'status' => $statusCode,
                    'message' => $this->formatSapTokenErrorMessage($statusCode, 'Contract Requisition Service'),
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
        $endpoint = $endpointUrl ?: $this->getEndpoint(
            'gl_accounts',
            '/sap/opu/odata/sap/YY1_I_GLACCOUNTINCOMPANYCO_CDS/YY1_I_GLACCOUNTINCOMPANYCO?$format=json'
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
        return [];
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
        $endpoint = $endpointUrl ?: $this->getEndpoint(
            'cost_centers',
            '/sap/opu/odata/sap/YY1_COSTCENTER_CDS/YY1_COSTCENTER?$format=json'
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
                                || str_contains(strtolower($it['CostCenterName'] ?? ''), $term)
                                || str_contains(strtolower($it['CostCenterDescription'] ?? ''), $term)
                                || str_contains(strtolower($it['name'] ?? ''), $term)
                                || str_contains(strtolower($it['description'] ?? ''), $term)
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
                    'message' => "No Value Found. SAP S/4HANA Cloud responded with HTTP {$response->status()}: " .
                        ($response->status() === 401 ? 'Invalid or unauthorized Communication User credentials.' : 'Check CDS View service exposure.'),
                    'items' => [],
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
                    'message' => "No Value Found. Failed to connect to SAP Cloud endpoint: " . $e->getMessage(),
                    'items' => [],
                ];
            }
        }

        return [
            'success' => false,
            'is_live' => false,
            'status' => 200,
            'source' => 'SAP S/4HANA Cloud (Credentials Missing)',
            'endpoint' => $endpoint,
            'count' => 0,
            'items' => [],
            'message' => 'No Value Found. SAP Communication User credentials not configured.',
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

        // Master cost center descriptions for Assam Petro-Chemicals Ltd.
        // Resolves the Cartesian cross-join returned by SAP CDS View YY1_COSTCENTER_CDS.
        $costCenterMasterCatalog = [
            '10101PCC01' => [
                'name' => 'NG & GTC CNS-100 MTH',
                'description' => 'NG & GTC CONSUMPTION-100 TPD METH',
            ],
            '10102PCC02' => [
                'name' => 'WATER CNSMN-100 METH',
                'description' => 'WATER CONSUMPTION-100 TPD METH',
            ],
            '10102PCC03' => [
                'name' => 'ENRGY CNSMN-100 METH',
                'description' => 'ENERGY CONSUMPTION-100 TPD METH',
            ],
            '10103PCC04' => [
                'name' => 'CHMCL CONSM-100 MTH',
                'description' => 'CHEMICALS CONSUMPTION-100 TPD METH',
            ],
            '10104PCC05' => [
                'name' => 'STORE CONSM-100 MTH',
                'description' => 'STORE CONSUMPTION-100 TPD METH',
            ],
            '10105PCC06' => [
                'name' => 'MNTNC COST-100 MTH',
                'description' => 'MAINTENANCE COST-100 TPD METH',
            ],
            '10106PCC07' => [
                'name' => 'DRT EMPL CST-100 MTH',
                'description' => 'DIRECT EMP COST-100 TPD METH',
            ],
            '10107PCC08' => [
                'name' => 'PRODN OVHD-100 METH',
                'description' => 'PRODN OVERHEAD-100 TPD METH',
            ],
            '10108PCC09' => [
                'name' => 'QC COST-100 TPD METH',
                'description' => 'QC COST-100 TPD METH',
            ],
            '10109PCC10' => [
                'name' => 'ADMN OVHD-100 METH',
                'description' => 'ADMIN OVERHEAD-100 TPD METH',
            ],
            '10110PCC11' => [
                'name' => 'S&D OVHD-100 METH',
                'description' => 'S&D OVERHEAD-100 TPD METH',
            ],
            '10101PCC12' => [
                'name' => 'PRDN ADMN OVH-NAMRUP',
                'description' => 'PRODUCTION ADMIN OVERHEAD-NAMRUP',
            ],
            '10101PCC13' => [
                'name' => 'MECH ADMN OVH-NAMRUP',
                'description' => 'MECHANICAL ADMIN OVERHEAD-NAMRUP',
            ],
            '10108PCC14' => [
                'name' => 'CIVL ADMN OVH-NAMRUP',
                'description' => 'CIVIL ADMIN OVERHEAD-NAMRUP',
            ],
            '10201PCC01' => [
                'name' => 'NG & GTC CONSUMPTION',
                'description' => 'NG & GTC CONSUMPTION-500 TPD METH',
            ],
            '10702ACC02' => [
                'name' => 'F&A ADMIN OVHD-NMRUP',
                'description' => 'FINANCE & ACCOUNTS ADMIN OVERHEAD-NAMRUP',
            ],
            '10705ACC05' => [
                'name' => 'C&P ADMN OVH-NAMRUP',
                'description' => 'CONTRACT & PROCUREMENT ADMIN OVHD-NAMRUP',
            ],
            '10707ACC07' => [
                'name' => 'P&A ADMN OVH-NAMRUP',
                'description' => 'PERSONNEL & ADMIN OVERHEAD-NAMRUP',
            ],
            '10710ACC10' => [
                'name' => 'SECURITY ADMN OVH-NR',
                'description' => 'SECURITY ADMIN OVERHEAD-NAMRUP',
            ],
            '10712ACC15' => [
                'name' => 'MEDICAL ADMN OVH-NR',
                'description' => 'MEDICAL & HEALTH ADMIN OVERHEAD-NAMRUP',
            ],
        ];

        foreach ($rawRecords as $rec) {
            $costCenter = trim((string)($rec['CostCenter'] ?? $rec['cost_center'] ?? $rec['code'] ?? ''));
            if (empty($costCenter)) {
                continue;
            }

            if (isset($costCenterMasterCatalog[$costCenter])) {
                $costCenterName = $costCenterMasterCatalog[$costCenter]['name'];
                $costCenterDescription = $costCenterMasterCatalog[$costCenter]['description'];
            } else {
                $costCenterName = trim((string)($rec['CostCenterName'] ?? $rec['cost_center_name'] ?? $rec['CostCenterText'] ?? $rec['name'] ?? ''));
                $costCenterDescription = trim((string)($rec['CostCenterDescription'] ?? $rec['cost_center_description'] ?? $rec['description'] ?? ''));
            }

            $companyCode = trim((string)($rec['CompanyCode'] ?? $rec['company_code'] ?? ''));
            $controllingArea = trim((string)($rec['ControllingArea'] ?? $rec['controlling_area'] ?? ''));
            $profitCenter = trim((string)($rec['ProfitCenter'] ?? $rec['profit_center'] ?? ''));
            $plant = trim((string)($rec['Plant'] ?? $rec['plant'] ?? ''));

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

            $displayName = $costCenterName ?: ($costCenterDescription ?: $costCenter);
            $displayDesc = $costCenterDescription ?: ($costCenterName ?: '');
            $extra = !empty($extraParts) ? implode(' • ', $extraParts) : '';

            $parsed[] = [
                'code' => $costCenter,
                'name' => $displayName,
                'description' => $displayDesc,
                'extra' => $extra,
                'CostCenter' => $costCenter,
                'CostCenterName' => $costCenterName,
                'CostCenterDescription' => $costCenterDescription,
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
        return [];
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
        $endpoint = $endpointUrl ?: $this->getEndpoint(
            'suppliers',
            '/sap/opu/odata/sap/YY1_SUPPLIER_CDS/YY1_Supplier?$format=json'
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
        return [];
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
        $endpoint = $endpointUrl ?: $this->getEndpoint(
            'purchasing_organizations',
            '/sap/opu/odata/sap/YY1_PURCHASEORGANIZATION_CDS/YY1_PURCHASEORGANIZATION?$format=json'
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
                'code' => (string)$code,
                'name' => (string)$data['name'],
                'PurchasingOrganization' => (string)$code,
                'PurchasingOrganizationName' => (string)$data['name'],
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
        return [];
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
        $endpoint = $endpointUrl ?: $this->getEndpoint(
            'purchasing_groups',
            '/sap/opu/odata/sap/YY1_PURCHASINGGROUPAPI_CDS/YY1_PurchasingGroupAPI?$format=json'
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
        return [];
    }

    /**
     * Units of measure fallback list (empty - live SAP data only).
     */
    protected array $fallbackUnitsOfMeasure = [];

    /**
     * Get fallback units of measure matching SAP YY1_UNITOFMEASUREMENT_CDS schema.
     */
    public function getFormattedFallbackUnitsOfMeasure(): array
    {
        return [];
    }

    /**
     * Build a mapping of SAP UoM codes to their internal SAP unit codes and ISO codes.
     * Fetches from SAP CDS View (YY1_UNITOFMEASUREMENT_CDS) which provides:
     * - UnitOfMeasure (e.g. "AU")
     * - UnitOfMeasureCommercialName (e.g. "AU")
     * - UnitOfMeasureSAPCode (internal SAP unit, e.g. "LE")
     * - UnitOfMeasureISOCode (ISO unit, e.g. "C62")
     *
     * @return array<string, array{sapCode: string, isoCode: string}>
     */
    public function buildUomIsoMapping(): array
    {
        $mapping = [];

        // 1. Fetch all UoMs from SAP CDS View (uses Laravel cache internally)
        $uomResult = $this->fetchUnitsOfMeasureFromCdsView();

        $items = !empty($uomResult['items']) ? $uomResult['items'] : [];

        foreach ($items as $item) {
            $uomCode = trim((string)($item['UnitOfMeasure'] ?? $item['code'] ?? ''));
            $commercial = trim((string)($item['UnitOfMeasureCommercialName'] ?? ''));
            $sapInternal = trim((string)($item['UnitOfMeasureSAPCode'] ?? $item['sapCode'] ?? $uomCode));
            $iso = trim((string)($item['UnitOfMeasureISOCode'] ?? $item['isoCode'] ?? ''));

            if ($sapInternal === '') {
                $sapInternal = $uomCode;
            }

            if ($iso === '') {
                $iso = PurchaseRequisition::mapUnitOfMeasureToIso($sapInternal ?: $uomCode);
            }

            $entry = [
                'sapCode' => $sapInternal,
                'isoCode' => $iso,
            ];

            if ($uomCode !== '') {
                $mapping[strtoupper($uomCode)] = $entry;
            }
            if ($commercial !== '') {
                $mapping[strtoupper($commercial)] = $entry;
            }
            if ($sapInternal !== '') {
                $mapping[strtoupper($sapInternal)] = $entry;
            }
        }

        return $mapping;
    }

    /**
     * Resolve the ISO code for a given SAP internal UoM code.
     * Queries the UoM CDS view (cached) and falls back to hardcoded mapping.
     *
     * @param string $sapUnit SAP internal unit code (e.g. "AU", "PC", "KG")
     * @return string ISO code (e.g. "C62", "PCE", "KGM")
     */
    public function resolveUomIsoCode(string $sapUnit): string
    {
        $upper = strtoupper(trim($sapUnit));
        if (empty($upper)) {
            return 'EA';
        }

        $mapping = $this->buildUomIsoMapping();

        if (isset($mapping[$upper]) && $mapping[$upper] !== '') {
            return $mapping[$upper];
        }

        // Final fallback: hardcoded mapping from PurchaseRequisition model
        return PurchaseRequisition::mapUnitOfMeasureToIso($sapUnit);
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
        $endpoint = $endpointUrl ?: $this->getEndpoint(
            'units_of_measure',
            '/sap/opu/odata/sap/YY1_UNITOFMEASUREMENT_CDS/YY1_UnitOfMeasurement?$format=json'
        );

        $authUser = $username ?: config('sap.auth.username', env('SAP_ODATA_USER'));
        $authPass = $password ?: config('sap.auth.password', env('SAP_ODATA_PASSWORD'));

        if (!empty($authUser) && !empty($authPass)) {
            try {
                $startTime = microtime(true);
                $verifySsl = config('sap.verify_ssl', false);

                $cacheKey = 'sap_uom_items_all_v3';
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
     * Response fields supported (from YY1_UNITOFMEASUREMENT_CDS / I_UnitOfMeasure):
     * - UnitOfMeasure (SAP internal code, e.g. "AU")
     * - UnitOfMeasureCommercialName (commercial name, e.g. "AU")
     * - UnitOfMeasureLongName (long description, e.g. "Activity unit")
     * - UnitOfMeasureISOCode (ISO code required by OData V4, e.g. "ACT")
     * - UnitOfMeasureSAPCode (SAP internal code, e.g. "AU")
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
            $isoCode = trim((string)($rec['UnitOfMeasureISOCode'] ?? ''));
            $sapCode = trim((string)($rec['UnitOfMeasureSAPCode'] ?? $uom));

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
                'UnitOfMeasureISOCode' => $isoCode,
                'UnitOfMeasureSAPCode' => $sapCode,
                'isoCode' => $isoCode,
                'sapCode' => $sapCode,
                'Language' => $rec['Language'] ?? 'EN',
                'raw_data' => $rec,
            ];
        }

        return $parsed;
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
        $endpoint = $endpointUrl ?: $this->getEndpoint(
            'info_records',
            '/sap/opu/odata/sap/YY1_INFORECORD_CDS/YY1_INFORECORD?$format=json'
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

        return $parsed;
    }

    /**
     * Fallback purchasing info records for offline development or testing (empty - live only).
     */
    public function getFormattedFallbackInfoRecords(): array
    {
        return [];
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
        $endpoint = $endpointUrl ?: $this->getEndpoint(
            'tax_codes',
            '/sap/opu/odata/sap/YY1_TAXCODE_CDS/YY1_TAXCODE?$format=json'
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

        return $parsed;
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
     * Fallback tax codes (empty - live only).
     */
    public function getFormattedFallbackTaxCodes(?string $search = null): array
    {
        return [];
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
        $endpoint = $endpointUrl ?: $this->getEndpoint(
            'outline_contracts',
            '/sap/opu/odata/sap/YY1_OUTLINECONTRACT_CDS/YY1_OUTLINECONTRACT?$format=json'
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

        return $parsed;
    }

    /**
     * Fallback outline contract types (empty - live only).
     */
    public function getFormattedFallbackOutlineContracts(?string $search = null): array
    {
        return [];
    }
}



