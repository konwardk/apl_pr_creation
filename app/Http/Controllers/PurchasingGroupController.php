<?php

namespace App\Http\Controllers;

use App\Models\PurchasingGroup;
use App\Services\SapMasterDataService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PurchasingGroupController extends Controller
{
    protected SapMasterDataService $sapService;

    public function __construct(SapMasterDataService $sapService)
    {
        $this->sapService = $sapService;
    }

    /**
     * Display a listing of purchasing groups from MySQL database.
     */
    public function index(Request $request): JsonResponse
    {
        $query = PurchasingGroup::with('creator:id,name,email');

        if ($request->filled('search')) {
            $query->search($request->query('search'));
        }

        if ($request->filled('status')) {
            $status = $request->query('status');
            if ($status === 'active') {
                $query->where('is_active', true);
            } elseif ($status === 'inactive') {
                $query->where('is_active', false);
            }
        }

        if ($request->has('active_only') && $request->boolean('active_only')) {
            $query->active();
        }

        $groups = $query->orderBy('is_active', 'desc')
            ->orderBy('code')
            ->get();

        return response()->json([
            'success' => true,
            'purchasingGroups' => $groups,
            'data' => $groups,
            'total' => $groups->count(),
        ]);
    }

    /**
     * Fetch Purchasing Groups live from SAP S/4HANA Cloud CDS View
     * (YY1_PURCHASINGGROUPAPI_CDS / YY1_PurchasingGroupAPI)
     * without saving directly to the database yet (stages preview for Superadmin).
     */
    public function fetchSap(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'username' => 'nullable|string|max:255',
            'password' => 'nullable|string|max:255',
            'endpoint' => 'nullable|url|max:1000',
        ]);

        $result = $this->sapService->fetchPurchasingGroupsFromCdsView(
            $validated['username'] ?? null,
            $validated['password'] ?? null,
            $validated['endpoint'] ?? null
        );

        // Enhance items with current database sync status
        $existingCodes = PurchasingGroup::pluck('code')->toArray();
        $existingMap = PurchasingGroup::all()->keyBy('code');

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
     * Save/upsert selected Purchasing Groups into MySQL database (apl_pr_db).
     */
    public function saveSap(Request $request): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.code' => 'required|string|max:20',
            'items.*.name' => 'required|string|max:255',
            'items.*.description' => 'nullable|string',
            'items.*.email' => 'nullable|email|max:255',
            'items.*.phone_number' => 'nullable|string|max:50',
            'items.*.is_active' => 'nullable|boolean',
            'items.*.sap_source' => 'nullable|string|max:150',
            'items.*.raw_data' => 'nullable|array',
        ]);

        $summary = $this->sapService->savePurchasingGroups(
            $validated['items'],
            $request->user()?->id
        );

        $message = "Successfully saved {$summary['total']} Purchasing Groups to MySQL (Created: {$summary['created']}, Updated: {$summary['updated']}).";

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => $message,
                'summary' => $summary,
                'purchasingGroups' => PurchasingGroup::orderBy('code')->get(),
                'data' => PurchasingGroup::orderBy('code')->get(),
            ]);
        }

        return redirect()->back()->with('success', $message);
    }

    /**
     * Convenient one-click direct sync from SAP CDS view into MySQL database.
     */
    public function syncSap(Request $request): JsonResponse
    {
        $fetchResult = $this->sapService->fetchPurchasingGroupsFromCdsView();

        if (!($fetchResult['success'] ?? false) || empty($fetchResult['items'])) {
            // If fetch failed, fallback to fallback items if database is empty
            if (PurchasingGroup::count() === 0) {
                $fallbackItems = $this->sapService->getFormattedFallbackPurchasingGroups();
                $this->sapService->savePurchasingGroups($fallbackItems, $request->user()?->id);
            }

            return response()->json([
                'success' => false,
                'message' => $fetchResult['message'] ?? 'Failed to connect to SAP Cloud endpoint.',
                'purchasingGroups' => PurchasingGroup::orderBy('code')->get(),
                'data' => PurchasingGroup::orderBy('code')->get(),
            ], 400);
        }

        $summary = $this->sapService->savePurchasingGroups(
            $fetchResult['items'],
            $request->user()?->id
        );

        return response()->json([
            'success' => true,
            'message' => "Successfully synchronized {$summary['total']} Purchasing Groups from SAP S/4HANA Cloud (Created: {$summary['created']}, Updated: {$summary['updated']}).",
            'summary' => $summary,
            'purchasingGroups' => PurchasingGroup::orderBy('code')->get(),
            'data' => PurchasingGroup::orderBy('code')->get(),
        ]);
    }

    /**
     * Store a newly created purchasing group manually.
     */
    public function store(Request $request): RedirectResponse|JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:20', 'unique:purchasing_groups,code'],
            'name' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone_number' => ['nullable', 'string', 'max:50'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $code = trim($validated['code']);
        $description = trim($validated['description'] ?? $validated['name'] ?? '');
        $name = trim($validated['name'] ?? $validated['description'] ?? $code);

        $group = PurchasingGroup::create([
            'code' => $code,
            'name' => $name,
            'description' => $description ?: $name,
            'email' => isset($validated['email']) ? trim($validated['email']) : null,
            'phone_number' => isset($validated['phone_number']) ? trim($validated['phone_number']) : null,
            'is_active' => $request->has('is_active') ? (bool) $request->input('is_active') : true,
            'sap_source' => 'Manual Local Entry',
            'is_synced' => false,
            'created_by' => $request->user()?->id,
        ]);

        $displayName = $group->description ?: $group->name;

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Purchasing Group '{$group->code} - {$displayName}' created successfully.",
                'purchasingGroup' => $group->load('creator:id,name,email'),
            ], 201);
        }

        return redirect()->back()->with('success', "Purchasing Group '{$group->code} - {$displayName}' created successfully.");
    }

    /**
     * Update the specified purchasing group.
     */
    public function update(Request $request, PurchasingGroup $purchasingGroup): RedirectResponse|JsonResponse
    {
        $validated = $request->validate([
            'code' => [
                'required',
                'string',
                'max:20',
                Rule::unique('purchasing_groups', 'code')->ignore($purchasingGroup->id),
            ],
            'name' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone_number' => ['nullable', 'string', 'max:50'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $code = trim($validated['code']);
        $description = trim($validated['description'] ?? $validated['name'] ?? $purchasingGroup->description ?? '');
        $name = trim($validated['name'] ?? $validated['description'] ?? $code);

        $purchasingGroup->update([
            'code' => $code,
            'name' => $name,
            'description' => $description ?: $name,
            'email' => isset($validated['email']) ? trim($validated['email']) : $purchasingGroup->email,
            'phone_number' => isset($validated['phone_number']) ? trim($validated['phone_number']) : $purchasingGroup->phone_number,
            'is_active' => $request->has('is_active') ? (bool) $request->input('is_active') : $purchasingGroup->is_active,
        ]);

        $displayName = $purchasingGroup->description ?: $purchasingGroup->name;

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Purchasing Group '{$purchasingGroup->code} - {$displayName}' updated successfully.",
                'purchasingGroup' => $purchasingGroup->load('creator:id,name,email'),
            ]);
        }

        return redirect()->back()->with('success', "Purchasing Group '{$purchasingGroup->code} - {$displayName}' updated successfully.");
    }

    /**
     * Remove the specified purchasing group.
     */
    public function destroy(Request $request, PurchasingGroup $purchasingGroup): RedirectResponse|JsonResponse
    {
        $code = $purchasingGroup->code;
        $name = $purchasingGroup->name;
        $purchasingGroup->delete();

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Purchasing Group '{$code} - {$name}' deleted successfully.",
            ]);
        }

        return redirect()->back()->with('success', "Purchasing Group '{$code} - {$name}' deleted successfully.");
    }

    /**
     * Toggle active/inactive status.
     */
    public function toggleStatus(Request $request, PurchasingGroup $purchasingGroup): RedirectResponse|JsonResponse
    {
        $purchasingGroup->update([
            'is_active' => ! $purchasingGroup->is_active,
        ]);

        $statusText = $purchasingGroup->is_active ? 'activated' : 'deactivated';

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Purchasing Group '{$purchasingGroup->code}' has been {$statusText}.",
                'purchasingGroup' => $purchasingGroup->load('creator:id,name,email'),
            ]);
        }

        return redirect()->back()->with('success', "Purchasing Group '{$purchasingGroup->code}' has been {$statusText}.");
    }

    /**
     * Endpoint for Purchase Requisition Form search help.
     */
    public function getForPr(Request $request): JsonResponse
    {
        $search = $request->query('query') ?? $request->query('search');

        // 1. First check local MySQL database
        $query = PurchasingGroup::active();
        if (!empty($search)) {
            $query->search($search);
        }
        $dbGroups = $query->orderBy('code')->get();

        if ($dbGroups->isNotEmpty()) {
            $formatted = $dbGroups->map(function ($group) {
                $description = $group->description ?: $group->name;
                $code = (string) $group->code;
                return [
                    'code' => $code,
                    'name' => "{$code} - {$description}",
                    'groupName' => $description,
                    'PurchasingGroup' => $code,
                    'PurchasingGroupName' => $description,
                    'description' => $description,
                    'extra' => $description,
                    'email' => $group->email,
                    'phone_number' => $group->phone_number,
                ];
            })->values()->toArray();

            return response()->json([
                'success' => true,
                'source' => 'Local Database (Synced from SAP)',
                'count' => count($formatted),
                'purchasingGroups' => $formatted,
                'items' => $formatted,
            ]);
        }

        // 2. If database has no active records yet, fetch live from SAP CDS view
        $liveResult = $this->sapService->fetchPurchasingGroupsFromCdsView();
        $items = $liveResult['items'] ?? [];

        $formatted = array_map(function ($g) {
            $code = (string) ($g['code'] ?? $g['PurchasingGroup'] ?? '');
            $desc = $g['description'] ?? $g['PurchasingGroupName'] ?? $g['name'] ?? '';
            return [
                'code' => $code,
                'name' => "{$code} - {$desc}",
                'groupName' => $desc,
                'PurchasingGroup' => $code,
                'PurchasingGroupName' => $desc,
                'description' => $desc,
                'extra' => $desc,
            ];
        }, $items);

        return response()->json([
            'success' => true,
            'source' => $liveResult['source'] ?? 'SAP S/4HANA Cloud (Live CDS: YY1_PURCHASINGGROUPAPI_CDS)',
            'count' => count($formatted),
            'purchasingGroups' => $formatted,
            'items' => $formatted,
        ]);
    }
}
