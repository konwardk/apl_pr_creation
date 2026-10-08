<?php

namespace App\Http\Controllers;

use App\Models\PrDocumentType;
use App\Services\SapMasterDataService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class PrDocumentTypeController extends Controller
{
    protected SapMasterDataService $sapService;

    public function __construct(SapMasterDataService $sapService)
    {
        $this->sapService = $sapService;
    }

    /**
     * Display a listing of saved PR document types from MySQL database.
     */
    public function index(Request $request): JsonResponse
    {
        $types = PrDocumentType::query()
            ->search($request->query('search'))
            ->orderBy('code')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $types,
            'total' => $types->count(),
        ]);
    }

    /**
     * Fetch PR document types live from the SAP S/4HANA Cloud CDS View (I_PurchaseRequisitionType)
     * without saving directly to the database yet (stages preview for Superadmin).
     */
    public function fetchSap(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'username' => 'nullable|string|max:255',
            'password' => 'nullable|string|max:255',
            'endpoint' => 'nullable|url|max:1000',
        ]);

        $result = $this->sapService->fetchPrDocumentTypesFromCdsView(
            $validated['username'] ?? null,
            $validated['password'] ?? null,
            $validated['endpoint'] ?? null
        );

        // Enhance items with their current database sync status
        $existingCodes = PrDocumentType::pluck('code')->toArray();
        $existingMap = PrDocumentType::all()->keyBy('code');

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
     * Save/upsert selected PR document types into MySQL database (apl_pr_db).
     */
    public function saveSap(Request $request): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.code' => 'required|string|max:10',
            'items.*.name' => 'required|string|max:255',
            'items.*.description' => 'nullable|string',
            'items.*.category' => 'nullable|string|max:100',
            'items.*.is_active' => 'nullable|boolean',
            'items.*.sap_source' => 'nullable|string|max:100',
            'items.*.raw_data' => 'nullable|array',
        ]);

        $summary = $this->sapService->savePrDocumentTypes(
            $validated['items'],
            $request->user()?->id
        );

        $message = "Successfully saved {$summary['total']} PR document types to MySQL (Created: {$summary['created']}, Updated: {$summary['updated']}).";

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => $message,
                'summary' => $summary,
                'data' => PrDocumentType::orderBy('code')->get(),
            ]);
        }

        return back()->with('success', $message);
    }

    /**
     * Toggle active/inactive status of a document type.
     */
    public function toggleStatus(PrDocumentType $prDocumentType): RedirectResponse|JsonResponse
    {
        $prDocumentType->update([
            'is_active' => !$prDocumentType->is_active,
        ]);

        $statusStr = $prDocumentType->is_active ? 'enabled' : 'disabled';
        $message = "PR Document Type '{$prDocumentType->code}' {$statusStr} successfully.";

        if (request()->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => $message,
                'data' => $prDocumentType,
            ]);
        }

        return back()->with('success', $message);
    }

    /**
     * Update metadata or notes for a document type.
     */
    public function update(Request $request, PrDocumentType $prDocumentType): RedirectResponse|JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category' => 'nullable|string|max:100',
            'is_active' => 'nullable|boolean',
        ]);

        $prDocumentType->update($validated);

        $message = "PR Document Type '{$prDocumentType->code}' updated successfully.";

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => $message,
                'data' => $prDocumentType,
            ]);
        }

        return back()->with('success', $message);
    }

    /**
     * Delete a PR document type from the database.
     */
    public function destroy(PrDocumentType $prDocumentType): RedirectResponse|JsonResponse
    {
        $code = $prDocumentType->code;
        $prDocumentType->delete();

        $message = "PR Document Type '{$code}' deleted from local database.";

        if (request()->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => $message,
            ]);
        }

        return back()->with('success', $message);
    }
}
