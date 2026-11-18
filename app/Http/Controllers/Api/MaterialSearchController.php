<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\SapMaterialSyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class MaterialSearchController extends Controller
{
    protected SapMaterialSyncService $syncService;

    public function __construct(SapMaterialSyncService $syncService)
    {
        $this->syncService = $syncService;
    }

    /**
     * Search materials via Meilisearch direct index (or high-speed local zero-SQL cache).
     *
     * GET /api/materials/search?q=...&group=...&type=...&plant=...&limit=20
     */
    public function search(Request $request): JsonResponse
    {
        $query = (string)($request->query('q') ?? $request->query('query') ?? $request->query('search') ?? '');
        $group = (string)($request->query('group') ?? $request->query('material_group') ?? '');
        $type = (string)($request->query('type') ?? $request->query('material_type') ?? '');
        $plant = (string)($request->query('plant') ?? $request->query('valuation_area') ?? '');
        $limit = (int)($request->query('limit', 20));
        $offset = (int)($request->query('offset', 0));

        $filters = array_filter([
            'group' => $group,
            'type' => $type,
            'plant' => $plant,
        ]);

        // Short-lived cache key (15 seconds) for identical query parameters to maximize speed
        $cacheKey = 'mat_search_' . md5(json_encode([$query, $filters, $limit, $offset]));

        $result = Cache::remember($cacheKey, 15, function () use ($query, $filters, $limit, $offset) {
            return $this->syncService->search($query, $filters, $limit, $offset);
        });

        return response()->json($result);
    }

    /**
     * Quick status check of the Meilisearch service and indexed document count.
     *
     * GET /api/materials/status
     */
    public function status(): JsonResponse
    {
        $isMeiliHealthy = $this->syncService->isMeilisearchHealthy();
        $localDocs = $this->syncService->getLocalDocuments();

        return response()->json([
            'meilisearch_connected' => $isMeiliHealthy,
            'meilisearch_host' => config('services.meilisearch.host', 'http://127.0.0.1:7700'),
            'local_cached_materials' => count($localDocs),
            'database_tables_used' => 0,
            'storage_mode' => 'Zero-SQL Direct Indexing',
        ]);
    }
}
