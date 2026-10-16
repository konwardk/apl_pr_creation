<?php

namespace App\Http\Controllers;

use App\Models\PurchasingOrganization;
use App\Services\SapMasterDataService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class PurchasingOrganizationController extends Controller
{
    protected SapMasterDataService $sapService;

    public function __construct(SapMasterDataService $sapService)
    {
        $this->sapService = $sapService;
    }

    /**
     * Display a listing of saved Purchasing Organizations from MySQL database.
     */
    public function index(Request $request): JsonResponse
    {
        $query = PurchasingOrganization::query();

        if ($request->filled('search')) {
            $query->search($request->query('search'));
        }

        if ($request->has('active_only') && $request->boolean('active_only')) {
            $query->active();
        }

        $orgs = $query->orderBy('code')->get();

        return response()->json([
            'success' => true,
            'data' => $orgs,
            'total' => $orgs->count(),
        ]);
    }

    /**
     * Fetch Purchasing Organizations live from SAP S/4HANA Cloud CDS View
     * (YY1_PURCHASEORGANIZATION_CDS / YY1_PURCHASEORGANIZATION)
     * without saving directly to the database yet (stages preview for Superadmin).
     */
    public function fetchSap(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'username' => 'nullable|string|max:255',
            'password' => 'nullable|string|max:255',
            'endpoint' => 'nullable|url|max:1000',
        ]);

        $result = $this->sapService->fetchPurchasingOrganizationsFromCdsView(
            $validated['username'] ?? null,
            $validated['password'] ?? null,
            $validated['endpoint'] ?? null
        );

        // Enhance items with current database sync status
        $existingCodes = PurchasingOrganization::pluck('code')->toArray();
        $existingMap = PurchasingOrganization::all()->keyBy('code');

        $enhancedItems = array_map(function ($item) use ($existingCodes, $existingMap) {
            $code = $item['code'];
            $isInDb = in_array($code, $existingCodes);
            $existing = $existingMap->get($code);

            return array_merge($item, [
                'is_in_database' => $isInDb,
                'db_id' => $existing?->id,
                'is_active' => $existing ? $existing->is_active : true,
                'sync_status' => $isInDb ? 'Already in Database' : 'New from SAP',
            ]);
        }, $result['items'] ?? []);

        $result['items'] = $enhancedItems;

        return response()->json($result);
    }

    /**
     * Save/upsert selected Purchasing Organizations into MySQL database (apl_pr_db).
     */
    public function saveSap(Request $request): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.code' => 'required|string|max:10',
            'items.*.name' => 'required|string|max:255',
            'items.*.company_code' => 'nullable|string|max:10',
            'items.*.plants' => 'nullable|array',
            'items.*.description' => 'nullable|string',
            'items.*.is_active' => 'nullable|boolean',
            'items.*.sap_source' => 'nullable|string|max:150',
            'items.*.raw_data' => 'nullable|array',
        ]);

        $summary = $this->sapService->savePurchasingOrganizations(
            $validated['items'],
            $request->user()?->id
        );

        $message = "Successfully saved {$summary['total']} Purchasing Organizations to MySQL (Created: {$summary['created']}, Updated: {$summary['updated']}).";

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => $message,
                'summary' => $summary,
                'data' => PurchasingOrganization::orderBy('code')->get(),
            ]);
        }

        return back()->with('success', $message);
    }

    /**
     * Convenient one-click direct sync from SAP CDS view into MySQL database.
     */
    public function syncSap(Request $request): JsonResponse
    {
        $fetchResult = $this->sapService->fetchPurchasingOrganizationsFromCdsView();

        if (!($fetchResult['success'] ?? false) || empty($fetchResult['items'])) {
            // If fetch failed, fallback to fallback items if database is empty
            if (PurchasingOrganization::count() === 0) {
                $fallbackItems = $this->sapService->getFormattedFallbackPurchasingOrganizations();
                $this->sapService->savePurchasingOrganizations($fallbackItems, $request->user()?->id);
            }

            return response()->json([
                'success' => false,
                'message' => $fetchResult['message'] ?? 'Failed to connect to SAP Cloud endpoint.',
                'data' => PurchasingOrganization::orderBy('code')->get(),
            ], 400);
        }

        $summary = $this->sapService->savePurchasingOrganizations(
            $fetchResult['items'],
            $request->user()?->id
        );

        return response()->json([
            'success' => true,
            'message' => "Successfully synchronized {$summary['total']} Purchasing Organizations from SAP S/4HANA Cloud (Created: {$summary['created']}, Updated: {$summary['updated']}).",
            'summary' => $summary,
            'data' => PurchasingOrganization::orderBy('code')->get(),
        ]);
    }

    /**
     * Toggle active/inactive status of a Purchasing Organization.
     */
    public function toggleStatus(PurchasingOrganization $purchasingOrganization): JsonResponse|RedirectResponse
    {
        $purchasingOrganization->update([
            'is_active' => !$purchasingOrganization->is_active,
        ]);

        $statusStr = $purchasingOrganization->is_active ? 'activated' : 'deactivated';
        $message = "Purchasing Organization {$purchasingOrganization->code} has been {$statusStr}.";

        if (request()->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => $message,
                'data' => $purchasingOrganization,
            ]);
        }

        return back()->with('success', $message);
    }

    /**
     * Store a manually created Purchasing Organization.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'required|string|max:10|unique:purchasing_organizations,code',
            'name' => 'required|string|max:255',
            'company_code' => 'nullable|string|max:10',
            'plants' => 'nullable|array',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        $org = PurchasingOrganization::create([
            'code' => trim($validated['code']),
            'name' => trim($validated['name']),
            'company_code' => trim($validated['company_code'] ?? '1000'),
            'plants' => $validated['plants'] ?? [],
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
            'sap_source' => 'Manual Local Entry',
            'is_synced' => false,
            'created_by' => $request->user()?->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Purchasing Organization {$org->code} created successfully.",
            'data' => $org,
        ], 201);
    }

    /**
     * Update an existing Purchasing Organization.
     */
    public function update(Request $request, PurchasingOrganization $purchasingOrganization): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'company_code' => 'nullable|string|max:10',
            'plants' => 'nullable|array',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        $purchasingOrganization->update([
            'name' => trim($validated['name']),
            'company_code' => trim($validated['company_code'] ?? $purchasingOrganization->company_code ?? '1000'),
            'plants' => $validated['plants'] ?? $purchasingOrganization->plants,
            'description' => $validated['description'] ?? $purchasingOrganization->description,
            'is_active' => $validated['is_active'] ?? $purchasingOrganization->is_active,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Purchasing Organization {$purchasingOrganization->code} updated successfully.",
            'data' => $purchasingOrganization,
        ]);
    }

    /**
     * Delete a Purchasing Organization.
     */
    public function destroy(PurchasingOrganization $purchasingOrganization): JsonResponse
    {
        $code = $purchasingOrganization->code;
        $purchasingOrganization->delete();

        return response()->json([
            'success' => true,
            'message' => "Purchasing Organization {$code} deleted successfully.",
        ]);
    }

    /**
     * Fetch active Purchasing Organizations for PR Creation & F4 Search Help.
     */
    public function getForPr(Request $request): JsonResponse
    {
        $search = $request->query('query') ?? $request->query('search');

        // First check local MySQL database
        $query = PurchasingOrganization::active();
        if (!empty($search)) {
            $query->search($search);
        }
        $dbItems = $query->orderBy('code')->get();

        if ($dbItems->isNotEmpty()) {
            $formatted = $dbItems->map(function ($org) {
                $plantsStr = !empty($org->plants) ? implode(', ', $org->plants) : '';
                return [
                    'code' => $org->code,
                    'name' => $org->name,
                    'PurchasingOrganization' => $org->code,
                    'PurchasingOrganizationName' => $org->name,
                    'company_code' => $org->company_code,
                    'plants' => $org->plants ?? [],
                    'extra' => $plantsStr ? "Mapped Plants: {$plantsStr}" : 'Company Code: 1000',
                    'description' => $org->description,
                ];
            })->values()->toArray();

            return response()->json([
                'success' => true,
                'source' => 'Local Database (Synced from SAP)',
                'count' => count($formatted),
                'items' => $formatted,
            ]);
        }

        // If database is empty, fetch live from SAP CDS view and return
        $liveResult = $this->sapService->fetchPurchasingOrganizationsFromCdsView();
        return response()->json($liveResult);
    }
}
