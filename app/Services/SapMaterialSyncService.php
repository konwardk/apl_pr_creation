<?php

namespace App\Services;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SapMaterialSyncService
{
    protected string $meiliHost;
    protected ?string $meiliKey;
    protected string $indexName = 'sap_materials';
    protected string $localIndexPath;
    protected SapMasterDataService $sapService;

    public function __construct(?SapMasterDataService $sapService = null)
    {
        $this->sapService = $sapService ?: new SapMasterDataService();
        $this->meiliHost = rtrim(config('services.meilisearch.host', env('MEILISEARCH_HOST', 'http://127.0.0.1:7700')), '/');
        $this->meiliKey = config('services.meilisearch.key', env('MEILISEARCH_KEY'));
        $this->localIndexPath = storage_path('app/sap_materials_index.json');
    }

    /**
     * Check if Meilisearch instance is reachable.
     */
    public function isMeilisearchHealthy(): bool
    {
        try {
            $req = Http::timeout(1.5);
            if (!empty($this->meiliKey) && $this->meiliKey !== 'null') {
                $req = $req->withToken($this->meiliKey);
            }
            $res = $req->get("{$this->meiliHost}/health");
            return $res->successful() && ($res->json('status') === 'available' || $res->status() === 200);
        } catch (\Throwable $e) {
            return false;
        }
    }

    /**
     * Configure the sap_materials index settings in Meilisearch.
     */
    public function configureIndexSettings(): bool
    {
        if (!$this->isMeilisearchHealthy()) {
            return false;
        }

        try {
            $req = $this->meiliClient();

            // 1. Ensure index exists with primaryKey 'id'
            $req->post("{$this->meiliHost}/indexes", [
                'uid' => $this->indexName,
                'primaryKey' => 'id',
            ]);

            // 2. Set index configuration
            $settingsRes = $this->meiliClient()->patch("{$this->meiliHost}/indexes/{$this->indexName}/settings", [
                'searchableAttributes' => [
                    'Material',
                    'MaterialDescription',
                    'ManufacturerPartNumber',
                    'poText',
                ],
                'filterableAttributes' => [
                    'MaterialGroup',
                    'MaterialType',
                    'BaseUnit',
                    'Plant',
                ],
                'sortableAttributes' => [
                    'Material',
                    'MaterialDescription',
                    'valuationPrice',
                ],
                'rankingRules' => [
                    'words',
                    'typo',
                    'proximity',
                    'attribute',
                    'sort',
                    'exactness',
                ],
                'typoTolerance' => [
                    'enabled' => true,
                    'minWordSizeForTypos' => [
                        'oneTypo' => 3,
                        'twoTypos' => 7,
                    ],
                ],
            ]);

            return $settingsRes->successful();
        } catch (\Throwable $e) {
            Log::warning('Meilisearch settings configuration warning: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Sync ~15,000 materials from SAP S/4HANA Cloud OData endpoint into Meilisearch and local zero-SQL cache.
     *
     * @param callable|null $progressCallback function(string $message, int $fetchedCount, int $batchCount)
     * @return array
     */
    public function sync(?callable $progressCallback = null): array
    {
        $startTime = microtime(true);
        $endpoint = config('sap.endpoints.materials', 'https://my443658.s4hana.cloud.sap/sap/opu/odata/sap/YY1_PRODUCTPLANTVALUATION_CDS/YY1_ProductPlantValuation?$format=json');
        $baseUri = explode('?', $endpoint)[0];

        [$authUser, $authPass] = $this->sapService->getAuthCredentials();
        $verifySsl = config('sap.verify_ssl', false);

        $client = Http::timeout(30)
            ->withBasicAuth($authUser, $authPass)
            ->withHeaders([
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
            ]);

        if (!$verifySsl) {
            $client = $client->withoutVerifying();
        }

        $allDocuments = [];
        $pageSize = 1000;
        $skip = 0;
        $hasMore = true;
        $page = 1;
        $meiliPushed = 0;
        $meiliAvailable = $this->isMeilisearchHealthy();

        if ($meiliAvailable) {
            $this->configureIndexSettings();
        }

        while ($hasMore) {
            $url = "{$baseUri}?\$top={$pageSize}&\$skip={$skip}&\$format=json";
            if ($progressCallback) {
                $progressCallback("Fetching SAP materials page {$page} (skip: {$skip}, top: {$pageSize})...", count($allDocuments), 0);
            }

            try {
                $res = (clone $client)->get($url);
            } catch (\Throwable $e) {
                Log::error("SAP material sync failed on skip {$skip}: " . $e->getMessage());
                break;
            }

            if (!$res->successful()) {
                Log::warning("SAP material sync received non-200 status {$res->status()} on skip {$skip}");
                break;
            }

            $json = $res->json();
            $records = [];
            if (isset($json['d']['results']) && is_array($json['d']['results'])) {
                $records = $json['d']['results'];
            } elseif (isset($json['d']) && is_array($json['d'])) {
                $records = $json['d'];
            } elseif (isset($json['value']) && is_array($json['value'])) {
                $records = $json['value'];
            }

            if (empty($records)) {
                $hasMore = false;
                break;
            }

            $batchDocs = [];
            foreach ($records as $rec) {
                $doc = $this->normalizeSapRecord($rec);
                if ($doc) {
                    $batchDocs[] = $doc;
                    $allDocuments[] = $doc;
                }
            }

            // Push batch to Meilisearch if available
            if ($meiliAvailable && !empty($batchDocs)) {
                try {
                    $pushRes = $this->meiliClient()->post("{$this->meiliHost}/indexes/{$this->indexName}/documents?primaryKey=id", $batchDocs);
                    if ($pushRes->successful()) {
                        $meiliPushed += count($batchDocs);
                    }
                } catch (\Throwable $e) {
                    Log::warning('Failed pushing batch to Meilisearch: ' . $e->getMessage());
                }
            }

            if ($progressCallback) {
                $progressCallback("Fetched " . count($batchDocs) . " materials (Total: " . count($allDocuments) . ")", count($allDocuments), count($batchDocs));
            }

            // Check if SAP returned fewer items than requested (end of data)
            if (count($records) < $pageSize) {
                $hasMore = false;
            } else {
                $skip += $pageSize;
                $page++;
            }
        }

        // Store into local zero-SQL cache file (storage/app/sap_materials_index.json)
        if (!empty($allDocuments)) {
            $dir = dirname($this->localIndexPath);
            if (!File::isDirectory($dir)) {
                File::makeDirectory($dir, 0755, true);
            }
            File::put($this->localIndexPath, json_encode([
                'updated_at' => now()->toIso8601String(),
                'count' => count($allDocuments),
                'documents' => $allDocuments,
            ], JSON_UNESCAPED_UNICODE));
        }

        $durationMs = round((microtime(true) - $startTime) * 1000);

        return [
            'success' => count($allDocuments) > 0,
            'total_synced' => count($allDocuments),
            'meilisearch_pushed' => $meiliPushed,
            'meilisearch_available' => $meiliAvailable,
            'duration_ms' => $durationMs,
            'cached_locally' => file_exists($this->localIndexPath),
        ];
    }

    /**
     * Search materials via Meilisearch or fallback zero-SQL local index.
     *
     * @param string $query Search string (Material SKU or Description)
     * @param array $filters ['group' => '...', 'type' => '...', 'plant' => '...']
     * @param int $limit Default 20
     * @param int $offset Default 0
     * @return array
     */
    public function search(string $query = '', array $filters = [], int $limit = 20, int $offset = 0): array
    {
        $cleanQuery = trim($query);
        $limit = max(1, min($limit, 100));
        $offset = max(0, $offset);

        // 1. Try Meilisearch first if healthy
        if ($this->isMeilisearchHealthy()) {
            try {
                $filterParts = [];
                if (!empty($filters['group'])) {
                    $cleanGroup = addslashes(trim($filters['group']));
                    $filterParts[] = "MaterialGroup = \"{$cleanGroup}\"";
                }
                if (!empty($filters['type'])) {
                    $cleanType = addslashes(trim($filters['type']));
                    $filterParts[] = "MaterialType = \"{$cleanType}\"";
                }
                if (!empty($filters['plant'])) {
                    $cleanPlant = addslashes(trim($filters['plant']));
                    $filterParts[] = "Plant = \"{$cleanPlant}\"";
                }

                $body = [
                    'q' => $cleanQuery,
                    'limit' => $limit,
                    'offset' => $offset,
                    'attributesToHighlight' => ['Material', 'MaterialDescription'],
                    'highlightPreTag' => '<mark class="bg-yellow-200 text-yellow-900 font-bold rounded px-0.5">',
                    'highlightPostTag' => '</mark>',
                    'facets' => ['MaterialGroup', 'MaterialType', 'Plant'],
                ];

                if (!empty($filterParts)) {
                    $body['filter'] = implode(' AND ', $filterParts);
                }

                $res = $this->meiliClient()->post("{$this->meiliHost}/indexes/{$this->indexName}/search", $body);

                if ($res->successful()) {
                    $data = $res->json();
                    return [
                        'success' => true,
                        'source' => 'meilisearch',
                        'query' => $cleanQuery,
                        'totalHits' => $data['totalHits'] ?? $data['estimatedTotalHits'] ?? count($data['hits'] ?? []),
                        'limit' => $limit,
                        'offset' => $offset,
                        'hits' => $data['hits'] ?? [],
                        'facets' => $data['facetDistribution'] ?? [],
                    ];
                }
            } catch (\Throwable $e) {
                Log::warning('Meilisearch search error, falling back to local index: ' . $e->getMessage());
            }
        }

        // 2. Fallback to high-speed zero-SQL local cached index
        return $this->searchLocalIndex($cleanQuery, $filters, $limit, $offset);
    }

    /**
     * Search against the local memory/cached index (storage/app/sap_materials_index.json).
     */
    protected function searchLocalIndex(string $query, array $filters = [], int $limit = 20, int $offset = 0): array
    {
        $docs = $this->getLocalDocuments();
        $term = strtolower(trim($query));
        $searchWords = array_filter(explode(' ', $term));

        $filtered = array_filter($docs, function ($doc) use ($term, $searchWords, $filters) {
            // Apply filters
            if (!empty($filters['group']) && strcasecmp((string)$doc['MaterialGroup'], (string)$filters['group']) !== 0) {
                return false;
            }
            if (!empty($filters['type']) && strcasecmp((string)$doc['MaterialType'], (string)$filters['type']) !== 0) {
                return false;
            }
            if (!empty($filters['plant']) && strcasecmp((string)$doc['Plant'], (string)$filters['plant']) !== 0) {
                return false;
            }

            if ($term === '') {
                return true;
            }

            $mat = strtolower((string)($doc['Material'] ?? ''));
            $desc = strtolower((string)($doc['MaterialDescription'] ?? ''));
            $part = strtolower((string)($doc['ManufacturerPartNumber'] ?? ''));
            $poText = strtolower((string)($doc['poText'] ?? ''));
            $combined = "{$mat} {$desc} {$part} {$poText}";

            if (count($searchWords) > 1) {
                foreach ($searchWords as $w) {
                    if (!str_contains($combined, $w)) {
                        return false;
                    }
                }
                return true;
            }

            return str_contains($mat, $term) || str_contains($desc, $term) || str_contains($part, $term) || str_contains($poText, $term);
        });

        // Compute scores and rank matches
        if ($term !== '') {
            usort($filtered, function ($a, $b) use ($term) {
                return $this->scoreLocalDoc($b, $term) <=> $this->scoreLocalDoc($a, $term);
            });
        }

        $totalHits = count($filtered);
        $slice = array_slice($filtered, $offset, $limit);

        // Highlight matching terms in _formatted identical to Meilisearch
        $hits = array_map(function ($doc) use ($term) {
            $formatted = $doc;
            if ($term !== '') {
                $escaped = preg_quote($term, '/');
                $replacement = '<mark class="bg-yellow-200 text-yellow-900 font-bold rounded px-0.5">$0</mark>';
                $formatted['Material'] = preg_replace("/{$escaped}/i", $replacement, (string)$doc['Material']);
                $formatted['MaterialDescription'] = preg_replace("/{$escaped}/i", $replacement, (string)$doc['MaterialDescription']);
            }
            $doc['_formatted'] = $formatted;
            return $doc;
        }, $slice);

        // Compute facets
        $facets = [
            'MaterialGroup' => [],
            'MaterialType' => [],
            'Plant' => [],
        ];
        foreach ($docs as $d) {
            $g = $d['MaterialGroup'] ?? '';
            $t = $d['MaterialType'] ?? '';
            $p = $d['Plant'] ?? '';
            if ($g) $facets['MaterialGroup'][$g] = ($facets['MaterialGroup'][$g] ?? 0) + 1;
            if ($t) $facets['MaterialType'][$t] = ($facets['MaterialType'][$t] ?? 0) + 1;
            if ($p) $facets['Plant'][$p] = ($facets['Plant'][$p] ?? 0) + 1;
        }

        return [
            'success' => true,
            'source' => 'cache_fallback',
            'query' => $query,
            'totalHits' => $totalHits,
            'limit' => $limit,
            'offset' => $offset,
            'hits' => array_values($hits),
            'facets' => $facets,
        ];
    }

    /**
     * Compute relevance score for local ranking.
     */
    protected function scoreLocalDoc(array $doc, string $term): int
    {
        $mat = strtolower((string)($doc['Material'] ?? ''));
        $desc = strtolower((string)($doc['MaterialDescription'] ?? ''));

        if ($mat === $term) return 1000;
        if ($desc === $term) return 950;
        if (str_starts_with($mat, $term)) return 850;
        if (str_starts_with($desc, $term)) return 800;
        if (preg_match("/\b" . preg_quote($term, '/') . "/i", $desc)) return 700;
        if (str_contains($desc, $term)) return 500;
        if (str_contains($mat, $term)) return 400;

        return 100;
    }

    /**
     * Load normalized documents from local zero-SQL cache.
     */
    public function getLocalDocuments(): array
    {
        if (File::exists($this->localIndexPath)) {
            try {
                $content = File::get($this->localIndexPath);
                $data = json_decode($content, true);
                if (!empty($data['documents']) && is_array($data['documents'])) {
                    return $data['documents'];
                }
            } catch (\Throwable $e) {}
        }
        return [];
    }

    /**
     * Save documents directly to local index (e.g. from live search or sync).
     */
    public function saveDocumentsToLocalIndex(array $documents): void
    {
        $dir = dirname($this->localIndexPath);
        if (!File::isDirectory($dir)) {
            File::makeDirectory($dir, 0755, true);
        }
        File::put($this->localIndexPath, json_encode([
            'updated_at' => now()->toIso8601String(),
            'count' => count($documents),
            'documents' => $documents,
        ], JSON_UNESCAPED_UNICODE));
    }

    /**
     * Normalize SAP OData record into Meilisearch document schema.
     */
    public function normalizeSapRecord(array $rec): ?array
    {
        $product = trim((string)(
            $rec['Product']
            ?? $rec['YY1_MATERIALS']
            ?? $rec['Material']
            ?? $rec['MaterialNumber']
            ?? $rec['code']
            ?? ''
        ));

        if ($product === '') {
            return null;
        }

        $plant = trim((string)($rec['Plant'] ?? $rec['ValuationArea'] ?? '1200'));

        // Identify description
        $productDesc = trim((string)(
            $rec['ProductDescription']
            ?? $rec['ProductDescription_1']
            ?? $rec['MaterialDescription']
            ?? $rec['Description']
            ?? ''
        ));

        if (empty($productDesc)) {
            foreach ([
                'ProductText', 'MaterialText', 'ItemDescription', 'LongText', 'ShortText',
                'PurchaseOrderItemText', 'YY1_ProductDescription', 'YY1_MaterialDescription',
                'YY1_ProductText', 'YY1_MaterialText', 'YY1_Description', 'ProductName', 'MaterialName',
            ] as $key) {
                if (!empty($rec[$key]) && trim((string)$rec[$key]) !== '' && trim((string)$rec[$key]) !== $product) {
                    $productDesc = trim((string)$rec[$key]);
                    break;
                }
            }
        }

        if (empty($productDesc)) {
            foreach ($rec as $k => $v) {
                if (is_string($v) && trim($v) !== '' && trim($v) !== $product) {
                    $kLower = strtolower($k);
                    if (
                        (str_contains($kLower, 'desc') || str_contains($kLower, 'text') || str_contains($kLower, 'name')) &&
                        !str_contains($kLower, 'plant') &&
                        !str_contains($kLower, 'company') &&
                        !str_contains($kLower, 'user') &&
                        !str_contains($kLower, 'type') &&
                        !str_contains($kLower, 'valuation') &&
                        !str_contains($kLower, 'group')
                    ) {
                        $productDesc = trim($v);
                        break;
                    }
                }
            }
        }

        if ($productDesc === '') {
            $productDesc = $product;
        }

        $baseUnit = trim((string)($rec['BaseUnit'] ?? $rec['UnitOfMeasure'] ?? $rec['UoM'] ?? 'PC'));
        $productGroup = trim((string)($rec['ProductGroup'] ?? $rec['MaterialGroup'] ?? 'L001'));
        $productType = trim((string)($rec['ProductType'] ?? $rec['MaterialType'] ?? 'ROH'));
        $movingAvg = (float)($rec['MovingAveragePrice'] ?? 0.0);
        $standardPrice = (float)($rec['StandardPrice'] ?? 0.0);
        $invValProcedure = strtoupper(trim((string)($rec['InventoryValuationProcedure'] ?? '')));
        $currency = trim((string)($rec['Currency'] ?? 'INR'));

        $valuationPrice = $invValProcedure === 'V'
            ? $movingAvg
            : ($invValProcedure === 'S' ? $standardPrice : ($movingAvg > 0 ? $movingAvg : $standardPrice));

        $id = preg_replace('/[^a-zA-Z0-9_-]/', '_', "{$product}_{$plant}");

        return [
            'id' => $id,
            'Material' => $product,
            'MaterialDescription' => $productDesc,
            'MaterialGroup' => $productGroup,
            'MaterialType' => $productType,
            'BaseUnit' => $baseUnit,
            'Plant' => $plant,
            'ManufacturerPartNumber' => trim((string)($rec['ProductExternalID'] ?? $rec['ManufacturerPartNumber'] ?? '')),
            'MovingAveragePrice' => $movingAvg,
            'StandardPrice' => $standardPrice,
            'InventoryValuationProcedure' => $invValProcedure,
            'valuationPrice' => $valuationPrice,
            'Currency' => $currency ?: 'INR',
            'poText' => trim((string)($rec['poText'] ?? '')),
            'raw_data' => $rec,
        ];
    }

    /**
     * Helper to obtain Meilisearch HTTP client with headers.
     */
    protected function meiliClient(): \Illuminate\Http\Client\PendingRequest
    {
        $client = Http::timeout(5)
            ->withHeaders([
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ]);

        if (!empty($this->meiliKey) && $this->meiliKey !== 'null') {
            $client = $client->withToken($this->meiliKey);
        }

        return $client;
    }
}
